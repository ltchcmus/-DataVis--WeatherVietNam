import { useState, useEffect, useMemo } from 'react';

const NUMERIC_FIELDS = new Set([
  'city_id', 'latitude', 'longitude',
  'temperature_max', 'temperature_min', 'temperature_mean',
  'rain_sum', 'humidity_mean', 'wind_speed_max', 'aqi', 'cloud_cover_mean',
]);

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
        row[header] = NUMERIC_FIELDS.has(header) ? parseFloat(raw) : raw;
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
    latitude: cityInfo.latitude != null ? parseFloat(cityInfo.latitude) : null,
    longitude: cityInfo.longitude != null ? parseFloat(cityInfo.longitude) : null,
    temperature_max: rec.temperature_2m_max != null ? parseFloat(rec.temperature_2m_max) : null,
    temperature_min: rec.temperature_2m_min != null ? parseFloat(rec.temperature_2m_min) : null,
    temperature_mean: rec.temperature_2m_mean != null ? parseFloat(rec.temperature_2m_mean) : null,
    rain_sum: rec.rain_sum != null ? parseFloat(rec.rain_sum) : null,
    humidity_mean: rec.relative_humidity_2m_mean != null ? parseFloat(rec.relative_humidity_2m_mean) : null,
    wind_speed_max: rec.wind_speed_10m_max != null ? parseFloat(rec.wind_speed_10m_max) : null,
    aqi: rec.aqi != null ? parseFloat(rec.aqi) : null,
    cloud_cover_mean: rec.cloud_cover_mean != null ? parseFloat(rec.cloud_cover_mean) : null,
  };
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
          const endpoint = `${supabaseUrl}/rest/v1/weather_daily?select=*,cities(city,country,latitude,longitude)&order=date.asc&limit=10000`;
          const res = await fetch(endpoint, {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Range-Unit': 'items',
            },
          });

          if (res.ok) {
            const rawData = await res.json();
            if (Array.isArray(rawData) && rawData.length > 0) {
              const mapped = rawData.map(mapSupabaseRecord);
              setData(mapped);
              setLoading(false);
              return;
            }
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

