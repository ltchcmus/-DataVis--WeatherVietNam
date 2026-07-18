import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os

# Set seed for reproducibility
np.random.seed(42)

provinces = ["Hà Nội", "TP.HCM", "Đà Nẵng", "Hải Phòng", "Cần Thơ", "Nha Trang", "Đà Lạt", "Vũng Tàu", "Huế", "Quy Nhơn"]
start_date = datetime(2023, 1, 1)

data = []
# Generate 2500 rows
for i in range(2500):
    date = start_date + timedelta(days=i // len(provinces))
    province = provinces[i % len(provinces)]
    
    # Temperature based on province
    temp = np.random.normal(28, 5) if province != "Đà Lạt" else np.random.normal(20, 3)
    
    # Air quality metrics
    pm25 = np.random.lognormal(mean=3.5, sigma=0.5)
    pm10 = pm25 * np.random.uniform(1.2, 2.0)
    aqi = int(pm25 * 1.5 + np.random.normal(0, 10))
    aqi = max(0, min(500, aqi)) # Ensure realistic AQI
    
    # Weather metrics
    humidity = np.random.uniform(60, 95)
    wind_speed = np.random.uniform(0, 15)
    
    data.append({
        "date": date.strftime("%Y-%m-%d"),
        "province": province,
        "pm25": round(pm25, 2),
        "pm10": round(pm10, 2),
        "aqi": aqi,
        "temperature": round(temp, 1),
        "humidity": round(humidity, 1),
        "wind_speed": round(wind_speed, 1)
    })

df = pd.DataFrame(data)

# Ensure data directory exists
os.makedirs("data", exist_ok=True)

# Save to CSV
df.to_csv("data/dataset.csv", index=False)
print(f"Thành công! Đã tạo file data/dataset.csv với {len(df)} dòng và {len(df.columns)} cột.")
