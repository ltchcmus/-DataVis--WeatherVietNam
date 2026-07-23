import { useState, useEffect, useMemo } from 'react';

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

function mapSupabaseRecord(rec) {
  const cityInfo = rec.cities || {};
  return {
    date: rec.date,
    city_id: String(rec.city_id),
    province: cityInfo.city || '',
    country: cityInfo.country || 'Viet Nam',
    latitude: toNum(cityInfo.latitude),
    longitude: toNum(cityInfo.longitude),
    temperature_max: toNum(rec.temperature_2m_max ?? rec.temperature_max),
    temperature_min: toNum(rec.temperature_2m_min ?? rec.temperature_min),
    temperature_mean: toNum(rec.temperature_2m_mean ?? rec.temperature_mean),
    rain_sum: toNum(rec.rain_sum),
    humidity_mean: toNum(rec.relative_humidity_2m_mean ?? rec.humidity_mean),
    wind_speed_max: toNum(rec.wind_speed_10m_max ?? rec.wind_speed_max),
    aqi: toNum(rec.aqi),
    cloud_cover_mean: toNum(rec.cloud_cover_mean),
  };
}

async function fetchAllSupabaseRecords(supabaseUrl, supabaseKey) {
  const pageSize = 1000;
  const maxPages = 25; // 25,000 records in parallel covers 2024, 2025, and 2026
  const pagePromises = [];

  for (let page = 0; page < maxPages; page++) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const endpoint = `${supabaseUrl}/rest/v1/weather_daily?select=*,cities(city,country,latitude,longitude)&order=date.desc`;
    
    pagePromises.push(
      fetch(endpoint, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Range': `${from}-${to}`,
        },
      }).then(res => (res.ok ? res.json() : []))
    );
  }

  const results = await Promise.all(pagePromises);
  const allRawData = results.flat();
  return allRawData;
}

export default function useWeatherData() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

      if (supabaseUrl && supabaseKey) {
        try {
          const rawData = await fetchAllSupabaseRecords(supabaseUrl, supabaseKey);
          if (Array.isArray(rawData) && rawData.length > 0) {
            const mapped = rawData.map(mapSupabaseRecord);
            // Sort ascending by date
            mapped.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
            setData(mapped);
            setLoading(false);
            return;
          }
        } catch (err) {
          console.warn('Failed to fetch from Supabase, falling back to local dataset.csv:', err);
        }
      }

      // Fallback to local dataset.csv
      try {
        const res = await fetch('/dataset.csv');
        if (!res.ok) throw new Error('Failed to load dataset');
        const text = await res.text();
        setData(parseCSV(text));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
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

  return { data, loading, error, dates, provinces };
}

