from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.models.exercises import (
    CheckExerciseRequest,
    CheckExerciseResponse,
    GenerateExercisesRequest,
    GenerateExercisesResponse,
)
from app.services.exercise_service import check_exercise, generate_exercises

router = APIRouter(prefix="/v1/exercises", tags=["exercises"])


@router.post("/generate", response_model=GenerateExercisesResponse)
async def generate(req: GenerateExercisesRequest) -> GenerateExercisesResponse:
    try:
        return await generate_exercises(req)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post("/check", response_model=CheckExerciseResponse)
async def check(req: CheckExerciseRequest) -> CheckExerciseResponse:
    try:
        return await check_exercise(req)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(e)) from e

