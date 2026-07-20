"""
CSV Manager: Export rolling 7-day window sang dataset.csv.

Sau khi pipeline nạp dữ liệu mới vào Supabase, module này:
1. Query 7 ngày gần nhất từ Supabase cho các thành phố VN
2. Export ra data/dataset.csv (ghi đè)
3. Reload DatasetService cache
"""
import datetime
from pathlib import Path

from app.config import get_settings
from app.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()

_DATA_DIR = Path(__file__).parent.parent.parent / "data"
_DATASET_PATH = _DATA_DIR / "dataset.csv"
_ROLLING_DAYS = 7


def export_rolling_csv() -> bool:
    """
    Query 7 ngày gần nhất từ Supabase và export ra dataset.csv.
    Returns True nếu thành công.
    """
    if not settings.supabase_url or not settings.supabase_service_role_key:
        logger.warning("Supabase credentials not configured — skipping CSV export")
        return False

    try:
        import pandas as pd
        from supabase import create_client

        sb = create_client(settings.supabase_url, settings.supabase_service_role_key)
        end_date = datetime.date.today() - datetime.timedelta(days=1)
        start_date = end_date - datetime.timedelta(days=_ROLLING_DAYS - 1)

        scope = settings.cities_scope.lower()
        if scope == "vietnam":
            # Filter chỉ lấy thành phố Việt Nam
            cities_resp = sb.table("cities").select("city_id").eq("country", "Viet Nam").execute()
            city_ids = [c["city_id"] for c in cities_resp.data]
            query = (
                sb.table("weather_daily")
                .select("*, cities(city, country, latitude, longitude)")
                .gte("date", start_date.isoformat())
                .lte("date", end_date.isoformat())
                .in_("city_id", city_ids)
                .order("date", desc=False)
            )
        else:
            query = (
                sb.table("weather_daily")
                .select("*, cities(city, country, latitude, longitude)")
                .gte("date", start_date.isoformat())
                .lte("date", end_date.isoformat())
                .order("date", desc=False)
            )

        resp = query.execute()
        if not resp.data:
            logger.warning("No data returned from Supabase for CSV export")
            return False

        rows = []
        for rec in resp.data:
            city_info = rec.pop("cities", {}) or {}
            rows.append({
                "date": rec["date"],
                "city_id": rec["city_id"],
                "province": city_info.get("city", ""),
                "country": city_info.get("country", ""),
                "latitude": city_info.get("latitude"),
                "longitude": city_info.get("longitude"),
                "temperature_max": rec.get("temperature_2m_max"),
                "temperature_min": rec.get("temperature_2m_min"),
                "temperature_mean": rec.get("temperature_2m_mean"),
                "rain_sum": rec.get("rain_sum"),
                "humidity_mean": rec.get("relative_humidity_2m_mean"),
                "wind_speed_max": rec.get("wind_speed_10m_max"),
                "aqi": rec.get("aqi"),
                "cloud_cover_mean": rec.get("cloud_cover_mean"),
            })

        df = pd.DataFrame(rows)
        _DATA_DIR.mkdir(parents=True, exist_ok=True)
        df.to_csv(_DATASET_PATH, index=False)
        logger.info(f"Exported {len(df)} rows to {_DATASET_PATH} ({start_date} → {end_date})")

        # Reload DatasetService cache
        try:
            from app.services.dataset_service import dataset_service
            dataset_service._cache.clear()
            dataset_service._df_cache.clear()
            logger.info("DatasetService cache invalidated")
        except Exception:
            pass

        return True

    except ImportError:
        logger.error("supabase-py not installed")
        return False
    except Exception as e:
        logger.error(f"CSV export failed: {e}")
        return False
