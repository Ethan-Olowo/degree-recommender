from sqlalchemy import Column, String, Float, Boolean, ForeignKey, Text, Date, TIMESTAMP, VARCHAR
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from database.db import Base
import uuid

class User(Base):
    __tablename__ = "users"
    user_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name = Column(String(100), nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    auth_id = Column(UUID(as_uuid=True), nullable=False)
    profiles = relationship("StudentProfile", back_populates="user")

class Country(Base):
    __tablename__ = "countries"
    country_code = Column(String(10), primary_key=True)
    country_name = Column(String(100), nullable=False)

class Subject(Base):
    __tablename__ = "subjects"
    subject_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subject_name = Column(String(100), nullable=False)

class AcademicData(Base):
    __tablename__ = "academic_data"
    academic_data_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    gpa = Column(Float)
    grade_system = Column(String(50))
    school_type = Column(String(50))
    subject_grades = relationship("SubjectGrade", back_populates="academic_data")

class SubjectGrade(Base):
    __tablename__ = "subject_grades"
    academic_data_id = Column(UUID(as_uuid=True), ForeignKey("academic_data.academic_data_id", ondelete="CASCADE"), primary_key=True)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.subject_id", ondelete="CASCADE"), primary_key=True)
    grade = Column(String(10))
    academic_data = relationship("AcademicData", back_populates="subject_grades")
    subject = relationship("Subject")

class StudentProfile(Base):
    __tablename__ = "student_profiles"
    profile_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    academic_data_id = Column(UUID(as_uuid=True), ForeignKey("academic_data.academic_data_id", ondelete="SET NULL"))
    user = relationship("User", back_populates="profiles")
    academic_data = relationship("AcademicData")
    personal_interests = relationship("PersonalInterest", back_populates="profile")
    socioeconomic = relationship("SocioeconomicIndicator", back_populates="profile", uselist=False)
    recommendations = relationship("Recommendation", back_populates="profile")

class PersonalInterest(Base):
    __tablename__ = "personal_interests"
    profile_id = Column(UUID(as_uuid=True), ForeignKey("student_profiles.profile_id", ondelete="CASCADE"), primary_key=True)
    interest = Column(String(100), primary_key=True)
    profile = relationship("StudentProfile", back_populates="personal_interests")

class SocioeconomicIndicator(Base):
    __tablename__ = "socioeconomic_indicators"
    profile_id = Column(UUID(as_uuid=True), ForeignKey("student_profiles.profile_id", ondelete="CASCADE"), primary_key=True)
    country_code = Column(String(10), ForeignKey("countries.country_code"))
    income_level = Column(String(20))
    gender = Column(String(20))
    school_type = Column(String(50))
    profile = relationship("StudentProfile", back_populates="socioeconomic")
    country = relationship("Country")

class Industry(Base):
    __tablename__ = "industries"
    industry_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    industry_name = Column(String(100), nullable=False)

class DegreeProgram(Base):
    __tablename__ = "degree_programs"
    program_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    program_name = Column(String(100), nullable=False)
    program_type = Column(String(50))
    description = Column(Text)
    minimum_gpa = Column(Float)
    subject_requirements = relationship("SubjectRequirement", back_populates="degree_program")
    degree_industries = relationship("DegreeIndustry", back_populates="degree_program")
    recommendations = relationship("Recommendation", back_populates="degree_program")

class SubjectRequirement(Base):
    __tablename__ = "subject_requirements"
    program_id = Column(UUID(as_uuid=True), ForeignKey("degree_programs.program_id", ondelete="CASCADE"), primary_key=True)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.subject_id", ondelete="CASCADE"), primary_key=True)
    requirement_detail = Column(String(50))
    degree_program = relationship("DegreeProgram", back_populates="subject_requirements")
    subject = relationship("Subject")

class DegreeIndustry(Base):
    __tablename__ = "degree_industries"
    program_id = Column(UUID(as_uuid=True), ForeignKey("degree_programs.program_id", ondelete="CASCADE"), primary_key=True)
    industry_id = Column(UUID(as_uuid=True), ForeignKey("industries.industry_id", ondelete="CASCADE"), primary_key=True)
    degree_program = relationship("DegreeProgram", back_populates="degree_industries")
    industry = relationship("Industry")

class IndicatorType(Base):
    __tablename__ = "indicator_types"
    indicator_type_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    indicator_name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    unit = Column(String(50))

class MarketIndicatorValue(Base):
    __tablename__ = "market_indicator_values"
    value_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    indicator_type_id = Column(UUID(as_uuid=True), ForeignKey("indicator_types.indicator_type_id", ondelete="CASCADE"))
    value = Column(Float)
    last_updated = Column(Date)
    country_code = Column(String(10), ForeignKey("countries.country_code"))
    industry_id = Column(UUID(as_uuid=True), ForeignKey("industries.industry_id"))
    indicator_type = relationship("IndicatorType")
    country = relationship("Country")
    industry = relationship("Industry")

class Recommendation(Base):
    __tablename__ = "recommendations"
    recommendation_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    profile_id = Column(UUID(as_uuid=True), ForeignKey("student_profiles.profile_id", ondelete="CASCADE"))
    program_id = Column(UUID(as_uuid=True), ForeignKey("degree_programs.program_id", ondelete="CASCADE"))
    confidence_score = Column(Float)
    algorithm_source = Column(String(100))
    explanation = Column(Text)
    market_score = Column(Float)
    profile = relationship("StudentProfile", back_populates="recommendations")
    degree_program = relationship("DegreeProgram", back_populates="recommendations")

class Report(Base):
    __tablename__ = "reports"
    report_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    generated_at = Column(TIMESTAMP, default="now()")
    recommendation_stats = Column(Text)
