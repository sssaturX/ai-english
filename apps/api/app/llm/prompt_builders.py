from __future__ import annotations

from typing import Literal

from app.models.exercises import GenerateExercisesRequest, OpenAnswerQuestion, ExerciseType, Level


def build_generate_exercises_messages(req: GenerateExercisesRequest) -> list[dict[str, str]]:
    subtopic = req.subtopic or ""
    exercise_types = req.exerciseTypes or [
        "fill_in_gap",
        "multiple_choice",
        "sentence_transformation",
        "error_correction",
        "open_answer",
    ]

    system = (
        "You are an English grammar teacher. "
        "Create natural-sounding practice items. "
        "Return ONLY raw JSON with no surrounding text. "
        "The first character must be '{' and the last character must be '}'. "
        "No Markdown, no commentary."
    )

    user = (
        f"Topic: {req.topic}\n"
        f"Subtopic: {subtopic}\n"
        f"Level: {req.level}\n"
        f"Count: {req.count}\n"
        f"Exercise types to include (choose among these): {exercise_types}\n\n"
        "Output EXACTLY this root shape:\n"
        "{\"questions\":[question1, question2, ...]}\n\n"
        "Generate EXACTLY {count} questions.\n\n"
        "REQUIRED for ALL questions:\n"
        "id (string), type (one of exercise types), topic (string), subtopic (string or empty), level (B1|B2|C1),\n"
        "prompt (string), correctAnswer (string), ruleExplanation (string), acceptableAnswers (array of strings).\n\n"
        "TYPE-SPECIFIC REQUIRED fields:\n"
        "- fill_in_gap: (none beyond base fields)\n"
        "- multiple_choice: options (array of 3-5 strings), and correctAnswer MUST be exactly one option\n"
        "  If prompt contains a blank (e.g., [_____] or ____), options must be short insertions, not full sentences.\n"
        "- sentence_transformation: (none beyond base fields)\n"
        "- error_correction: (none beyond base fields)\n"
        "- open_answer: evaluationRubric (string), expectedAnswerNotes (string)\n\n"
        "No extra fields.\n"
    ).replace("{count}", str(req.count))

    return [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]


def build_open_answer_check_messages(*, question: OpenAnswerQuestion, user_answer: str) -> list[dict[str, str]]:
    system = (
        "You are an English grammar teacher and grader. "
        "Check whether the user's answer satisfies the evaluation rubric. "
        "Return ONLY valid JSON with keys: isCorrect, explanation, correctAnswer. "
        "No Markdown and no commentary."
    )

    user = (
        f"Question prompt:\n{question.prompt}\n\n"
        f"User answer:\n{user_answer}\n\n"
        f"Correct answer (reference for feedback):\n{question.correctAnswer}\n\n"
        f"Evaluation rubric:\n{question.evaluationRubric}\n\n"
        f"Expected answer notes:\n{question.expectedAnswerNotes}\n\n"
        "Tasks:\n"
        "1) Decide isCorrect (true/false).\n"
        "2) Provide explanation: why it is correct or what to fix, referencing the rubric in plain language.\n"
        "Return JSON only."
    )

    return [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]

