"""
Rate Limiter Middleware — Fixed Window Counter bằng Redis.

Thuật toán:
  key = f"rl:{client_ip}"
  count = INCR(key)
  if count == 1: EXPIRE(key, window_seconds)  # Set TTL lần đầu
  if count > limit: return 429

Nếu Redis không khả dụng: bypass rate limiting (graceful degradation).
"""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.config import get_settings
from app.core.redis_client import get_redis_client
from app.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()

# Paths không áp dụng rate limit
_EXEMPT_PATHS = {"/health", "/ai/health", "/docs", "/openapi.json", "/redoc"}


class RateLimitMiddleware(BaseHTTPMiddleware):
    """IP-based Fixed Window rate limiter."""

    async def dispatch(self, request: Request, call_next):
        if request.url.path in _EXEMPT_PATHS:
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        r = get_redis_client()

        if r is None:
            return await call_next(request)

        key = f"rl:{client_ip}"
        limit = settings.rate_limit_requests
        window = settings.rate_limit_window_seconds

        try:
            pipe = r.pipeline()
            pipe.incr(key)
            pipe.ttl(key)
            count, ttl = pipe.execute()

            if ttl == -1:
                r.expire(key, window)
                ttl = window

            remaining = max(0, limit - count)
            reset_in = ttl if ttl > 0 else window

            if count > limit:
                logger.warning(f"Rate limit exceeded | ip={client_ip} | count={count}")
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Quá nhiều yêu cầu. Vui lòng thử lại sau."},
                    headers={
                        "X-RateLimit-Limit": str(limit),
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Reset": str(reset_in),
                        "Retry-After": str(reset_in),
                    },
                )

            response = await call_next(request)
            response.headers["X-RateLimit-Limit"] = str(limit)
            response.headers["X-RateLimit-Remaining"] = str(remaining)
            response.headers["X-RateLimit-Reset"] = str(reset_in)
            return response

        except Exception as e:
            logger.warning(f"Rate limiter Redis error (bypassing): {e}")
            return await call_next(request)
