"""
Redis singleton client — hỗ trợ cả REDIS_URL (cloud) và REDIS_HOST/PORT (local).
Graceful fallback: nếu Redis không khả dụng, trả None và caller phải xử lý cache miss.
"""
import redis
from app.config import get_settings
from app.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()

_client: redis.Redis | None = None


def get_redis_client() -> redis.Redis | None:
    """Trả về Redis client singleton. Trả None nếu không kết nối được."""
    global _client
    if _client is not None:
        return _client

    try:
        if settings.redis_url:
            _client = redis.from_url(
                settings.redis_url,
                decode_responses=True,
                socket_connect_timeout=3,
                socket_timeout=3,
            )
        else:
            kwargs = dict(
                host=settings.redis_host,
                port=settings.redis_port,
                db=settings.redis_db,
                decode_responses=True,
                socket_connect_timeout=3,
                socket_timeout=3,
            )
            if settings.redis_password:
                kwargs["password"] = settings.redis_password
            _client = redis.Redis(**kwargs)

        _client.ping()
        logger.info(f"Redis connected | host={settings.redis_host or 'cloud'}")
    except Exception as e:
        logger.warning(f"Redis unavailable — running without cache/rate-limit: {e}")
        _client = None

    return _client


# Eagerly try to connect on import
redis_client = get_redis_client()
