import gzip
import logging
import logging.handlers
import os
import shutil
import sys
from datetime import datetime, timedelta
from pathlib import Path

from app.config import get_settings

settings = get_settings()

_initialized = False


def _get_log_dir() -> Path:
    log_dir = Path(settings.log_dir)
    log_dir.mkdir(parents=True, exist_ok=True)
    return log_dir


class _GzipRotatingFileHandler(logging.handlers.RotatingFileHandler):
    """RotatingFileHandler: tự động nén file cũ thành .gz sau khi rotate."""

    def doRollover(self):
        super().doRollover()
        rotated = f"{self.baseFilename}.1"
        if os.path.exists(rotated):
            gz_path = rotated + ".gz"
            with open(rotated, "rb") as f_in, gzip.open(gz_path, "wb") as f_out:
                shutil.copyfileobj(f_in, f_out)
            os.remove(rotated)


class _JsonFormatter(logging.Formatter):
    """Format log ra dạng JSON-line để dễ parse và query."""

    def format(self, record: logging.LogRecord) -> str:
        import json
        payload = {
            "ts": datetime.fromtimestamp(record.created).astimezone().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)

        for extra in ("request_id", "ip", "method", "path", "status", "latency_ms"):
            val = getattr(record, extra, None)
            if val is not None:
                payload[extra] = val

        return json.dumps(payload, ensure_ascii=False)


def _setup_logging():
    global _initialized
    if _initialized:
        return
    _initialized = True

    log_dir = _get_log_dir()
    level = getattr(logging, settings.log_level.upper(), logging.INFO)
    json_fmt = _JsonFormatter()
    console_fmt = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # ── Root logger ─────────────────────────────────────────
    root = logging.getLogger()
    root.setLevel(level)
    root.handlers.clear()

    # Console handler (colored for dev)
    ch = logging.StreamHandler(sys.stdout)
    ch.setFormatter(console_fmt)
    root.addHandler(ch)

    # ── app.log — hệ thống ──────────────────────────────────
    app_handler = _GzipRotatingFileHandler(
        filename=log_dir / "app.log",
        maxBytes=settings.log_max_bytes,
        backupCount=settings.log_backup_count,
        encoding="utf-8",
    )
    app_handler.setFormatter(json_fmt)
    root.addHandler(app_handler)

    # ── access.log — HTTP requests (chỉ access logger) ──────
    access_logger = logging.getLogger("access")
    access_logger.setLevel(logging.INFO)
    access_logger.propagate = False

    access_handler = _GzipRotatingFileHandler(
        filename=log_dir / "access.log",
        maxBytes=settings.log_max_bytes,
        backupCount=settings.log_backup_count,
        encoding="utf-8",
    )
    access_handler.setFormatter(json_fmt)
    access_logger.addHandler(access_handler)

    # Console output cho access cũng vào root handler qua nó
    access_logger.addHandler(ch)


def get_logger(name: str) -> logging.Logger:
    """Trả về logger đã cấu hình. Dùng: logger = get_logger(__name__)"""
    _setup_logging()
    return logging.getLogger(name)


def get_access_logger() -> logging.Logger:
    """Logger riêng cho HTTP access log."""
    _setup_logging()
    return logging.getLogger("access")


def cleanup_old_logs():
    """Xóa các file .gz quá LOG_RETENTION_DAYS ngày. Gọi từ scheduler."""
    log_dir = _get_log_dir()
    cutoff = datetime.now() - timedelta(days=settings.log_retention_days)
    removed = 0
    for f in log_dir.glob("*.gz"):
        if datetime.fromtimestamp(f.stat().st_mtime) < cutoff:
            f.unlink()
            removed += 1
    if removed:
        logging.getLogger(__name__).info(f"Log cleanup: removed {removed} old .gz files")
