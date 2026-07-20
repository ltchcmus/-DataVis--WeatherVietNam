import os
import pandas as pd
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
from pathlib import Path

# Load env
load_dotenv()
db_url = os.getenv("DATABASE_URL")

if not db_url:
    print("Lỗi: Không tìm thấy DATABASE_URL trong .env")
    exit(1)

print("Đang kết nối Database Supabase...")
engine = create_engine(db_url)

sql_create_tables = """
CREATE TABLE IF NOT EXISTS public.cities (
    city_id text PRIMARY KEY,
    city text,
    country text,
    latitude double precision,
    longitude double precision
);

CREATE TABLE IF NOT EXISTS public.weather_daily (
    city_id text REFERENCES public.cities(city_id),
    date date,
    weather_code integer,
    temperature_2m_max double precision,
    temperature_2m_min double precision,
    temperature_2m_mean double precision,
    rain_sum double precision,
    shortwave_radiation_sum double precision,
    wind_direction_10m_dominant double precision,
    wind_speed_10m_max double precision,
    wind_speed_10m_mean double precision,
    wind_gusts_10m_max double precision,
    wind_gusts_10m_mean double precision,
    relative_humidity_2m_max double precision,
    relative_humidity_2m_min double precision,
    relative_humidity_2m_mean double precision,
    cloud_cover_max double precision,
    cloud_cover_min double precision,
    cloud_cover_mean double precision,
    aqi integer,
    PRIMARY KEY (city_id, date)
);
"""

try:
    with engine.begin() as conn:
        print("🔨 Đang tạo bảng cities và weather_daily...")
        conn.execute(text(sql_create_tables))
    print("Tạo bảng thành công!")
except Exception as e:
    print(f"Lỗi tạo bảng: {e}")
    exit(1)

print("Đang nạp dữ liệu tọa độ vào bảng cities...")
try:
    # Đọc cả 2 file
    df_vn = pd.read_csv("data/VietNam.csv")
    df_1500 = pd.read_csv("data/cities_1500.csv")
    
    # Chuẩn hóa df_vn
    df_vn = df_vn.rename(columns={
        "ID": "city_id",
        "City": "city",
        "Latitude": "latitude",
        "Longitude": "longitude"
    })
    df_vn["country"] = "Viet Nam"

    # Chuẩn hóa df_1500
    df_1500 = df_1500.rename(columns={
        "ID": "city_id",
        "City": "city",
        "Country": "country",
        "Latitude": "latitude",
        "Longitude": "longitude"
    })
    if "country" not in df_1500.columns:
        df_1500["country"] = "Unknown"
    
    # Gộp lại
    df_all = pd.concat([df_vn, df_1500], ignore_index=True)
    
    # Ép kiểu city_id thành text để khớp DB
    df_all["city_id"] = df_all["city_id"].astype(str)
    
    # Lọc bỏ trùng lặp
    df_all = df_all.drop_duplicates(subset=["city_id"])
    
    # Chỉ giữ các cột cần thiết
    df_all = df_all[["city_id", "city", "country", "latitude", "longitude"]]
    
    # Đẩy vào Supabase (dùng on_conflict do_nothing bằng cách insert qua pandas có thể lỗi nếu trùng, 
    # nên ta dùng if_exists='append' nhưng có thể lỗi PK. Tốt nhất là xoá bảng hoặc insert ignore.
    # Tuy nhiên vì nãy giờ bảng trống, ta cứ append.
    
    with engine.begin() as conn:
        # Xóa cũ trước cho an toàn
        conn.execute(text("DELETE FROM weather_daily"))
        conn.execute(text("DELETE FROM cities"))
        
    df_all.to_sql("cities", engine, if_exists="append", index=False)
    print(f"Đã nạp {len(df_all)} thành phố vào bảng cities thành công!")
except Exception as e:
    print(f"Lỗi nạp dữ liệu: {e}")
    
print("Hoàn tất quá trình khởi tạo Database Supabase!")
print("Bây giờ bạn có thể chạy: python run_pipeline_now.py")
