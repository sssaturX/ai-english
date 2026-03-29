from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

Level = Literal["B1", "B2", "C1"]


class WordCard(BaseModel):
    word: str
    ipa: str | None = None
    translation: str
    example: str | None = None
    synonyms: list[str] = Field(default_factory=list)
    antonyms: list[str] = Field(default_factory=list)


class VocabGenerateRequest(BaseModel):
    count: int = Field(ge=1, le=50)
    level: Level
    # Optional theme like "travel", "work", "technology".
    theme: str | None = None


class VocabGenerateResponse(BaseModel):
    words: list[WordCard]

