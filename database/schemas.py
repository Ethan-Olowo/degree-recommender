from sqlalchemy import Column, String, Float, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from database.db import Base

class Student(Base):
    __tablename__ = "Student"
    studentId = Column(String, primary_key=True, index=True)
    firstName = Column(String)
    lastName = Column(String)
    email = Column(String, unique=True, index=True)
    password = Column(String)

    profile = relationship("StudentProfile", back_populates="student", uselist=False)

class StudentProfile(Base):
    __tablename__ = "StudentProfile"
    profileId = Column(String, primary_key=True, index=True)
    studentId = Column(String, ForeignKey("Student.studentId"))
    academicPerformance = Column(JSON) # e.g., {"gpa": 3.8, "grades": {...}}
    careerPreferences = Column(JSON)
    extracurricularActivities = Column(JSON)
    personalInterests = Column(JSON)
    socioeconomicIndicators = Column(JSON)

    student = relationship("Student", back_populates="profile")
    recommendations = relationship("Recommendation", back_populates="profile")


class DegreeProgram(Base):
    __tablename__ = "DegreeProgram"
    programId = Column(String, primary_key=True, index=True)
    programName = Column(String)
    programType = Column(String)
    description = Column(Text)
    industries = Column(JSON) # Storing list as JSON
    minimumGPA = Column(Float)
    requiredSubjects = Column(JSON) # Storing list as JSON

class Recommendation(Base):
    __tablename__ = "Recommendation"
    recommendationId = Column(String, primary_key=True, index=True)
    profileId = Column(String, ForeignKey("StudentProfile.profileId"))
    degreeProgramId = Column(String, ForeignKey("DegreeProgram.programId"))
    confidenceScore = Column(Float)
    algorithmSource = Column(String)
    explanation = Column(Text, nullable=True)
    marketScore = Column(Float)

    profile = relationship("StudentProfile", back_populates="recommendations")
    degree_program = relationship("DegreeProgram")
