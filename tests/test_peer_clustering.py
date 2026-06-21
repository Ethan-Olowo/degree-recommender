import pytest
from unittest.mock import MagicMock, patch
import uuid
import numpy as np
import pandas as pd
from recommendations.peer_clustering import PeerClustering
from models import User, AcademicData, SubjectGrade, SocioeconomicIndicator

@pytest.fixture(autouse=True)
def setup_peer_clustering(monkeypatch):
    # Patch joblib.load to return mock objects
    mock_joblib_load = MagicMock()
    mock_scaler = MagicMock()
    mock_scaler.transform.return_value = np.array([[1.0, 2.0, 3.0]])
    mock_ordinal_encoder = MagicMock()
    mock_ordinal_encoder.transform.return_value = np.array([[0, 1, 2]])
    mock_label_encoder = MagicMock()
    mock_label_encoder.inverse_transform = MagicMock(return_value=["cat5", "cat4", "cat3", "cat2", "cat1"])
    mock_selected_features = ["SC.HS", "ENG.HS", "CR.HS"]
    mock_xgb_model = MagicMock()
    mock_xgb_model.predict_proba.return_value = np.array([[0.1, 0.2, 0.3, 0.15, 0.25]])
    mock_joblib_load.side_effect = [
        mock_scaler,
        mock_ordinal_encoder,
        mock_label_encoder,
        mock_selected_features,
        mock_xgb_model
    ]
    monkeypatch.setattr("recommendations.peer_clustering.joblib.load", mock_joblib_load)
    return {
        "peer_clustering": PeerClustering()
    }

def create_mock_user():
    subject_grades = [SubjectGrade(academic_data_id=uuid.uuid4(), subject_id=uuid.uuid4(), grade='A', subject=None)]
    academic_data = AcademicData(academic_data_id=uuid.uuid4(), gpa=4.0, grade_system='A', school_type='Public', user_id=uuid.uuid4(), subject_grades=subject_grades)
    socioeconomic = SocioeconomicIndicator(user_id=uuid.uuid4(), gender='Male', mother_education='complete technical degree', father_education='complete technical degree', funding_method='self')
    user = User(user_id=uuid.uuid4(), academic_data=academic_data, socioeconomic=socioeconomic)
    return user

def create_mock_user_missing_fields():
    # User with missing academic_data and socioeconomic
    return User(user_id=uuid.uuid4(), academic_data=None, socioeconomic=None)

def create_mock_user_invalid_education():
    # User with invalid education levels
    subject_grades = [SubjectGrade(academic_data_id=uuid.uuid4(), subject_id=uuid.uuid4(), grade='A', subject=None)]
    academic_data = AcademicData(academic_data_id=uuid.uuid4(), gpa=4.0, grade_system='A', school_type='Public', user_id=uuid.uuid4(), subject_grades=subject_grades)
    socioeconomic = SocioeconomicIndicator(user_id=uuid.uuid4(), gender='Other', mother_education='unknown', father_education='unknown', funding_method='credit')
    user = User(user_id=uuid.uuid4(), academic_data=academic_data, socioeconomic=socioeconomic)
    return user

def create_mock_user_funding_parents():
    # User with funding method 'parents'
    subject_grades = [SubjectGrade(academic_data_id=uuid.uuid4(), subject_id=uuid.uuid4(), grade='A', subject=None)]
    academic_data = AcademicData(academic_data_id=uuid.uuid4(), gpa=4.0, grade_system='A', school_type='Public', user_id=uuid.uuid4(), subject_grades=subject_grades)
    socioeconomic = SocioeconomicIndicator(user_id=uuid.uuid4(), gender='Female', mother_education='complete secondary school', father_education='complete secondary school', funding_method='parents')
    user = User(user_id=uuid.uuid4(), academic_data=academic_data, socioeconomic=socioeconomic)
    return user

def test_user_to_dict_missing_fields(setup_peer_clustering):
    peer_clustering = setup_peer_clustering["peer_clustering"]
    user = create_mock_user_missing_fields()
    result = peer_clustering._user_to_dict(user)
    assert isinstance(result, dict)
    # Should default to 'M' for gender and 'does not know' for education
    assert result['gender'] == 'M'
    assert result['fems'] == 'does not know'
    assert result['fefs'] == 'does not know'
    assert result['t.own'] == 1

def test_user_to_dict_invalid_education(setup_peer_clustering):
    peer_clustering = setup_peer_clustering["peer_clustering"]
    user = create_mock_user_invalid_education()
    result = peer_clustering._user_to_dict(user)
    assert result['gender'] == 'M'  # Defaults to 'M' for unknown gender
    assert result['fems'] == 'does not know'
    assert result['fefs'] == 'does not know'
    assert result['t.cred'] == 1
    assert result['t.parents'] == 0
    assert result['t.own'] == 0

def test_user_to_dict_funding_parents(setup_peer_clustering):
    peer_clustering = setup_peer_clustering["peer_clustering"]
    user = create_mock_user_funding_parents()
    result = peer_clustering._user_to_dict(user)
    assert result['gender'] == 'F'
    assert result['t.parents'] == 1
    assert result['t.cred'] == 0
    assert result['t.own'] == 0
    

def test_recommend_missing_fields(setup_peer_clustering):
    peer_clustering = setup_peer_clustering["peer_clustering"]
    user = create_mock_user_missing_fields()
    result = peer_clustering.recommend(user)
    assert isinstance(result, list)
    assert all('score' in item and 'category' in item for item in result)
    assert len(result) == 5

def test_recommend_invalid_education(setup_peer_clustering):
    peer_clustering = setup_peer_clustering["peer_clustering"]
    user = create_mock_user_invalid_education()
    result = peer_clustering.recommend(user)
    assert isinstance(result, list)
    assert all('score' in item and 'category' in item for item in result)
    assert len(result) == 5

def test_recommend_funding_parents(setup_peer_clustering):
    peer_clustering = setup_peer_clustering["peer_clustering"]
    user = create_mock_user_funding_parents()
    result = peer_clustering.recommend(user)
    assert isinstance(result, list)
    assert all('score' in item and 'category' in item for item in result)
    assert len(result) == 5

