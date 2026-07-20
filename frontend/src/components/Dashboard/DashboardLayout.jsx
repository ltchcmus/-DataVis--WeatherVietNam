import React from 'react';
import { KPICard, GeospatialMap, TrendChart, CorrelationChart } from './PlaceholderCharts';

const DashboardLayout = () => {
  return (
    <div className="dashboard-panel">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Vietnam Data Visualization</h1>
        <div>
          {/* Placeholder for Global Filters */}
          <select style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid var(--border-color)' }}>
            <option>Tất cả thời gian</option>
            <option>Năm 2024</option>
            <option>Năm 2023</option>
          </select>
        </div>
      </div>
      
      <div className="dashboard-content">
        <div className="dashboard-grid">
          {/* Top Level KPIs */}
          <KPICard title="Nhiệt độ trung bình" value="28°C" subValue="Cao nhất 32°C | Thấp nhất 24°C" colorClass="--temp-mean" />
          <KPICard title="Tổng lượng mưa" value="125 mm" subValue="Tăng 15% so với tháng trước" colorClass="--rain" />
          <KPICard title="Chỉ số AQI (Trung bình)" value="85" subValue="Mức độ: Khá (Moderate)" colorClass="--aqi-moderate" />
          <KPICard title="Độ ẩm trung bình" value="75%" subValue="Gió tối đa: 15 km/h" colorClass="--humidity" />

          {/* Geospatial Map (Full width) */}
          <GeospatialMap />

          {/* Half width charts */}
          <TrendChart />
          <CorrelationChart />
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
