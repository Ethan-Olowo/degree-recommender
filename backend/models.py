# --- Market Indicator Models ---
from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional, Union
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
    program_type: str = "Undergraduate"
    description: Optional[str] = None
    minimum_gpa: Optional[float] = None
    category: Optional[str] = None
    description_embedding: Optional[str] = None


class DegreeProgram(DegreeProgramBase):
    program_id: uuid.UUID
    industries: Optional[List[str]] = []
    subject_requirements: Optional[List[SubjectRequirement]] = []
    model_config = ConfigDict(from_attributes=True)

# Recommendation
class RecommendationBase(BaseModel):
    program_id: Optional[uuid.UUID] = None
    confidence_score: Optional[float] = None
    market_score: Optional[float] = None
    explanation: Optional[str] = None
    created_at: Optional[datetime] = None
    liked: Optional[bool] = False
    algorithm_source: Optional[uuid.UUID] = None
    semantic_score: Optional[float] = None
    subject_score: Optional[float] = None
    peer_score: Optional[float] = None
    model_config = ConfigDict(from_attributes=True)

class RecommendationCreate(RecommendationBase):
    user_id: uuid.UUID


class Recommendation(RecommendationBase):
    recommendation_id: uuid.UUID
    user_id: uuid.UUID
    degree_program: Optional[DegreeProgram] = None
    model_config = ConfigDict(from_attributes=True)

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
    model_config = ConfigDict(from_attributes=True)


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
    model_config = ConfigDict(from_attributes=True)
    

class MarketIndicatorRequest(BaseModel):
    years: list[int]
    country_codes: list[str]

class MarketIndicatorValueResponse(BaseModel):
    indicator_name: str
    country_code: str
    value: float
    year: int

# Chat History Message
class ChatMessage(BaseModel):
    role: str  # e.g., 'system', 'user', 'assistant'
    content: str

# Chat Request
class ChatRequest(BaseModel):
    chatHistory: Optional[List[ChatMessage]] = Field(default_factory=list)
    recommendation_id: Optional[str] = None
    newMessage: str

# Chat Response
class ChatResponse(BaseModel):
    reply: str

# Error Response
class ErrorResponse(BaseModel):
    error: str
