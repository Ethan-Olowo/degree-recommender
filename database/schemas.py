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
    personal_interests = relationship("PersonalInterest", back_populates="user")
    socioeconomic = relationship("SocioeconomicIndicator", back_populates="user", uselist=False)
    recommendations = relationship("Recommendation", back_populates="user")
    academic_data = relationship("AcademicData", backref="user", uselist=False)

class CategoryConfidence(Base):
    __tablename__ = "category_confidence"
    prediction_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(TIMESTAMP, nullable=False)
    predicted_category = Column(Text, nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    prediction_confidence = Column(Float, nullable=False)

class Country(Base):
    __tablename__ = "countries"
    country_code = Column(String(10), primary_key=True)
    country_name = Column(String(100), nullable=False)

class Subject(Base):
    __tablename__ = "subjects"
    subject_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subject_name = Column(String(100), nullable=False)
    embedding = Column(String(3000))  # 384-dim embedding as comma-separated string

class AcademicData(Base):
    __tablename__ = "academic_data"
    academic_data_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    gpa = Column(Float)
    grade_system = Column(String(50))
    school_type = Column(String(50))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    subject_grades = relationship("SubjectGrade", back_populates="academic_data")

class SubjectGrade(Base):
    __tablename__ = "subject_grades"
    academic_data_id = Column(UUID(as_uuid=True), ForeignKey("academic_data.academic_data_id", ondelete="CASCADE"), primary_key=True)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.subject_id", ondelete="CASCADE"), primary_key=True)
    grade = Column(String(10))
    academic_data = relationship("AcademicData", back_populates="subject_grades")
    subject = relationship("Subject")


class PersonalInterest(Base):
    __tablename__ = "personal_interests"
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True)
    interest = Column(String(100), primary_key=True)
    embedding = Column(String(3000))  # 384-dim embedding as comma-separated string
    user = relationship("User", back_populates="personal_interests")

class SocioeconomicIndicator(Base):
    __tablename__ = "socioeconomic_indicators"
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True)
    country_code = Column(String(10), ForeignKey("countries.country_code"))
    income_level = Column(String(20))
    gender = Column(String(20))
    school_type = Column(String(50))
    father_education = Column(Text, default="Does not know")
    mother_education = Column(Text, default="Does not know")
    funding_method = Column(String(50), default="self")
    user = relationship("User", back_populates="socioeconomic")
    country = relationship("Country")

class Industry(Base):
    __tablename__ = "industries"
    industry_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    industry_name = Column(String(100), nullable=False)
    embedding = Column(String(3000))  # 384-dim embedding as comma-separated string

class DegreeProgram(Base):
    __tablename__ = "degree_programs"
    program_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    program_name = Column(String(100), nullable=False)
    program_type = Column(String(50))
    description = Column(Text)
    description_embedding = Column(String(3000))  # 384-dim embedding as comma-separated string
    minimum_gpa = Column(Float)
    category = Column(String(50))
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
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    program_id = Column(UUID(as_uuid=True), ForeignKey("degree_programs.program_id", ondelete="CASCADE"))
    confidence_score = Column(Float)
    explanation = Column(Text)
    market_score = Column(Float)
    created_at = Column(TIMESTAMP, nullable=False)
    liked = Column(Boolean, default=False, nullable=False)
    user = relationship("User", back_populates="recommendations")
    degree_program = relationship("DegreeProgram", back_populates="recommendations")

class Report(Base):
    __tablename__ = "reports"
    report_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    generated_at = Column(TIMESTAMP, default="now()")
    recommendation_stats = Column(Text)
