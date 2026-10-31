# AVERTIQ — SECURITY, PRIVACY & GOVERNANCE POLICY

## 1. Secrets Management & Environment Isolation

- **Zero Hardcoded Secrets**: All credentials (database passwords, JWT secret keys, Telegram bot tokens, Gemini API keys) are injected strictly through environment variables or `.env` files.
- **Git Hygiene**: `.env` and `*.db` files are strictly excluded via `.gitignore`.
- **Secret Redaction**: Logging configurations redact bot tokens and API keys. The health endpoint (`/api/v1/health`) reports only boolean connectivity flags (`gemini_active: true/false`, `telegram_bot_active: true/false`), never exposing the underlying keys.

---

## 2. Network Security & Transport Encryption

- **Strict Transport Security (Mobile)**: The Flutter Android application specifies `android:usesCleartextTraffic="false"` in `AndroidManifest.xml`. All communication with the backend is strictly forced over encrypted TLS (HTTPS / WSS).
- **CORS Configuration (Backend)**: The FastAPI backend implements an origin regex pattern (`^https?://.*`) allowing authorized Vercel deployments and preview environments to communicate securely with `allow_credentials=True` and token headers without wildcard exposure.
- **Managed PostgreSQL Encryption**: Cloud connections enforce SSL transport encryption (`sslmode=require`) between the FastAPI web service and the managed database.

---

## 3. Webhook Authentication & Telegram Security

- **Secret-Token Enforced Validation**: Every incoming Telegram webhook is validated against the configured `TELEGRAM_WEBHOOK_SECRET` header (`X-Telegram-Bot-Api-Secret-Token`). Requests lacking or presenting an invalid secret are immediately rejected with `403 Forbidden`.
- **Payload Sanitization**: Incoming message text is treated as untrusted user input and normalized before passing to NLP or database pipelines.
- **Idempotency Protection**: Repeated deliveries of the same message are deduplicated using `telegram_message_id` and `telegram_user_id` to prevent webhook replay denial-of-service.

---

## 4. Authentication & Role-Based Access Control (RBAC)

AVERTIQ implements token-based authentication using **HS256 JWT** and **bcrypt** password hashing:

| Operational Role | Permitted Actions | Restricted Actions |
| :--- | :--- | :--- |
| **Administrator** | User provisioning, platform configuration, demo data seeding/resetting, database inspection. | Autonomous emergency team dispatch. |
| **Incident Coordinator** | Triage review, coordinate correction, incident approval/rejection, duplicate merge/unmerge, silent-zone resolution, rescue team assignment. | User management, resetting production datasets. |
| **Read-Only Viewer** | Map viewing, telemetry inspection, evidence reading. | Any state mutation, incident verification, or field editing. |

Protected endpoints enforce dependency injection checks via `require_coordinator_or_admin` in `app.api.deps`.

---

## 5. Reporter Privacy & Data Minimization

- **No Public PII Exposure**: Citizen phone numbers and personal handles are never exposed on public dashboard endpoints or public map popups.
- **Source Separation**: Citizen reports are stored as raw distress messages, distinct from the canonical incident title and description displayed on public situational maps.
- **Right to Erasure**: Public citizen reports can be expunged or anonymized upon request by an authorized administrator.

---

## 6. Input Validation & Database Protection

- **SQL Injection Prevention**: All database operations use **SQLAlchemy 2.0 ORM** parameterized queries. Raw string interpolation in SQL statements is prohibited.
- **Strict Schema Enforcement**: Inbound payloads are validated through **Pydantic v2** models with strict type checking, regex verification, and bounds enforcement (e.g. latitude $-90$ to $+90$, longitude $-180$ to $+180$, radius $\le 200\text{ km}$).
- **XSS Mitigation**: React JSX automatically escapes dynamic values before DOM rendering. Map popups escape HTML markup before binding to MapLibre elements.

---

## 7. Non-Autonomous Dispatch Guardrail

> **SAFETY MANDATE**: AVERTIQ is exclusively an **advisory decision-support system**. Under no circumstances does the application autonomously trigger physical emergency responder dispatches or external dispatch API calls. Human emergency coordinators must explicitly inspect evidence, assess risks, and confirm incident reality on the Rescue Team Management console before initiating real-world responses.
