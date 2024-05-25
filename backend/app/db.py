from sqlalchemy import create_engine, Column, Integer, String, MetaData, Table
from databases import Database
import os
from dotenv import load_dotenv


load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

metadata = MetaData()

jobs = Table(
    "jobs",
    metadata,
    Column('id', Integer, primary_key=True, autoincrement=True),
    Column('job_id', Integer, index=True),
    Column('name', String),
    Column('recording', String)
)

engine = create_engine(DATABASE_URL)
metadata.create_all(engine)

database = Database(DATABASE_URL)
