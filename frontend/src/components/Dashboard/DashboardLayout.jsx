import React, { useState } from 'react';
import { 
  KPICard, 
  GeospatialMap, 
  TrendChart, 
  CorrelationChart, 
  PlaceholderChart 
} from './PlaceholderCharts';
import { 
  Activity, 
  Cloud, 
  Wind, 
  Thermometer, 
  Droplets,
  BarChart2,
  Map as MapIcon
} from 'lucide-react';

const DashboardLayout = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Tổng quan', icon: <MapIcon size={18} /> },
    { id: 'climate', label: 'Xu Hướng & Khí Hậu', icon: <Thermometer size={18} /> },
    { id: 'aqi', label: 'Chất lượng không khí', icon: <Cloud size={18} /> }
  ];

  return (
    <div className="dashboard-panel">
      <div className="dashboard-header">
        <div className="header-title-container">
          <h1 className="dashboard-title">Vietnam Data Visualization</h1>
          <p className="dashboard-subtitle">Hệ thống phân tích thời tiết và môi trường</p>
        </div>
        <div className="header-actions">
          <select className="filter-select">
            <option>Tất cả thời gian</option>
            <option>7 ngày gần nhất</option>
            <option>30 ngày gần nhất</option>
            <option>Năm 2024</option>
          </select>
        </div>
      </div>
      
      <div className="dashboard-tabs-container">
        <div className="dashboard-tabs">
          {tabs.map(tab => (
            <button 
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>
      
      <div className="dashboard-content">
        {activeTab === 'overview' && (
          <div className="dashboard-grid">
            <KPICard title="Nhiệt độ trung bình" value="28°C" subValue="Max: 32°C | Min: 24°C" colorClass="--temp-mean" icon={<Thermometer size={24} />} />
            <KPICard title="Tổng lượng mưa" value="125 mm" subValue="Tăng 15% so với tháng trước" colorClass="--rain" icon={<Droplets size={24} />} />
            <KPICard title="Chỉ số AQI (Trung bình)" value="85" subValue="Mức độ: Khá (Moderate)" colorClass="--aqi-moderate" icon={<Cloud size={24} />} />
            <KPICard title="Độ ẩm trung bình" value="75%" subValue="Gió tối đa: 15 km/h" colorClass="--humidity" icon={<Wind size={24} />} />
            
            <GeospatialMap />
          </div>
        )}

        {activeTab === 'climate' && (
          <div className="dashboard-grid">
            <TrendChart />
            <PlaceholderChart title="Phân bố nhiệt độ theo khu vực (Boxplot)" icon={<BarChart2 size={48} />} />
            <PlaceholderChart title="Tương quan Nhiệt độ - Lượng mưa (Scatter)" icon={<Activity size={48} />} />
          </div>
        )}

        {activeTab === 'aqi' && (
          <div className="dashboard-grid">
            <CorrelationChart />
            <PlaceholderChart title="Mật độ phân bố AQI (Heatmap)" icon={<MapIcon size={48} />} />
            <PlaceholderChart title="Biến động AQI theo khu vực (Bar Chart)" icon={<BarChart2 size={48} />} />
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardLayout;
