"""
main.py — FastAPI Application Entry Point

Khởi động server:
  uvicorn app.main:app --reload --port 8000
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.db.database import engine, Base
from app.middleware.access_log import AccessLogMiddleware
from app.middleware.rate_limiter import RateLimitMiddleware
from app.routers.ai import router as ai_router
from app.routers.execute import router as execute_router
from app.routers.logs import router as logs_router
from app.routers.history import router as history_router
from app.routers.data import router as data_router
from app.utils.logger import get_logger, cleanup_old_logs

logger = get_logger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=" * 60)
    logger.info("AI Backend starting up...")
    logger.info(f"   Environment : {settings.app_env}")
    logger.info(f"   Dataset path: {settings.dataset_path}")
    logger.info(f"   Gemini model: {settings.gemini_model}")
    logger.info(f"   Gemini keys : {len(settings.get_gemini_keys())} configured")
    logger.info(f"   Auto execute: {settings.enable_auto_execute}")
    logger.info(f"   Cities scope: {settings.cities_scope}")
    logger.info("=" * 60)

    # Init DB tables
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables initialized.")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")

    # Pre-load dataset metadata
    try:
        from app.services.dataset_service import dataset_service
        metadata = dataset_service.get_metadata("default")
        if metadata:
            logger.info(f"Dataset loaded | rows={metadata.row_count} | cols={metadata.column_count}")
        else:
            logger.warning("Dataset not found — AI will work without dataset context")
    except Exception as e:
        logger.error(f"Failed to pre-load dataset: {e}")

    # Start APScheduler
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        from apscheduler.triggers.cron import CronTrigger

        scheduler = AsyncIOScheduler()

        # Log cleanup: chạy 3h sáng hằng ngày
        scheduler.add_job(cleanup_old_logs, CronTrigger(hour=3, minute=0), id="log_cleanup")

        # Data pipeline: chạy theo PIPELINE_CRON (default 2h sáng)
        try:
            from app.pipeline.runner import run_pipeline
            hour, minute = settings.pipeline_cron.split(":")
            scheduler.add_job(
                run_pipeline,
                CronTrigger(hour=int(hour), minute=int(minute)),
                id="data_pipeline",
            )
            logger.info(f"Pipeline scheduler set: {settings.pipeline_cron} daily")
        except ImportError:
            logger.info("Pipeline module not installed yet, skipping scheduler")

        scheduler.start()
        logger.info("APScheduler started (log cleanup + data pipeline)")
        app.state.scheduler = scheduler
    except ImportError:
        logger.warning("apscheduler not installed — run: pip install apscheduler")
    except Exception as e:
        logger.error(f"Scheduler failed to start: {e}")

    yield

    # Shutdown
    if hasattr(app.state, "scheduler"):
        app.state.scheduler.shutdown()
    logger.info("Shutting down AI Backend...")


app = FastAPI(
    title="AI Data Analysis Backend",
    description="""
## Dashboard Phân Tích Dữ Liệu Việt Nam — AI Backend

| Endpoint | Mô tả |
|----------|-------|
| `POST /ai/chat` | AI Orchestrator — sinh code, trả lời (SSE) |
| `POST /execute` | Chạy code Python đã approve |
| `GET /logs` | Lấy lịch sử execution |
| `GET /history` | Lấy lịch sử hội thoại |
| `GET /conversations/{id}/messages` | Lấy tin nhắn trong conversation |
| `GET /suggestions` | Gợi ý phân tích có sẵn |
| `GET /data` | Dataset info |
    """,
    version="2.0.0",
    lifespan=lifespan,
)

# ── Middlewares (thứ tự quan trọng: Rate Limit → CORS → Access Log) ──────────
app.add_middleware(AccessLogMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.app_env == "development" else ["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(RateLimitMiddleware)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(ai_router)
app.include_router(execute_router)
app.include_router(logs_router)
app.include_router(history_router)
app.include_router(data_router)

# Routers mới (sẽ được thêm ở Phase 5)
try:
    from app.routers.messages import router as messages_router
    app.include_router(messages_router)
except ImportError:
    pass

try:
    from app.routers.suggestions import router as suggestions_router
    app.include_router(suggestions_router)
except ImportError:
    pass


@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "AI Data Analysis Backend v2.0",
        "docs": "/docs",
        "version": "2.0.0",
    }


@app.get("/health", tags=["Root"])
async def health():
    return {
        "status": "ok",
        "enable_auto_execute": settings.enable_auto_execute
    }
