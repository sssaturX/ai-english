from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class LLMProvider(ABC):
    @abstractmethod
    async def chat_json(
        self,
        *,
        model: str,
        messages: list[dict[str, str]],
        timeout_s: float = 60.0,
    ) -> dict[str, Any]:
        """
        Call the underlying LLM and return a parsed JSON object.

        The caller is responsible for enforcing the "JSON only" behavior via prompt,
        while the provider tries to robustly extract and parse the JSON.
        """

