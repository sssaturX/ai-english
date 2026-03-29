# RUN (Windows, with dependency quirks)

Этот файл — практичный сценарий запуска для твоего окружения (`win32`, PowerShell), с учетом типичных проблем:

- занятые порты (`8001`, `11434`)
- "битые" зависимости
- нестабильный Ollama запуск

## 0) Что должно быть установлено

- Node.js + npm
- Python 3.14+
- Ollama (desktop/CLI)

Проверка:

```powershell
node -v
npm -v
python --version
ollama --version
```

## 1) Очистка/починка зависимостей (если что-то "сломалось")

### Frontend (`apps/web`)

```powershell
cd D:\Coding\english\apps\web
if (Test-Path node_modules) { Remove-Item -Recurse -Force node_modules }
if (Test-Path package-lock.json) { Remove-Item -Force package-lock.json }
npm install
```

### Backend (`apps/api`)

```powershell
cd D:\Coding\english\apps\api
if (Test-Path venv) { Remove-Item -Recurse -Force venv }
python -m venv venv
.\venv\Scripts\python.exe -m pip install --upgrade pip
.\venv\Scripts\python.exe -m pip install -r requirements.txt
 .\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

## 2) Ollama: запуск и модель

Проект сейчас использует по умолчанию `llama3.1:8b`.

### 2.1 Проверить, не занят ли порт 11434

```powershell
netstat -ano | findstr ":11434"
```

Если есть `LISTENING`, не запускай второй `ollama serve`.

### 2.2 Запустить Ollama (если не запущен)

```powershell
ollama serve
```

Если получаешь:
`bind: Only one usage of each socket address...`
— значит Ollama уже запущен, это нормально.

### 2.3 Проверить модель

```powershell
ollama list
```

Если `llama3.1:8b` нет:

```powershell
ollama pull llama3.1:8b
```

### 2.4 Проверка API Ollama

```powershell
Invoke-RestMethod http://127.0.0.1:11434/api/tags
```

## 3) Backend (FastAPI) на 8001

Фронт уже настроен слать запросы на `http://localhost:8001`.

### 3.1 Освободить порт 8001 (если занят)

```powershell
netstat -ano | findstr ":8001"
```

Если видишь `LISTENING <PID>`, убей процесс:

```powershell
Stop-Process -Id <PID> -Force
```

### 3.2 Запуск API

```powershell
cd D:\Coding\english\apps\api
$env:OLLAMA_MODEL="llama3.1:8b"
$env:OLLAMA_BASE_URL="http://127.0.0.1:11434"
.\venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8001
```

Проверка:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8001/health
```

## 4) Frontend (Next.js)

В другом терминале:

```powershell
cd D:\Coding\english\apps\web
npm run dev
```

Открыть:

- `http://localhost:3000`

## 5) Быстрый smoke-test API генерации

```powershell
$body=@{topic='Tenses';subtopic=$null;level='B1';count=1} | ConvertTo-Json
Invoke-WebRequest -UseBasicParsing `
  -Uri "http://127.0.0.1:8001/v1/exercises/generate" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

## 6) Частые проблемы и что делать

### A) `WinError 10048` на `8001` или `11434`

- Порт уже занят.
- Проверь `netstat -ano | findstr ":PORT"` и заверши процесс `Stop-Process -Id PID -Force`.

### B) `503 Service Unavailable` от Ollama

- Ollama не готов/перегружен/не запущен.
- Проверь `Invoke-RestMethod http://127.0.0.1:11434/api/tags`.
- Проверь `ollama ps` (модель может быть в долгом инференсе).

### C) Очень долгая генерация

- Для 9B/8B моделей это нормально: может занимать десятки секунд.
- Проверь загрузку в `ollama ps`.
- Для тестов используй `count=1`.

### D) Front не видит backend

- Убедись, что backend реально на `8001`.
- Проверь в браузере: `http://127.0.0.1:8001/health`.

### E) После правок "ничего не изменилось"

- Перезапусти `uvicorn`.
- Если нужно, перезапусти `npm run dev`.

## 7) Рекомендуемый порядок старта каждый раз

1. `ollama serve` (или убедиться, что уже запущен)
2. backend (`uvicorn ... --port 8001`)
3. frontend (`npm run dev`)

