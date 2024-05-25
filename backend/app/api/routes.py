from fastapi import APIRouter, HTTPException,Depends, status
from typing import Any
import httpx

router = APIRouter()

@router.get("/jobs/")
async def list_jobs():
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get("https://app.timetomeet.ai/api/jobs")
            jobs = response.json()
            return {"jobs": jobs}
        except httpx.RequestError as e:
            raise HTTPException(status_code=400, detail="Error fetching jobs")

@router.get("/job/{job_id}")
async def get_job_details(job_id: int):
    url = f"https://app.timetomeet.ai/api/job/{job_id}"
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url)
            job_details = response.json()
            questions = job_details.get("questions", "No questions available")
            avatar_img = job_details.get("avatar_img", "No avatar image available")
            return {"questions": questions, "avatar_img": avatar_img}
        except httpx.RequestError as e:
            raise HTTPException(status_code=400, detail=f"Error fetching details for job ID {job_id}")

