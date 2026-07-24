import React, { useState } from 'react';
import {
  Thermometer,
  Map as MapIcon,
  GitCompare,
  Network,
  Bot
} from 'lucide-react';
import OverviewTab from './OverviewTab';
import TimeTrendTab from './TimeTrendTab';
import ProvinceComparisonTab from './ProvinceComparisonTab';
import RelationshipAnalysisTab from './RelationshipAnalysisTab';

const DashboardLayout = ({ isChatVisible, onToggleChat }) => {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Tổng quan', icon: <MapIcon size={18} /> },
    { id: 'climate', label: 'Biến động theo thời gian', icon: <Thermometer size={18} /> },
    { id: 'compare', label: 'So sánh tỉnh', icon: <GitCompare size={18} /> },
    { id: 'relationship', label: 'Mối quan hệ', icon: <Network size={18} /> },
  ];

  return (
    <div className="dashboard-panel">
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="header-title-container">
          <h1 className="dashboard-title">Vietnam Data Visualization</h1>
          <p className="dashboard-subtitle">Hệ thống phân tích thời tiết và môi trường</p>
        </div>
        {!isChatVisible && (
          <button 
            onClick={onToggleChat}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '8px 16px', 
              backgroundColor: 'var(--accent-color)', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              fontWeight: '500',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <Bot size={18} /> Mở AI Chat
          </button>
        )}
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