import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, ZAxis } from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Mock Data cho Trends
const trendData = [
  { date: '1/1', max: 32, mean: 28, min: 24, rain: 0 },
  { date: '2/1', max: 33, mean: 29, min: 25, rain: 10 },
  { date: '3/1', max: 30, mean: 27, min: 23, rain: 45 },
  { date: '4/1', max: 28, mean: 25, min: 22, rain: 60 },
  { date: '5/1', max: 29, mean: 26, min: 23, rain: 20 },
];

// Mock Data cho Scatter (Độ ẩm vs Mây)
const scatterData = [
  { humidity: 60, cloud: 20 },
  { humidity: 70, cloud: 40 },
  { humidity: 85, cloud: 80 },
  { humidity: 90, cloud: 100 },
  { humidity: 65, cloud: 30 },
];

// Mock Data cho Map (Một số tỉnh)
const mapData = [
  { name: 'Hà Nội', lat: 21.0285, lng: 105.8542, temp: 24, aqi: 120 },
  { name: 'TP.HCM', lat: 10.8231, lng: 106.6297, temp: 32, aqi: 80 },
  { name: 'Đà Nẵng', lat: 16.0471, lng: 108.2062, temp: 28, aqi: 45 },
];

export const KPICard = ({ title, value, subValue, colorClass, icon }) => (
  <div className="kpi-card" style={{ borderLeft: `4px solid var(${colorClass})` }}>
    <div className="kpi-card-inner">
      <div className="kpi-content">
        <h3>{title}</h3>
        <p>{value}</p>
        {subValue && <span className="kpi-subvalue" style={{ color: `var(${colorClass})` }}>{subValue}</span>}
      </div>
      {icon && (
        <div className="kpi-icon" style={{ color: `var(${colorClass})`, opacity: 0.8 }}>
          {icon}
        </div>
      )}
    </div>
  </div>
);

export const PlaceholderChart = ({ title, icon }) => (
  <div className="half-chart placeholder-chart">
    <div className="placeholder-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.6 }}>
      <div className="placeholder-icon" style={{ color: 'var(--text-secondary)' }}>{icon}</div>
      <h3 style={{ marginTop: '1rem', fontSize: '1.1rem', textAlign: 'center', color: 'var(--text-primary)' }}>{title}</h3>
      <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '0.5rem', fontSize: '0.9rem', maxWidth: '80%' }}>
        Khu vực dành cho biểu đồ dữ liệu.<br/>Team Data Viz sẽ cập nhật phần này sau.
      </p>
    </div>
  </div>
);

export const GeospatialMap = () => (
  <div className="trend-chart" style={{ padding: 0, overflow: 'hidden', minHeight: '400px' }}>
    <MapContainer center={[16.0471, 105.8542]} zoom={5} style={{ height: '400px', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />
      {mapData.map((city, idx) => (
        <CircleMarker
          key={idx}
          center={[city.lat, city.lng]}
          radius={8}
          fillColor={city.aqi > 100 ? "var(--aqi-unhealthy-sensitive)" : "var(--aqi-good)"}
          color="white"
          weight={2}
          fillOpacity={0.8}
        >
          <Popup>
            <strong>{city.name}</strong><br/>
            Nhiệt độ: {city.temp}°C<br/>
            AQI: {city.aqi}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  </div>
);

export const TrendChart = () => (
  <div className="half-chart" style={{ display: 'block' }}>
    <h3 style={{ marginBottom: '16px', fontSize: '1.1rem' }}>Xu hướng Nhiệt độ & Lượng mưa</h3>
    <div style={{ width: '100%', height: '250px' }}>
      <ResponsiveContainer>
        <LineChart data={trendData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tick={{fontSize: 12}} />
          <YAxis tick={{fontSize: 12}} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="max" name="Max Temp" stroke="var(--temp-hot)" strokeWidth={2} />
          <Line type="monotone" dataKey="mean" name="Mean Temp" stroke="var(--temp-mean)" strokeWidth={2} />
          <Line type="monotone" dataKey="min" name="Min Temp" stroke="var(--temp-cold)" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
);

export const CorrelationChart = () => (
  <div className="half-chart" style={{ display: 'block' }}>
    <h3 style={{ marginBottom: '16px', fontSize: '1.1rem' }}>Độ ẩm vs Mây che phủ</h3>
    <div style={{ width: '100%', height: '250px' }}>
      <ResponsiveContainer>
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" dataKey="humidity" name="Độ ẩm" unit="%" tick={{fontSize: 12}} />
          <YAxis type="number" dataKey="cloud" name="Mây" unit="%" tick={{fontSize: 12}} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
          <Scatter name="Correlation" data={scatterData} fill="var(--humidity)" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  </div>
);
