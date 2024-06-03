from fastapi import APIRouter, File,Form, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import ffmpeg
import os
from dotenv import load_dotenv
from db import database, jobs
from datetime import datetime

load_dotenv()

router = APIRouter()

# Ensure the upload folder exists
RECORDING_DIR = os.getenv('RECORDING_DIR')
os.makedirs(RECORDING_DIR, exist_ok=True)

@router.post("/upload/")
async def upload_video(file: UploadFile = File(...), job_id: int = Form(...), user_name: str = Form(...)):
    try:
        # Create a unique filename
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        original_filename = file.filename
        filename = f"{timestamp}_job{job_id}_user{user_name}_{original_filename}"
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
            job_id=job_id,
            name=user_name,
            recording=output_filename
        )
        await database.execute(query)

        return JSONResponse(content={"message": "File converted and saved successfully", "file_path": output_filename}, status_code=200)

    except Exception as e:
        return JSONResponse(content={"message": str(e)}, status_code=500)

