"""
security.py — Code Safety Validator

Kiểm tra Python code do AI sinh ra có chứa các
lệnh nguy hiểm không trước khi trả về cho frontend.

NOTE: File này được Thịnh dùng lại trong /execute endpoint.
"""

from app.utils.logger import get_logger

logger = get_logger(__name__)

BLACKLIST_PATTERNS = [
    "import os",
    "import sys",
    "import subprocess",
    "import socket",
    "import shutil",
    "import requests",
    "import urllib",
    "import http",
    "import ftplib",
    "import smtplib",
    "__import__",
    "eval(",
    "exec(",
    "compile(",
    "open(",
    "os.system",
    "os.popen",
    "os.remove",
    "os.rmdir",
    "shutil.rmtree",
    "subprocess.run",
    "subprocess.call",
    "subprocess.Popen",
]


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

    for pattern in BLACKLIST_PATTERNS:
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
