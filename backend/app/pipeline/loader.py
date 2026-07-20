"""
Pipe 3 — Loader: Upsert records vào Supabase + invalidate Redis cache.
"""
import os
from app.config import get_settings
from app.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()

_BATCH_SIZE = 500


def load_to_supabase(records: list[dict]) -> int:
    """
    Upsert records vào bảng weather_daily trên Supabase.
    Returns số records đã upsert.
    """
    if not records:
        return 0
    if not settings.supabase_url or not settings.supabase_service_role_key:
        logger.warning("Supabase credentials not set — skipping DB load")
        return 0

    try:
        from supabase import create_client
        sb = create_client(settings.supabase_url, settings.supabase_service_role_key)

        total = 0
        for i in range(0, len(records), _BATCH_SIZE):
            batch = records[i:i + _BATCH_SIZE]
            sb.table("weather_daily").upsert(batch, on_conflict="city_id,date").execute()
            total += len(batch)
            logger.info(f"Upserted batch {i // _BATCH_SIZE + 1}: {len(batch)} records")

        return total
    except ImportError:
        logger.error("supabase-py not installed. Run: pip install supabase")
        return 0
    except Exception as e:
        logger.error(f"Supabase upsert failed: {e}")
        return 0


def invalidate_cache(pattern: str = "weather:*"):
    """Xóa cache Redis sau khi dữ liệu mới được nạp."""
    try:
        from app.core.redis_client import get_redis_client
        r = get_redis_client()
        if r:
            keys = r.keys(pattern)
            if keys:
                r.delete(*keys)
                logger.info(f"Invalidated {len(keys)} Redis cache keys")
    except Exception as e:
        logger.warning(f"Cache invalidation failed: {e}")
