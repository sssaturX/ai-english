from __future__ import annotations

import asyncio
import codecs
import json
import re
from typing import Any

import httpx

from .base import LLMProvider


def _extract_json_candidate(text: str) -> str:
    """
    Best-effort extraction of the first JSON object found in the text.
    Ollama sometimes wraps output; we try to recover valid JSON.
    """
    text = text.strip()

    # Fast path: looks like pure JSON.
    if text.startswith("{") and text.endswith("}"):
        return text

    match = re.search(r"\{[\s\S]*\}", text)
    if not match:
        raise ValueError("No JSON object found in model output.")
    return match.group(0)


class OllamaLLMProvider(LLMProvider):
    def __init__(self, *, base_url: str = "http://127.0.0.1:11434", default_model: str = "llama3.1:8b"):
        self.base_url = base_url.rstrip("/")
        self.default_model = default_model

    async def chat_json(
        self,
        *,
        model: str,
        messages: list[dict[str, str]],
        timeout_s: float = 180.0,
    ) -> dict[str, Any]:
        url = f"{self.base_url}/api/chat"

        payload = {
            "model": model or self.default_model,
            "stream": False,
            # Ask Ollama to constrain output to JSON.
            "format": "json",
            "messages": messages,
            # Reduce runaway generation time for MVP.
            "options": {
                "temperature": 0.2,
                # Too-low values can truncate large JSON payloads mid-object.
                "num_predict": 2200,
            },
        }

        last_err: Exception | None = None
        last_content_snippet: str | None = None
        last_ollama_response_snippet: str | None = None
        async with httpx.AsyncClient(timeout=timeout_s) as client:
            # Ollama may temporarily return 503 while the model is loading or under load.
            # Do a small retry loop instead of failing the entire request.
            for attempt in range(4):
                try:
                    resp = await client.post(url, json=payload)
                    resp.raise_for_status()
                    data = resp.json()

                    content = data.get("message", {}).get("content", "")
                    # Unescape the content string (Ollama may return escaped JSON in the content field)
                    # Try parsing as a JSON string literal first (handles JSON escapes properly)
                    try:
                        if not (content.startswith('"') and content.endswith('"')):
                            content_to_parse = f'"{content}"'
                        else:
                            content_to_parse = content
                        unescaped_content = json.loads(content_to_parse)
                    except (json.JSONDecodeError, ValueError):
                        # Fall back to unicode_escape codec if JSON parsing fails
                        unescaped_content = codecs.decode(content, "unicode_escape")
                    json_text = _extract_json_candidate(unescaped_content)
                    return json.loads(json_text)
                except (httpx.HTTPStatusError, httpx.RequestError) as e:
                    # Ollama can return 503 while it's loading the model or under load.
                    last_err = e
                    if attempt < 3:
                        await asyncio.sleep(2.0 * (attempt + 1))
                        continue
                    break
                except Exception as e:  # noqa: BLE001
                    # Parse/extraction errors.
                    last_err = e
                    try:
                        last_content_snippet = content[:500]  # type: ignore[name-defined]
                    except Exception:
                        last_content_snippet = None
                    try:
                        # Include a small snippet of raw Ollama response for debugging.
                        last_ollama_response_snippet = json.dumps(data, ensure_ascii=False)[:800]  # type: ignore[name-defined]
                    except Exception:
                        last_ollama_response_snippet = None
                    if attempt < 1:
                        continue
                    break

        snippet = (
            f" Last content snippet: {last_content_snippet!r}" if last_content_snippet is not None else ""
        )
        resp_snippet = (
            f" Last Ollama response snippet: {last_ollama_response_snippet!r}"
            if last_ollama_response_snippet is not None
            else ""
        )
        raise RuntimeError(f"Failed to get JSON from Ollama: {last_err}.{snippet}.{resp_snippet}")

