# AVERTIQ — DATA SOURCES, TELEMETRY FEEDS & SIMULATION

This document catalogues all external environmental feeds, APIs, map tile providers, and synthetic demonstration scenarios integrated into Avertiq.

---

## 1. External Environmental Data Feeds

| Source Name | Provider URL / Endpoint | Authentication | Data Type | Refresh Rate | Limitations |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Open-Meteo Weather API** | `https://api.open-meteo.com/v1/forecast` | None (Open Access) | Hourly precipitation (mm), wind speed (km/h), rain probability | 15 minutes | Surface weather model interpolation. Does not reflect blocked stormwater drains or local embankment failures. |
| **USGS Real-Time Earthquakes** | `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson` | None (Open Access) | Global seismic events, magnitude, epicenter coordinates, depth | 5 minutes | Epicenter calculation; does not estimate individual structure collapse without local civil inspection. |
| **GDACS Disaster Alerts** | `https://www.gdacs.org/xml/rss.xml` | None (Open Access) | Global disaster alerts (floods, cyclones, earthquakes, tsunamis) | 30 minutes | Macro-regional alert radius; broad footprint without micro-street resolution. |
| **NASA FIRMS** | `https://firms.modaps.eosdis.nasa.gov/api/` | Optional (Map Key in `.env`) | Satellite active thermal fire hotspots (MODIS / VIIRS) | 3 hours | Thermal satellite passes occur at fixed orbits; clouds may obscure ground fire signatures. |
| **OpenStreetMap Nominatim** | `https://nominatim.openstreetmap.org/search` | Subject to OSM Usage Policy (User-Agent header enforced) | Reverse and forward geocoding of place names and roads | On-demand (rate limited) | Landmark match accuracy depends on OpenStreetMap volunteer annotations. |

---

## 2. Map Basemap Tile Services

- **Provider**: OpenStreetMap Standard Raster Tile Server.
- **URL Template**: `https://tile.openstreetmap.org/{z}/{x}/{y}.png`
- **Render Engine**: MapLibre GL JS v4.1.1.
- **Attribution**: `© OpenStreetMap contributors`.
- **Default Viewport**: Ludhiana, Punjab, India (`Latitude: 30.9010`, `Longitude: 75.8573`, `Zoom: 12`).

---

## 3. Citizen Telemetry Intake Channels

### 1. Citizen Mobile & Web Application (Flutter)
- **Endpoint**: `POST /api/v1/reports`
- **Source Identifier**: `source_channel: "app"`
- **Capabilities**: Captures high-accuracy GPS coordinates (`LocationService.getCurrentPosition`), multi-category selection (flood, fire, earthquake, trapped), headcount and vulnerability markers.
- **Offline Resilience**: Automatically stores reports in local SQLite / IndexedDB if network is disrupted; synchronizes immediately upon connection restoration.
- **Feedback Loop**: Establishes 5-second polling / WebSocket listener for live 7-stage SOS delivery updates and rescue team arrival times.

### 2. Telegram Bot API
- **Endpoint**: `POST /api/v1/webhooks/telegram`
- **Authentication**: `X-Telegram-Bot-Api-Secret-Token` header validation.
- **Capabilities**: Ingests raw UTF-8 text messages, shared GPS locations (`message.location`), and photo metadata.
- **Idempotency**: Prevents duplicate report creation using `(telegram_user_id, telegram_message_id)`.

### 3. Public Web Submission Portal
- **Endpoint**: `POST /api/v1/reports`
- **Capabilities**: Accepts structured and unstructured reports, interactive map pin drop, headcount estimates, and vulnerable population markers.

---

## 4. Real Operational Data vs Synthetic Demonstration Scenarios

Avertiq enforces a strict separation between genuine citizen emergency data and synthetic training scenarios.

### Deterministic Demo Scenario (`DEMO_MODE=true`):
When initialized in demo mode or triggered via `POST /api/v1/dashboard/seed-demo`, the system injects a deterministic disaster scenario set in Ludhiana:

1. **Incident 1 — Sutlej River Basin Inundation**:
   - High priority ($85.0/100$).
   - Coordinates: `30.9580, 75.8320` (near Sutlej Bridge).
   - 3 cross-corroborating multilingual citizen reports:
     - *Report 1 (Hinglish)*: *"Flood aa gaya hai, pul ke paas paani badh raha hai. Kuch log phanse hue hain."*
     - *Report 2 (Punjabi)*: *"Pul de kol paani chadh reha hai, 15 bande phanse hoye ne bachao."*
     - *Report 3 (English)*: *"Water levels rising rapidly beside the bridge, families stranded on roofs."*
   - Corroborating Open-Meteo precipitation evidence ($45.2\text{ mm/h}$).

2. **Incident 2 — Gill Road Industrial Warehouse Fire**:
   - High priority ($72.0/100$).
   - Coordinates: `30.8750, 75.8600`.
   - Distinct from the flood incident; verified by deduplication engine not to merge.

3. **Incident 3 — Unlocated Citizen Distress Call**:
   - Preliminary priority ($35.0/100$, unconfirmed).
   - Original text: *"Madad chahiye paani ghar me ghus gaya hai"* (missing location).
   - Coordinates: `null`, `location_source: unconfirmed`. Stored in coordinator review queue without a misleading map pin.

4. **Silent-Zone Grid Matrix**:
   - `ZONE-LUD-1-1`: High hazard ($85/100$) + $0$ citizen reports $\to$ **CRITICAL SILENT ZONE** ($74.5/100$).
   - `ZONE-LUD-0-3`: Zero hazard ($0/100$) + $0$ citizen reports $\to$ **LOW RISK** ($5.0/100$, silence is safe).

All synthetic records carry the attribute:
```json
{
  "synthetic": true,
  "scenario": "ludhiana_demonstration"
}
```
Synthetic records are never mixed with real emergency dispatches.

