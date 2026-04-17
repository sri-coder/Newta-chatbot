"""
Newta Chatbot – Flask Backend
Entry point. Registers blueprints, wires CORS, and serves the frontend.

Folder layout expected:
  backend/   ← this file lives here
  frontend/  ← index.html, chat.js, style.css
"""

import os
from pathlib import Path
from flask import Flask, send_from_directory
from flask_cors import CORS
from routes.chat import chat_bp
from routes.leads import leads_bp

# Resolve the frontend directory relative to this file
FRONTEND_DIR = Path(__file__).parent.parent / "frontend"


def create_app() -> Flask:
    app = Flask(__name__, static_folder=str(FRONTEND_DIR), static_url_path="")
    CORS(app)

    app.register_blueprint(chat_bp, url_prefix="/api")
    app.register_blueprint(leads_bp, url_prefix="/api")

    @app.get("/api/health")
    def health():
        return {"status": "ok", "service": "newta-chatbot"}

    # Serve index.html at root
    @app.get("/")
    def index():
        return send_from_directory(FRONTEND_DIR, "index.html")

    # Catch-all: serve any static file from the frontend folder
    @app.get("/<path:filename>")
    def static_files(filename):
        return send_from_directory(FRONTEND_DIR, filename)

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)