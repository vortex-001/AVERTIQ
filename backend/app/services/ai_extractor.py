import re
import json
from typing import Dict, Any, Optional
import httpx
from app.core.config import settings

VALID_INCIDENT_TYPES = ["flood", "earthquake", "fire", "cyclone", "landslide", "other"]

# Multilingual keywords for incident classification
KEYWORDS_FLOOD = [
    "flood", "water", "paani", "pani", "drowning", "badh", "chadh", "submerged", 
    "dub", "dubb", "harrh", "sailaab", "overflow", "river", "nadi", "dariya"
]
KEYWORDS_FIRE = [
    "fire", "aag", "dhuan", "smoke", "blaze", "burning", "jal", "blast", "cylinder"
]
KEYWORDS_EARTHQUAKE = [
    "earthquake", "bhukamp", "bhookamp", "tremor", "hila", "shake", "collapse", "gir gayi"
]
KEYWORDS_CYCLONE = [
    "cyclone", "storm", "toofan", "tufan", "andhi", "wind", "hawa", "heavy rain"
]
KEYWORDS_LANDSLIDE = [
    "landslide", "malba", "pahad", "debris", "slide", "chattan"
]

def detect_language(text: str) -> Dict[str, str]:
    text_lower = text.lower()
    has_devanagari = bool(re.search(r'[\u0900-\u097F]', text))
    has_gurmukhi = bool(re.search(r'[\u0A00-\u0A7F]', text))
    
    # Common Hindi & Punjabi romanized markers
    hindi_markers = ["aa gaya", "hai", "paas", "kuch", "log", "phanse", "badh", "raha", "madad", "chahiye"]
    punjabi_markers = ["kol", "reha", "hai", "de", "vich", "harrh", "chadh", "painda", "saanu"]
    
    hi_count = sum(1 for m in hindi_markers if m in text_lower)
    pa_count = sum(1 for m in punjabi_markers if m in text_lower)
    
    if has_gurmukhi:
        return {"language": "pa", "language_mixture": "Punjabi (Gurmukhi script)"}
    if has_devanagari:
        return {"language": "hi", "language_mixture": "Hindi (Devanagari script)"}
    
    if pa_count > 0 and hi_count > 0:
        return {"language": "mixed", "language_mixture": "Hinglish/Punglish Code-Mixed"}
    elif pa_count > hi_count and pa_count > 0:
        return {"language": "pa", "language_mixture": "Punjabi (Roman script)"}
    elif hi_count > 0:
        return {"language": "hi", "language_mixture": "Hindi (Roman script / Hinglish)"}
    else:
        return {"language": "en", "language_mixture": "English"}

def rule_based_extract(text: str) -> Dict[str, Any]:
    """
    Deterministic multilingual rule-based extraction fallback.
    Never fabricates facts, numbers, or coordinates.
    """
    text_lower = text.lower()
    lang_info = detect_language(text)
    
    # 1. Incident Type
    incident_type = "other"
    if any(k in text_lower for k in KEYWORDS_FLOOD):
        incident_type = "flood"
    elif any(k in text_lower for k in KEYWORDS_FIRE):
        incident_type = "fire"
    elif any(k in text_lower for k in KEYWORDS_EARTHQUAKE):
        incident_type = "earthquake"
    elif any(k in text_lower for k in KEYWORDS_CYCLONE):
        incident_type = "cyclone"
    elif any(k in text_lower for k in KEYWORDS_LANDSLIDE):
        incident_type = "landslide"

    # 2. Extract explicitly stated numbers of people
    affected_count = None
    num_match = re.search(r'(\d+)\s*(people|persons|log|bande|individuals)', text_lower)
    if num_match:
        try:
            affected_count = int(num_match.group(1))
        except ValueError:
            pass

    # 3. Vulnerable groups
    vulnerable_groups = []
    if any(w in text_lower for w in ["bachhe", "children", "child", "kids", "baby"]):
        vulnerable_groups.append("children")
    if any(w in text_lower for w in ["elderly", "buzurg", "old people", "buddhe"]):
        vulnerable_groups.append("elderly")
    if any(w in text_lower for w in ["pregnant", "garbhvati"]):
        vulnerable_groups.append("pregnant women")
    if any(w in text_lower for w in ["injured", "ghayal", "zakhmi"]):
        vulnerable_groups.append("injured persons")

    # 4. Location description
    location_desc = None
    loc_match = re.search(r'(near|paas|kol|at|in|beside|across)\s+([^.,\n]+)', text_lower)
    if loc_match:
        location_desc = loc_match.group(0).strip()

    # 5. Missing Information
    missing_fields = []
    if not location_desc:
        missing_fields.append("Specific landmark or physical location missing")
    if affected_count is None:
        missing_fields.append("Exact number of affected individuals not specified")

    # 6. Preliminary Urgency
    urgency = "medium"
    high_urgency_words = ["trapped", "phanse", "drowning", "critical", "emergency", "jaldi", "bachao", "save"]
    if any(w in text_lower for w in high_urgency_words):
        urgency = "high"
    elif affected_count and affected_count > 10:
        urgency = "high"

    return {
        "incident_type": incident_type,
        "language": lang_info["language"],
        "language_mixture": lang_info["language_mixture"],
        "location_description": location_desc,
        "affected_people_count": affected_count,
        "vulnerable_groups": ", ".join(vulnerable_groups) if vulnerable_groups else None,
        "resource_requests": "Rescue assistance requested" if urgency == "high" else None,
        "preliminary_urgency": urgency,
        "missing_information": missing_fields,
        "confidence": 0.85,
        "uncertainty": "Rule-based deterministic extraction applied. Location requires coordinator confirmation.",
        "extractor": "deterministic_rule_engine"
    }

async def extract_incident_intelligence(text: str) -> Dict[str, Any]:
    """
    Extracts structured emergency intelligence.
    If Gemini API key is configured, uses Gemini LLM with schema validation;
    Otherwise uses deterministic multilingual rule extractor.
    """
    if not settings.GEMINI_API_KEY:
        return rule_based_extract(text)

    # Gemini API prompt
    prompt = f"""
    You are an emergency triage AI for the Avertiq disaster platform.
    Analyze this citizen emergency report:
    Report: "{text}"

    Extract ONLY facts explicitly present in the text. DO NOT fabricate coordinates, casualty numbers, or assumptions.
    Return a strict JSON object with these keys:
    - incident_type: string ("flood", "fire", "earthquake", "cyclone", "landslide", or "other")
    - language: string ("hi", "pa", "en", or "mixed")
    - language_mixture: string description (e.g. "Hindi-English Code-Mixed")
    - location_description: string or null
    - affected_people_count: integer or null
    - vulnerable_groups: string or null
    - resource_requests: string or null
    - preliminary_urgency: string ("high", "medium", or "low")
    - missing_information: list of strings
    - confidence: float between 0.0 and 1.0
    - uncertainty: string explaining limitations
    """
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"response_mime_type": "application/json"}
    }
    
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                result = resp.json()
                raw_text = result["candidates"][0]["content"]["parts"][0]["text"]
                data = json.loads(raw_text)
                data["extractor"] = "gemini_api"
                return data
    except Exception:
        # Graceful fallback to rule-based without crashing
        pass

    fallback_res = rule_based_extract(text)
    fallback_res["uncertainty"] += " (Gemini API unavailable, fell back to deterministic engine)"
    return fallback_res
