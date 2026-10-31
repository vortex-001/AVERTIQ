# AVERTIQ — AI-Powered Disaster Intelligence & Emergency Response System

> **Evidence-Linked Disaster Intelligence, Incident Triage, Silent-Zone Risk Detection & Rescue Team Management Platform**

---

## 1. Project Overview

### Problem Statement
During severe climate events and disasters, emergency control centers are overwhelmed with fragmented, multi-lingual, and duplicate reports across social channels, messaging apps, and citizen calls. Concurrently, catastrophic infrastructure failures cause "silent zones"—areas where citizen communications suddenly cease—masking life-threatening conditions from responders.

### Solution
**AVERTIQ** provides a unified, AI-orchestrated disaster intelligence ecosystem:
1. **Citizen SOS App (`app/`)**: Offline-first Flutter Android and Web application enabling citizens to submit geo-tagged emergency SOS alerts with an interactive 7-stage delivery confirmation tracker and live rescue team arrival updates.
2. **FastAPI Intelligence Engine (`backend/`)**: Automated multi-lingual text extraction (Gemini AI + deterministic fallback), cross-lingual semantic deduplication, hazard correlation (USGS, Open-Meteo, GDACS), silent-zone risk detection, and real-time WebSocket / polling synchronization.
3. **Emergency Command Center (`admin-panel/`)**: React/TypeScript/Vite dashboard empowering disaster management coordinators to triage incidents, analyze spatial silent zones, review external sensor evidence, assign rescue teams with ETAs, and broadcast real-time updates.

---

## 2. System Architecture

```
                                 ┌──────────────────────────────────────────────┐
                                 │                CITIZEN APP                   │
                                 │       (Flutter Android Production APK)       │
                                 │   Target: Any Android phone on 4G/5G/Wi-Fi   │
                                 └──────────────────────┬───────────────────────┘
                                                        │
                                     HTTPS REST / WSS WebSocket
                                                        │
                                                        ▼
┌─────────────────────────────────┐      ┌──────────────────────────────────────┐
│       ADMIN WEB DASHBOARD       │      │         FASTAPI CLOUD BACKEND        │
│        (React 18 + Vite)        ├─────►│          (Python 3.10+ Runtime)      │
│         Hosted on Vercel        │◄─────┤           Hosted on Render           │
│   https://<admin-app>.vercel.app│      │   https://<backend-app>.onrender.com │
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

## 3. Repository Structure

```
AVERTIQ/
├── app/                  # Citizen Mobile & Web Application (Flutter 3.x / Dart)
│   ├── lib/              # Source code (providers, screens, local DB, services)
│   │   ├── core/         # Routing, theme tokens (Light & Dark), EnvConfig
│   │   ├── data/         # SQLite / Web IndexedDB, REST API & WebSocket clients
│   │   ├── models/       # Report and SOS delivery state models
│   │   ├── providers/    # State management (SOS, Reports, Map, Theme, Language)
│   │   ├── screens/      # Home, SOS Request, 7-Stage Tracker, Map, Profile
│   │   └── widgets/      # Brand app bar, SOS button, status cards
│   ├── android/          # Android platform scaffolding (hardened TLS, permissions)
│   ├── web/              # Web platform deployment assets
│   ├── test/             # Unit and end-to-end synchronization tests
│   └── pubspec.yaml      # Dependencies manifest & asset declarations
│
├── admin-panel/          # Emergency Command Center (React 18 / TypeScript / Vite)
│   ├── src/              # Source code
│   │   ├── components/   # Single-line Navbar, StatCard, PriorityBadge, IncidentMap
│   │   ├── context/      # Dual-theme context (Light `#2B6777` default & Dark)
│   │   ├── pages/        # DashboardOverview, Rescue Team Management, Review Queue, etc.
│   │   ├── services/     # Dynamic API client (`VITE_API_BASE_URL` aware)
│   │   └── types/        # TypeScript interfaces and Incident status unions
│   ├── public/           # Static branding assets (official emblem, favicons)
│   ├── vercel.json       # Production SPA routing rewrites for Vercel deployment
│   ├── package.json      # Dependencies manifest
│   └── vite.config.ts    # Bundler & reverse-proxy configuration
│
├── backend/              # Disaster Intelligence & API Server (FastAPI / Python)
│   ├── app/              # Application modules
│   │   ├── api/          # REST routes (reports, incidents, silent zones, auth, ws)
│   │   ├── core/         # Config, resilient database session, security/JWT
│   │   ├── models/       # SQLAlchemy 2.0 database entities (9 models)
│   │   ├── schemas/      # Pydantic v2 validation models
│   │   ├── seed/         # Demo scenario generator
│   │   └── services/     # AI extraction, deduplication, priority, geocoding
│   ├── tests/            # Pytest test suite (14 passing feature tests)
│   ├── alembic/          # Database migrations
│   ├── Dockerfile        # Container configuration (Render & Docker compatible)
│   └── requirements.txt  # Python dependencies manifest
│
├── docs/                 # Complete Architectural & Operational Documentation
│   ├── ARCHITECTURE.md   # System architecture, location resolution, 9 entities
│   ├── WORKFLOW.md       # Operational lifecycle, SOS tracking, rescue assignment
│   ├── SECURITY.md       # RBAC, privacy, encryption, cleartext restrictions
│   ├── TESTING.md        # Validation matrices & test commands across all 3 tiers
│   ├── DATA_SOURCES.md   # External environmental feeds (Open-Meteo, USGS, GDACS)
│   ├── AI_ROLES.md       # Gemini AI triage & deterministic rule fallbacks
│   └── IMPLEMENTATION_STATUS.md # Production readiness audit & component matrix
│
├── deployment/           # Local containerization infrastructure
│   ├── docker-compose.yml# Production multi-service stack (PostGIS + Redis + Web)
│   └── docker/postgres/  # Database initialization SQL scripts
│
├── render.yaml           # Render Blueprint (FastAPI Web Service + Managed PostgreSQL)
├── AVERTIQ-release.apk   # Ready-to-install Production Android Release APK (58.6 MB)
├── alembic.ini           # Alembic migration configuration
├── pytest.ini            # Pytest execution configuration
├── .gitignore            # Multi-stack Git ignore rules
├── .env.example          # Environment variable template
└── README.md             # Master project documentation
```

---

## 4. Quick Start & Execution Guide

### Prerequisites
- Python 3.10+
- Node.js 18+ & npm
- Flutter SDK 3.x
- Git

---

### Step 1 — Backend Setup & Launch

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # Windows:
   venv\Scripts\activate
   # Linux/macOS:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI development server:
   ```bash
   uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
5. Access interactive API documentation:
   - Swagger UI: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
   - Health Check: [http://127.0.0.1:8000/api/v1/health](http://127.0.0.1:8000/api/v1/health)

---

### Step 2 — Admin Command Center Setup & Launch

1. Navigate to the admin panel directory:
   ```bash
   cd admin-panel
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open the Command Center in your browser:
   - URL: [http://localhost:3000](http://localhost:3000)
   - Default Coordinator Login:
     - **Email**: `admin@avertiq.org`
     - **Password**: `AdminPassword123!`

---

### Step 3 — Citizen Application Setup & Launch

1. Navigate to the app directory:
   ```bash
   cd app
   ```
2. Retrieve Flutter packages:
   ```bash
   flutter pub get
   ```
3. Launch the application:
   - **Chrome (Web UI testing)**:
     ```bash
     flutter run -d chrome
     ```
   - **Android Device / Emulator**:
     ```bash
     flutter run -d android
     ```

---

## 5. Production Android APK Release

A pre-built standalone production release APK is immediately available in the repository root:
- **Location**: [`AVERTIQ-release.apk`](AVERTIQ-release.apk)
- **Size**: **58.6 MB**
- **Features**: Includes the official brand emblem, full dual-theme support, high-accuracy GPS capture, 7-stage SOS tracker, and strict TLS network security.

To compile a fresh release APK connected to your deployed cloud backend:
```bash
cd app
flutter clean
flutter pub get
flutter build apk --release --dart-define=API_BASE_URL="https://<YOUR-RENDER-BACKEND-URL>"
```
The output APK will be generated at `app/build/app/outputs/flutter-apk/app-release.apk`.

---

## 6. Remote Cloud Deployment (Render & Vercel)

AVERTIQ is fully configured for turnkey zero-downtime remote cloud hosting:

### A. Deploy Backend & PostgreSQL on Render
1. Push this repository to GitHub / GitLab.
2. In [Render Dashboard](https://dashboard.render.com), select **New +** > **Blueprint**.
3. Connect your repository. Render automatically reads [`render.yaml`](render.yaml) to provision:
   - Managed PostgreSQL database (`avertiq-db` with persistent disk & automated backups)
   - FastAPI Web Service (`avertiq-backend` with auto-migrations via `alembic upgrade head`)
4. Copy your live backend URL (e.g. `https://avertiq-backend-xxxx.onrender.com`).

### B. Deploy Admin Panel on Vercel
1. In [Vercel Dashboard](https://vercel.com), import your repository.
2. Set **Root Directory** to `admin-panel` (Framework Preset: `Vite`).
3. Add Environment Variable:
   - `VITE_API_BASE_URL` = `https://<your-render-backend-url>`
4. Deploy. Vercel utilizes [`admin-panel/vercel.json`](admin-panel/vercel.json) to ensure seamless SPA routing and automatic API proxying.

---

## 7. Automated Verification & Testing

### Backend Test Suite (Pytest)
```bash
cd backend
python -m pytest tests/test_all_features.py -q
```
- **Result**: `14 passed in 2.39s` (100% passing).
- **Coverage**: Report ingestion, multilingual entity extraction, landmark geocoding, cross-lingual deduplication, priority engine, silent-zone detection, and audit trails.

### Admin Panel Compilation (TypeScript & Vite)
```bash
cd admin-panel
npm run build
```
- **Result**: `1552 modules transformed` with **0 errors**.

### Flutter Analysis & Tests
```bash
cd app
flutter analyze
flutter test
```
- **Result**: `No issues found!` on static analysis. All unit & E2E synchronization tests passing.
