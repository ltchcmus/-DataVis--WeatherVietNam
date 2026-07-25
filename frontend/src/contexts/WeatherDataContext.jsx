/**
 * WeatherDataContext.jsx
 * 
 * Global React Context để load và share dữ liệu thời tiết cho toàn bộ Dashboard.
 * 
 * Lợi ích:
 *  - Load data 1 lần duy nhất khi app khởi động
 *  - Share cho tất cả 4 tab (Overview, TimeTrend, ProvinceComparison, RelationshipAnalysis)
 *  - Không fetch lại khi chuyển tab
 *  - Loại bỏ 100 Supabase parallel requests → 1 CSV request
 * 
 * Chiến lược load (ưu tiên từ trên xuống):
 *  1. GET /csv/all  →  Backend endpoint (pre-generated CSV, toàn bộ ~60k rows)
 *  2. /data/datasetall.csv  →  Static fallback từ frontend/public/data/ (offline mode)
 *  3. /data/dataset.csv     →  Legacy fallback nếu không có file mới
 */
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

const WeatherDataContext = createContext(null);

const NUMERIC_FIELDS = new Set([
  'city_id', 'latitude', 'longitude',
  'temperature_max', 'temperature_min', 'temperature_mean',
  'rain_sum', 'humidity_mean', 'wind_speed_max', 'aqi', 'cloud_cover_mean',
]);

function toNum(val, defaultVal = 0) {
  if (val == null || val === '') return defaultVal;
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : defaultVal;
}

function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  return lines
    .slice(1)
    .filter(line => line.trim())
    .map(line => {
      const values = line.split(',');
      const row = {};
      headers.forEach((header, i) => {
        const raw = values[i]?.trim();
        row[header] = NUMERIC_FIELDS.has(header) ? toNum(raw) : raw;
      });
      return row;
    });
}

async function loadFromUrl(url, label) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const rows = parseCSV(text);
    if (rows.length === 0) throw new Error('Empty CSV');
    console.log(`[WeatherData] ✓ Loaded ${rows.length} rows from ${label}`);
    return rows;
  } catch (err) {
    console.warn(`[WeatherData] ✗ Failed ${label}: ${err.message}`);
    return null;
  }
}

export function WeatherDataProvider({ children }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dataSource, setDataSource] = useState(null); // for debug

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);

      // Chiến lược 1: Backend /csv/all endpoint
      let rows = await loadFromUrl('/csv/all', 'Backend /csv/all');
      if (rows) {
        rows.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
        setData(rows);
        setDataSource('backend-csv-all');
        setLoading(false);
        return;
      }

      // Chiến lược 2: Static fallback — datasetall.csv trong public/data/
      rows = await loadFromUrl('/data/datasetall.csv', 'static /data/datasetall.csv');
      if (rows) {
        rows.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
        setData(rows);
        setDataSource('static-datasetall');
        setLoading(false);
        return;
      }

      // Chiến lược 3: Legacy fallback — dataset.csv
      rows = await loadFromUrl('/data/dataset.csv', 'legacy /data/dataset.csv');
      if (rows) {
        rows.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
        setData(rows);
        setDataSource('legacy-dataset');
        setLoading(false);
        return;
      }

      // Chiến lược 4: Root legacy
      rows = await loadFromUrl('/dataset.csv', 'root /dataset.csv');
      if (rows) {
        rows.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
        setData(rows);
        setDataSource('root-legacy');
        setLoading(false);
        return;
      }

      setError('Không thể tải dữ liệu. Vui lòng kiểm tra backend hoặc file CSV.');
      setLoading(false);
    }

    loadData();
  }, []);

  const dates = useMemo(
    () => [...new Set(data.map(r => r.date))].filter(Boolean).sort(),
    [data],
  );

  const provinces = useMemo(
    () => [...new Set(data.map(r => r.province))].filter(Boolean).sort((a, b) => a.localeCompare(b, 'vi')),
    [data],
  );

  const value = { data, loading, error, dates, provinces, dataSource };

  return (
    <WeatherDataContext.Provider value={value}>
      {children}
    </WeatherDataContext.Provider>
  );
}

export function useWeatherContext() {
  const ctx = useContext(WeatherDataContext);
  if (!ctx) {
    throw new Error('useWeatherContext must be used within <WeatherDataProvider>');
  }
  return ctx;
}

export default WeatherDataContext;
