from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv
load_dotenv()

# Load Supabase credentials from environment variables
# SUPABASE_URL = os.getenv("SUPABASE_URL")
# SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Supabase uses PostgreSQL; connection string format:
# postgresql://<user>:<password>@<host>:<port>/<database>
# You may need to parse SUPABASE_URL to get these details.
# For example, if using the connection string directly:
SQLALCHEMY_DATABASE_URL = os.getenv("SUPABASE_DB_URL")  # Set this in your .env

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()