"""
Pipe 1 — Fetcher: Lấy dữ liệu thời tiết từ Open-Meteo Archive API.

Hỗ trợ CITIES_SCOPE toggle:
  - "vietnam" → đọc data/VietNam.csv  (63 thành phố)
  - "all"     → đọc data/cities_1500.csv (1533 thành phố)
"""
import datetime
import os
import random
import time
from pathlib import Path
from typing import Optional

import pandas as pd
import requests

from app.config import get_settings
from app.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()

_ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"
_AQI_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"

DAILY_VARS = [
    "weather_code", "temperature_2m_max", "temperature_2m_min",
    "temperature_2m_mean", "rain_sum", "shortwave_radiation_sum",
    "wind_direction_10m_dominant", "wind_speed_10m_max", "wind_speed_10m_mean",
    "wind_gusts_10m_max", "wind_gusts_10m_mean",
    "relative_humidity_2m_max", "relative_humidity_2m_min", "relative_humidity_2m_mean",
    "cloud_cover_max", "cloud_cover_min", "cloud_cover_mean",
]

_MAX_RETRIES = 4
_RETRY_BACKOFF = (1.0, 5.0, 15.0, 30.0)


def load_cities() -> pd.DataFrame:
    """Load cities CSV dựa theo CITIES_SCOPE env."""
    data_dir = Path(__file__).parent.parent.parent / "data"
    scope = settings.cities_scope.lower()

    if scope == "vietnam":
        csv_path = data_dir / "VietNam.csv"
    else:
        csv_path = data_dir / "cities_1500.csv"

    if not csv_path.exists():
        logger.error(f"Cities CSV not found: {csv_path}")
        raise FileNotFoundError(f"Cities CSV not found: {csv_path}")

    df = pd.read_csv(csv_path)
    logger.info(f"Loaded {len(df)} cities | scope={scope}")
    return df


def _jitter_wait(base: float, step: int, cap: float) -> float:
    ceiling = min(cap, base * (2 ** step))
    return random.uniform(0, ceiling)


def fetch_aqi(lat: float, lon: float, start: datetime.date, end: datetime.date) -> dict[str, int | None]:
    """Fetch daily AQI từ Open-Meteo Air Quality API."""
    params = {
        "latitude": lat, "longitude": lon,
        "hourly": "european_aqi",
        "start_date": start.isoformat(), "end_date": end.isoformat(),
        "timezone": "GMT",
    }
    try:
        resp = requests.get(_AQI_URL, params=params, timeout=30)
        resp.raise_for_status()
        hourly = resp.json().get("hourly", {})
        times = hourly.get("time", [])
        aqi_vals = hourly.get("european_aqi", [])
        daily: dict[str, list[int]] = {}
        for t, v in zip(times, aqi_vals):
            if v is not None:
                daily.setdefault(t[:10], []).append(int(v))
        return {d: min(round(sum(vals) / len(vals)), 500) for d, vals in daily.items()}
    except Exception as e:
        logger.warning(f"AQI fetch failed lat={lat:.4f} lon={lon:.4f}: {e}")
        return {}


def fetch_city(
    city_id: int,
    city_name: str,
    lat: float,
    lon: float,
    start: datetime.date,
    end: datetime.date,
) -> Optional[list[dict]]:
    """
    Fetch thời tiết cho 1 thành phố từ start đến end.
    Returns list of record dicts hoặc None nếu thất bại.
    """
    params = {
        "latitude": lat, "longitude": lon,
        "start_date": start.isoformat(), "end_date": end.isoformat(),
        "daily": ",".join(DAILY_VARS),
        "timezone": "GMT",
    }

    rate_limit_count = 0

    for attempt in range(_MAX_RETRIES):
        try:
            resp = requests.get(_ARCHIVE_URL, params=params, timeout=30)

            if resp.status_code == 429:
                rate_limit_count += 1
                if rate_limit_count > 3:
                    logger.error(f"Too many rate limits for {city_name}. Giving up.")
                    return None
                wait = _jitter_wait(30, rate_limit_count - 1, 300)
                logger.warning(f"Rate limit {city_name} (#{rate_limit_count}). Wait {wait:.0f}s")
                time.sleep(wait)
                continue

            resp.raise_for_status()
            data = resp.json()
            daily = data.get("daily", {})
            dates = daily.get("time", [])
            if not dates:
                logger.warning(f"No data for {city_name} ({start} – {end})")
                return None

            # Fetch AQI cho cùng range
            aqi_by_date = fetch_aqi(lat, lon, start, end)

            def _fval(key, idx):
                arr = daily.get(key, [])
                v = arr[idx] if idx < len(arr) else None
                if v is None:
                    return None
                try:
                    return float(v)
                except (ValueError, TypeError):
                    return None

            records = []
            for i, date_str in enumerate(dates):
                wc = daily.get("weather_code", [])[i] if i < len(daily.get("weather_code", [])) else None
                records.append({
                    "city_id": city_id,
                    "date": date_str,
                    "weather_code": int(wc) if wc is not None else None,
                    **{var: _fval(var, i) for var in DAILY_VARS if var != "weather_code"},
                    "aqi": aqi_by_date.get(date_str),
                })

            logger.info(f"Fetched {len(records)} records for {city_name}")
            return records

        except (requests.exceptions.ConnectionError,
                requests.exceptions.Timeout,
                requests.exceptions.ChunkedEncodingError) as e:
            if attempt < _MAX_RETRIES - 1:
                wait = _RETRY_BACKOFF[attempt]
                logger.warning(f"Transient error {city_name} attempt {attempt+1}, retry in {wait}s: {e}")
                time.sleep(wait)
            else:
                logger.error(f"Giving up on {city_name}: {e}")
                return None
        except Exception as e:
            logger.error(f"Error fetching {city_name}: {e}")
            return None
