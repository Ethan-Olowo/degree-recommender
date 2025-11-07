from models import DegreeProgram

class MarketTrendAnalyzer:
    """
    Analyzes market trends to inform degree recommendations.
    """
    def analyze_trends(self, degree_program: DegreeProgram) -> dict:
        """
        Analyzes market trends related to a specific degree program using four indicators:
        Industry Employment Growth, Average Industry Wage, Unemployment Rate, Real GDP Growth.
        """
        # Placeholder for actual market trend analysis logic
        # Replace these with real data sources or APIs as needed
        return {
            "industry_employment_growth": 0.04,  # 4% growth
            "average_industry_wage": 75000,      # $75,000
            "unemployment_rate": 0.045,          # 4.5%
            "real_gdp_growth": 0.03              # 3% growth
        }

    def calculate_market_score(self, degree_program: DegreeProgram) -> float:
        trends = self.analyze_trends(degree_program)
        # Calculate market score based on the four indicators
        # Weights can be adjusted as needed
        employment_growth_weight = 0.3
        wage_weight = 0.3
        unemployment_weight = 0.2
        gdp_growth_weight = 0.2

        # Normalization parameters (adjust as needed)
        max_employment_growth = 0.10  # 10% growth
        max_wage = 100000             # $100,000
        max_unemployment = 0.10       # 10%
        max_gdp_growth = 0.05         # 5% growth

        # Normalize all indicators to 0-1 scale
        normalized_employment_growth = min(trends["industry_employment_growth"] / max_employment_growth, 1.0)
        normalized_wage = min(trends["average_industry_wage"] / max_wage, 1.0)
        normalized_unemployment = max(0, 1 - (trends["unemployment_rate"] / max_unemployment))
        normalized_gdp_growth = min(trends["real_gdp_growth"] / max_gdp_growth, 1.0)

        market_score = (
            normalized_employment_growth * employment_growth_weight +
            normalized_wage * wage_weight +
            normalized_unemployment * unemployment_weight +
            normalized_gdp_growth * gdp_growth_weight
        )
        return market_score