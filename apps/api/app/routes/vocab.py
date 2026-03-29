from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.models.vocab import VocabGenerateRequest, VocabGenerateResponse
from app.services.vocab_service import generate_vocab

router = APIRouter(prefix="/v1/vocab", tags=["vocab"])


@router.post("/generate", response_model=VocabGenerateResponse)
async def generate(req: VocabGenerateRequest) -> VocabGenerateResponse:
    try:
        return await generate_vocab(req)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(e)) from e

