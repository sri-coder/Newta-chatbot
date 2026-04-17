"""
llm_client.py – Thin wrapper around the Ollama /api/chat endpoint.

Swap this file out to point at OpenAI, Anthropic, or any other
provider without touching the rest of the codebase.
"""

from __future__ import annotations
import os
import requests

OLLAMA_URL: str = os.getenv("OLLAMA_URL", "http://localhost:11434/api/chat")
DEFAULT_MODEL: str = os.getenv("OLLAMA_MODEL", "llama3.2")

SYSTEM_PROMPT = """You are the Newta Assistant — a friendly, professional AI chatbot for Newta, \
a specialized data migration and modernization company.

Your job is to:
1. Answer questions about Newta's services, process, technology, pricing, and expertise \
using ONLY the provided knowledge base context.
2. Be concise, helpful, and professional. Never make up information not in the context.
3. If unsure, say "I'd be happy to connect you with our team for more details."
4. Keep responses under 150 words unless the user asks for detail.
5. Use a warm, consultative tone. You are talking to a potential client.

Do NOT reveal you are powered by an open-source model or mention Ollama. \
Present yourself as the Newta Assistant."""


def chat(
    user_message: str,
    context: str,
    history: list[dict],
    model: str = DEFAULT_MODEL,
) -> str:
    """
    Send a message to Ollama and return the assistant's reply.

    Parameters
    ----------
    user_message : str
        The latest user message.
    context : str
        RAG-retrieved knowledge context to inject.
    history : list[dict]
        Prior turns as [{"role": "user"|"assistant", "content": str}, ...].
        Keep trimmed to last N turns before calling this function.
    model : str
        Ollama model name.

    Returns
    -------
    str
        The assistant's text reply.

    Raises
    ------
    RuntimeError
        If Ollama is unreachable or returns a non-200 status.
    """
    # Build messages list: inject context into the first user message
    contextual_user_msg = (
        f"KNOWLEDGE BASE CONTEXT:\n{context}\n\n---\nUser question: {user_message}"
    )

    messages: list[dict] = []

    # Include recent history (skip injecting context into old turns)
    if len(history) > 2:
        messages.extend(history[-8:-1])  # last 8 turns, excluding current

    messages.append({"role": "user", "content": contextual_user_msg})

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            *messages,
        ],
        "stream": False,
        "options": {
            "temperature": 0.4,
            "num_predict": 300,
            "top_k": 40,
            "top_p": 0.9,
        },
    }

    try:
        response = requests.post(OLLAMA_URL, json=payload, timeout=60)
        response.raise_for_status()
    except requests.exceptions.ConnectionError as exc:
        raise RuntimeError(
            "Cannot connect to Ollama. Make sure `ollama serve` is running."
        ) from exc
    except requests.exceptions.HTTPError as exc:
        raise RuntimeError(f"Ollama returned HTTP {response.status_code}: {response.text}") from exc

    data = response.json()
    return data.get("message", {}).get("content", "Sorry, I could not generate a response.")
