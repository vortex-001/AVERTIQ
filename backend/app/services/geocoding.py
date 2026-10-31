import math
from typing import Optional, Tuple, Dict, Any, List
import httpx

KNOWN_LUDHIANA_LANDMARKS = {
    "sutlej bridge": (30.9580, 75.8320, 300.0, "Sutlej River Bridge, Ludhiana"),
    "pul": (30.9580, 75.8320, 500.0, "Bridge area, Sutlej / Canal"),
    "clock tower": (30.9124, 75.8535, 100.0, "Clock Tower, Old Ludhiana"),
    "ghanta ghar": (30.9124, 75.8535, 100.0, "Ghanta Ghar (Clock Tower)"),
    "samrala chowk": (30.9067, 75.8821, 200.0, "Samrala Chowk, Ludhiana"),
    "haibowal kalan": (30.9231, 75.8214, 400.0, "Haibowal Kalan, Ludhiana"),
    "civil lines": (30.9042, 75.8398, 250.0, "Civil Lines, Ludhiana"),
    "gill road": (30.8750, 75.8600, 500.0, "Gill Road corridor, Ludhiana"),
    "ferozepur road": (30.8950, 75.8150, 600.0, "Ferozepur Road, Ludhiana"),
    "model town": (30.8872, 75.8385, 300.0, "Model Town, Ludhiana"),
    "sherpur chowk": (30.8845, 75.8971, 250.0, "Sherpur Chowk, Ludhiana"),
    "basti jodhewal": (30.9320, 75.8640, 350.0, "Basti Jodhewal, Ludhiana"),
}

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates the great-circle distance between two points on the Earth in kilometers."""
    R = 6371.0 # Earth's radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def resolve_location_from_text(text: str) -> Optional[Tuple[float, float, float, str, str]]:
    """
    Attempts to resolve landmark mentions in text.
    Returns: (latitude, longitude, accuracy_m, resolved_name, source) or None.
    NEVER defaults to map center!
    """
    if not text:
        return None
    
    clean_text = text.lower()
    for landmark, (lat, lon, accuracy, name) in KNOWN_LUDHIANA_LANDMARKS.items():
        if landmark in clean_text:
            return (lat, lon, accuracy, name, "geocoded_landmark")
            
    return None

async def geocode_query_online(query: str) -> Optional[Tuple[float, float, float, str, str]]:
    """
    Queries Nominatim safely with timeouts and User-Agent.
    Returns (lat, lon, accuracy_m, display_name, source)
    """
    if not query or len(query.strip()) < 3:
        return None
        
    url = "https://nominatim.openstreetmap.org/search"
    headers = {"User-Agent": "Avertiq-DisasterIntel-Platform/1.0 (contact@avertiq.org)"}
    params = {"q": query, "format": "json", "limit": 1}
    
    try:
        async with httpx.AsyncClient(timeout=1.0) as client:
            resp = await client.get(url, params=params, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                if data and len(data) > 0:
                    lat = float(data[0]["lat"])
                    lon = float(data[0]["lon"])
                    display_name = data[0].get("display_name", query)
                    return (lat, lon, 500.0, display_name, "geocoded_landmark")
    except Exception:
        pass
    return None
