from typing import Dict, Any, Optional
import httpx
from app.core.config import settings

async def send_telegram_message(chat_id: int, text: str, reply_markup: Optional[Dict[str, Any]] = None) -> bool:
    """
    Sends message to Telegram user via official Bot API.
    """
    if not settings.TELEGRAM_BOT_TOKEN:
        return False
        
    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML"
    }
    if reply_markup:
        payload["reply_markup"] = reply_markup
        
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(url, json=payload)
            return resp.status_code == 200
    except Exception:
        return False

def parse_telegram_update(update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Extracts text, location, photo, user ID, message ID from Telegram webhook update.
    """
    message = update_data.get("message") or update_data.get("channel_post")
    if not message:
        return None

    user = message.get("from", {})
    user_id = str(user.get("id", ""))
    message_id = str(message.get("message_id", ""))
    chat_id = message.get("chat", {}).get("id")

    text = message.get("text") or message.get("caption") or ""
    
    # Check for direct GPS location share
    location = message.get("location")
    latitude = None
    longitude = None
    location_source = "unconfirmed"
    
    if location:
        latitude = float(location.get("latitude"))
        longitude = float(location.get("longitude"))
        location_source = "explicit_reporter"

    # Check for photo
    photos = message.get("photo", [])
    photo_file_id = photos[-1].get("file_id") if photos else None

    return {
        "telegram_user_id": user_id,
        "telegram_message_id": message_id,
        "chat_id": chat_id,
        "text": text,
        "latitude": latitude,
        "longitude": longitude,
        "location_source": location_source,
        "photo_file_id": photo_file_id,
        "raw_update": update_data
    }
