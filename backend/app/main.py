import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import Base, engine, SessionLocal
from app.api.v1 import reports, incidents, silent_zones, evidence, sources, dashboard, telegram, auth, websocket
from app.seed.demo_data import seed_demo_dataset
from app.models.models import Incident

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("avertiq")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Avertiq Disaster Intelligence Platform...")
    # Create tables
    Base.metadata.create_all(bind=engine)
    logger.info("Database schema verified.")
    
    # Auto-seed demo scenario if DB is fresh and DEMO_MODE is enabled
    db = SessionLocal()
    try:
        inc_count = db.query(Incident).count()
        if inc_count == 0 and settings.DEMO_MODE:
            logger.info("Fresh database detected in DEMO_MODE. Seeding Ludhiana disaster scenario...")
            seed_demo_dataset(db)
            logger.info("Demo dataset seeded successfully.")
    except Exception as e:
        logger.error(f"Error during startup seeding: {e}")
    finally:
        db.close()
        
    yield
    logger.info("Shutting down Avertiq...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Evidence-Linked Disaster Intelligence, Incident Triage & Silent-Zone Risk Detection Platform",
    lifespan=lifespan
)

# CORS Middleware — robust origin handling for remote Vercel and local access
cors_origins = [str(o).strip() for o in settings.BACKEND_CORS_ORIGINS] if isinstance(settings.BACKEND_CORS_ORIGINS, list) else [str(settings.BACKEND_CORS_ORIGINS).strip()]
allow_origin_regex = None
if "*" in cors_origins:
    allow_origin_regex = r"^https?://.*"
    cors_origins = []

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=allow_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(reports.router, prefix=settings.API_V1_STR)
app.include_router(incidents.router, prefix=settings.API_V1_STR)
app.include_router(silent_zones.router, prefix=settings.API_V1_STR)
app.include_router(evidence.router, prefix=settings.API_V1_STR)
app.include_router(sources.router, prefix=settings.API_V1_STR)
app.include_router(dashboard.router, prefix=settings.API_V1_STR)
app.include_router(telegram.router, prefix=settings.API_V1_STR)
app.include_router(auth.router, prefix=settings.API_V1_STR)
# WebSocket — Avertiq Viewer App real-time channel
app.include_router(websocket.router, prefix=settings.API_V1_STR)

@app.get("/api/v1/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": "Avertiq API",
        "version": settings.VERSION,
        "demo_mode": settings.DEMO_MODE,
        "database": "connected",
        "gemini_active": bool(settings.GEMINI_API_KEY),
        "telegram_bot_active": bool(settings.TELEGRAM_BOT_TOKEN)
    }

@app.get("/", tags=["Root"])
def root():
    return {
        "message": "Welcome to Avertiq - AI-Powered Disaster Intelligence & Silent-Zone Detection Platform",
        "docs_url": "/docs",
        "api_v1": settings.API_V1_STR,
        "health": "/api/v1/health"
    }
