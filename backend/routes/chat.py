"""
routes/chat.py – /api/chat endpoint.

Accepts a JSON body:
{
  "message": "user text",
  "history": [{"role": "user"|"assistant", "content": "..."}]   // optional
}

Returns:
{
  "reply": "assistant text"
}
"""

from __future__ import annotations
from flask import Blueprint, request, jsonify, Response
from rag import build_context
from llm_client import chat

chat_bp = Blueprint("chat", __name__)

MAX_HISTORY = 12   # keep last N turns in context window


@chat_bp.post("/chat")
def handle_chat() -> Response:
    body: dict = request.get_json(force=True, silent=True) or {}

    user_message: str = (body.get("message") or "").strip()
    if not user_message:
        return jsonify({"error": "message is required"}), 400

    history: list[dict] = body.get("history") or []
    # Trim history to avoid bloating the context window
    trimmed_history = history[-(MAX_HISTORY):]

    context = build_context(user_message)

    try:
        reply = chat(
            user_message=user_message,
            context=context,
            history=trimmed_history,
        )
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 503

    return jsonify({"reply": reply})
