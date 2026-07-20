"""
Batch Sequential Orchestrator — chạy pipeline đầy đủ:
  Batch 1: Fetch → Batch 2: Transform → Batch 3: Load + Export CSV

Pattern: Pipe-and-Filter trong mỗi batch, Sequential giữa các batch.
"""
import datetime
import time
from app.utils.logger import get_logger
from app.pipeline.fetcher import load_cities, fetch_city
from app.pipeline.transformer import transform_records
from app.pipeline.loader import load_to_supabase, invalidate_cache
from app.pipeline.csv_manager import export_rolling_csv

logger = get_logger(__name__)


def run_pipeline():
    """Main entry point — chạy toàn bộ pipeline một lần."""
    start_ts = time.time()
    logger.info("=" * 50)
    logger.info("Data pipeline started")

    try:
        cities_df = load_cities()
    except Exception as e:
        logger.error(f"Pipeline aborted — cannot load cities: {e}")
        return

    today = datetime.date.today()
    end_date = today - datetime.timedelta(days=1)

    # Lấy ngày mới nhất từng city đã có trong DB để chỉ fetch phần còn thiếu
    city_latest: dict[int, datetime.date] = _get_city_latest_dates()

    fetched_total = 0
    errors = 0

    for _, row in cities_df.iterrows():
        city_id = int(row["ID"])
        city_name = row["City"]
        lat = float(row["Latitude"])
        lon = float(row["Longitude"])

        latest = city_latest.get(city_id)
        if latest is None:
            start_date = datetime.date(2024, 1, 1)
        else:
            lag = (today - latest).days
            if lag < 2:
                continue  # Đã up-to-date
            start_date = latest + datetime.timedelta(days=1)

        # ── Batch 1: Fetch ──────────────────────────────────────
        raw_records = fetch_city(city_id, city_name, lat, lon, start_date, end_date)
        if not raw_records:
            errors += 1
            continue

        # ── Batch 2: Transform ──────────────────────────────────
        clean_records = transform_records(raw_records)

        # ── Batch 3: Load ───────────────────────────────────────
        upserted = load_to_supabase(clean_records)
        fetched_total += upserted

        time.sleep(0.3)

    # ── Post-pipeline: Export CSV + Invalidate cache ────────────
    logger.info(f"Upserted {fetched_total} total records, errors={errors}")
    export_rolling_csv()
    invalidate_cache("weather:*")
    invalidate_cache("meta:dataset")

    elapsed = round(time.time() - start_ts, 1)
    logger.info(f"Pipeline completed in {elapsed}s")
    logger.info("=" * 50)


def _get_city_latest_dates() -> dict[int, datetime.date]:
    """Query Supabase để lấy ngày dữ liệu mới nhất mỗi city bằng SQLAlchemy."""
    try:
        import os
        from sqlalchemy import create_engine
        import pandas as pd
        from app.config import get_settings
        
        settings = get_settings()
        db_url = os.getenv("DATABASE_URL")
        if not db_url:
            return {}
            
        engine = create_engine(db_url)
        df = pd.read_sql("SELECT city_id, MAX(date) as max_date FROM weather_daily GROUP BY city_id", engine)
        
        return {
            int(row["city_id"]): row["max_date"]
            for _, row in df.iterrows() if pd.notnull(row["max_date"])
        }
    except Exception as e:
        logger.warning(f"Cannot get latest dates from DB: {e}")
        return {}
