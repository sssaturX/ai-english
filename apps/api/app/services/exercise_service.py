from __future__ import annotations

import hashlib
import json
import os
from typing import Any

from pydantic import ValidationError

from app.llm.ollama import OllamaLLMProvider
from app.llm.prompt_builders import build_generate_exercises_messages, build_open_answer_check_messages
from app.models.exercises import (
    CheckExerciseRequest,
    CheckExerciseResponse,
    GenerateExercisesRequest,
    GenerateExercisesResponse,
    OpenAnswerQuestion,
    QuestionUnion,
)
from app.utils.cache import TTLCache
from app.utils.normalize import best_effort_equal


_CACHE = TTLCache(ttl_s=300.0, max_items=256)


def _default_model() -> str:
    return os.getenv("OLLAMA_MODEL", "llama3.1:8b")


def _ollama_base_url() -> str:
    return os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")


def _cache_key_for_generate(req: GenerateExercisesRequest) -> str:
    key_payload: dict[str, Any] = {
        "topic": req.topic,
        "subtopic": req.subtopic,
        "level": req.level,
        "count": req.count,
        "exerciseTypes": req.exerciseTypes,
    }
    raw = json.dumps(key_payload, ensure_ascii=False, sort_keys=True)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _repair_llm_payload(raw: dict[str, Any], req: GenerateExercisesRequest) -> dict[str, Any]:
    """
    Best-effort repair for imperfect LLM payloads.
    Some models omit required fields; we add safe fallbacks before Pydantic validation.
    """
    questions = raw.get("questions")
    if not isinstance(questions, list):
        return raw

    fixed_questions: list[dict[str, Any]] = []
    for idx, q in enumerate(questions, start=1):
        if not isinstance(q, dict):
            continue

        q_type = str(q.get("type", "fill_in_gap"))
        q_fixed = dict(q)

        q_fixed["id"] = str(q_fixed.get("id") or f"q{idx}")
        q_fixed["topic"] = str(q_fixed.get("topic") or req.topic)
        q_fixed["subtopic"] = q_fixed.get("subtopic") if q_fixed.get("subtopic") is not None else (req.subtopic or "")
        q_fixed["level"] = str(q_fixed.get("level") or req.level)
        q_fixed["type"] = q_type
        q_fixed["prompt"] = str(q_fixed.get("prompt") or "Complete the sentence.")
        q_fixed["correctAnswer"] = str(q_fixed.get("correctAnswer") or q_fixed.get("answer") or "")

        rule = q_fixed.get("ruleExplanation") or q_fixed.get("explanation")
        q_fixed["ruleExplanation"] = str(rule or "Apply the grammar rule relevant to this sentence.")

        if q_type == "multiple_choice":
            options = q_fixed.get("options")
            if not isinstance(options, list):
                options = []
            options = [str(o) for o in options if str(o).strip()]
            # Ensure correct answer is explicitly present in options.
            if q_fixed["correctAnswer"] and q_fixed["correctAnswer"] not in options:
                options = [q_fixed["correctAnswer"], *options]
            if not options and q_fixed["correctAnswer"]:
                options = [q_fixed["correctAnswer"]]

            # If prompt is clearly a gap-fill but options look like full sentences,
            # convert to fill_in_gap to keep UX clear and answerable.
            prompt = q_fixed["prompt"]
            has_gap = ("[_____]" in prompt) or ("____" in prompt)
            options_are_long = bool(options) and (sum(len(o.split()) for o in options) / max(1, len(options)) > 4)
            correct_is_short = len(str(q_fixed["correctAnswer"]).split()) <= 4
            if has_gap and options_are_long and correct_is_short:
                q_fixed["type"] = "fill_in_gap"
                q_fixed.pop("options", None)
            else:
                # Keep compact set of unique options while preserving order.
                unique_options: list[str] = []
                for opt in options:
                    if opt not in unique_options:
                        unique_options.append(opt)
                q_fixed["options"] = unique_options[:5]

        acceptable = q_fixed.get("acceptableAnswers")
        if not isinstance(acceptable, list):
            acceptable = []
        acceptable = [str(a) for a in acceptable if str(a).strip()]
        if not acceptable and q_fixed["correctAnswer"]:
            acceptable = [q_fixed["correctAnswer"]]
        q_fixed["acceptableAnswers"] = acceptable

        if q_type == "open_answer":
            if not q_fixed["correctAnswer"]:
                q_fixed["correctAnswer"] = "See explanation."
            q_fixed["evaluationRubric"] = str(
                q_fixed.get("evaluationRubric")
                or "Check tense, word order, and grammar correctness."
            )
            q_fixed["expectedAnswerNotes"] = str(
                q_fixed.get("expectedAnswerNotes")
                or "Answer should be grammatically correct and match the target tense."
            )

        fixed_questions.append(q_fixed)

    return {"questions": fixed_questions}


async def generate_exercises(req: GenerateExercisesRequest) -> GenerateExercisesResponse:
    cache_key = _cache_key_for_generate(req)
    cached = _CACHE.get(cache_key)
    if cached is not None:
        return GenerateExercisesResponse.model_validate(cached)

    provider = OllamaLLMProvider(base_url=_ollama_base_url(), default_model=_default_model())
    messages = build_generate_exercises_messages(req)

    llm_payload = await provider.chat_json(model=_default_model(), messages=messages)
    llm_payload = _repair_llm_payload(llm_payload, req)

    try:
        parsed = GenerateExercisesResponse.model_validate(llm_payload)
    except ValidationError as e:
        # Bubble up with context; prompt builders request strict JSON.
        raise RuntimeError(f"LLM returned unexpected payload for exercises: {e}") from e

    _CACHE.set(cache_key, parsed.model_dump())
    return parsed


async def check_exercise(req: CheckExerciseRequest) -> CheckExerciseResponse:
    question: QuestionUnion = req.question
    user_answer = req.userAnswer

    acceptable = getattr(question, "acceptableAnswers", None) or []
    if not acceptable:
        acceptable = [question.correctAnswer]

    if question.type == "open_answer":
        assert isinstance(question, OpenAnswerQuestion)

        provider = OllamaLLMProvider(base_url=_ollama_base_url(), default_model=_default_model())
        messages = build_open_answer_check_messages(question=question, user_answer=user_answer)
        llm_payload = await provider.chat_json(model=_default_model(), messages=messages)

        is_correct = bool(llm_payload.get("isCorrect"))
        explanation = str(llm_payload.get("explanation", "")).strip()
        correct_answer = str(llm_payload.get("correctAnswer", question.correctAnswer)).strip() or question.correctAnswer
    else:
        is_correct = best_effort_equal(user_answer, acceptable)
        correct_answer = question.correctAnswer

        if is_correct:
            explanation = f"Correct. {question.ruleExplanation}".strip()
        else:
            explanation = f"Not quite. {question.ruleExplanation}"

    next_suggestion = None
    if not is_correct:
        next_suggestion = "Do 2–3 more exercises on this topic."

    return CheckExerciseResponse(
        isCorrect=is_correct,
        correctAnswer=correct_answer,
        explanation=explanation,
        ruleExplanation=question.ruleExplanation,
        nextSuggestion=next_suggestion,
    )

