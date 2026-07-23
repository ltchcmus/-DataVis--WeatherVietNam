"""
CSV Manager: Export CSV files cho từng khoảng thời gian.

Sau khi pipeline nạp dữ liệu mới vào Supabase, module này:
1. Query Supabase và export 4 file CSV:
   - dataset7days.csv  : 7 ngày gần nhất
   - dataset30days.csv : 30 ngày gần nhất
   - dataset90days.csv : 90 ngày gần nhất
   - datasetall.csv    : Toàn bộ dữ liệu lịch sử
2. Sync tất cả file sang frontend/public/data/ (failover offline)
3. Reload DatasetService cache
"""
import datetime
import shutil
from pathlib import Path

from app.config import get_settings
from app.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()

_DATA_DIR = Path(__file__).parent.parent.parent / "data"

# Paths cho từng file CSV
_DATASET_7D_PATH  = _DATA_DIR / "dataset7days.csv"
_DATASET_30D_PATH = _DATA_DIR / "dataset30days.csv"
_DATASET_90D_PATH = _DATA_DIR / "dataset90days.csv"
_DATASET_ALL_PATH = _DATA_DIR / "datasetall.csv"

# Path đến frontend/public/data để sync failover
_FRONTEND_PUBLIC_DATA = (
    Path(__file__).parent.parent.parent.parent  # gốc project
    / "frontend" / "public" / "data"
)


def _build_query(sb, scope: str, start_date=None, end_date=None):
    """Tạo Supabase query với optional date range."""
    if scope == "vietnam":
        cities_resp = sb.table("cities").select("city_id").eq("country", "Viet Nam").execute()
        city_ids = [c["city_id"] for c in cities_resp.data]
        query = (
            sb.table("weather_daily")
            .select("*, cities(city, country, latitude, longitude)")
            .in_("city_id", city_ids)
            .order("date", desc=False)
        )
    else:
        query = (
            sb.table("weather_daily")
            .select("*, cities(city, country, latitude, longitude)")
            .order("date", desc=False)
        )

    if start_date:
        query = query.gte("date", start_date.isoformat())
    if end_date:
        query = query.lte("date", end_date.isoformat())

    return query


def _records_to_rows(resp_data: list) -> list:
    """Chuyển response Supabase thành list of dicts theo schema CSV."""
    rows = []
    for rec in resp_data:
        city_info = rec.pop("cities", {}) or {}
        rows.append({
            "date":             rec["date"],
            "city_id":          rec["city_id"],
            "province":         city_info.get("city", ""),
            "country":          city_info.get("country", ""),
            "latitude":         city_info.get("latitude"),
            "longitude":        city_info.get("longitude"),
            "temperature_max":  rec.get("temperature_2m_max"),
            "temperature_min":  rec.get("temperature_2m_min"),
            "temperature_mean": rec.get("temperature_2m_mean"),
            "rain_sum":         rec.get("rain_sum"),
            "humidity_mean":    rec.get("relative_humidity_2m_mean"),
            "wind_speed_max":   rec.get("wind_speed_10m_max"),
            "aqi":              rec.get("aqi"),
            "cloud_cover_mean": rec.get("cloud_cover_mean"),
        })
    return rows


def _paginated_fetch(sb, scope: str, start_date=None, end_date=None) -> list:
    """Fetch toàn bộ records theo pagination (1000 rows/page)."""
    import time
    PAGE_SIZE = 1000
    all_rows = []
    page = 0

    # Lấy total count trước
    if scope == "vietnam":
        cities_resp = sb.table("cities").select("city_id").eq("country", "Viet Nam").execute()
        city_ids = [c["city_id"] for c in cities_resp.data]
        count_query = sb.table("weather_daily").select("city_id", count="exact").in_("city_id", city_ids)
    else:
        count_query = sb.table("weather_daily").select("city_id", count="exact")

    if start_date:
        count_query = count_query.gte("date", start_date.isoformat())
    if end_date:
        count_query = count_query.lte("date", end_date.isoformat())

    count_resp = count_query.execute()
    total = count_resp.count or 0
    logger.info(f"  Total rows to fetch: {total}")

    while True:
        offset = page * PAGE_SIZE
        if total > 0 and offset >= total:
            break

        if scope == "vietnam":
            query = (
                sb.table("weather_daily")
                .select("*, cities(city, country, latitude, longitude)")
                .in_("city_id", city_ids)
                .order("date", desc=False)
                .range(offset, offset + PAGE_SIZE - 1)
            )
        else:
            query = (
                sb.table("weather_daily")
                .select("*, cities(city, country, latitude, longitude)")
                .order("date", desc=False)
                .range(offset, offset + PAGE_SIZE - 1)
            )

        if start_date:
            query = query.gte("date", start_date.isoformat())
        if end_date:
            query = query.lte("date", end_date.isoformat())

        resp = query.execute()
        if not resp.data:
            break

        all_rows.extend(_records_to_rows(resp.data))
        logger.info(f"  Fetched page {page + 1}: {len(resp.data)} rows (total so far: {len(all_rows)})")

        if len(resp.data) < PAGE_SIZE:
            break

        page += 1
        time.sleep(0.1)  # Tránh rate limit

    return all_rows


def _export_for_days(days: int | None, output_path: Path) -> bool:
    """
    Export CSV cho khoảng thời gian cụ thể.
    days=None → export toàn bộ lịch sử.
    """
    if not settings.supabase_url or not settings.supabase_service_role_key:
        logger.warning("Supabase credentials not configured — skipping CSV export")
        return False

    try:
        import pandas as pd
        from supabase import create_client

        sb = create_client(settings.supabase_url, settings.supabase_service_role_key)
        scope = settings.cities_scope.lower()

        if days is not None:
            end_date = datetime.date.today() - datetime.timedelta(days=1)
            start_date = end_date - datetime.timedelta(days=days - 1)
            label = f"{days} ngày"
        else:
            start_date = None
            end_date = None
            label = "toàn bộ lịch sử"

        logger.info(f"Exporting {label} → {output_path.name} ...")
        rows = _paginated_fetch(sb, scope, start_date, end_date)

        if not rows:
            logger.warning(f"No data returned for {label}")
            return False

        df = pd.DataFrame(rows)
        _DATA_DIR.mkdir(parents=True, exist_ok=True)
        df.to_csv(output_path, index=False)
        logger.info(f"  ✓ Exported {len(df)} rows to {output_path.name}")
        return True

    except ImportError:
        logger.error("supabase-py not installed")
        return False
    except Exception as e:
        logger.error(f"CSV export failed for {output_path.name}: {e}")
        return False


def _sync_to_frontend():
    """Copy tất cả CSV files sang frontend/public/data/ để failover khi backend offline."""
    try:
        _FRONTEND_PUBLIC_DATA.mkdir(parents=True, exist_ok=True)
        csv_files = [
            _DATASET_7D_PATH,
            _DATASET_30D_PATH,
            _DATASET_90D_PATH,
            _DATASET_ALL_PATH,
        ]
        synced = 0
        for src in csv_files:
            if src.exists():
                dst = _FRONTEND_PUBLIC_DATA / src.name
                shutil.copy2(src, dst)
                logger.info(f"  Synced {src.name} → {dst}")
                synced += 1
        logger.info(f"Frontend sync complete: {synced} files copied to {_FRONTEND_PUBLIC_DATA}")
    except Exception as e:
        logger.warning(f"Frontend sync failed (non-critical): {e}")


def export_all_csvs() -> dict:
    """
    Export toàn bộ 4 file CSV preset + sync sang frontend/public/data/.
    Returns dict kết quả {preset: success}.
    """
    logger.info("=" * 50)
    logger.info("Starting CSV export for all presets...")

    results = {
        "7days":  _export_for_days(7,  _DATASET_7D_PATH),
        "30days": _export_for_days(30, _DATASET_30D_PATH),
        "90days": _export_for_days(90, _DATASET_90D_PATH),
        "all":    _export_for_days(None, _DATASET_ALL_PATH),
    }

    logger.info(f"Export results: {results}")

    # Reload DatasetService cache
    try:
        from app.services.dataset_service import dataset_service
        dataset_service._cache.clear()
        dataset_service._df_cache.clear()
        logger.info("DatasetService cache invalidated")
    except Exception:
        pass

    # Sync sang frontend/public/data/
    _sync_to_frontend()

    logger.info("=" * 50)
    return results


# Backward compatibility alias
def export_rolling_csv() -> bool:
    """Deprecated: Dùng export_all_csvs() thay thế."""
    logger.warning("export_rolling_csv() is deprecated, use export_all_csvs()")
    return _export_for_days(7, _DATASET_7D_PATH)
