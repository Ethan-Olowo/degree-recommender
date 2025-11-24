import pytest
from recommendations.recommendation_engine import RecommendationEngine
import uuid
from models import User, DegreeProgram, Recommendation, AcademicData, SubjectGrade, PersonalInterest, SocioeconomicIndicator

class DummyDB:
    pass

class DummyBackgroundTasks:
    def __init__(self):
        self.tasks = []
    def add_task(self, func, *args, **kwargs):
        self.tasks.append((func, args, kwargs))

@pytest.fixture
def dummy_user():
    user_id = uuid.UUID("44444444-4444-4444-4444-444444444444")
    academic_data_id = uuid.UUID("55555555-5555-5555-5555-555555555555")
    subject_id_1 = uuid.UUID("88888888-8888-8888-8888-888888888888")
    subject_id_2 = uuid.UUID("99999999-9999-9999-9999-999999999999")
    academic_data = AcademicData(
        user_id=user_id,
        academic_data_id=academic_data_id,
        subject_grades=[
            SubjectGrade(academic_data_id=academic_data_id, subject_id=subject_id_1, grade="A"),
            SubjectGrade(academic_data_id=academic_data_id, subject_id=subject_id_2, grade="B")
        ]
    )
    personal_interests = [
        PersonalInterest(user_id=user_id, interest="AI"),
        PersonalInterest(user_id=user_id, interest="Robotics")
    ]
    socioeconomic = SocioeconomicIndicator(
        user_id=user_id,
        income_level="medium",
        country_code="US"
    )
    return User(
        user_id=user_id,
        personal_interests=personal_interests,
        academic_data=academic_data,
        socioeconomic=socioeconomic
    )

@pytest.fixture
def dummy_degree_programs():
    return [
        DegreeProgram(program_id="11111111-1111-1111-1111-111111111111", category='Engineering', industry='Tech', program_name='Computer Engineering'),
        DegreeProgram(program_id="22222222-2222-2222-2222-222222222222", category='Science', industry='Research', program_name='Biology'),
        DegreeProgram(program_id="33333333-3333-3333-3333-333333333333", category='Engineering', industry='Tech', program_name='Mechanical Engineering'),
    ]

@pytest.fixture
def engine(dummy_degree_programs):
    eng = RecommendationEngine()
    eng.degree_programs = dummy_degree_programs
    eng.categories = [{'category': 'Engineering', 'score': 0.9}, {'category': 'Science', 'score': 0.8}]
    return eng

def test_filter_programs(engine):
    filtered = engine.filter_programs(['Engineering'])
    assert all(dp.category == 'Engineering' for dp in filtered)
    assert len(filtered) == 2

def test_rank_recommendations(engine):
    recs = [
        Recommendation(
            recommendation_id=uuid.UUID("66666666-6666-6666-6666-666666666666"),
            user_id=uuid.UUID("44444444-4444-4444-4444-444444444444"),
            confidence_score=0.8,
            market_score=0.7,
            peer_score=0.9,
            degree_program=engine.degree_programs[0],
            subject_score=0.0,
            semantic_score=0.0,
            explanation="",
            created_at=None,
            liked=False,
            algorithm_source=uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
            subject_requirements=[]
        ),
        Recommendation(
            recommendation_id=uuid.UUID("77777777-7777-7777-7777-777777777777"),
            user_id=uuid.UUID("44444444-4444-4444-4444-444444444444"),
            confidence_score=0.6,
            market_score=0.9,
            peer_score=0.8,
            degree_program=engine.degree_programs[1],
            subject_score=0.0,
            semantic_score=0.0,
            explanation="",
            created_at=None,
            liked=False,
            algorithm_source=uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
            subject_requirements=[]
        ),
    ]
    ranked = engine.rank_recommendations(recs)
    assert len(ranked) == 2
    assert ranked[0].confidence_score >= ranked[1].confidence_score or ranked[0].market_score >= ranked[1].market_score

def test_get_market_importance(engine, dummy_user):
    dummy_user.socioeconomic.income_level = 'low'
    assert engine.get_market_importance(dummy_user) == 1.5
    dummy_user.socioeconomic.income_level = 'high'
    assert engine.get_market_importance(dummy_user) == 0.5
    dummy_user.socioeconomic.income_level = 'medium'
    assert engine.get_market_importance(dummy_user) == 1

def test_get_content_importance(engine, dummy_user):
    user_id = dummy_user.user_id
    academic_data_id = dummy_user.academic_data.academic_data_id
    dummy_user.personal_interests = [PersonalInterest(user_id=user_id, interest="A") for _ in range(8)]
    dummy_user.academic_data.subject_grades = [SubjectGrade(academic_data_id=academic_data_id, subject_id=uuid.uuid4(), grade="A") for _ in range(3)]
    assert engine.get_content_importance(dummy_user) == 1.5
    dummy_user.personal_interests = []
    dummy_user.academic_data.subject_grades = [SubjectGrade(academic_data_id=academic_data_id, subject_id=uuid.uuid4(), grade="A")]
    assert engine.get_content_importance(dummy_user) == 0.5
    dummy_user.personal_interests = [PersonalInterest(user_id=user_id, interest="A") for _ in range(2)]
    dummy_user.academic_data.subject_grades = [SubjectGrade(academic_data_id=academic_data_id, subject_id=uuid.uuid4(), grade="A") for _ in range(2)]
    assert engine.get_content_importance(dummy_user) == 1