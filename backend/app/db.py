from sqlalchemy import create_engine, Column, Integer, String, MetaData, Table,Text,UniqueConstraint
from databases import Database
import os
from dotenv import load_dotenv
from sqlalchemy.orm import sessionmaker


load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

metadata = MetaData()

jobs = Table(
    "jobs",
    metadata,
    Column('id', Integer, primary_key=True, autoincrement=True),
    Column('job_id', Integer, index=True),
    Column('user_id', Integer, index=True),
    Column('user_name', String),
    Column('recording', String),
    Column('transcript', Text),  # Storing transcript
    Column('analysis', Text),  # Storing analysis results as a JSON string
    UniqueConstraint('job_id', 'user_id', name='uix_job_user')  # Ensuring unique combination of job_id and user_id
)

engine = create_engine(DATABASE_URL)
metadata.create_all(engine)
SessionLocal = sessionmaker(bind=engine)

database = Database(DATABASE_URL)
