import React from 'react';
import { Loader2, Database, Sparkles } from 'lucide-react';

export default function DashboardSkeleton({ message = "Đang kết nối Supabase & đồng bộ dữ liệu thời tiết Việt Nam..." }) {
  return (
    <div className="dashboard-skeleton-container">
      {/* Loading Header Banner */}
      <div className="skeleton-status-banner">
        <div className="skeleton-spinner-wrap">
          <Loader2 className="skeleton-spinner-icon" size={24} />
        </div>
        <div className="skeleton-status-text">
          <div className="skeleton-status-title">
            <span>{message}</span>
            <span className="skeleton-live-badge">
              <Sparkles size={12} /> Supabase Sync
            </span>
          </div>
          <p className="skeleton-status-sub">Vui lòng chờ trong giây lát, ứng dụng đang nạp dữ liệu đầy đủ các năm...</p>
        </div>
      </div>

      {/* Filter Row Skeleton */}
      <div className="skeleton-filter-row">
        <div className="skeleton-box" style={{ width: '120px', height: '36px' }} />
        <div className="skeleton-box" style={{ width: '160px', height: '36px' }} />
        <div className="skeleton-box" style={{ width: '220px', height: '36px' }} />
      </div>

      {/* KPI Tiles Skeleton (4 Cards) */}
      <div className="skeleton-kpi-grid">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="skeleton-kpi-card">
            <div className="skeleton-box skeleton-circle" style={{ width: '44px', height: '44px' }} />
            <div className="skeleton-kpi-body">
              <div className="skeleton-box" style={{ width: '60%', height: '12px', marginBottom: '8px' }} />
              <div className="skeleton-box" style={{ width: '40%', height: '24px', marginBottom: '8px' }} />
              <div className="skeleton-box" style={{ width: '85%', height: '10px' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Main Charts Skeleton Grid */}
      <div className="skeleton-viz-grid">
        <div className="skeleton-chart-card">
          <div className="skeleton-chart-header">
            <div className="skeleton-box" style={{ width: '200px', height: '18px' }} />
            <div className="skeleton-box" style={{ width: '120px', height: '28px' }} />
          </div>
          <div className="skeleton-box skeleton-chart-body" />
        </div>

        <div className="skeleton-chart-card">
          <div className="skeleton-chart-header">
            <div className="skeleton-box" style={{ width: '180px', height: '18px' }} />
          </div>
          <div className="skeleton-box skeleton-chart-body" />
        </div>
      </div>
    </div>
  );
}
