# AVERTIQ — ARCHITECTURE & SYSTEM DESIGN

## 1. System Architecture Overview

AVERTIQ is designed as an end-to-end, decoupled disaster intelligence and emergency response platform. It connects on-the-ground citizen distress telemetry with a high-throughput FastAPI decision-support engine and an administrative command console.

```
                                 ┌──────────────────────────────────────────────┐
                                 │                CITIZEN APP                   │
                                 │       (Flutter Android Production APK)       │
                                 │   Target: Any Android phone on 4G/5G/Wi-Fi   │
                                 │                                              │
                                 │  • Offline-First Local SQLite Queue          │
                                 │  • High-Accuracy GPS Geolocation Provider    │
                                 │  • 7-Stage Live SOS Delivery Tracker         │
                                 │  • Dual-Theme Engine (Light & Dark)          │
                                 └──────────────────────┬───────────────────────┘
                                                        │
                                     HTTPS REST / WSS WebSocket
                                                        │
                                                        ▼
┌─────────────────────────────────┐      ┌──────────────────────────────────────┐
│       ADMIN WEB DASHBOARD       │      │         FASTAPI CLOUD BACKEND        │
│        (React 18 + Vite)        ├─────►│          (Python 3.10+ Runtime)      │
│         Hosted on Vercel        │◄─────┤           Hosted on Render           │
│                                 │      │                                      │
│  • Single-Line Responsive Nav   │      │  • Multilingual NLP (Gemini + Rules) │
│  • Live MapLibre Situational Map│      │  • Haversine & Semantic Deduplication│
│  • Priority Queue & Risk Badges │      │  • Spatial Silent-Zone Risk Engine   │
│  • SOS Real-Time Popup Toasts   │      │  • External Feeds (Meteo/USGS/GDACS) │
│  • Rescue Team Management Portal│      │  • Live WebSocket Broadcasting       │
└─────────────────────────────────┘      └──────────────────┬───────────────────┘
                                                            │
                                              SSL Encrypted PostgreSQL Link
                                                            │
                                                            ▼
                                         ┌──────────────────────────────────────┐
                                         │       MANAGED POSTGRESQL DB          │
                                         │      (Render PostgreSQL Instance)    │
                                         │     Persistent Storage + Backups     │
                                         └──────────────────────────────────────┘
```

---

## 2. Ingestion & Location Resolution Pipeline

A primary tenet of AVERTIQ is **never fabricating rescue coordinates**. When an emergency report arrives, the location is resolved strictly according to the following 4-tier hierarchy:

1. **Tier 1 — Explicit GPS Coordinates**: High confidence (0.95), captured directly via mobile device GPS (`LocationService.getCurrentPosition()`) or Telegram location pin. Accuracy radius: ~10–50 meters.
2. **Tier 2 — Web Form Map Pin**: High confidence (0.90), deliberately selected on the interactive coordinate picker.
3. **Tier 3 — Known Landmark Geocoding**: Medium confidence (0.70–0.75), matched against the regional landmark database (e.g. "Sutlej Bridge", "Clock Tower", "Gill Road") or Nominatim OpenStreetMap service. Accuracy radius: 300–1000 meters.
4. **Tier 4 — Unconfirmed Location Queue**: Confidence (0.0). If the location description is vague or absent (e.g. "Water is entering houses, help"), the report remains `latitude: null`, `location_source: unconfirmed`. It appears in the **Incident Review Queue** for coordinator follow-up without misleading responders on the live map.

---

## 3. Multilingual Semantic Deduplication

Emergency reports frequently arrive in Hindi, Punjabi, English, and Romanized code-mixing (Hinglish/Punglish). Duplicate detection combines 4 weighted vectors:

$$S_{\text{composite}} = 0.35 \cdot S_{\text{semantic}} + 0.35 \cdot S_{\text{geographic}} + 0.15 \cdot S_{\text{type}} + 0.15 \cdot S_{\text{temporal}}$$

- **$S_{\text{semantic}}$**: Cosine similarity between multilingual concept embeddings mapping semantically aligned tokens across languages (e.g. `pul` / `bridge` / `water` / `paani` / `harrh` / `chadh`).
- **$S_{\text{geographic}}$**: Haversine distance decay function (1.0 within 500m; linearly decays to 0.0 at 2.0km).
- **$S_{\text{type}}$**: Exact match multiplier (incompatible types like `fire` vs `flood` incur a severe penalty to prevent spurious merges).
- **$S_{\text{temporal}}$**: Linear decay over a 24-hour observation horizon.

---

## 4. Silent-Zone Risk Detection Engine

A key architectural innovation in AVERTIQ is detecting areas where **hazard telemetry indicates extreme conditions, yet citizen reports are near-zero**.

### Formula:
$$\text{Risk}_{\text{silent}} = 0.45 \cdot H + 0.35 \cdot D_{\text{reporting}} + 0.15 \cdot V_{\text{vuln}} + 0.05 \cdot C_{\text{coverage}}$$

Where:
- $H$: Hazard score ($0$ to $100$) derived from Open-Meteo precipitation ($>50\text{ mm/h}$), river water discharge gauges, or seismic intensity.
- $D_{\text{reporting}}$: Reporting deficit normalized against expected report density for the observed hazard.
- $V_{\text{vuln}}$: Baseline population and infrastructure vulnerability score.
- $C_{\text{coverage}}$: Data confidence score (if sensor coverage $<30\%$, the cell is labeled `insufficient_evidence` instead of generating a false alarm).

### Critical Guardrail:
If $H < 15.0$, the silent-zone risk is unconditionally clamped to **Low**. An absence of emergency reports during normal weather is normal and safe.

---

## 5. Real-Time SOS Synchronization & Rescue Team Management

AVERTIQ implements a closed-loop incident response workflow connecting citizens and emergency administrators:

```
Citizen App                     FastAPI Backend                 Admin Command Center
    │                                 │                                  │
    │─── Submit SOS (GPS + Desc) ────►│                                  │
    │    [Stage 1: Submitted]         │                                  │
    │                                 ├─── Save to DB (Incident created) │
    │◄── 201 Created (Ref ID) ────────┤                                  │
    │    [Stage 2: Report Received]   │─── Broadcast via WS / 8s Poll ──►│
    │                                 │    [Popup Toast Alert]           │
    │                                 │                                  │
    │                                 │◄── Assign Rescue Team & ETA ─────│
    │                                 │    (POST /incidents/{id}/assign) │
    │                                 ├─── Persist Team, ETA & History   │
    │                                 │                                  │
    │◄── 5s Poll Sync / WebSocket ────┤                                  │
    │    [Stage 3: Under Review]      │                                  │
    │    [Stage 4: Team Assigned]     │                                  │
    │    [Stage 5: Team Dispatched]   │                                  │
    │    [Stage 6: Rescue In Progress]│                                  │
    │    [Stage 7: Resolved]          │                                  │
```

- **7-Stage Delivery State Tracker**: `submitted` $\to$ `received` $\to$ `under_review` $\to$ `response_assigned` $\to$ `team_dispatched` $\to$ `team_en_route` $\to$ `rescue_in_progress` $\to$ `resolved`.
- **Bidirectional Resilience**: If WebSockets disconnect, the citizen app falls back to seamless 5-second REST polling; the admin panel polls every 8 seconds.

---

## 6. Database Schema & Entities (9 Models)

The platform persists relational data using SQLAlchemy 2.0 with universal compatibility across PostgreSQL (cloud) and SQLite (local):

1. **`users`**: Administrative authentication, bcrypt hashed credentials, and role-based access (`admin`, `coordinator`, `viewer`).
2. **`incidents`**: Canonical disaster entities containing priority score, location coordinates, verification status, rescue team assignment, and ETA minutes.
3. **`reports`**: Raw incoming citizen distress reports, source channel (`app`, `telegram`, `web`), extracted metadata, and language tags.
4. **`report_embeddings`**: Normalized vector representations for semantic deduplication queries.
5. **`evidence_items`**: External environmental sensor readings (rainfall, seismic, alerts), observation timestamps, corroboration status, and staleness flags.
6. **`silent_zone_cells`**: Spatial bounding boxes, hazard scores, reporting deficits, and coordinator verification statuses.
7. **`review_actions`**: Comprehensive immutable audit trail recording coordinator names, timestamps, action types, and JSON diffs.
8. **`external_source_statuses`**: Health, latency, and connectivity monitoring for external APIs.
9. **`incident_eta_history`**: Audit log of all rescue team assignments, ETA adjustments, status transitions, and coordinator notes.

---

## 7. Service Boundaries & Safety Constraints

1. **Advisory Decision Support**: AVERTIQ outputs recommendations, priority scores, and dispatch targets; it does not trigger autonomous unverified emergency responder deployment.
2. **Human Override**: Authorized coordinators can manually adjust coordinates, separate false duplicates, and update rescue lifecycle statuses. Every override generates an immutable `ReviewAction` log.
3. **Strict Transport Security**: The citizen Android application enforces `usesCleartextTraffic="false"`, requiring encrypted HTTPS/WSS communication for all network traffic.
