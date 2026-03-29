from __future__ import annotations

import re


_MULTISPACE_RE = re.compile(r"\s+")


def normalize_answer(text: str) -> str:
    """
    Normalize user answer for forgiving comparisons.
    MVP approach: case-insensitive, trim, collapse whitespace, strip common wrapping quotes.
    """
    t = (text or "").strip()
    t = t.strip("\"'“”‘’")
    t = _MULTISPACE_RE.sub(" ", t)
    t = t.lower()

    # Remove trailing punctuation for short answers.
    t = re.sub(r"[.!?]+$", "", t).strip()
    return t


def best_effort_equal(user_answer: str, acceptable_answers: list[str]) -> bool:
    user_n = normalize_answer(user_answer)
    for a in acceptable_answers:
        if user_n == normalize_answer(a):
            return True
    return False

