"""
security.py — Code Safety Validator

Kiểm tra Python code do AI sinh ra có chứa các
lệnh nguy hiểm không trước khi trả về cho frontend.
"""

from app.utils.logger import get_logger

logger = get_logger(__name__)

import os

def get_blacklist_patterns() -> list[str]:
    """Đọc danh sách blacklist từ file blacklist.txt"""
    blacklist_file = os.path.join(os.path.dirname(__file__), "blacklist.txt")
    if not os.path.exists(blacklist_file):
        return []
    
    patterns = []
    with open(blacklist_file, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#"):
                patterns.append(line)
    return patterns


def validate_code(code: str) -> list[str]:
    """
    Kiểm tra code có chứa blacklist keyword không.

    Args:
        code: Python code string do AI sinh ra.

    Returns:
        Danh sách warnings (rỗng nếu code sạch).
    """
    if not code:
        return []

    warnings: list[str] = []
    blacklist_patterns = get_blacklist_patterns()

    for pattern in blacklist_patterns:
        if pattern in code:
            warning_msg = f"Detected potentially unsafe pattern: '{pattern}'"
            warnings.append(warning_msg)
            logger.warning(f"Security check failed | pattern='{pattern}'")

    if not warnings:
        logger.debug("Security check passed — code is clean")

    return warnings


def is_code_safe(code: str) -> bool:
    """Trả True nếu code không có pattern nguy hiểm."""
    return len(validate_code(code)) == 0
