import asyncio
import json

from app.llm.ollama import OllamaLLMProvider
from app.llm.prompt_builders import build_generate_exercises_messages
from app.models.exercises import GenerateExercisesRequest


async def main() -> None:
    provider = OllamaLLMProvider()
    messages = [
        {"role": "system", "content": "Return ONLY valid JSON."},
        {"role": "user", "content": "Say {\"ok\":true}"},
    ]

    out = await provider.chat_json(model="qwen3.5:9b", messages=messages)
    print("OK keys:", list(out.keys()))
    print(json.dumps(out, ensure_ascii=False)[:200])


if __name__ == "__main__":
    asyncio.run(main())

