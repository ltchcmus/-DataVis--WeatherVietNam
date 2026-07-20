"""
Pipe 2 — Transformer: Làm sạch và chuẩn hóa dữ liệu thô từ Fetcher.

Filter chain:
  raw_records -> [remove_nulls] -> [clamp_values] -> [add_metadata] -> clean_records
"""
from app.utils.logger import get_logger

logger = get_logger(__name__)

_TEMP_RANGE = (-20.0, 55.0)
_HUMIDITY_RANGE = (0.0, 100.0)
_WIND_RANGE = (0.0, 300.0)
_AQI_RANGE = (0, 500)


def _clamp(val, lo, hi):
    if val is None:
        return None
    try:
        v = float(val)
        return max(lo, min(hi, v))
    except (ValueError, TypeError):
        return None


def _clamp_int(val, lo, hi):
    if val is None:
        return None
    try:
        v = int(val)
        return max(lo, min(hi, v))
    except (ValueError, TypeError):
        return None


def transform_records(raw_records: list[dict]) -> list[dict]:
    """
    Pipe-and-Filter: làm sạch và validate records.
    Trả về list records đã clean (không xóa record, chỉ clamp giá trị).
    """
    clean = []
    for rec in raw_records:
        cleaned = {
            "city_id": rec["city_id"],
            "date": rec["date"],
            "weather_code": _clamp_int(rec.get("weather_code"), 0, 99),
            "temperature_2m_max": _clamp(rec.get("temperature_2m_max"), *_TEMP_RANGE),
            "temperature_2m_min": _clamp(rec.get("temperature_2m_min"), *_TEMP_RANGE),
            "temperature_2m_mean": _clamp(rec.get("temperature_2m_mean"), *_TEMP_RANGE),
            "rain_sum": _clamp(rec.get("rain_sum"), 0.0, 1500.0),
            "shortwave_radiation_sum": _clamp(rec.get("shortwave_radiation_sum"), 0.0, 40.0),
            "wind_direction_10m_dominant": _clamp(rec.get("wind_direction_10m_dominant"), 0.0, 360.0),
            "wind_speed_10m_max": _clamp(rec.get("wind_speed_10m_max"), *_WIND_RANGE),
            "wind_speed_10m_mean": _clamp(rec.get("wind_speed_10m_mean"), *_WIND_RANGE),
            "wind_gusts_10m_max": _clamp(rec.get("wind_gusts_10m_max"), *_WIND_RANGE),
            "wind_gusts_10m_mean": _clamp(rec.get("wind_gusts_10m_mean"), *_WIND_RANGE),
            "relative_humidity_2m_max": _clamp(rec.get("relative_humidity_2m_max"), *_HUMIDITY_RANGE),
            "relative_humidity_2m_min": _clamp(rec.get("relative_humidity_2m_min"), *_HUMIDITY_RANGE),
            "relative_humidity_2m_mean": _clamp(rec.get("relative_humidity_2m_mean"), *_HUMIDITY_RANGE),
            "cloud_cover_max": _clamp(rec.get("cloud_cover_max"), *_HUMIDITY_RANGE),
            "cloud_cover_min": _clamp(rec.get("cloud_cover_min"), *_HUMIDITY_RANGE),
            "cloud_cover_mean": _clamp(rec.get("cloud_cover_mean"), *_HUMIDITY_RANGE),
            "aqi": _clamp_int(rec.get("aqi"), *_AQI_RANGE),
        }
        clean.append(cleaned)

    logger.debug(f"Transformed {len(clean)}/{len(raw_records)} records")
    return clean
