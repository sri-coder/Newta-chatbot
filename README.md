# Newta Chatbot

A RAG-based chatbot built using Python (Flask) and Ollama, with a lightweight frontend.

This project simulates a real-world AI assistant for a data migration company, handling user queries and collecting leads through a conversational flow and saves them in an .xlsx file.

---

## Tech Stack

- Python (Flask)
- Ollama (LLM)
- Basic RAG pipeline
- HTML, CSS, JavaScript

---

## Features

- Context-aware responses using a custom knowledge base  
- Multi-turn conversation handling  
- Lead collection through chat  
- Excel export of collected leads  

---

## Setup

```bash
# backend
cd backend
pip install -r requirements.txt

# run ollama
ollama serve

# start server
python app.py