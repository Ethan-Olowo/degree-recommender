from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any

# Base models for DegreeProgram
class DegreeProgramBase(BaseModel):
    programName: str
    programType: str
    description: Optional[str] = None
    industries: List[str]
    minimumGPA: float
    requiredSubjects: List[str]

class DegreeProgramCreate(DegreeProgramBase):
    pass

class DegreeProgram(DegreeProgramBase):
    programId: str

    class Config:
        orm_mode = True

# Base models for Recommendation
class RecommendationBase(BaseModel):
    degreeProgramId: str
    confidenceScore: float
    algorithmSource: str
    marketScore: float

class RecommendationCreate(RecommendationBase):
    pass

class Recommendation(RecommendationBase):
    recommendationId: str
    profileId: str
    explanation: Optional[str] = None

    class Config:
        orm_mode = True

# Base models for StudentProfile
class StudentProfileBase(BaseModel):
    academicPerformance: Dict[str, Any]
    careerPreferences: Dict[str, Any]
    extracurricularActivities: List[str]
    personalInterests: List[str]
    socioeconomicIndicators: Dict[str, Any]

class StudentProfileCreate(StudentProfileBase):
    pass

class StudentProfile(StudentProfileBase):
    profileId: str
    studentId: str
    recommendations: List[Recommendation] = []

    class Config:
        orm_mode = True

# Base models for Student
class StudentBase(BaseModel):
    firstName: str
    lastName: str
    email: EmailStr

class StudentCreate(StudentBase):
    password: str

class Student(StudentBase):
    studentId: str
    profile: Optional[StudentProfile] = None

    class Config:
        orm_mode = True

