"""
csv_router.py — Serve static CSV files cho Frontend Dashboard.

Endpoint: GET /csv/{preset}
  preset = 7days | 30days | 90days | all

Frontend dùng endpoint này để load data thay vì gọi Supabase trực tiếp.
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path
from app.config import get_settings
from app.utils.logger import get_logger

router = APIRouter(prefix="/csv", tags=["CSV Data"])
logger = get_logger(__name__)
settings = get_settings()

_DATA_DIR = Path(__file__).parent.parent.parent / "data"

_PRESET_MAP = {
    "7days":  _DATA_DIR / "dataset7days.csv",
    "30days": _DATA_DIR / "dataset30days.csv",
    "90days": _DATA_DIR / "dataset90days.csv",
    "all":    _DATA_DIR / "datasetall.csv",
    # Backward compat
    "default": _DATA_DIR / "dataset7days.csv",
}


@router.get("/{preset}", summary="Serve pre-generated CSV file by time preset")
async def get_csv(preset: str):
    """
    Trả về file CSV tương ứng với preset thời gian.
    
    - **7days**: 7 ngày gần nhất
    - **30days**: 30 ngày gần nhất  
    - **90days**: 90 ngày gần nhất
    - **all**: Toàn bộ lịch sử
    """
    csv_path = _PRESET_MAP.get(preset)
    if csv_path is None:
        raise HTTPException(
            status_code=404,
            detail=f"Preset '{preset}' not found. Valid: 7days, 30days, 90days, all"
        )
    
    if not csv_path.exists():
        # Thử fallback sang dataset.csv cũ nếu file mới chưa được tạo
        fallback = _DATA_DIR / "dataset.csv"
        if fallback.exists() and preset == "7days":
            logger.warning(f"dataset7days.csv not found, serving fallback dataset.csv")
            return FileResponse(
                path=str(fallback),
                media_type="text/csv",
                filename="dataset7days.csv"
            )
        raise HTTPException(
            status_code=503,
            detail=f"CSV file for preset '{preset}' not generated yet. Run export script first."
        )
    
    logger.info(f"Serving CSV: {csv_path.name} ({csv_path.stat().st_size // 1024} KB)")
    return FileResponse(
        path=str(csv_path),
        media_type="text/csv",
        filename=csv_path.name,
        headers={"Cache-Control": "public, max-age=3600"},  # Cache 1h ở browser
    )


@router.get("", summary="List available CSV presets")
async def list_presets():
    """Liệt kê các preset CSV có sẵn và trạng thái file."""
    result = {}
    for preset, path in _PRESET_MAP.items():
        if preset == "default":
            continue
        result[preset] = {
            "available": path.exists(),
            "size_kb": round(path.stat().st_size / 1024, 1) if path.exists() else None,
            "filename": path.name,
        }
    return result
