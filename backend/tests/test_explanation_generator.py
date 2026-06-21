import pytest
from unittest.mock import patch, MagicMock
from recommendations.explanation_generator import ExplanationGenerator

# Dummy classes to mimic models
class DummyAcademicData:
    def __init__(self, gpa):
        self.gpa = gpa

class DummyPersonalInterest:
    def __init__(self, interest):
        self.interest = interest

class DummySocioeconomic:
    def __init__(self, country_code=None, income_level=None, gender=None, school_type=None,
                 father_education=None, mother_education=None, funding_method=None):
        self.country_code = country_code
        self.income_level = income_level
        self.gender = gender
        self.school_type = school_type
        self.father_education = father_education
        self.mother_education = mother_education
        self.funding_method = funding_method

class DummySubject:
    def __init__(self, subject_name):
        self.subject_name = subject_name

class DummySubjectRequirement:
    def __init__(self, subject):
        self.subject = subject

class DummyDegreeProgram:
    def __init__(self, program_name, description, industries=None, subject_requirements=None):
        self.program_name = program_name
        self.description = description
        self.industries = industries or []
        self.subject_requirements = subject_requirements or []

class DummyRecommendation:
    def __init__(self, semantic_score=None, peer_score=None, subject_score=None, market_score=None, recommendation_id=None):
        self.semantic_score = semantic_score
        self.peer_score = peer_score
        self.subject_score = subject_score
        self.market_score = market_score
        self.recommendation_id = recommendation_id

class DummyUser:
    def __init__(self, academic_data=None, personal_interests=None, socioeconomic=None):
        self.academic_data = academic_data
        self.personal_interests = personal_interests or []
        self.socioeconomic = socioeconomic

@pytest.fixture
def generator():
    return ExplanationGenerator()

@pytest.fixture
def dummy_user():
    return DummyUser(
        academic_data=DummyAcademicData(gpa=3.8),
        personal_interests=[DummyPersonalInterest("Mathematics"), DummyPersonalInterest("Physics")],
        socioeconomic=DummySocioeconomic(
            country_code="US", income_level="High", gender="Male", school_type="Public",
            father_education="College", mother_education="High School", funding_method="Scholarship"
        )
    )

@pytest.fixture
def dummy_degree_program():
    return DummyDegreeProgram(
        program_name="Computer Science",
        description="A program focused on computation and programming.",
        industries=["Technology", "Software"],
        subject_requirements=[DummySubjectRequirement(DummySubject("Mathematics")), DummySubjectRequirement(DummySubject("Computer Science"))]
    )

@pytest.fixture
def dummy_recommendation():
    return DummyRecommendation(
        semantic_score=0.8,
        peer_score=0.6,
        subject_score=0.7,
        market_score=0.9,
        recommendation_id=123
    )

@pytest.fixture
def dummy_trends():
    return {"growth": "High", "salary": "Excellent"}

@patch.object(ExplanationGenerator, '_get_llm_snippet')
def test_generate_explanation_all_drivers(mock_llm_snippet, generator, dummy_user, dummy_degree_program, dummy_recommendation, dummy_trends):
    # Mock LLM responses
    mock_llm_snippet.side_effect = lambda driver_type, data, program_name: f"{driver_type.capitalize()} snippet for {program_name}"

    explanation = generator.generate_explanation(dummy_user, dummy_degree_program, dummy_recommendation, dummy_trends)

    assert "Based on your unique profile" in explanation
    assert "**Computer Science**" in explanation
    assert "A Great Fit for Your Interests" in explanation
    assert "Plays to Your Strengths" in explanation
    assert "A Strong Future Outlook" in explanation
    assert "Aligns with Similar Students" in explanation
    assert "When recommending this program" in explanation
    assert "Semantic snippet for Computer Science" in explanation
    assert "Subject snippet for Computer Science" in explanation
    assert "Market snippet for Computer Science" in explanation

@patch.object(ExplanationGenerator, '_get_llm_snippet')
def test_generate_explanation_some_drivers(mock_llm_snippet, generator, dummy_user, dummy_degree_program, dummy_trends):
    # Only semantic_score and market_score are high
    recommendation = DummyRecommendation(semantic_score=0.7, peer_score=0.2, subject_score=0.3, market_score=0.6)
    mock_llm_snippet.side_effect = lambda driver_type, data, program_name: f"{driver_type.capitalize()} snippet for {program_name}"

    explanation = generator.generate_explanation(dummy_user, dummy_degree_program, recommendation, dummy_trends)

    assert "A Great Fit for Your Interests" in explanation
    assert "A Strong Future Outlook" in explanation
    assert "Plays to Your Strengths" not in explanation
    assert "Aligns with Similar Students" not in explanation

@patch.object(ExplanationGenerator, '_get_llm_snippet')
def test_generate_explanation_no_high_scores(mock_llm_snippet, generator, dummy_user, dummy_degree_program, dummy_trends):
    # All scores below threshold
    recommendation = DummyRecommendation(semantic_score=0.1, peer_score=0.2, subject_score=0.3, market_score=0.4)
    explanation = generator.generate_explanation(dummy_user, dummy_degree_program, recommendation, dummy_trends)

    # Should only contain header and footer
    assert "A Great Fit for Your Interests" not in explanation
    assert "Plays to Your Strengths" not in explanation
    assert "A Strong Future Outlook" not in explanation
    assert "Aligns with Similar Students" not in explanation
    assert "Based on your unique profile" in explanation
    assert "When recommending this program" in explanation

@patch.object(ExplanationGenerator, '_get_llm_snippet')
def test_generate_explanation_handles_missing_data(mock_llm_snippet, generator, dummy_trends):
    # User missing academic_data and socioeconomic
    user = DummyUser(academic_data=None, personal_interests=[], socioeconomic=None)
    degree_program = DummyDegreeProgram(
        program_name="History",
        description="Study of past events.",
        industries=[],
        subject_requirements=[]
    )
    recommendation = DummyRecommendation(semantic_score=0.6, peer_score=0.6, subject_score=None, market_score=None)
    mock_llm_snippet.side_effect = lambda driver_type, data, program_name: f"{driver_type.capitalize()} snippet for {program_name}"

    explanation = generator.generate_explanation(user, degree_program, recommendation, dummy_trends)

    assert "A Great Fit for Your Interests" in explanation
    assert "Aligns with Similar Students" in explanation
    assert "Plays to Your Strengths" not in explanation
    assert "A Strong Future Outlook" not in explanation

@patch.object(ExplanationGenerator, '_get_llm_snippet')
def test_generate_explanation_llm_failure(mock_llm_snippet, generator, dummy_user, dummy_degree_program, dummy_recommendation, dummy_trends):
    # LLM returns empty string
    mock_llm_snippet.return_value = ""
    explanation = generator.generate_explanation(dummy_user, dummy_degree_program, dummy_recommendation, dummy_trends)
    # Section templates should still be present but empty
    assert "**A Great Fit for Your Interests:**" in explanation
    assert "**Plays to Your Strengths:**" in explanation
    assert "**A Strong Future Outlook:**" in explanation