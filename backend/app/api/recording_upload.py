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

load_dotenv()

router = APIRouter()

# Ensure the upload folder exists
RECORDING_DIR = os.getenv('RECORDING_DIR')
os.makedirs(RECORDING_DIR, exist_ok=True)

@router.post("/upload")
async def upload_video(file: UploadFile = File(...), job_id: int = Form(...), user_id: str = Form(...),  user_name: str = Form(...)):
    try:
        print(job_id)
        # Create a unique filename
        #timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        #original_filename = file.filename
        filename = f"{job_id}_{user_id}.webm"
        # Save the file with the new unique filename
        file_location = os.path.join(RECORDING_DIR, filename)
        with open(file_location, "wb+") as file_object:
            file_object.write(await file.read())

        # Convert to MP4 and overwrite the original file
        output_filename = file_location.replace('.webm', '.mp4')
        try:
            ffmpeg.input(file_location).output(output_filename, vcodec='libx264', acodec='aac', strict='experimental').run(overwrite_output=True)
            os.remove(file_location)  # Remove the original .webm file after conversion
        except Exception as e:
            print('Error converting file:', e)

        # Save details to the database
        query = jobs.insert().values(
            job_id=int(job_id),
            user_id=int(user_id),
            user_name=user_name,
            recording=output_filename
        )
        await database.execute(query)

        return JSONResponse(content={"message": "File converted and saved successfully", "file_path": output_filename}, status_code=200)

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

    if file_path.suffix == ".mp4":
        file_path = convert_to_wav(file_path)  # Convert MP4 to WAV before transcription

    recognizer = sr.Recognizer()
    with sr.AudioFile(str(file_path)) as source:  # sr.AudioFile expects a string path
        audio_data = recognizer.record(source)

    try:
        transcript = recognizer.recognize_google(audio_data)
        return transcript
    except sr.UnknownValueError:
        return "Transcription failed due to unrecognizable speech."
    except sr.RequestError as e:
        return f"Could not request results from Google Speech Recognition service; {e}"

async def analyze_answers(transcript, questions):
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

def copy_to_public(file_name):
    """Copy a file from the recording directory to the public directory."""
    source = Path(RECORDING_DIR) / file_name
    destination = Path(PUBLIC_DIR) / file_name
    if not destination.exists():
        shutil.copy(source, destination)
    return destination

frontend_base_url=os.getenv('FRONTEND_BASE_URL')

@router.get("/jobs/{job_id}/review/{user_id}")
async def review_recording(job_id: int, user_id: int):
    """Fetches and reviews a job interview recording, making it available in a public folder."""

    job_details = await get_job_details_endpoint(job_id, user_id)
    questions = job_details['questions']

    filename = f"{job_id}_{user_id}.mp4"
    file_path = Path(RECORDING_DIR) / filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Recording file not found.")

    public_file_path = copy_to_public(filename)
    public_url = f"{os.getenv('HTTP_FRONTEND_BASE_URL')}/{filename}"

    # Assuming transcription and analysis functions are defined elsewhere
    transcript = transcribe_audio(file_path)
    analysis = await analyze_answers(transcript,questions)

    return {
        "transcript": transcript,
        "analysis": analysis,
        "download_url": public_url  # URL to download the audio file
    }