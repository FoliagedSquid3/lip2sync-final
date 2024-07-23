from fastapi import APIRouter, File,Form, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import ffmpeg
import os
from dotenv import load_dotenv
from db import database, jobs
from datetime import datetime
import speech_recognition as sr
from pydub import AudioSegment
import openai
import base64
from pathlib import Path
import shutil
from .routes import get_job_details_endpoint
from celery import shared_task
from requests import get
import asyncio
import json
from sqlalchemy.sql import select
from db import SessionLocal, jobs
import whisper
import torch

load_dotenv()

router = APIRouter()



# Ensure the upload folder exists
RECORDING_DIR = os.getenv('RECORDING_DIR')
os.makedirs(RECORDING_DIR, exist_ok=True)

@shared_task
def process_video(file_location, job_id, user_id, output_filename,user_name):
    output_filename = file_location.replace('.webm', '.mp4')
    print('in queue')
    try:
        ffmpeg.input(file_location).output(output_filename, vcodec='libx264', acodec='aac', strict='experimental').run(overwrite_output=True)
        os.remove(file_location)  # Remove the original .webm file after conversion
    except Exception as e:
        print('Error converting file:', e)

    loop = asyncio.get_event_loop()
    print('loop',loop)
    if loop.is_closed():
        print("Event loop is closed, creating a new one")
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
 
    job_details = loop.run_until_complete(get_job_details_endpoint(job_id, user_id))
    questions = job_details['questions']

    filename = f"{job_id}_{user_id}.mp4"
    file_path = Path(RECORDING_DIR) / filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Recording file not found.")

    public_file_path = copy_to_public(filename)
    public_url = f"{os.getenv('FRONTEND_BASE_URL')}/media/{filename}"

    # Assuming transcription and analysis functions are defined elsewhere
    transcript = transcribe_audio(file_path)
    analysis = analyze_answers(transcript,questions)
    print('transcript',transcript)
    print('analysis',analysis)
    print('job id',job_id)
    print('user id',user_id)
    print('recording',output_filename)

    db = SessionLocal()
    query = jobs.insert().values(
        job_id=job_id,
        user_id=user_id,
        user_name=user_name,
        recording=output_filename,
        transcript=transcript,
        analysis=json.dumps(analysis)  # Assuming analysis is a dictionary
    )

    print("Preparing to insert data into the database.")
    try:
        db.execute(query)
        db.commit()
        print("Data inserted successfully.")
    except Exception as e:
        print("Exception during database operation:", e)
        db.rollback()  # Rollback in case of an issue
        print("Exception during database operation:", e)
    finally:
        db.close()  # Close the session

    api_url = f"https://app.timetomeet.ai/fetch-meeting/{job_id}/{user_id}"
    print('api_url',api_url)
    try:
        response = get(api_url)
        print('response',response)
        response.raise_for_status()  # will raise an exception for HTTP error codes
    except Exception as e:
        print(f"Failed to notify API: {e}")
        return {"message": f"Failed to notify API: {e}", "status": "failed"}

    return {
            "message": "File converted and saved successfully",
            "file_path": output_filename,
        }
    # return JSONResponse(content={"message": "File converted and saved successfully", "file_path": output_filename}, status_code=200)


@router.post("/upload")
async def upload_video(file: UploadFile = File(...), job_id: int = Form(...), user_id: int = Form(...), user_name: str = Form(...)):
    try:
        # Create a unique filename and save the file temporarily
        filename = f"{job_id}_{user_id}.webm"
        file_location = os.path.join(RECORDING_DIR, filename)
        with open(file_location, "wb+") as file_object:
            file_object.write(await file.read())

        # Dispatch the video processing task
        print('going to run queue')
        task = process_video.delay(file_location, job_id, user_id, filename, user_name)
        return JSONResponse(content={"message": "Upload received, processing started", "task_id": task.id}, status_code=202)

    except Exception as e:
        return JSONResponse(content={"message": str(e)}, status_code=500)

def convert_to_wav(file_path):
    """Converts an MP4 file to WAV format."""
    # Ensure file_path is a Path object
    file_path = Path(file_path)
    
    # Construct new path with WAV extension
    wav_path = file_path.with_suffix('.wav')
    
    # Convert file using pydub
    audio = AudioSegment.from_file(file_path, format="mp4")
    audio.export(wav_path, format="wav")
    
    return wav_path

def get_base64_encoded_audio(audio_path):
    """Encodes the audio file to a Base64 string."""
    with open(audio_path, "rb") as audio_file:
        audio_content = audio_file.read()
    return base64.b64encode(audio_content).decode('utf-8')

def transcribe_audio(file_path):
    """Transcribes audio from a given file path."""
    # Convert file_path to a Path object if it's not already one
    file_path = Path(file_path)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    model = whisper.load_model('large', device = device)


    if file_path.suffix == ".mp4":
        file_path = convert_to_wav(file_path)  # Convert MP4 to WAV before transcription

    recognizer = sr.Recognizer()
    with sr.AudioFile(str(file_path)) as source:  # sr.AudioFile expects a string path
        audio_data = recognizer.record(source)

    result = model.transcribe(str(file_path))

    transcript = result["text"]
    return transcript


def analyze_answers(transcript, questions):
    """Analyzes each answer by directly extracting from the transcript and assigns a score based on its relevance to the corresponding question using OpenAI API."""
    openai_api_key = os.getenv('OPENAI_KEY')
    openai.api_key = openai_api_key
    results = []
    
    for question in questions:
        try:
            # Adjusted prompt to emphasize direct extraction from the transcript without additional interpretation
            prompt = f"Transcript: \"{transcript}\"\nQuestion: \"{question}\"\nExtract the answer directly from the transcript if present and assign a relevance score from 0 to 100 based on direct match."
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": prompt}
                ],
                temperature=0.3,  # Lower temperature to encourage less creative responses
                max_tokens=250
            )
            full_response = response.choices[0].message['content'].strip()
            
            # Extract and assign score
            if "Relevance score:" in full_response:
                answer, score_part = full_response.split("Relevance score:")
                score = int(score_part.split()[0])
            else:
                answer = full_response if full_response else "No relevant answer found."
                score = 0
            
            results.append({'question': question, 'answer': answer, 'score': score})
        except Exception as e:
            results.append({'question': question, 'answer': f"Failed to analyze answer due to error: {str(e)}", 'score': 0})
    
    return results

PUBLIC_DIR = os.getenv('PUBLIC_DIR')  # Ensure this environment variable is set to your public folder path

def copy_to_public(filename: str) -> str:
    src_path = Path(RECORDING_DIR) / filename
    dest_path = Path(PUBLIC_DIR) / filename
    print('src path',src_path)
    print('dest path',dest_path)
    try:
        shutil.copyfile(src_path, dest_path)
        print(f"File copied from {src_path} to {dest_path}")
        
        # Verify file integrity
        if src_path.stat().st_size != dest_path.stat().st_size:
            raise HTTPException(status_code=500, detail="File size mismatch after copying")
            
    except Exception as e:
        print(f"Error copying file: {e}")
        raise HTTPException(status_code=500, detail="Error copying file to public directory")
    
    return str(dest_path)

frontend_base_url=os.getenv('FRONTEND_BASE_URL')

@router.get("/jobs/{job_id}/review/{user_id}")
async def review_recording(job_id: int, user_id: int):
    """Fetches and reviews a job interview recording, making it available in a public folder."""
    # Construct the select query using direct column references
    query = select(jobs.c.transcript, jobs.c.analysis).where(
            (jobs.c.job_id == job_id) & (jobs.c.user_id == user_id)
        )
    result = await database.fetch_one(query)
    transcript = result['transcript']
    analysis = json.loads(result['analysis'])  # Convert JSON string back to dictionary

    filename = f"{job_id}_{user_id}.mp4"
    print('filename',filename)
    # file_path = Path(RECORDING_DIR) / filename
    # print('filepath',file_path)
    # if not file_path.exists():
    #     raise HTTPException(status_code=404, detail="Recording file not found.")

    # public_file_path = copy_to_public(filename)
    frontend_base_url=os.getenv('FRONTEND_BASE_URL')
    print('frontend base url',frontend_base_url)
    public_url = f"{os.getenv('FRONTEND_BASE_URL')}/media/{filename}"
    print('public_url',public_url)
    return {
        "transcript": transcript,
        "analysis": analysis,
        "download_url": public_url
    }