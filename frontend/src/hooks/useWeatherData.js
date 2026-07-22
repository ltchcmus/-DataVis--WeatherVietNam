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

export default function useWeatherData() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/dataset.csv')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load dataset');
        return res.text();
      })
      .then(text => {
        setData(parseCSV(text));
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const dates = useMemo(
    () => [...new Set(data.map(r => r.date))].sort(),
    [data],
  );

  const provinces = useMemo(
    () => [...new Set(data.map(r => r.province))].sort((a, b) => a.localeCompare(b, 'vi')),
    [data],
  );

  return { data, loading, error, dates, provinces };
}
