import logging
import sys
from app.config import get_settings

settings = get_settings()


def get_logger(name: str) -> logging.Logger:
    """
    Trả về một logger đã được cấu hình chuẩn.
    Sử dụng: logger = get_logger(__name__)
    """
    logger = logging.getLogger(name)

    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        formatter = logging.Formatter(
            fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)

    level = getattr(logging, settings.log_level.upper(), logging.INFO)
    logger.setLevel(level)
    return logger
