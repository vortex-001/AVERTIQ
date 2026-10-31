# Avertiq Viewer App

> AI-Powered Disaster Intelligence — Flutter Viewer for Citizens

---

## Overview

The **Avertiq Viewer App** is the citizen-facing Flutter application for the Avertiq disaster intelligence platform. It allows users to:

- Submit emergency SOS requests with location, category, description, and optional photo.
- Track the delivery status of their reports (Saved → Queued → Received → Acknowledged → Rescue Assigned).
- View nearby emergency facilities (hospitals, police, fire, shelters).
- Monitor active disaster incidents on a live map.
- Receive real-time updates from the backend via WebSocket.
- Operate fully offline with automatic sync when connectivity returns.

No registration or login is required. Every device is identified by a persistent anonymous UUID.

---

## Prerequisites

| Tool | Version |
|------|---------|
| Flutter SDK | ≥ 3.19.0 |
| Dart SDK | ≥ 3.3.0 |
| Android Studio / Xcode | Latest stable |
| Android SDK | API 21+ |
| iOS Deployment Target | 13.0+ |
| Avertiq Backend | Running locally or on a server |

---

## Quick Start

### 1. Clone / Open the Project

```
cd mobile/viewer-app
```

### 2. Install Dependencies

```bash
flutter pub get
```

### 3. Generate Localization Files

```bash
flutter gen-l10n
```

This generates `lib/generated/l10n/app_localizations.dart` from the `.arb` files in `l10n/`.

### 4. Start the Backend

```bash
cd existing-backend/extracted/"New folder"/backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 5. Run the Flutter App

**Android Emulator (points to host machine):**
```bash
flutter run \
  --dart-define=API_BASE_URL=http://10.0.2.2:8000 \
  --dart-define=WS_BASE_URL=ws://10.0.2.2:8000
```

**iOS Simulator (points to host machine):**
```bash
flutter run \
  --dart-define=API_BASE_URL=http://127.0.0.1:8000 \
  --dart-define=WS_BASE_URL=ws://127.0.0.1:8000
```

**Physical Device (replace with your machine's LAN IP):**
```bash
flutter run \
  --dart-define=API_BASE_URL=http://192.168.1.42:8000 \
  --dart-define=WS_BASE_URL=ws://192.168.1.42:8000
```

---

## Build Release APK

```bash
flutter build apk --release \
  --dart-define=API_BASE_URL=https://your-production-server.com \
  --dart-define=WS_BASE_URL=wss://your-production-server.com
```

The APK will be at `build/app/outputs/flutter-apk/app-release.apk`.

---

## Environment Configuration

Copy `.env.example` and read the comments. The app reads two compile-time defines:

| Variable | Default | Description |
|----------|---------|-------------|
| `API_BASE_URL` | `http://10.0.2.2:8000` | FastAPI base URL |
| `WS_BASE_URL` | `ws://10.0.2.2:8000` | WebSocket base URL |

**Never hardcode secrets or production URLs in source code.**

---

## Supported Languages

| Language | ARB file | Status |
|----------|----------|--------|
| English | `l10n/app_en.arb` | ✅ Complete |
| Hindi | `l10n/app_hi.arb` | ✅ Complete |
| Punjabi | `l10n/app_pa.arb` | ✅ Complete |

---

## Project Structure

```
lib/
├── core/
│   ├── config/         # EnvConfig — compile-time environment variables
│   ├── constants/      # AppColors, AppTextStyles
│   ├── router/         # GoRouter routes (app_router.dart)
│   └── utils/          # DeviceId (persistent anonymous UUID)
├── data/
│   ├── local/          # SQLite via sqflite (LocalDb, PendingReport)
│   └── remote/         # ApiClient (HTTP), WebSocketClient
├── models/             # ReportCreate, ReportResponse, IncidentResponse, etc.
├── providers/          # ChangeNotifier providers (SosProvider, etc.)
├── screens/            # 10 app screens
│   ├── splash/
│   ├── onboarding/
│   ├── home/
│   ├── sos/
│   ├── nearby/
│   ├── map/
│   ├── reports/
│   ├── profile/
│   └── language/
├── services/
│   ├── location_service.dart   # GPS via geolocator
│   └── sync_service.dart       # Offline queue flush
├── widgets/            # Reusable: SosButton, FacilityCard, etc.
├── app.dart            # MaterialApp + providers setup
└── main.dart           # Entry point
```

---

## App Screens

| Screen | Route | Description |
|--------|-------|-------------|
| Splash | `/splash` | Animated logo, redirects after 2 s |
| Onboarding | `/onboarding` | 3-page intro, shown once |
| Home Dashboard | `/home` | Active alerts, SOS button, status |
| SOS Request | `/sos` | Category, description, photo, submit |
| SOS Confirmation | `/sos/confirm` | Delivery state display |
| Nearby Help | `/nearby` | Filtered facility list with call/nav |
| Disaster Map | `/map` | flutter_map with incident markers |
| My Reports | `/reports` | Device's submitted SOS list |
| Profile & Settings | `/profile` | Device ID, language, version |
| Language Selection | `/language` | EN / HI / PA picker |

---

## SOS Report Flow

```
User taps SOS
    → SosRequestScreen (category + desc + photo)
    → SosProvider.submitSos()
        ├── Save to LocalDb (state: queued)
        ├── Try POST /api/v1/reports
        │     ├── Success → state: received → Navigate to SosConfirmationScreen
        │     └── Failure → state: queued (SyncService will retry)
        └── SyncService flushes queue when connectivity returns
```

**Honest offline note:** Saving a report locally does NOT mean emergency services have been notified. Notification only happens when the report reaches the server (state = `received`).

---

## WebSocket

- Route: `ws://<host>:8000/api/v1/ws/viewer`
- Flutter connects on app foreground and auto-reconnects on failure.
- Ping/pong keepalive every 30 s.
- Events pushed to client: `new_report`, `status_update`, `alert`.

---

## Nearby Emergency Facilities

> ⚠️ **Important:** The facility data shown in the Nearby Help screen is representative sample data for Ludhiana, Punjab for demonstration purposes only. It is not live-verified operational data. Always confirm facility availability through official channels in a real emergency.

---

## Backend WebSocket Addition

The following files were added to the existing backend:

- **`app/api/v1/websocket.py`** — New WebSocket router (`/api/v1/ws/viewer`)
- **`app/main.py`** — Added `app.include_router(websocket.router, ...)`
- **`app/api/v1/reports.py`** — Added `broadcast()` call after successful report ingestion

No existing functionality was modified. All existing REST endpoints remain unchanged.

---

## Permissions

### Android
- `INTERNET`, `ACCESS_NETWORK_STATE`
- `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`
- `CAMERA`, `READ_MEDIA_IMAGES`

### iOS
- `NSLocationWhenInUseUsageDescription`
- `NSCameraUsageDescription`
- `NSPhotoLibraryUsageDescription`

---

## Known Limitations

- **Inter font:** The `fonts:` section in `pubspec.yaml` is commented out. The app uses the system sans-serif. To enable Inter, download the TTF files from [rsms.me/inter](https://rsms.me/inter/) into `assets/fonts/` and uncomment the font block.
- **Bluetooth relay:** Not implemented. Listed as a future capability.
- **Map tile caching:** flutter_map tiles are not pre-cached for offline use; the map requires an internet connection to load tiles.
- **SMS fallback:** The `sms:` URI scheme is declared in `AndroidManifest.xml` queries. Full SMS fallback UI is a planned enhancement.

---

## Testing

```bash
# Analyze for errors
flutter analyze

# Run unit tests
flutter test

# Build without running
flutter build apk --debug
```

---

## Architecture

See the full architecture document: [`ARCHITECTURE_PLAN.md`](../../.gemini/antigravity/brain/041d0b17-3ebf-4187-9c41-81c02f7ae9ee/ARCHITECTURE_PLAN.md)

