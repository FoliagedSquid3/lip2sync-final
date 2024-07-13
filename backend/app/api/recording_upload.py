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
        filename = f"{job_id}_{user_id}mp4."
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

async def analyze_answers(transcript):
    """Analyzes the transcript to determine if answers are correct using OpenAI's Chat model."""
    openai_api_key = os.getenv('OPENAI_KEY')
    openai.api_key = openai_api_key
    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",  # Make sure to use the correct model here
            messages=[
                {"role": "system", "content": "You are an assistant that evaluates responses in a job interview based on technical accuracy and relevance."},
                {"role": "user", "content": transcript}
            ],
            temperature=0.7,  # Adjust as necessary for creativity or strictness
            max_tokens=200,
            stop=None
        )
        return response.choices[0].message['content'].strip()  # Make sure to access the content correctly
    except Exception as e:
        return f"Failed to analyze answers: {str(e)}"


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
    filename = f"{job_id}_{user_id}.mp4"
    file_path = Path(RECORDING_DIR) / filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Recording file not found.")

    public_file_path = copy_to_public(filename)
    public_url = f"http://{os.getenv('FRONTEND_BASE_URL')}/public/{filename}"

    # Assuming transcription and analysis functions are defined elsewhere
    transcript = transcribe_audio(file_path)
    analysis = await analyze_answers(transcript)

    return {
        "transcript": transcript,
        "analysis": analysis,
        "download_url": public_url  # URL to download the audio file
    }