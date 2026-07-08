"""
main.py — FastAPI Application Entry Point

Khởi động server:
  uvicorn app.main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import get_settings
from app.routers.ai import router as ai_router
from app.routers.execute import router as execute_router
from app.routers.logs import router as logs_router
from app.routers.history import router as history_router
from app.routers.data import router as data_router
from app.db.database import engine, Base
from app.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup & shutdown events."""
    logger.info("=" * 60)
    logger.info("AI Backend starting up...")
    logger.info(f"   Environment : {settings.app_env}")
    logger.info(f"   Dataset path: {settings.dataset_path}")
    logger.info(f"   Gemini model: {settings.gemini_model}")
    logger.info("=" * 60)

    # Khởi tạo DB tables
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")


    try:
        from app.services.dataset_service import dataset_service
        metadata = dataset_service.get_metadata("default")
        if metadata:
            logger.info(f"Dataset loaded | rows={metadata.row_count} | cols={metadata.column_count}")
        else:
            logger.warning("Dataset not found — AI will work without dataset context")
    except Exception as e:
        logger.error(f"Failed to pre-load dataset: {e}")

    yield 
    logger.info("Shutting down AI Backend...")

app = FastAPI(
    title="AI Data Analysis Backend",
    description="""
## Dashboard Phân Tích Dữ Liệu Việt Nam — AI Backend

### Phân chia API:
| Endpoint | Owner | Mô tả |
|----------|-------|-------|
| `POST /ai/chat` | **Công** | AI Orchestrator — sinh code, trả lời |
| `POST /execute` | Thịnh | Chạy code Python đã được approve |
| `GET /logs` | Thịnh | Lấy lịch sử execution |
| `GET /history` | Thịnh | Lấy lịch sử hội thoại |
| `GET /data` | Thịnh | API lấy dataset info |

### Workflow:
```
User → /ai/chat (Công) → pending response
     → User review & approve code
     → /execute (Thịnh) → result
     → /logs (Thịnh) → save log
```
    """,
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.app_env == "development" else ["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ai_router)
app.include_router(execute_router)
app.include_router(logs_router)
app.include_router(history_router)
app.include_router(data_router)

@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "AI Data Analysis Backend",
        "docs": "/docs",
        "version": "1.0.0",
        "endpoints": {
            "ai_chat": "POST /ai/chat",
            "ai_health": "GET /ai/health",
        }
    }


@app.get("/health", tags=["Root"])
async def health():
    return {"status": "ok"}
