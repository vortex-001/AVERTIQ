"""
WebSocket endpoint for the Avertiq Viewer App.

Route: /api/v1/ws/viewer

Responsibilities:
  - Accept connections from Flutter viewer clients.
  - Respond to ping keepalives so the client does not time out.
  - Broadcast events (new_report, status_update, alert) to all connected clients.
  - Broadcast is called by the report ingestion pipeline after AI processing.

This module does NOT break existing REST routes.
"""

import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List

logger = logging.getLogger("avertiq.websocket")

router = APIRouter(prefix="/ws", tags=["WebSocket"])

# Active viewer connections — simple in-memory list.
# For production: replace with Redis pub/sub or a connection manager class.
_connections: List[WebSocket] = []


@router.websocket("/viewer")
async def viewer_ws(websocket: WebSocket):
    """
    WebSocket connection for the Flutter Viewer App.

    Accepted message types (client → server):
      {"type": "ping"}                 → server replies {"type": "pong"}
      {"type": "subscribe", "device_id": "<uuid>"}  → acknowledged

    Pushed message types (server → client):
      {"type": "new_report",      "report": {...}}
      {"type": "status_update",   "report_id": "...", "status": "..."}
      {"type": "alert",           "message": "...", "severity": "high|medium|low"}
      {"type": "pong"}
    """
    await websocket.accept()
    _connections.append(websocket)
    logger.info(f"Viewer WebSocket connected. Total connections: {len(_connections)}")

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_text(
                    json.dumps({"type": "error", "message": "Invalid JSON"})
                )
                continue

            msg_type = msg.get("type", "")

            if msg_type == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))

            elif msg_type == "subscribe":
                device_id = msg.get("device_id", "unknown")
                logger.info(f"Device subscribed: {device_id}")
                await websocket.send_text(
                    json.dumps({"type": "subscribed", "device_id": device_id})
                )

            else:
                logger.debug(f"Unrecognised WS message type: {msg_type}")

    except WebSocketDisconnect:
        logger.info("Viewer WebSocket disconnected.")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        if websocket in _connections:
            _connections.remove(websocket)
        logger.info(f"Remaining connections: {len(_connections)}")


async def broadcast(event: dict) -> None:
    """
    Broadcast a JSON event to all connected viewer clients.
    Dead connections are removed silently.

    Usage (from ingestion.py after report processing):
        from app.api.v1.websocket import broadcast
        await broadcast({"type": "new_report", "report": report_dict})
    """
    if not _connections:
        return

    payload = json.dumps(event)
    dead: List[WebSocket] = []

    for ws in _connections:
        try:
            await ws.send_text(payload)
        except Exception:
            dead.append(ws)

    for ws in dead:
        if ws in _connections:
            _connections.remove(ws)

    if dead:
        logger.info(f"Removed {len(dead)} dead WebSocket connection(s).")

