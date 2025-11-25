from models import DegreeProgram
from database.schemas import MarketIndicatorValue
from collections import defaultdict
import math
import requests

# Define the indicators we want to fetch, mapping ID to a readable name
INDICATORS = {
    'NY.GDP.MKTP.KD.ZG': 'GDP Growth Rate',
    'SL.UEM.TOTL.ZS': 'National Unemployment Rate',
    'FP.CPI.TOTL.ZG': 'Inflation Rate',
}


class MarketTrendAnalyzer:
    """
    Analyzes market trends to inform degree recommendations.
    """

    indicators: list[MarketIndicatorValue]
    indicator_groups: dict[str, list[dict]]  # Updated to include is_positive

    @staticmethod
    def fetch_world_bank_data(years: list[int], country_codes: list[str]) -> list[dict]:
        """
        Fetches country-level data from the World Bank API for specified years and countries.

        Args:
            years: A list of years to fetch data for (e.g., [2023, 2024]).
            country_codes: A list of ISO3 country codes (e.g., ['USA', 'DEU', 'BRA']).
                        Use ['all'] to fetch for all countries.

        Returns:
            A list of dictionaries, where each dictionary contains a single data point:
            {
                'country_code': 'USA',
                'country_name': 'United States',
                'indicator_name': 'GDP Growth Rate',
                'value': 2.5,
                'year': 2023
            }
            Returns an empty list if an error occurs.
        """
        # 1. Format parameters for the API URL
        if not years:
            raise ValueError("The 'years' list cannot be empty.")
        date_range = f"{min(years)}:{max(years)}"
        if not country_codes:
            raise ValueError("The 'country_codes' list cannot be empty.")
        country_str = ";".join(country_codes)
        base_url = "https://api.worldbank.org/v2/country"
        all_data_points = []
        print(f"Fetching data for countries: {country_str} and years: {date_range}")
        for indicator_id, indicator_name in INDICATORS.items():
            params = {
                'date': date_range,
                'format': 'json',
                'per_page': '1000'
            }
            url = f"{base_url}/{country_str}/indicator/{indicator_id}"
            try:
                response = requests.get(url, params=params)
                response.raise_for_status()
                data = response.json()
                if not data or not isinstance(data, list) or len(data) < 2:
                    print(f"Warning: No data returned or unexpected format for {indicator_name}.")
                    continue
                data_array = data[1]
                if not data_array:
                    print(f"No data found for {indicator_name}.")
                    continue
                print(f"Successfully fetched {len(data_array)} data points for {indicator_name}.")
                for point in data_array:
                    if point.get('value') is None or not point.get('countryiso3code'):
                        continue
                    all_data_points.append({
                        'country_code': point['countryiso3code'],
                        'country_name': point['country']['value'],
                        'indicator_name': indicator_name,
                        'value': point['value'],
                        'year': int(point['date'])
                    })
            except requests.exceptions.HTTPError as http_err:
                print(f"HTTP error fetching {indicator_name}: {http_err}")
            except requests.exceptions.RequestException as req_err:
                print(f"Error fetching {indicator_name}: {req_err}")
            except Exception as e:
                print(f"An unexpected error occurred while processing {indicator_name}: {e}")
        return all_data_points

    def __init__(self, indicators: list[MarketIndicatorValue]):
        """
        Initializes the MarketTrendAnalyzer with market indicators.
        """
        self.indicators = indicators
        self.indicator_groups = defaultdict(list)

    def analyze_trends(self, degree_program: DegreeProgram) -> dict:
        """
        Analyzes market trends for a degree program using provided indicators.
        Filters indicators by matching industry (or industry is None), then averages values per indicator type.
        Returns: {indicator_name: avg_value}
        """
        self.indicator_groups = defaultdict(list)

        # Group by indicator type
        for indicator in self.indicators:
            name = getattr(indicator.indicator_type, 'indicator_name', None)
            is_positive = getattr(indicator.indicator_type, 'is_positive', True)
            indicator_type_avg = getattr(indicator.indicator_type, 'average', None)
            if name:
                self.indicator_groups[name].append({
                    'value': indicator.value,
                    'industry_id': indicator.industry_id,
                    'is_positive': is_positive,
                    'average': indicator_type_avg
                })

        # Log indicator groups for debugging
        # print("Indicator Groups:", self.indicator_groups)

        # Calculate average values per indicator type
        avg_values = {}
        degree_industries = {di.industry_id for di in degree_program.degree_industries}

        for name, entries in self.indicator_groups.items():
            industry_values = [
                entry['value'] for entry in entries
                if entry['industry_id'] in degree_industries
            ]
            if industry_values:
                avg_values[name] = sum(industry_values) / len(industry_values)
            elif any(entry['industry_id'] is None for entry in entries):
                # Take the first value where industry_id is None
                avg_values[name] = next(
                    entry['value'] for entry in entries if entry['industry_id'] is None
                )

        # Log average values for debugging
        print("Average Values:", avg_values)

        return avg_values

    def normalize_indicator(self, name: str, value: float, values: list, indicator_average: float = None, is_positive: bool = True) -> float:
        """
        Normalizes a market indicator value according to the rules:
        - If only one value: log normalization between -0.5 and 0.5
        - If multiple values: percentile normalization
        """
        if not values:
            return 0.0

        if len(values) == 1:
            norm = self.normalize_sigmoid(values[0], midpoint=indicator_average if indicator_average is not None else 3.0)
            return norm if is_positive else 1 - norm
        else:
            sorted_vals = sorted(values)
            rank = sum(1 for x in sorted_vals if x < value)
            percentile = rank / (len(sorted_vals) - 1) if len(sorted_vals) > 1 else 0.5
            return percentile if is_positive else 1 - percentile

    @staticmethod
    def normalize_sigmoid(value: float, steepness: float = 0.3, midpoint: float = 3.0) -> float:
        """
        Scales a value to a [0, 1] range using a sigmoid function.
        Adjusted for expected percentage values like GDP growth rate, unemployment rate, etc.
        """
        try:
            adjusted_value = value - midpoint
            score = 1 / (1 + math.exp(-steepness * adjusted_value))
        except OverflowError:
            score = 0.0 if adjusted_value < 0 else 1.0
        return score
    
    def calculate_market_score(self, degree_program: DegreeProgram) -> float:
        """
        Calculates a market score for a degree program based on normalized indicator values.
        """
        # Get the values for this degree (from analyze_trends)
        trends = self.analyze_trends(degree_program)
        # Market score is a weighted average of normalized indicator values
        weighted_sum = 0.0
        total_weight = 0.0

        for name, value in trends.items():
            entries = self.indicator_groups.get(name, [])
            values = [entry['value'] for entry in entries]
            is_positive = entries[0]['is_positive'] if entries else True  # Use is_positive from the first entry
            indicator_average = entries[0].get('average') if entries else None

            norm = self.normalize_indicator(name, value, values, indicator_average, is_positive)
            
            print(f"Indicator: {name}, Raw Value: {value}, Normalized: {norm}, Is Positive: {is_positive}")

            # Determine weight based on industry_id
            weight = 2.0 if any(entry['industry_id'] not in (None, "") for entry in entries) else 1.0
            weighted_sum += norm * weight
            total_weight += weight

        market_score = weighted_sum / total_weight if total_weight > 0 else 0.0
        return market_score