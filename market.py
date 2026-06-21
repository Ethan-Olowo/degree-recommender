import requests
from typing import List, Dict, Union, Any

# Define the indicators we want to fetch, mapping ID to a readable name
INDICATORS = {
    'NY.GDP.MKTP.KD.ZG': 'GDP Growth Rate',
    'SL.UEM.TOTL.ZS': 'National Unemployment Rate',
    'FP.CPI.TOTL.ZG': 'Inflation Rate',
}

def fetch_world_bank_data(years: List[int], country_codes: List[str]) -> List[Dict[str, Union[str, float, int]]]:
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
            'indicator_name': 'GDP Growth (Annual %)',
            'value': 2.5,
            'year': 2023
        }
        Returns an empty list if an error occurs.
    """
    
    # 1. Format parameters for the API URL
    
    # Format date range: e.g., [2023, 2024] -> "2023:2024"
    if not years:
        raise ValueError("The 'years' list cannot be empty.")
    date_range = f"{min(years)}:{max(years)}"
    
    # Format country codes: e.g., ['USA', 'DEU'] -> "USA;DEU"
    if not country_codes:
        raise ValueError("The 'country_codes' list cannot be empty.")
    country_str = ";".join(country_codes)
    
    base_url = "https://api.worldbank.org/v2/country"
    all_data_points = []

    print(f"Fetching data for countries: {country_str} and years: {date_range}")

    # 2. Loop through each indicator and fetch its data
    for indicator_id, indicator_name in INDICATORS.items():
        # per_page=1000 to get many results.
        # Note: For 'all' countries, this may not be enough.
        # Proper pagination would be needed for a production system.
        params = {
            'date': date_range,
            'format': 'json',
            'per_page': '1000'
        }
        
        url = f"{base_url}/{country_str}/indicator/{indicator_id}"
        
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()  # Raises an HTTPError for bad responses (4xx or 5xx)
            
            data = response.json()
            
            # World Bank API returns a 2-element list: [pagination_info, data_array]
            if not data or not isinstance(data, list) or len(data) < 2:
                print(f"Warning: No data returned or unexpected format for {indicator_name}.")
                continue
                
            pagination_info = data[0]
            data_array = data[1]

            if not data_array:
                print(f"No data found for {indicator_name}.")
                continue

            print(f"Successfully fetched {len(data_array)} data points for {indicator_name}.")

            # 3. Process the data and format the output
            for point in data_array:
                # Skip entries with no value or aggregate regions
                if point.get('value') is None or not point.get('countryiso3code'):
                    continue
                
                # Add the formatted data point to our results list
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