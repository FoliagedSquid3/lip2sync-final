Main production branch is named shayaan_work, rename it if deemed necessary, since this is a micro feature of an existing application in another main github repo, can let it stay the same too.
Documentation.docx file is present there in root.


Project Setup
Clone repository from https://github.com/FoliagedSquid3/lip2sync-final.
Create following folders in root,  
audio
images
public
recordings
video

Project schema should be similar to this : 


Setup .env file too

DATABASE_URL=
RECORDING_DIR=
JOB_API=
OPENAI_KEY=
AUDIO_OUTPUT=
VIDEO_OUTPUT=
IMAGES_DIR=
FRONTEND_BASE_URL=
PUBLIC_DIR=
ORIGINAL_FILE_PATH=
API_URL=
API_URL_2=


Backend Setup

Download Python 3.8 or higher.

Download requirements.txt from root of project via command pip install -r requirements.txt

Move to following folders, ..//backend/app/api/SadTalker
Download the requirements.txt, req.txt and requirements3d.txt from here too similarly like pip install -r req.txt etc

Move to ..//backend/app/api/SadTalker/scripts, run the download_models.sh file. Run it using bash depending on your OS.

A checkpoints and gfpgan folder will be created within the SadTalker folder with all relevant model paths and weights.

Copy these two folders and paste in ..//backend/app , it would be //backend/app/checkpoints 
//backend/app/gfpgan

Create database by running the following command python3 db.py from ..//backend

Backend schema should be something similar to this in the following image


Download redis for your relevant OS too, production is windows server so redis is already set up there. Ensure redis server is always up and running. Once running run this in terminal
 redis-cli ping

This will return pong, meaning the server is up and running.

Now that whole backend is set up, run the backend using the following command from this location ..//backend/app
uvicorn main:app --host 0.0.0.0 --port 8000

Run the celery service using this command from ..//backend/app
celery -A celery_app worker --pool=solo -l info  --loglevel=info


Frontend Setup

Download Node 22.5.1

Frontend folder is named Audio Control React App

Install all the necessary packages

A specific Readme.md is present within this folder

Run the frontend using the following command

 npm start


NOTE
These are the links to additional documents which may be helpful if needed 

https://github.com/OpenTalker/SadTalker
https://gtts.readthedocs.io/en/latest/module.html
