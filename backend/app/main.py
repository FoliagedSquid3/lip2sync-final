from fastapi import FastAPI
from api.routes import router as job_router
from api.recording_upload import router as upload_router
from db import database, engine, metadata
from fastapi.middleware.cors import CORSMiddleware

metadata.create_all(engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React app's URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(job_router)
app.include_router(upload_router)