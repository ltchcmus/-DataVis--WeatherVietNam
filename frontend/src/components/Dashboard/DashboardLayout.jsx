import React, { useState } from 'react';
import {
  Thermometer,
  Map as MapIcon,
  GitCompare,
  Network,
} from 'lucide-react';
import OverviewTab from './OverviewTab';
import TimeTrendTab from './TimeTrendTab';
import ProvinceComparisonTab from './ProvinceComparisonTab';
import RelationshipAnalysisTab from './RelationshipAnalysisTab';

const DashboardLayout = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Tổng quan', icon: <MapIcon size={18} /> },
    { id: 'climate', label: 'Biến động theo thời gian', icon: <Thermometer size={18} /> },
    { id: 'compare', label: 'So sánh tỉnh', icon: <GitCompare size={18} /> },
    { id: 'relationship', label: 'Mối quan hệ', icon: <Network size={18} /> },
  ];

  return (
    <div className="dashboard-panel">
      <div className="dashboard-header">
        <div className="header-title-container">
          <h1 className="dashboard-title">Vietnam Data Visualization</h1>
          <p className="dashboard-subtitle">Hệ thống phân tích thời tiết và môi trường</p>
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
        {activeTab === 'overview' && <OverviewTab />}

        {activeTab === 'climate' && <TimeTrendTab />}

        {activeTab === 'compare' && <ProvinceComparisonTab />}

        {activeTab === 'relationship' && <RelationshipAnalysisTab />}
      </div>
    </div>
  );
};

export default DashboardLayout;