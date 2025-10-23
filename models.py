from pydantic import BaseModel
from typing import List, Optional
import uuid
from datetime import datetime

# Subject
class Subject(BaseModel):
    subject_id: uuid.UUID
    subject_name: str

# SubjectRequirement
class SubjectRequirement(BaseModel):
    program_id: uuid.UUID
    subject_id: uuid.UUID
    requirement_detail: Optional[str] = None
    subject: Optional[Subject] = None

# Degree Program
class DegreeProgramBase(BaseModel):
    program_name: str
    program_type: Optional[str] = "Undergraduate"
    description: Optional[str] = None
    minimum_gpa: Optional[float] = None
    category: Optional[str] = None
    description_embedding: Optional[List[float]] = None


class DegreeProgram(DegreeProgramBase):
    program_id: uuid.UUID
    industries: Optional[List[str]] = []
    subject_requirements: Optional[List[SubjectRequirement]] = []
    class Config:
        from_attributes = True

# Recommendation
class RecommendationBase(BaseModel):
    program_id: uuid.UUID
    confidence_score: float
    market_score: float
    explanation: Optional[str] = None
    created_at: Optional[datetime] = None
    liked: Optional[bool] = False


class RecommendationCreate(RecommendationBase):
    # Explicitly define all fields required for creation
    user_id: uuid.UUID
    confidence_score: float
    market_score: float
    explanation: Optional[str] = None
    created_at: Optional[datetime] = None
    liked: Optional[bool] = False


class Recommendation(RecommendationBase):
    recommendation_id: uuid.UUID
    user_id: uuid.UUID
    degree_program: Optional[DegreeProgram] = None
    class Config:
        from_attributes = True

# SubjectGrade
class SubjectGrade(BaseModel):
    academic_data_id: uuid.UUID
    subject_id: uuid.UUID
    grade: Optional[str] = None
    subject: Optional[Subject] = None

# Academic Data
class AcademicDataBase(BaseModel):
    gpa: Optional[float] = None
    grade_system: Optional[str] = None
    school_type: Optional[str] = None
    user_id: uuid.UUID

class AcademicData(AcademicDataBase):
    academic_data_id: uuid.UUID
    subject_grades: Optional[List[SubjectGrade]] = []
    class Config:
        from_attributes = True


# Personal Interest
class PersonalInterest(BaseModel):
    user_id: uuid.UUID
    interest: str

# Socioeconomic Indicator
class SocioeconomicIndicator(BaseModel):
    user_id: uuid.UUID
    country_code: Optional[str] = None
    income_level: Optional[str] = None
    gender: Optional[str] = None
    school_type: Optional[str] = None
    father_education: Optional[str] = "Does not know"
    mother_education: Optional[str] = "Does not know"
    funding_method: Optional[str] = "self"

# User
class UserBase(BaseModel):
    full_name: Optional[str] = None
    is_admin: bool = False

class User(UserBase):
    user_id: uuid.UUID
    academic_data: Optional[AcademicData] = None
    personal_interests: Optional[List[PersonalInterest]] = []
    socioeconomic: Optional[SocioeconomicIndicator] = None
    recommendations: Optional[List[Recommendation]] = []
    subject_grades: Optional[List[SubjectGrade]] = []
    class Config:
        from_attributes = True
