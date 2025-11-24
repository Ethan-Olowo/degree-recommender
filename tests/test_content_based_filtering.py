import pytest
import numpy as np
from unittest.mock import MagicMock, patch
from recommendations.content_based_filtering import ContentBasedFiltering

# Mock classes for dependencies
class MockSubject:
    def __init__(self, subject_name):
        self.subject_name = subject_name

class MockIndustry:
    def __init__(self, industry_name, industry_id, embedding=None):
        self.industry_name = industry_name
        self.industry_id = industry_id
        self.embedding = embedding

class MockSubjectGrade:
    def __init__(self, subject, grade):
        self.subject = subject
        self.grade = grade

class MockAcademicData:
    def __init__(self, subject_grades=None, gpa=0.0):
        self.subject_grades = subject_grades or []
        self.gpa = gpa

class MockPersonalInterest:
    def __init__(self, interest, embedding=None):
        self.interest = interest
        self.embedding = embedding

class MockUser:
    def __init__(self, user_id, academic_data, personal_interests=None):
        self.user_id = user_id
        self.academic_data = academic_data
        self.personal_interests = personal_interests or []

class MockSubjectRequirement:
    def __init__(self, subject, requirement_detail=None):
        self.subject = subject
        self.requirement_detail = requirement_detail

class MockDegreeIndustry:
    def __init__(self, industry):
        self.industry = industry

class MockDegreeProgram:
    def __init__(self, program_id, subject_requirements=None, degree_industries=None,
                 minimum_gpa=0.0, description=None, description_embedding=None, program_type=None, category=None):
        self.program_id = program_id
        self.subject_requirements = subject_requirements or []
        self.degree_industries = degree_industries or []
        self.minimum_gpa = minimum_gpa
        self.description = description
        self.description_embedding = description_embedding
        self.program_type = program_type
        self.category = category

class MockRecommendation:
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)

# Patch imports in content_based_filtering
@pytest.fixture(autouse=True)
def patch_dependencies(monkeypatch):
    monkeypatch.setattr("recommendations.content_based_filtering.normalize_grade", lambda g: float(g))
    monkeypatch.setattr("recommendations.content_based_filtering.crud.save_embeddings_batch", lambda *a, **kw: None)
    monkeypatch.setattr("recommendations.content_based_filtering.Recommendation", MockRecommendation)
    monkeypatch.setattr("recommendations.content_based_filtering.SentenceTransformer", lambda model: MagicMock(
        encode=lambda texts: [np.ones(384) for _ in texts]
    ))

def test_fit_encoders_initializes_feature_space():
    subjects = [MockSubject("Math"), MockSubject("Physics")]
    industries = [MockIndustry("Engineering", 1), MockIndustry("Science", 2)]
    cbf = ContentBasedFiltering(subjects, industries)
    assert cbf.all_subjects == ["Math", "Physics"]
    assert cbf.all_industries == ["Engineering", "Science"]
    assert isinstance(cbf.embedding_model, MagicMock)
    assert cbf.industry_id_map == {"Engineering": 1, "Science": 2}

def test_create_user_vectors_with_grades_and_interests():
    subjects = [MockSubject("Math"), MockSubject("Physics")]
    industries = [MockIndustry("Engineering", 1)]
    user = MockUser(
        user_id=123,
        academic_data=MockAcademicData([
            MockSubjectGrade(subjects[0], 80),
            MockSubjectGrade(subjects[1], 90)
        ]),
        personal_interests=[MockPersonalInterest("Robotics")]
    )
    cbf = ContentBasedFiltering(subjects, industries)
    subject_vec, interest_vec = cbf._create_user_vectors(user)
    assert np.allclose(subject_vec, [0.8, 0.9])
    assert interest_vec.shape == (384,)
    assert np.allclose(interest_vec, np.ones(384))

def test_create_degree_vectors_with_requirements_and_embeddings():
    subjects = [MockSubject("Math"), MockSubject("Physics")]
    industries = [MockIndustry("Engineering", 1)]
    degree_programs = [
        MockDegreeProgram(
            program_id=1,
            subject_requirements=[MockSubjectRequirement(subjects[0], 70)],
            degree_industries=[MockDegreeIndustry(industries[0])],
            description="Engineering degree"
        )
    ]
    cbf = ContentBasedFiltering(subjects, industries)
    subject_df, semantic_matrix, program_id_map = cbf._create_degree_vectors(degree_programs)
    assert subject_df.shape == (1, 2)
    assert np.allclose(subject_df.values[0], [70.0, 0.0])
    assert semantic_matrix.shape == (1, 384)
    assert np.allclose(semantic_matrix[0], np.ones(384))
    assert program_id_map[1] == 0

def test_recommend_returns_recommendations_sorted_by_score():
    subjects = [MockSubject("Math"), MockSubject("Physics")]
    industries = [MockIndustry("Engineering", 1)]
    user = MockUser(
        user_id=123,
        academic_data=MockAcademicData([
            MockSubjectGrade(subjects[0], 80),
            MockSubjectGrade(subjects[1], 90)
        ], gpa=3.5),
        personal_interests=[MockPersonalInterest("Robotics")]
    )
    degree_programs = [
        MockDegreeProgram(
            program_id=1,
            subject_requirements=[MockSubjectRequirement(subjects[0], 70)],
            degree_industries=[MockDegreeIndustry(industries[0])],
            minimum_gpa=3.0,
            description="Engineering degree",
            program_type=None,
            category="A"
        ),
        MockDegreeProgram(
            program_id=2,
            subject_requirements=[MockSubjectRequirement(subjects[1], 85)],
            degree_industries=[MockDegreeIndustry(industries[0])],
            minimum_gpa=3.0,
            description="Physics degree",
            program_type=None,
            category="B"
        )
    ]
    cbf = ContentBasedFiltering(subjects, industries)
    weights = {"subject_similarity_weight": 0.5, "semantic_similarity_weight": 0.5, "algorithm_id": "cbf"}
    category_ranks = {"A": 1, "B": 2}
    recommendations = cbf.recommend(user, degree_programs, top_n=2, db=None, weights=weights, category_ranks=category_ranks)
    assert len(recommendations) == 2
    for rec in recommendations:
        assert hasattr(rec, "confidence_score")
        assert hasattr(rec, "subject_score")
        assert hasattr(rec, "semantic_score")
        assert hasattr(rec, "peer_score")
        assert rec.algorithm_source == "cbf"
        assert rec.degree_program is not None

def test_recommend_returns_empty_list_if_no_eligible_programs():
    subjects = [MockSubject("Math")]
    industries = [MockIndustry("Engineering", 1)]
    user = MockUser(
        user_id=123,
        academic_data=MockAcademicData([MockSubjectGrade(subjects[0], 80)], gpa=2.0),
        personal_interests=[MockPersonalInterest("Robotics")]
    )
    degree_programs = [
        MockDegreeProgram(
            program_id=1,
            subject_requirements=[MockSubjectRequirement(subjects[0], 70)],
            degree_industries=[MockDegreeIndustry(industries[0])],
            minimum_gpa=3.0,
            description="Engineering degree"
        )
    ]
    cbf = ContentBasedFiltering(subjects, industries)
    recommendations = cbf.recommend(user, degree_programs, top_n=1, db=None, weights={"algorithm_id": "cbf"})
    assert recommendations == []