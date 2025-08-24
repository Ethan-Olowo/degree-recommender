from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uuid

# Degree Program
class DegreeProgramBase(BaseModel):
    program_name: str
    program_type: str
    description: Optional[str] = None
    minimum_gpa: Optional[float] = None

class DegreeProgramCreate(DegreeProgramBase):
    industries: List[str]
    required_subjects: List[str]

class DegreeProgram(DegreeProgramBase):
    program_id: uuid.UUID
    industries: Optional[List[str]] = []
    required_subjects: Optional[List[str]] = []

    class Config:
        from_attributes = True

# Recommendation
class RecommendationBase(BaseModel):
    program_id: uuid.UUID
    confidence_score: float
    algorithm_source: str
    market_score: float

class RecommendationCreate(RecommendationBase):
    explanation: Optional[str] = None

class Recommendation(RecommendationBase):
    recommendation_id: uuid.UUID
    profile_id: uuid.UUID
    explanation: Optional[str] = None

    class Config:
        from_attributes = True

# Student Profile
class StudentProfileBase(BaseModel):
    academic_data_id: Optional[uuid.UUID] = None
    personal_interests: Optional[List[str]] = []
    socioeconomic: Optional[Dict[str, Any]] = None

class StudentProfileCreate(StudentProfileBase):
    personal_interests: List[str]

class StudentProfile(StudentProfileBase):
    profile_id: uuid.UUID
    user_id: uuid.UUID
    recommendations: Optional[List[Recommendation]] = []

    class Config:
        from_attributes = True

# User
class UserBase(BaseModel):
    full_name: str
    is_admin: bool = False
    auth_id: uuid.UUID

class UserCreate(UserBase):
    pass

class User(UserBase):
    user_id: uuid.UUID
    profiles: Optional[List[StudentProfile]] = []

    class Config:
        from_attributes = True
