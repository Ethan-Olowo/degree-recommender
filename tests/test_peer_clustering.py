import unittest
from unittest.mock import MagicMock, patch
import uuid
import numpy as np
import pandas as pd
from recommendations.peer_clustering import PeerClustering
from models import User, AcademicData, SubjectGrade, SocioeconomicIndicator

class TestPeerClustering(unittest.TestCase):
    def setUp(self):
        # Patch joblib.load to return mock objects
        patcher_joblib = patch('recommendations.peer_clustering.joblib.load')
        self.mock_joblib_load = patcher_joblib.start()
        self.addCleanup(patcher_joblib.stop)
        # Mock scaler, encoder, selected_features, xgb_model
        self.mock_scaler = MagicMock()
        self.mock_scaler.transform.return_value = np.array([[1, 2, 3]])
        self.mock_ordinal_encoder = MagicMock()
        self.mock_ordinal_encoder.transform.return_value = np.array([[0, 1, 2]])
        self.mock_label_encoder = MagicMock()
        self.mock_label_encoder.classes_ = ['cat1', 'cat2', 'cat3']
        self.mock_selected_features = ['SC.HS', 'ENG.HS', 'CR.HS']
        self.mock_xgb_model = MagicMock()
        self.mock_xgb_model.predict.return_value = np.array([0.1, 0.5, 0.4])
        self.mock_joblib_load.side_effect = [
            self.mock_scaler,
            self.mock_ordinal_encoder,
            self.mock_label_encoder,
            self.mock_selected_features,
            self.mock_xgb_model
        ]
        # Patch xgb.DMatrix to just return the input
        patcher_xgb = patch('recommendations.peer_clustering.xgb.DMatrix', side_effect=lambda x: x)
        self.mock_xgb_dmatrix = patcher_xgb.start()
        self.addCleanup(patcher_xgb.stop)
        self.peer_clustering = PeerClustering(model_dir='dummy_dir')

    def test_user_to_dict(self):
        # Create mock user
        subject_grades = [SubjectGrade(academic_data_id=uuid.uuid4(), subject_id=uuid.uuid4(), grade='A', subject=None)]
        academic_data = AcademicData(academic_data_id=uuid.uuid4(), gpa=4.0, grade_system='A', school_type='Public', user_id=uuid.uuid4(), subject_grades=subject_grades)
        socioeconomic = SocioeconomicIndicator(user_id=uuid.uuid4(), gender='Male', mother_education='College', father_education='High School', funding_method='self')
        user = User(user_id=uuid.uuid4(), academic_data=academic_data, socioeconomic=socioeconomic)
        result = self.peer_clustering._user_to_dict(user)
        self.assertIsInstance(result, dict)
        self.assertIn('SC.HS', result)
        self.assertEqual(result['gender'], 'Male')
        self.assertEqual(result['fems'], 'College')
        self.assertEqual(result['fefs'], 'High School')
        self.assertEqual(result['t.own'], 1)

    def test_recommend(self):
        # Create mock user
        subject_grades = [SubjectGrade(academic_data_id=uuid.uuid4(), subject_id=uuid.uuid4(), grade='A', subject=None)]
        academic_data = AcademicData(academic_data_id=uuid.uuid4(), gpa=4.0, grade_system='A', school_type='Public', user_id=uuid.uuid4(), subject_grades=subject_grades)
        socioeconomic = SocioeconomicIndicator(user_id=uuid.uuid4(), gender='Male', mother_education='College', father_education='High School', funding_method='self')
        user = User(user_id=uuid.uuid4(), academic_data=academic_data, socioeconomic=socioeconomic)
        result = self.peer_clustering.recommend(user)
        self.assertIsInstance(result, list)
        self.assertTrue(all('id' in item and 'score' in item and 'category' in item for item in result))
        self.assertEqual(len(result), 3)  # Because mock_xgb_model returns 3 classes

if __name__ == '__main__':
    unittest.main()
