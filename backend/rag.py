"""
rag.py – Retrieval-Augmented Generation engine.

Uses a lightweight TF-style keyword scorer to rank knowledge-base
entries against the user's query, then assembles a context string
that is injected into the LLM system prompt.
"""

from __future__ import annotations
from knowledge import KNOWLEDGE_BASE, KnowledgeEntry


# ── Scoring ──────────────────────────────────────────────────────

def _score(query: str, entry: KnowledgeEntry) -> float:
    """Return a relevance score for *entry* given *query*."""
    q = query.lower()
    words = [w for w in q.split() if len(w) > 2]
    score = 0.0

    # Tag match (high weight)
    for tag in entry["tags"]:
        if tag in q:
            score += 5
        for word in words:
            if tag in word or word in tag:
                score += 2

    # Title match
    title_lower = entry["title"].lower()
    for word in words:
        if word in title_lower:
            score += 3

    # Content match
    content_lower = entry["content"].lower()
    for word in words:
        if word in content_lower:
            score += 1

    return score


# ── Retrieval ─────────────────────────────────────────────────────

def retrieve(query: str, top_k: int = 3) -> list[KnowledgeEntry]:
    """Return the *top_k* most relevant knowledge-base entries."""
    scored = sorted(
        KNOWLEDGE_BASE,
        key=lambda e: _score(query, e),
        reverse=True,
    )
    # Filter out zero-score entries (nothing matched at all)
    relevant = [e for e in scored if _score(query, e) > 0]
    return relevant[:top_k] if relevant else KNOWLEDGE_BASE[:3]


def build_context(query: str) -> str:
    """
    Retrieve relevant chunks and format them as a context block
    ready to be injected into the LLM prompt.
    """
    chunks = retrieve(query)
    sections = [f"[{e['title']}]\n{e['content']}" for e in chunks]
    return "\n\n".join(sections)
