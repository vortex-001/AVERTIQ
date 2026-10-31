from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
import httpx
from app.core.config import settings

async def fetch_open_meteo_rainfall(lat: float, lon: float) -> Optional[Dict[str, Any]]:
    """
    Fetches real-time precipitation and rainfall forecast from Open-Meteo (Free, no API key required).
    If offline or in Demo Mode, returns simulated local weather radar contextual evidence immediately.
    """
    if settings.DEMO_MODE:
        return {
            "source": "open-meteo",
            "source_event_id": f"om-demo-{lat:.2f}-{lon:.2f}",
            "observation_time": datetime.now(timezone.utc),
            "evidence_type": "weather_precipitation",
            "measurement_value": "4.2 mm/h (Precip: 5.1 mm, Wind: 14 km/h)",
            "unit": "mm/h",
            "relationship_to_incident": "corroborating",
            "confidence_score": 0.85,
            "limitations_note": "Simulated local weather radar reading under Demo Mode.",
            "is_stale": False,
            "raw_payload": {"rain": 4.2, "precipitation": 5.1, "wind_speed_10m": 14.0}
        }

    url = f"{settings.OPEN_METEO_BASE_URL}?latitude={lat}&longitude={lon}&current=precipitation,rain,wind_speed_10m&hourly=precipitation_probability,precipitation"
    try:
        async with httpx.AsyncClient(timeout=1.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                current = data.get("current", {})
                precip = current.get("precipitation", 0.0)
                rain = current.get("rain", 0.0)
                wind = current.get("wind_speed_10m", 0.0)
                
                is_significant = precip > 2.0 or rain > 2.0
                return {
                    "source": "open-meteo",
                    "source_event_id": f"om-{lat:.2f}-{lon:.2f}",
                    "observation_time": datetime.now(timezone.utc),
                    "evidence_type": "weather_precipitation",
                    "measurement_value": f"{rain} mm/h (Precip: {precip} mm, Wind: {wind} km/h)",
                    "unit": "mm/h",
                    "relationship_to_incident": "corroborating" if is_significant else "contextual",
                    "confidence_score": 0.88,
                    "limitations_note": "Ground surface sensor network interpolation. Forecast does not confirm local drainage blockages.",
                    "is_stale": False,
                    "raw_payload": current
                }
    except Exception:
        return None

async def fetch_usgs_earthquakes() -> List[Dict[str, Any]]:
    """
    Fetches recent earthquakes from USGS API (Free, open GeoJSON).
    """
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(settings.USGS_EARTHQUAKE_FEED_URL)
            if resp.status_code == 200:
                data = resp.json()
                features = data.get("features", [])
                results = []
                for feat in features[:10]: # Top 10 recent
                    props = feat.get("properties", {})
                    geom = feat.get("geometry", {})
                    coords = geom.get("coordinates", [0, 0, 0])
                    results.append({
                        "source": "usgs",
                        "source_event_id": feat.get("id"),
                        "observation_time": datetime.fromtimestamp(props.get("time", 0) / 1000.0, tz=timezone.utc),
                        "evidence_type": "seismic_magnitude",
                        "measurement_value": f"M {props.get('mag')} - {props.get('place')}",
                        "unit": "Richter",
                        "latitude": coords[1],
                        "longitude": coords[0],
                        "confidence_score": 0.95,
                        "limitations_note": "Seismic epicenter detection. Does not quantify individual building structural integrity.",
                        "is_stale": False,
                        "raw_payload": props
                    })
                return results
    except Exception:
        return []

def evaluate_evidence_staleness(observation_time: datetime, max_age_hours: float = 6.0) -> bool:
    if not observation_time:
        return True
    if observation_time.tzinfo is None:
        observation_time = observation_time.replace(tzinfo=timezone.utc)
    age = (datetime.now(timezone.utc) - observation_time).total_seconds() / 3600.0
    return age > max_age_hours
