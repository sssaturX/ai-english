# English Trainer MVP

MVP без регистрации: генерирует упражнения по английской грамматике (B1–C1) через локальный Ollama и хранит прогресс/словарь в `localStorage`.

Для Windows со всеми типовыми конфликтами зависимостей/портов смотри:
- `RUN_WINDOWS.md`

## Prerequisites

- Node.js (для `apps/web`)
- Python (для `apps/api`)
- Ollama running locally (`http://localhost:11434`)

## Start FastAPI (backend)

From repository root:

```powershell
cd apps\api
.\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Optional env:

```powershell
$env:OLLAMA_MODEL="llama3.1:8b"
$env:OLLAMA_BASE_URL="http://localhost:11434"
```

Health check:

`GET http://127.0.0.1:8000/health`

## Start Next.js (frontend)

```powershell
cd ..\web
npm run dev
```

Open:

- `http://localhost:3000/`

## Notes

- `localStorage` keys:
  - session (текущая пачка упражнений)
  - progress (attempts/wrongs по темам)
  - vocabulary words
- Проверка `open_answer` оценивается LLM (по rubric), остальные типы сравниваются детерминированно/нормализацией.

