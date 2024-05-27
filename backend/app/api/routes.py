from fastapi import APIRouter, HTTPException,Depends, status
from typing import Any
import httpx
import os
from dotenv import load_dotenv
import requests
from PIL import Image
from io import BytesIO
from pathlib import Path
import openai
from openai._client import OpenAI
import subprocess
import sys

load_dotenv()

router = APIRouter()
job_api=os.getenv('JOB_API')
openai_key=os.getenv('OPENAI_KEY')
output_audio_dir=os.getenv('AUDIO_OUTPUT')
result_dir=os.getenv('VIDEO_OUTPUT')
images_dir=os.getenv('IMAGES_DIR')
def download_image(image_url):
    try:
        response = requests.get(image_url)
        response.raise_for_status()  # Ensure the request succeeded
        return Image.open(BytesIO(response.content))
    except requests.RequestException as e:
        print(f"Failed to download image from {image_url}, error: {e}")
        return None

def convert_to_png(image: Image.Image, output_path):
    if image:
        image.convert("RGBA").save(output_path, "PNG")
        print(f"Saved image as {output_path}")
        return output_path
    else:
        return None
    
def generate_speech(questions_text, job_id):
    output_dir = output_audio_dir
    filename = f"{job_id}.wav"
    wav_path = os.path.join(output_dir, filename)
    
    text_needed = " <break time='5000ms'/> ".join(questions_text)  # Adjust breaks as necessary for speech pauses
    api_key = openai_key
    if not api_key:
        raise ValueError("OpenAI API key is not set in environment variables.")
    
    client = OpenAI(api_key=api_key)

    # Create the OpenAI client and generate speech
    response = client.audio.speech.create(
        model="tts-1",
        voice="alloy",  # Possible values: alloy, echo, fable, onyx, nova, and shimmer
        input=text_needed
    )

    # Save the audio file
    os.makedirs(output_dir, exist_ok=True)
    response.stream_to_file(wav_path)

    return wav_path


def execute_script(audio_path, img_path, result_dir, job_id):
    # Construct the full path to the inference script
    script_dir = os.path.abspath(os.path.dirname(__file__))  # Get the directory of the current script
    inference_script_path = os.path.join(script_dir, '..', '..', 'SadTalker', 'inference.py')

    if not os.path.exists(inference_script_path):
        raise FileNotFoundError(f"The specified script does not exist: {inference_script_path}")

    # Ensure the output directory exists
    video_output_path = os.path.join(result_dir, f"{job_id}.mp4")
    os.makedirs(os.path.dirname(video_output_path), exist_ok=True)

    # Build the command
    command = [
        sys.executable, inference_script_path,
        "--driven_audio", audio_path,
        "--ref_pose", os.path.abspath(os.path.join(script_dir, '..', 'SadTalker', 'examples', 'ref_video', 'WDA_KatieHill_000.mp4')),
        "--ref_eyeblink", os.path.abspath(os.path.join(script_dir, '..', 'SadTalker', 'examples', 'ref_video', 'WDA_KatieHill_000.mp4')),
        "--source_image", img_path,
        "--result_dir", video_output_path,
        "--still", "--preprocess", "full", "--enhancer", "gfpgan"
    ]

    print("Running command:", " ".join(command))  # Print the command to check correctness

    try:
        subprocess.run(command, check=True)
        print("Script execution successful.")
    except subprocess.CalledProcessError as e:
        print(f"Script execution failed: {e}")
    except FileNotFoundError as e:
        print(f"Failed to execute script, file not found: {e}")

async def fetch_job_details(job_id: int):
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{job_api}/{job_id}")
            response.raise_for_status()
            job = response.json()
            avatar_img = job.get('avatar_img', '')
            questions = job.get('questions', [])
            # Ensure the entire questions are joined as whole strings
            return avatar_img, questions
        except httpx.HTTPError as e:
            raise HTTPException(status_code=e.response.status_code, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/jobs/{job_id}")
async def get_job_details_endpoint(job_id: int):
    avatar_img, questions = await fetch_job_details(job_id)
    if not questions:
        return {"message": "No questions found for this job", "avatar_img": avatar_img}
    return {"avatar_img": avatar_img, "questions": questions}


@router.get("/jobs/{job_id}/process_complete")
async def process_complete_job(job_id: int):
    avatar_img, formatted_questions = await fetch_job_details(job_id)
    if not formatted_questions:
        return {"message": "No questions found for this job", "avatar_img": avatar_img}

    # Continue with additional processing if needed
    # Download and process image
    if avatar_img:
        image = download_image(avatar_img)
        if image:
            image_path = os.path.join(images_dir, f"{job_id}.png")  # Use os.path.join for building paths
            print('image path',image_path)
            convert_to_png(image, image_path)
        else:
            return {"error": "Failed to download or process avatar image"}


    # Generate speech
    audio_path = generate_speech(formatted_questions.split(" <break time='5000ms'/> "), job_id)  # Assuming this needs the list of questions
    # Generate video
    execute_script(audio_path, image_path, result_dir, job_id)

    # Assuming the video is now saved in `result_dir`
    video_url = f"http://yourserver.com/videos/{job_id}.mp4"
    return {"video_url": video_url}



