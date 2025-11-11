from models import DegreeProgram
from database.schemas import MarketIndicatorValue
from collections import defaultdict
import math

class MarketTrendAnalyzer:
    """
    Analyzes market trends to inform degree recommendations.
    """
    
    indicators: list[MarketIndicatorValue]
    indicator_groups: dict[str, list[MarketIndicatorValue]]

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
        # Get industry IDs for the degree program
        degree_industries = set(di.industry_id for di in getattr(degree_program, 'degree_industries', []))
        filtered = []
        for indicator in self.indicators:
            # Use if industry matches or is None
            if indicator.industry_id is None or indicator.industry_id in degree_industries:
                filtered.append(indicator)
        # Group by indicator type
        for ind in filtered:
            name = getattr(ind.indicator_type, 'indicator_name', None)
            if name:
                self.indicator_groups[name].append(ind.value)
        # Average values per indicator type
        avg_values = {}
        for name, values in self.indicator_groups.items():
            if values:
                avg_values[name] = sum(values) / len(values)
        return avg_values

    def normalize_indicator(self, name: str, value: float, values: list) -> float:
        """
        Normalizes a market indicator value according to the rules:
        - If only one value: log normalization between -0.5 and 0.5
        - If multiple values: percentile normalization
        """
        if not values:
            return 0.0
        if len(values) == 1:
            v = values[0]
            mag = abs(v)
            if mag < 1:
                norm = math.copysign(math.log10(mag + 1e-8), v) / 2
            else:
                norm = math.copysign(math.log10(mag / 100 + 1e-8), v) / 2
            norm = max(-0.1, min(norm, 0.1))
            return norm
        else:
            sorted_vals = sorted(values)
            rank = sum(1 for x in sorted_vals if x < value)
            percentile = rank / (len(sorted_vals) - 1) if len(sorted_vals) > 1 else 0.5
            return percentile

    def calculate_market_score(self, degree_program: DegreeProgram) -> float:
        """
        Calculates a market score for a degree program based on normalized indicator values.
        """
        # Get the values for this degree (from analyze_trends)
        trends = self.analyze_trends(degree_program)
        normalized_values = []
        for name, value in trends.items():
            values = self.indicator_groups.get(name, [])
            norm = self.normalize_indicator(name, value, values)
            normalized_values.append(norm)
        # Market score is average of normalized indicator values
        if normalized_values:
            market_score = sum(normalized_values) / len(normalized_values)
        else:
            market_score = 0.0
        return market_score