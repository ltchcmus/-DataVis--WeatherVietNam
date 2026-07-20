import time
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from app.utils.logger import get_access_logger

access_logger = get_access_logger()


class AccessLogMiddleware(BaseHTTPMiddleware):
    """Ghi log mỗi HTTP request vào access.log."""

    async def dispatch(self, request: Request, call_next):
        start = time.perf_counter()
        client_ip = request.client.host if request.client else "-"

        response = await call_next(request)

        latency_ms = round((time.perf_counter() - start) * 1000, 2)
        access_logger.info(
            f"{request.method} {request.url.path} {response.status_code}",
            extra={
                "ip": client_ip,
                "method": request.method,
                "path": str(request.url.path),
                "status": response.status_code,
                "latency_ms": latency_ms,
            },
        )
        return response
