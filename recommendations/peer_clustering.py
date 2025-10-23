import os
import joblib
import xgboost as xgb
import numpy as np
import pandas as pd
from sklearn.preprocessing import OrdinalEncoder
from models import User
from recommendations.grades_helper import get_grade


class PeerClustering:
    def __init__(self, model_dir=None):
        if model_dir is None:
            model_dir = os.path.join(os.path.dirname(__file__), "models")
        self.model_dir = model_dir
        self.scaler = joblib.load(os.path.join(model_dir, "scaler.joblib"))
        self.ordinal_encoder = joblib.load(os.path.join(model_dir, "ordinal_encoder.joblib"))
        self.label_encoder = joblib.load(os.path.join(model_dir, "label_encoder.joblib"))
        self.selected_features = joblib.load(os.path.join(model_dir, "selected_features.joblib"))
        self.xgb_model = joblib.load(os.path.join(model_dir, "xgb_tuned_model.joblib"))

    def recommend(self, user: User):
        """
        User: User Profile
        Returns: list of top 5 category dicts (id, score, category)
        """
        # Convert user to DataFrame
        user_dict = self._user_to_dict(user)
        df = pd.DataFrame([user_dict])

        # Ordinal encode categorical columns
        cols_to_encode = [col for col in ["fefs", "fems", "gender"] if col in df.columns]
        if cols_to_encode:
            df[cols_to_encode] = self.ordinal_encoder.transform(df[cols_to_encode])

        # Drop columns not used during training
        for col in ["degree.focus", "degree"]:
            if col in df.columns:
                df = df.drop(columns=[col])
        
        # Scale numerical features
        df_scaled = self.scaler.transform(df)

        # Select only the features used for training
        if isinstance(df_scaled, np.ndarray):
            # If df_scaled is numpy array, select columns by index
            feature_indices = [df.columns.get_loc(f) for f in self.selected_features]
            df_scaled = df_scaled[:, feature_indices]
        else:
            # If scaler returns DataFrame, select columns by name
            df_scaled = df_scaled[self.selected_features]

        # Predict using XGBoost (scikit-learn API expects array/DataFrame, not DMatrix)
        predictions_proba = self.xgb_model.predict(df_scaled)
        top_k_idx = np.argsort(predictions_proba)[-5:][::-1]
        label_classes = self.label_encoder.classes_ if hasattr(self.label_encoder, "classes_") else self.label_encoder
        categories = []
        for idx in top_k_idx:
            cat_name = label_classes[idx] if idx < len(label_classes) else str(idx)
            score = float(predictions_proba[idx])
            item = {
                'id': int(idx),
                'score': score,
                'category': cat_name
            }
            print(item)
            categories.append(item)
        return categories
    
    
    
    def _user_to_dict(self, user: User):
        """
        Convert User object to dict for DataFrame construction.
        Maps user fields to expected model input for recommendation.
        """
        subject_grades = user.academic_data.subject_grades if user.academic_data and user.academic_data.subject_grades else []
        gender = getattr(user.socioeconomic, "gender", "") if user.socioeconomic else ""
        if gender.lower() == "male":
            gender_val = "M"
        elif gender.lower() == "female":
            gender_val = "F"
        else:
            gender_val = ""
        fems_val = getattr(user.socioeconomic, "mother_education", "Does not know") if user.socioeconomic else "Does not know"
        fefs_val = getattr(user.socioeconomic, "father_education", "Does not know") if user.socioeconomic else "Does not know"
        funding_method = getattr(user.socioeconomic, "funding_method", "self") if user.socioeconomic else "self"
        t_cred = 1 if funding_method == "credit" else 0
        t_parents = 1 if funding_method == "parents" else 0
        t_own = 1 if funding_method == "self" else 0

        data = {
            'ENG.HS': get_grade(subject_grades, "English"),
            'SC.HS': get_grade(subject_grades, "Science"),
            'MATH.HS': get_grade(subject_grades, "Math"),
            'CR.HS': get_grade(subject_grades, "Literature"),
            'NS.HS': get_grade(subject_grades, "History"),
            'degree': "",
            'degree.focus': "",
            'gender': gender_val,
            'fems': fems_val,
            'fefs': fefs_val,
            'int.s': 1.0,
            'comp.s': 0.0,
            'wasm.s': 1.0,
            'car.s': 0.0,
            't.cred': t_cred,
            't.parents': t_parents,
            't.own': t_own
        }
        return data
