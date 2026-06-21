from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool # <--- IMPORT THIS
import os
from dotenv import load_dotenv

load_dotenv()

SQLALCHEMY_DATABASE_URL = os.getenv("SUPABASE_DB_URL") 

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    poolclass=NullPool # <--- ADD THIS
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()