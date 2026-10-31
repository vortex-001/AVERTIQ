# AVERTIQ — OPERATIONAL WORKFLOW SPECIFICATION

This document outlines the end-to-end operational lifecycle of citizen emergency distress reports, hazard telemetry, coordinator triage, and rescue team deployment.

---

## 1. Citizen Mobile SOS Submission & Tracking Workflow

```
[Citizen opens Flutter App]
            │
            ▼
[GPS Coordinates Captured Automatically]
(LocationService.instance.getCurrentPosition)
            │
            ▼
[Select Emergency Category & Add Description]
(Flood, Earthquake, Fire, Cyclone, Medical, Trapped)
            │
            ▼
[Press "SEND SOS EMERGENCY REQUEST"]
            │
            ▼
[Persisted Locally in SQLite / Web IndexedDB]
(Stage 1: Submitted — safe offline queue)
            │
            ▼
[Transmitted via HTTPS POST /api/v1/reports]
            │
       +────┴────+
       │         │
[Online]     [Offline]
       │         │
       │     Stored in local queue;
       │     auto-syncs on reconnection
       │
       ▼
[Server returns 201 Created with Incident ID]
(Stage 2: Report Received — Citizen sees reference ID)
            │
            ▼
[Live Status Polling & WebSocket Channel Active]
(5-second interval querying latest server incident state)
```

### The 7-Stage Delivery Tracker:
Once submitted, the citizen's screen transitions to the live delivery timeline:
1. **Report Submitted**: Distress payload generated and timestamped locally.
2. **Report Received**: Confirmed by backend database; assigned unique reference ID.
3. **Under Review**: Emergency coordinator is reviewing situation & cross-checking evidence.
4. **Rescue Team Assigned**: A designated unit (e.g. NDRF Team Alpha) and estimated arrival time (ETA) are confirmed.
5. **Team Dispatched**: Responders have departed from the base station.
6. **Rescue In Progress**: Responders have arrived on-scene and are actively rendering assistance.
7. **Incident Resolved**: Situation stabilized and mission closed.

---

## 2. Admin Rescue Team Management Workflow

Located in the Command Center under **Rescue Team Management** (`/rescue-assignments`):

```
[Admin views unassigned incidents]
            │
            ▼
[Clicks "Assign Team / Set ETA"]
            │
            ▼
[Selects Response Unit]
(NDRF Alpha, SDRF Quick Response, Fire & Rescue, Medical Trauma Unit, Riverine Rescue)
            │
            ▼
[Sets Estimated Response Minutes (ETA)]
(Default recommendations: Critical=2m, High=5m, Medium=15m, Low=30m)
            │
            ▼
[Updates Lifecycle Stage & Adds Operational Notes]
            │
            ▼
[POST /api/v1/incidents/{id}/assign-eta]
            │
            ├── Updates `incidents.estimated_response_minutes`
            ├── Updates `incidents.response_team_name`
            ├── Updates `incidents.response_status`
            └── Inserts immutable record into `incident_eta_history`
            │
            ▼
[Real-Time Event / 5s Poll Syncs to Citizen Screen]
(Citizen immediately sees team name, ETA badge, and updated stage)
```

---

## 3. Telegram-to-Dashboard Lifecycle

```
[Citizen sends Telegram msg/location]
                 │
                 ▼
[Telegram Webhook POST /api/v1/webhooks/telegram]
                 │
     (1) Check Secret-Token Header
                 │
     (2) Check Idempotency (user_id + message_id)
                 │
     (3) Run Multilingual AI / Rule Triage
                 │
     (4) Resolve Location Coordinates (GPS / Landmark / Unconfirmed)
                 │
     (5) Query External Environmental Sensors (Open-Meteo / USGS)
                 │
     (6) Evaluate Duplicate Similarity with Open Incidents
                 │
        +--------+--------+
        │                 │
  [Match Found]     [No Match]
        │                 │
  Link to Existing    Create New
  Incident Record     Canonical Incident
        │                 │
        +--------+--------+
                 │
     (7) Compute Evidence-Linked Priority Score
                 │
     (8) Evaluate Spatial Silent-Zone Grid
                 │
     (9) Send Polite Telegram Confirmation
                 │
     (10) Stream to Coordinator Dashboard & Live Map
```

### Missing Location Handling:
If the incoming message lacks both coordinates and recognizable landmarks, AVERTIQ responds:
> *"Aapki emergency report register ho gayi hai. Kripya apni location share karein (Telegram Location Share) ya nazdeeki landmark ka naam batayein."*

The report is routed to the **Incident Review Queue** flagged as `location_source: unconfirmed`.

---

## 4. Cross-Lingual Deduplication & Merging Workflow

1. **Incoming Vector Calculation**: The system generates a normalized 64-dimensional multilingual concept embedding for the incoming report.
2. **Candidate Comparison**: All active incidents within a 24-hour temporal window and compatible disaster categories are evaluated.
3. **Thresholding**: If composite similarity $S \ge 0.65$ and geographic distance $\le 3.0\text{ km}$, the report is linked to the existing canonical incident. The incident's `report_count` increments.
4. **Human Unmerge**: If a coordinator notices that a report was mistakenly merged, they click **Unmerge Report** on the Incident Detail page.
   - The report is detached from the cluster.
   - A new canonical incident is automatically spawned with its own priority score.
   - An immutable audit trail entry (`ReviewAction`) is recorded.

---

## 5. Silent-Zone Detection Workflow

```
[Hourly Cron / Real-Time Telemetry Query]
                 │
                 ▼
   [Fetch Open-Meteo Precipitation / USGS Feeds]
                 │
                 ▼
   [Aggregate Sensor Readings into 5.5 km Grid Cells]
                 │
                 ▼
   [Count Citizen Reports Falling in Each Spatial Cell]
                 │
                 ▼
   [Calculate Reporting Deficit: Expected Reports - Actual Reports]
                 │
        +--------+--------+
        │                 │
 [Hazard > 40 &       [Hazard < 15]
  Reports == 0]           │
        │             Normal Low Risk
 Critical Silent Zone     (Safe)
        │
        ▼
 [Highlighted on Admin Map with Recommended Recon Action]
```
