# Newta Chatbot — Python/Flask + Ollama

A production-style RAG chatbot with a **Flask backend** and a lightweight vanilla JS frontend.
Built for a data migration company; structured for AI/ML internship portfolios.

```
newta-chatbot/
├── backend/
│   ├── app.py            # Flask app factory + entry point
│   ├── knowledge.py      # Knowledge base (edit to update content)
│   ├── rag.py            # RAG retrieval engine
│   ├── llm_client.py     # Ollama LLM wrapper (swap for OpenAI here)
│   ├── excel_utils.py    # Lead persistence (CSV + Excel export)
│   ├── requirements.txt
│   ├── .env.example
│   └── routes/
│       ├── chat.py       # POST /api/chat
│       └── leads.py      # POST/GET /api/leads, GET /api/leads/export
└── frontend/
    ├── index.html
    ├── chat.js           # UI logic + API calls (no AI logic here)
    └── style.css
```

---

## Prerequisites

1. **Python 3.11+**
2. **Ollama** — https://ollama.com/download

```bash
# Pull a model (pick one)
ollama pull llama3.2        # recommended
ollama pull llama3.2:1b     # fastest / low-RAM
ollama pull mistral         # alternative
```

---

## Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment config
cp .env.example .env          # edit if needed

# Start Ollama in a separate terminal
ollama serve

# Run Flask
python app.py
# → Listening on http://localhost:5000
```

---

## Frontend Setup

No build step required. Open `frontend/index.html` directly in a browser, or serve it
from any static host.

> **Note:** The frontend calls `http://localhost:5000/api/...`.
> CORS is already configured in Flask. For production, update `API_BASE` in `chat.js`
> to your deployed backend URL.

---

## API Reference

### `POST /api/chat`
Send a user message and receive an AI reply.

**Request**
```json
{
  "message": "What services do you offer?",
  "history": [
    { "role": "user",      "content": "Hi there" },
    { "role": "assistant", "content": "Hello! How can I help?" }
  ]
}
```

**Response**
```json
{ "reply": "Newta offers cloud migration, database migration…" }
```

---

### `POST /api/leads`
Save a lead captured through the chat flow.

**Request** — any subset of these keys:
```json
{
  "name": "Jane Smith",
  "email": "jane@acme.com",
  "phone": "+1 555 0100",
  "company": "Acme Corp",
  "jobTitle": "CTO",
  "serviceNeeded": "Cloud migration",
  "dataVolume": "10 TB",
  "sourceSystem": "Oracle on-prem",
  "targetSystem": "Snowflake",
  "timeline": "Q3 2025",
  "budgetRange": "$50K+",
  "notes": "HIPAA compliance required"
}
```

**Response**
```json
{ "status": "saved" }
```

---

### `GET /api/leads`
Return all stored leads as JSON.

### `GET /api/leads/export`
Download all leads as `newta_leads.xlsx`.

---

## Updating the Knowledge Base

Edit `backend/knowledge.py`. Add a new entry:

```python
{
    "id": "case_studies",
    "title": "Case Studies",
    "tags": ["case study", "example", "client", "result"],
    "content": "Newta migrated 50 TB of healthcare data for..."
}
```

No restart needed if you reload the module; restart Flask to pick up changes.

---

## Swapping the LLM

All LLM interaction is isolated in `backend/llm_client.py`.
To use OpenAI instead of Ollama, replace the `chat()` function body:

```python
import openai

def chat(user_message, context, history, model="gpt-4o-mini"):
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages += history[-8:]
    messages.append({"role": "user", "content": f"CONTEXT:\n{context}\n\nQuestion: {user_message}"})

    resp = openai.chat.completions.create(model=model, messages=messages, max_tokens=300)
    return resp.choices[0].message.content
```

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Cannot connect to Ollama` | Run `ollama serve` in a terminal |
| `ollama: model not found` | Run `ollama pull llama3.2` |
| CORS error in browser | Ensure Flask is running; origin is whitelisted by default |
| Excel export empty | No leads collected yet — complete the lead flow first |

---

## Tech Stack

| Layer | Technology |
|---|---|
| LLM inference | Ollama (local) — swappable |
| Retrieval | Custom keyword RAG (`rag.py`) |
| Backend | Python · Flask · flask-cors |
| Lead storage | CSV + openpyxl Excel export |
| Frontend | Vanilla HTML/CSS/JS (no framework) |
