from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.services.telegram_service import parse_telegram_update, send_telegram_message
from app.services.ingestion import process_incoming_report

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])

@router.post("/telegram")
async def telegram_webhook_handler(
    request: Request,
    x_telegram_bot_api_secret_token: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Receives incoming updates from Telegram Bot API.
    Validates secret token, extracts emergency message, location, or photo,
    and runs report ingestion.
    """
    # 1. Secret token validation
    # If a secret token is configured, enforce strict match
    if settings.TELEGRAM_WEBHOOK_SECRET and settings.TELEGRAM_BOT_TOKEN:
        if x_telegram_bot_api_secret_token != settings.TELEGRAM_WEBHOOK_SECRET:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid Telegram webhook secret token"
            )

    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    parsed = parse_telegram_update(body)
    if not parsed or not parsed["text"] and parsed["latitude"] is None:
        return {"status": "ignored", "reason": "No text or location present"}

    # Process through pipeline
    report = await process_incoming_report(
        db=db,
        original_text=parsed["text"] or "Location shared without text message",
        source_channel="telegram",
        explicit_lat=parsed["latitude"],
        explicit_lon=parsed["longitude"],
        telegram_user_id=parsed["telegram_user_id"],
        telegram_message_id=parsed["telegram_message_id"],
        raw_metadata={"raw_update": parsed["raw_update"]},
    )

    # If sender's report is missing location and chat_id is present, send polite clarification request
    if parsed.get("chat_id") and report.latitude is None:
        reply_msg = (
            "⚠️ <b>Avertiq Emergency Desk</b>: Aapki emergency report register ho gayi hai.\n"
            "कृपया अपनी सही लोकेशन शेयर करें (Telegram Location Share) या नजदीकी लैंडमार्क/पुल/सड़क का नाम बताएं ताकि टीम पुष्टि कर सके।"
        )
        await send_telegram_message(parsed["chat_id"], reply_msg)
    elif parsed.get("chat_id"):
        reply_msg = (
            f"✅ <b>Avertiq Desk</b>: Report accepted (Ref: #{report.id[:8]}). "
            f"Assigned to Incident Coordinator for verification."
        )
        await send_telegram_message(parsed["chat_id"], reply_msg)

    return {"status": "success", "report_id": report.id}
