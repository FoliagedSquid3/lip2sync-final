from fastapi import APIRouter, HTTPException,Depends, status, Request
from fastapi.responses import FileResponse
from typing import Any
import httpx
import os
from dotenv import load_dotenv
import requests
from PIL import Image
from io import BytesIO
from pathlib import Path
import openai
import subprocess
import sys
import traceback
from gtts import gTTS
from deepface import DeepFace
from pydub import AudioSegment
from pydantic import BaseModel

class SendVideo(BaseModel):
    user_id: int | str
    job_id: int | str

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

def detect_gender_from_image(image):
    if image is None:
        return "Image download failed, cannot detect gender."

    # Analyze the image to predict the gender
    try:
        # return "Man"
        result = DeepFace.analyze(img_path=image, actions=['gender'])
        dominant_gender = result[0]['dominant_gender']
        return dominant_gender
    
    except Exception as e:
        print(f"Failed to detect gender, error: {e}")
        return "Gender detection failed."


def convert_to_png(image: Image.Image, output_path):
    if image:
        image.convert("RGBA").save(output_path, "PNG")
        return output_path
    else:
        return None
    
def generate_speech(questions_text, job_id):
    output_dir = output_audio_dir
    filename = f"{job_id}.wav"
    wav_path = os.path.join(output_dir, filename)
    
    text_needed = " <break time='5000ms'/> ".join(questions_text)  # Adjust breaks as necessary for speech pauses
    tts = gTTS(text=text_needed, lang='en')
    os.makedirs(output_dir, exist_ok=True)
    tts.save(wav_path)

    return wav_path

def change_pitch(audio_path, semitones):
    audio = AudioSegment.from_file(audio_path)
    new_sample_rate = int(audio.frame_rate * (2.0 ** (semitones / 12.0)))
    changed_audio = audio._spawn(audio.raw_data, overrides={'frame_rate': new_sample_rate}).set_frame_rate(44100)
    changed_audio.export(audio_path, format="wav")  # Overwrite the original file with modified pitch
    return audio_path 

def execute_script(audio_path, img_path, result_dir, job_id, user_id):
    # Construct the full path to the inference script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    inference_script_path = os.path.join(script_dir, 'SadTalker', 'inference.py')

    if not os.path.exists(inference_script_path):
        raise FileNotFoundError(f"The specified script does not exist: {inference_script_path}")

    # Ensure the output directory exists
    job_output_dir = os.path.join(result_dir, str(job_id))
    os.makedirs(job_output_dir, exist_ok=True)

    # Build the command
    command = [
        sys.executable, inference_script_path,
        "--driven_audio", audio_path,
        "--ref_pose", os.path.abspath(os.path.join(script_dir, 'SadTalker', 'examples', 'ref_video', 'WDA_KatieHill_000.mp4')),
        "--ref_eyeblink", os.path.abspath(os.path.join(script_dir, 'SadTalker', 'examples', 'ref_video', 'WDA_KatieHill_000.mp4')),
        "--source_image", img_path,
        "--result_dir", job_output_dir,
        "--user_id", str(user_id), 
        "--still", "--preprocess", "full", "--enhancer", "gfpgan"
    ]

    try:
        subprocess.run(command, check=True)
        print("Script execution successful.")
    except subprocess.CalledProcessError as e:
        print(f"Script execution failed: {e}")
    except FileNotFoundError as e:
        print(f"Failed to execute script, file not found: {e}")


# Function to generate additional questions using OpenAI's API
async def fetch_additional_questions(initial_questions):
    openai_api_key = os.getenv('OPENAI_KEY')
    openai.api_key = openai_api_key

    try:
        # Updating the prompt to focus on generating advanced technical questions
        prompt = "Given these initial interview questions about coding experience, create direct, in-depth technical questions focusing on syntax, architecture, and best practices:\n\n"
        for question in initial_questions:
            prompt += f"{question}\n"

        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an assistant tasked with generating advanced technical interview questions."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.5,
            max_tokens=500,
            top_p=1.0,
            frequency_penalty=0.0,
            presence_penalty=0.0
        )
        
        # Extracting questions, filtering out any numeric prefixes
        messages = response.get('choices', [{}])[0].get('message', {}).get('content', '')
        detailed_questions = [line.strip() for line in messages.split('\n') if line.strip() and not line.lstrip().split()[0].isdigit()]

        return detailed_questions
    except Exception as e:
        print(f"Failed to generate detailed questions: {str(e)}")
        return []


async def fetch_job_details(job_id: int, user_id: int):
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{job_api}/{job_id}")
            response.raise_for_status()
            job = response.json()
            avatar_img = job.get('avatar_img', '')
            
            # Extracting applicant data and ensuring it includes the candidate's name
            applicant_data = next((applicant for applicant in job.get('applicants', []) if applicant['user']['id'] == user_id), None)
            if not applicant_data:
                raise HTTPException(status_code=404, detail="Applicant not found")

            candidate_name = applicant_data['user']['name']  # Fetching candidate name
            interview_timestamp = applicant_data.get('interview_timestamp')
            questions = job.get('questions', [])  # Parsing questions list

            # Log the avatar URL and candidate name to verify correct data fetching
            print("Avatar Image URL:", avatar_img)
            print("Candidate Name:", candidate_name)

            # Return all relevant data
            return avatar_img, questions, interview_timestamp, candidate_name
        except httpx.HTTPError as e:
            raise HTTPException(status_code=e.response.status_code, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/jobs/{job_id}/{user_id}")
async def get_job_details_endpoint(job_id: int, user_id: int):
    try:
        avatar_img, questions, interview_timestamp, candidate_name = await fetch_job_details(job_id, user_id)
    except ValueError as e:  # Handle specific exceptions or use HTTPException
        raise HTTPException(status_code=404, detail=str(e))

    if isinstance(questions, str):
        questions = questions.strip('[]').replace('"', '').split(',')
    questions = [q.strip() for q in questions if q.strip()]

    detailed_questions = await fetch_additional_questions(questions)
    questions.extend(detailed_questions)  # Extending with direct questions

    if not questions:
        raise HTTPException(status_code=404, detail="No questions found for this job")

    return {
        "candidate_name": candidate_name,
        "interview_timestamp": interview_timestamp,
        "avatar_img": avatar_img,
        "questions": questions
    }



frontend_base_url=os.getenv('FRONTEND_BASE_URL')

@router.get("/jobs/{job_id}/process_complete/{user_id}")
async def process_complete_job(job_id: int, user_id: int):
    # Fetch job details using the endpoint function
    job_details = await get_job_details_endpoint(job_id, user_id)
    if "error" in job_details:
        return job_details  # Return or handle error accordingly

    avatar_img = job_details['avatar_img']
    questions = job_details['questions']
    candidate_name = job_details['candidate_name']
    interview_timestamp = job_details['interview_timestamp']

    # Process data further...
    print('Avatar Image:', avatar_img)
    print('Timestamp:', interview_timestamp)
    print('Candidate Name:', candidate_name)
    print('Questions:', questions)
    
    formatted_questions = " <break time='5000ms'/> ".join(questions)
    
    # Continue with additional processing if needed
    # Download and process image
    
    if avatar_img:
        image = download_image(avatar_img)
        if image:
            image_path = os.path.join(images_dir, f"{job_id}.png")  # Use os.path.join for building paths
            convert_to_png(image, image_path)
            gender=detect_gender_from_image(image_path)
        else:
            return {"error": "Failed to download or process avatarimage"}
    # Generate speech
    if gender=="Man":
        audio_path = generate_speech(formatted_questions.split(" <break time='5000ms'/> "), job_id)  # Assuming this needs the list of questions
        audio_path = change_pitch(audio_path, -4)
    else:
        audio_path = generate_speech(formatted_questions.split(" <break time='5000ms'/> "), job_id)  # Assuming this needs the list of questions
    # Generate video
    execute_script(audio_path, image_path, result_dir, job_id, user_id)

    # Assuming the video is now saved in `result_dir`
    video_url = f"{frontend_base_url}/videos/{job_id}/{user_id}.mp4"
    return {"video_url": video_url}

@router.post("/send_video")
async def send_vide(request: SendVideo):
    try:
        job_id = str(request.job_id)
        user_id = str(request.user_id) + ".mp4"
        video_path = os.path.join(result_dir, job_id, user_id)
        print(video_path)
        return  FileResponse(video_path)
    except:
        traceback.print_exc()
        return None