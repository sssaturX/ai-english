from __future__ import annotations

from typing import Annotated, Literal, Union

from pydantic import BaseModel, Field

Level = Literal["B1", "B2", "C1"]
ExerciseType = Literal[
    "fill_in_gap",
    "multiple_choice",
    "sentence_transformation",
    "error_correction",
    "open_answer",
]


class QuestionBase(BaseModel):
    id: str
    topic: str
    subtopic: str | None = None
    level: Level
    type: ExerciseType
    prompt: str
    correctAnswer: str
    ruleExplanation: str


class MultipleChoiceQuestion(QuestionBase):
    type: Literal["multiple_choice"] = "multiple_choice"
    options: list[str]
    acceptableAnswers: list[str] = Field(default_factory=list)


class FillInGapQuestion(QuestionBase):
    type: Literal["fill_in_gap"] = "fill_in_gap"
    # For UI simplicity we keep a single input; prompt should clearly show the blank.
    acceptableAnswers: list[str] = Field(default_factory=list)


class SentenceTransformationQuestion(QuestionBase):
    type: Literal["sentence_transformation"] = "sentence_transformation"
    acceptableAnswers: list[str] = Field(default_factory=list)


class ErrorCorrectionQuestion(QuestionBase):
    type: Literal["error_correction"] = "error_correction"
    acceptableAnswers: list[str] = Field(default_factory=list)


class OpenAnswerQuestion(QuestionBase):
    type: Literal["open_answer"] = "open_answer"
    evaluationRubric: str
    expectedAnswerNotes: str


QuestionUnion = Annotated[
    Union[
        MultipleChoiceQuestion,
        FillInGapQuestion,
        SentenceTransformationQuestion,
        ErrorCorrectionQuestion,
        OpenAnswerQuestion,
    ],
    Field(discriminator="type"),
]


class GenerateExercisesRequest(BaseModel):
    topic: str
    subtopic: str | None = None
    level: Level
    count: int = Field(ge=1, le=50)
    exerciseTypes: list[ExerciseType] | None = None
    # Stored/derived on frontend; backend uses it only as a hint (MVP can ignore).
    adaptiveContext: dict | None = None


class GenerateExercisesResponse(BaseModel):
    questions: list[QuestionUnion]


class CheckExerciseRequest(BaseModel):
    questionId: str
    userAnswer: str
    question: QuestionUnion


class CheckExerciseResponse(BaseModel):
    isCorrect: bool
    correctAnswer: str
    explanation: str
    ruleExplanation: str
    nextSuggestion: str | None = None

