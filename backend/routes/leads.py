"""
routes/leads.py – Lead management endpoints.

POST /api/leads        – Save a new lead
GET  /api/leads        – Retrieve all leads as JSON
GET  /api/leads/export – Download all leads as an Excel file
"""

from __future__ import annotations
from flask import Blueprint, request, jsonify, Response, send_file
import io
from excel_utils import save_lead, get_all_leads, export_excel

leads_bp = Blueprint("leads", __name__)


@leads_bp.post("/leads")
def create_lead() -> Response:
    """Persist a lead captured through the chat UI."""
    data: dict = request.get_json(force=True, silent=True) or {}
    if not data:
        return jsonify({"error": "Empty payload"}), 400

    save_lead(data)
    return jsonify({"status": "saved"}), 201


@leads_bp.get("/leads")
def list_leads() -> Response:
    """Return all stored leads as JSON (for internal dashboards)."""
    return jsonify(get_all_leads())


@leads_bp.get("/leads/export")
def export_leads() -> Response:
    """Stream an Excel workbook containing all leads."""
    xlsx_bytes = export_excel()
    return send_file(
        io.BytesIO(xlsx_bytes),
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        as_attachment=True,
        download_name="newta_leads.xlsx",
    )
