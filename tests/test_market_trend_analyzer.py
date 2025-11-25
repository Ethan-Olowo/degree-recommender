import pytest
from recommendations.market_trend_analyzer import MarketTrendAnalyzer
from collections import namedtuple

# Mock classes
DegreeProgram = namedtuple('DegreeProgram', ['degree_industries'])
DegreeIndustry = namedtuple('DegreeIndustry', ['industry_id'])
IndicatorType = namedtuple('IndicatorType', ['indicator_name'])
MarketIndicatorValue = namedtuple('MarketIndicatorValue', ['indicator_type', 'industry_id', 'value'])

@pytest.fixture
def sample_indicators():
    return [
        MarketIndicatorValue(IndicatorType('Growth'), None, 10.0),
        MarketIndicatorValue(IndicatorType('Growth'), 1, 20.0),
        MarketIndicatorValue(IndicatorType('Salary'), 1, 50000.0),
        MarketIndicatorValue(IndicatorType('Salary'), 2, 60000.0),
        MarketIndicatorValue(IndicatorType('Demand'), None, 0.8),
    ]

@pytest.fixture
def degree_program():
    return DegreeProgram(degree_industries=[DegreeIndustry(1)])

def test_analyze_trends_filters_and_averages(sample_indicators, degree_program):
    analyzer = MarketTrendAnalyzer(sample_indicators)
    result = analyzer.analyze_trends(degree_program)
    # Growth: Only industry-specific value (20.0)
    # Salary: Only industry-specific value (50000.0)
    # Demand: First value (0.8) since industry is None
    assert pytest.approx(result['Growth']) == 20.0
    assert pytest.approx(result['Salary']) == 50000.0
    assert pytest.approx(result['Demand']) == 0.8

def test_normalize_indicator_single_value():
    analyzer = MarketTrendAnalyzer([])
    # Single value normalization
    norm = analyzer.normalize_indicator('Growth', 0.10, [0.10])
    assert 0 <= norm <=  1

def test_normalize_indicator_multiple_values():
    analyzer = MarketTrendAnalyzer([])
    values = [10, 20, 30, 40]
    norm = analyzer.normalize_indicator('Growth', 30, values)
    # 30 is third in sorted [10,20,30,40], so rank=2, percentile=2/3
    assert pytest.approx(norm) == 2/3

def test_calculate_market_score(sample_indicators, degree_program):
    analyzer = MarketTrendAnalyzer(sample_indicators)
    score = analyzer.calculate_market_score(degree_program)
    assert isinstance(score, float)
    assert -0.5 <= score <= 1.0

def test_analyze_trends_no_matching_industry():
    indicators = [
        MarketIndicatorValue(IndicatorType('Growth'), 99, 100.0),
    ]
    degree_program = DegreeProgram(degree_industries=[DegreeIndustry(1)])
    analyzer = MarketTrendAnalyzer(indicators)
    result = analyzer.analyze_trends(degree_program)
    # No matching industry, so result should be empty
    assert result == {}

def test_normalize_indicator_empty_values():
    analyzer = MarketTrendAnalyzer([])
    norm = analyzer.normalize_indicator('Growth', 10.0, [])
    assert norm == 0.0