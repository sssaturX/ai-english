from __future__ import annotations

import hashlib
import json
import os
import re
from typing import Any

from pydantic import ValidationError

from app.llm.ollama import OllamaLLMProvider
from app.models.vocab import VocabGenerateRequest, VocabGenerateResponse
from app.utils.cache import TTLCache


_CACHE = TTLCache(ttl_s=600.0, max_items=128)


def _default_model() -> str:
    return os.getenv("OLLAMA_MODEL", "llama3.1:8b")


def _ollama_base_url() -> str:
    return os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")


def _cache_key_for_vocab(req: VocabGenerateRequest) -> str:
    payload: dict[str, Any] = {"count": req.count, "level": req.level, "theme": req.theme}
    raw = json.dumps(payload, ensure_ascii=False, sort_keys=True)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


_CYRILLIC_RE = re.compile(r"[А-Яа-яЁё]")
_LATIN_RE = re.compile(r"[A-Za-z]")
_IPA_CHAR_RE = re.compile(r"[A-Za-zəɪʊæɑɔʌɒθðʃʒŋˈˌː\. /]")


def _decode_candidates(text: str) -> list[str]:
    candidates = [text]
    for enc in ("latin-1", "cp1252"):
        try:
            c = text.encode(enc).decode("utf-8")
            candidates.append(c)
        except Exception:
            pass
    # Unique preserve-order
    uniq: list[str] = []
    for c in candidates:
        if c not in uniq:
            uniq.append(c)
    return uniq


def _fix_mojibake(text: str | None, *, mode: str) -> str:
    if not text:
        return ""
    s = str(text)
    variants = _decode_candidates(s)

    def score_translation(v: str) -> int:
        cyr = len(_CYRILLIC_RE.findall(v))
        bad = v.count("�") + v.count("?") + v.count("Ð") + v.count("Ñ")
        return cyr * 3 - bad

    def score_ipa(v: str) -> int:
        good = len(_IPA_CHAR_RE.findall(v))
        bad = v.count("�") + v.count("?")
        return good - bad * 2

    if mode == "translation":
        return max(variants, key=score_translation)
    if mode == "ipa":
        return max(variants, key=score_ipa)
    return variants[0]


def _normalize_translation(value: str | None) -> str:
    raw = _fix_mojibake(value, mode="translation").strip()
    if not raw:
        return ""

    # Keep only comma-separated parts that contain Cyrillic.
    parts = [p.strip() for p in raw.split(",")]
    ru_parts = [p for p in parts if _CYRILLIC_RE.search(p)]
    if ru_parts:
        joined = ", ".join(ru_parts)
        # Remove accidental latin remnants if Russian text is present.
        joined = _LATIN_RE.sub("", joined)
        joined = re.sub(r"\s{2,}", " ", joined).strip(" ,;")
        return joined
    # If no Cyrillic found, treat as invalid translation for this MVP.
    return ""


def _normalize_ipa(value: str | None) -> str | None:
    raw = _fix_mojibake(value, mode="ipa").strip()
    if not raw:
        return None
    # If it clearly does not look like IPA, drop it.
    ipa_like_chars = len(_IPA_CHAR_RE.findall(raw))
    if ipa_like_chars < max(3, len(raw) // 3):
        return None
    # Ensure slash-wrapped representation if model omitted one side.
    if not raw.startswith("/"):
        raw = "/" + raw
    if not raw.endswith("/"):
        raw = raw + "/"
    return raw


def _repair_vocab_payload(raw: dict[str, Any], req: VocabGenerateRequest) -> dict[str, Any]:
    words = raw.get("words")
    if not isinstance(words, list):
        return raw

    fixed_words: list[dict[str, Any]] = []
    for item in words:
        if not isinstance(item, dict):
            continue

        word = _fix_mojibake(item.get("word"), mode="plain").strip()
        if not word:
            continue

        translation = _normalize_translation(item.get("translation"))
        if not translation:
            translation = "перевод недоступен"

        fixed_words.append(
            {
                "word": word,
                "ipa": _normalize_ipa(item.get("ipa")),
                "translation": translation,
                "example": _fix_mojibake(item.get("example"), mode="plain").strip() or None,
                "synonyms": [
                    str(s).strip()
                    for s in (item.get("synonyms") if isinstance(item.get("synonyms"), list) else [])
                    if str(s).strip()
                ][:5],
                "antonyms": [
                    str(a).strip()
                    for a in (item.get("antonyms") if isinstance(item.get("antonyms"), list) else [])
                    if str(a).strip()
                ][:5],
            }
        )

    # Keep request count size at most.
    return {"words": fixed_words[: req.count]}


async def generate_vocab(req: VocabGenerateRequest) -> VocabGenerateResponse:
    provider = OllamaLLMProvider(base_url=_ollama_base_url(), default_model=_default_model())

    system = (
        "You are a vocabulary tutor for English. "
        "Generate useful, natural English words for practicing grammar and reading. "
        "Return ONLY valid JSON (no Markdown, no commentary)."
    )

    # MVP: translation defaults to Russian per requirement.
    user = (
        f"Level: {req.level}\n"
        f"Theme (optional): {req.theme or ''}\n"
        f"How many words: {req.count}\n\n"
        "Rules:\n"
        "1) Choose words appropriate for B1 → C1 (avoid rare archaic words).\n"
        f"2) Output EXACTLY {req.count} items.\n"
        "3) For each item provide:\n"
        "- word (lemma)\n"
        "- ipa (English IPA like /mæp/; you may omit if unknown)\n"
        "- translation (Russian only, natural, no English letters)\n"
        "- example (optional but preferred: one short sentence using the word naturally)\n"
        "- synonyms (English only, 2-4 items)\n"
        "- antonyms (English only, 2-4 items)\n"
        "4) Keep example sentences short (max ~12 words).\n\n"
        "Expected JSON:\n"
        "{ \"words\": [ { \"word\": \"...\", \"ipa\": \"/.../\", \"translation\": \"...\", \"example\": \"...\", \"synonyms\": [\"...\"], \"antonyms\": [\"...\"] } ] }"
    )

    messages = [{"role": "system", "content": system}, {"role": "user", "content": user}]
    llm_payload = await provider.chat_json(model=_default_model(), messages=messages)
    llm_payload = _repair_vocab_payload(llm_payload, req)

    try:
        parsed = VocabGenerateResponse.model_validate(llm_payload)
    except ValidationError as e:
        raise RuntimeError(f"LLM returned unexpected payload for vocab: {e}") from e

    return parsed

