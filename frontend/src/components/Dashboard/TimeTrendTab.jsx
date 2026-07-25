import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer, ComposedChart, Line, Area, Bar, XAxis, YAxis,
  CartesianGrid, Legend, ReferenceLine, AreaChart, Tooltip as RechartsTooltip,
} from 'recharts';
import {
  Thermometer, Droplets, Cloud, Wind, Calendar, MapPin,
  TrendingUp, Sparkles, Layers, ShieldAlert, Clock, Filter,
} from 'lucide-react';
import useWeatherData from '../../hooks/useWeatherData';
import { REGIONS, getRegionByProvince } from '../../constants/regions';
import DashboardSkeleton from './DashboardSkeleton';

/* ── AQI Tiers & Colors ────────────────────────────────────────────── */
const AQI_TIERS = [
  { key: 'good',        label: 'Tốt (0-50)',           color: '#10B981' },
  { key: 'moderate',    label: 'Vừa phải (51-100)',    color: '#FBBF24' },
  { key: 'sensitive',   label: 'Nhóm nhạy cảm (101-150)', color: '#F97316' },
  { key: 'unhealthy',   label: 'Không khỏe (151-200)', color: '#EF4444' },
  { key: 'veryBad',     label: 'Rất kém (>200)',       color: '#8B5CF6' },
];

/* ── Temp Tiers & Colors ───────────────────────────────────────────── */
const TEMP_TIERS = [
  { key: 'cold',     label: 'Mát mẻ (<22°C)',                 color: '#3B82F6' },
  { key: 'mild',     label: 'Dễ chịu (22 - 28°C)',           color: '#10B981' },
  { key: 'warm',     label: 'Ấm / Nóng (28 - 33°C)',         color: '#FBBF24' },
  { key: 'hot',      label: 'Nắng nóng (>33°C)',              color: '#EF4444' },
];

/* ── Rain Tiers & Colors ───────────────────────────────────────────── */
const RAIN_TIERS = [
  { key: 'dry',        label: 'Không mưa (<2mm)',            color: '#38BDF8' },
  { key: 'light',      label: 'Mưa vừa (2 - 10mm)',          color: '#3B82F6' },
  { key: 'heavy',      label: 'Mưa to (10 - 25mm)',          color: '#1D4ED8' },
  { key: 'torrential', label: 'Mưa rất to (>25mm)',          color: '#6366F1' },
];

function getAqiStatus(aqi) {
  if (aqi <= 50) return { label: 'Tốt', color: '#10B981', key: 'good' };
  if (aqi <= 100) return { label: 'Vừa phải', color: '#FBBF24', key: 'moderate' };
  if (aqi <= 150) return { label: 'Nhạy cảm', color: '#F97316', key: 'sensitive' };
  if (aqi <= 200) return { label: 'Không khỏe', color: '#EF4444', key: 'unhealthy' };
  return { label: 'Rất kém', color: '#8B5CF6', key: 'veryBad' };
}

function getTempTier(val) {
  if (val <= 22) return { key: 'cold', label: 'Mát mẻ (<22°C)', color: '#3B82F6' };
  if (val <= 28) return { key: 'mild', label: 'Dễ chịu (22 - 28°C)', color: '#10B981' };
  if (val <= 33) return { key: 'warm', label: 'Ấm / Nóng (28 - 33°C)', color: '#FBBF24' };
  return { key: 'hot', label: 'Nắng nóng (>33°C)', color: '#EF4444' };
}

function getRainTier(val) {
  if (val <= 2) return { key: 'dry', label: 'Không mưa (<2mm)', color: '#38BDF8' };
  if (val <= 10) return { key: 'light', label: 'Mưa vừa (2 - 10mm)', color: '#3B82F6' };
  if (val <= 25) return { key: 'heavy', label: 'Mưa to (10 - 25mm)', color: '#1D4ED8' };
  return { key: 'torrential', label: 'Mưa rất to (>25mm)', color: '#6366F1' };
}

/* ── Date Helpers ──────────────────────────────────────────────────── */
function getWeekKey(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil((((d - startOfYear) / 86400000) + startOfYear.getDay() + 1) / 7);
  return `T${weekNum} (${d.getFullYear()})`;
}

function getMonthKey(dateStr) {
  const parts = dateStr.split('-');
  if (parts.length >= 2) return `T${parseInt(parts[1], 10)}/${parts[0]}`;
  return dateStr;
}

/* ── Custom Master Synced Tooltip Card ─────────────────────────────── */
const SyncedMasterTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="viz-tooltip">
      <div className="viz-tooltip-header">
        <span className="viz-tooltip-label">📅 Mốc thời gian: {label}</span>
      </div>
      <div className="viz-tooltip-divider" />
      <div className="viz-tooltip-body">
        {payload.map((p, i) => (
          <div key={i} className="viz-tooltip-row">
            <span className="viz-tooltip-key" style={{ backgroundColor: p.color }} />
            <span className="viz-tooltip-metric">{p.name}:</span>
            <span className="viz-tooltip-value">
              {p.value} {p.name.includes('Nhiệt độ') || p.name.includes('Biên độ') ? '°C' : p.name.includes('Lượng mưa') ? 'mm' : p.name.includes('Gió') ? 'km/h' : p.name.includes('AQI') ? '' : '%'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ── Custom Tooltip for Stacked Area Tier Distribution Chart ──────── */
const StackedTierTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((sum, p) => sum + (p.value || 0), 0);

  return (
    <div className="viz-tooltip">
      <div className="viz-tooltip-header">
        <span className="viz-tooltip-label">📅 Mốc thời gian: {label}</span>
      </div>
      <div className="viz-tooltip-divider" />
      <div className="viz-tooltip-body">
        {payload.slice().reverse().map((p, i) => {
          if (!p.value) return null;
          const pct = total ? +((p.value / total) * 100).toFixed(1) : 0;
          return (
            <div key={i} className="viz-tooltip-row">
              <span className="viz-tooltip-key" style={{ backgroundColor: p.color }} />
              <span className="viz-tooltip-metric">{p.name}:</span>
              <span className="viz-tooltip-value">{p.value} tỉnh ({pct}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const TimeTrendTab = () => {
  const { data, loading, error, dates, provinces } = useWeatherData();
  const [selectedRegion, setSelectedRegion]     = useState('all');
  const [selectedProvince, setSelectedProvince] = useState('all');

  /* ── Filtered Provinces based on Region ───────────────────────── */
  const filteredProvinces = useMemo(() => {
    if (selectedRegion === 'all') return provinces;
    return provinces.filter(p => getRegionByProvince(p) === selectedRegion);
  }, [provinces, selectedRegion]);
  
  /* ── Time Granularity & Range State ────────────────────────────── */
  const [granularity, setGranularity]           = useState('day'); // 'day' | 'week' | 'month'
  const [timePreset, setTimePreset]             = useState('all'); // 'all' | '7d' | '30d' | '90d' | 'custom'
  const [customStart, setCustomStart]           = useState('');
  const [customEnd, setCustomEnd]               = useState('');

  /* ── Metric Filter for Chart 4 (Stacked Area Tier Distribution) ─── */
  const [chart4Metric, setChart4Metric]         = useState('aqi'); // 'aqi' | 'temp' | 'rain'

  /* ── Filtered & Aggregated Time Series Data ────────────────────── */
  const timeSeriesData = useMemo(() => {
    if (!data.length) return [];
    
    // 1. Region & Province Filter
    let filtered = data;
    if (selectedRegion !== 'all') {
      filtered = filtered.filter(r => getRegionByProvince(r.province) === selectedRegion);
    }
    if (selectedProvince !== 'all') {
      filtered = filtered.filter(r => r.province === selectedProvince);
    }

    // 2. Date Range Filter
    if (dates.length > 0) {
      if (timePreset === '7d') {
        const recentDates = dates.slice(-7);
        filtered = filtered.filter(r => recentDates.includes(r.date));
      } else if (timePreset === '30d') {
        const recentDates = dates.slice(-30);
        filtered = filtered.filter(r => recentDates.includes(r.date));
      } else if (timePreset === '90d') {
        const recentDates = dates.slice(-90);
        filtered = filtered.filter(r => recentDates.includes(r.date));
      } else if (timePreset === 'custom') {
        if (customStart) filtered = filtered.filter(r => r.date >= customStart);
        if (customEnd) filtered = filtered.filter(r => r.date <= customEnd);
      }
    }

    // 3. Time Aggregation (Day / Week / Month)
    const grouped = {};
    filtered.forEach(r => {
      let groupKey = r.date;
      if (granularity === 'week') groupKey = getWeekKey(r.date);
      if (granularity === 'month') groupKey = getMonthKey(r.date);

      if (!grouped[groupKey]) {
        grouped[groupKey] = {
          timeLabel: groupKey,
          tempMaxSum: 0, tempMinSum: 0, tempMeanSum: 0,
          rainSum: 0, humiditySum: 0, aqiSum: 0, cloudSum: 0, windSum: 0, count: 0,
        };
      }
      const g = grouped[groupKey];
      g.tempMaxSum  += r.temperature_max;
      g.tempMinSum  += r.temperature_min;
      g.tempMeanSum += r.temperature_mean;
      g.rainSum     += r.rain_sum;
      g.humiditySum += r.humidity_mean;
      g.aqiSum      += r.aqi;
      g.cloudSum    += r.cloud_cover_mean;
      g.windSum     += r.wind_speed_max;
      g.count++;
    });

    return Object.values(grouped).map(g => {
      const meanMax = +(g.tempMaxSum / g.count).toFixed(1);
      const meanMin = +(g.tempMinSum / g.count).toFixed(1);
      return {
        date: g.timeLabel,
        'Nhiệt độ Max': meanMax,
        'Nhiệt độ Min': meanMin,
        'Nhiệt độ TB':  +(g.tempMeanSum / g.count).toFixed(1),
        'Biên độ nhiệt ΔT': +(meanMax - meanMin).toFixed(1),
        'Lượng mưa TB': +(g.rainSum / g.count).toFixed(1),
        'Độ ẩm TB':     Math.round(g.humiditySum / g.count),
        'Chỉ số AQI':   Math.round(g.aqiSum / g.count),
        'Độ che mây':   Math.round(g.cloudSum / g.count),
        'Gió Max TB':   +(g.windSum / g.count).toFixed(1),
      };
    });
  }, [data, selectedRegion, selectedProvince, dates, timePreset, customStart, customEnd, granularity]);

  /* ── Chart 4 Tier Distribution per Grouped Period & Metric ──────── */
  const chart4Distribution = useMemo(() => {
    if (!data.length) return [];
    let filtered = data;
    if (selectedRegion !== 'all') {
      filtered = filtered.filter(r => getRegionByProvince(r.province) === selectedRegion);
    }
    if (selectedProvince !== 'all') {
      filtered = filtered.filter(r => r.province === selectedProvince);
    }

    if (dates.length > 0) {
      if (timePreset === '7d') {
        const recentDates = dates.slice(-7);
        filtered = filtered.filter(r => recentDates.includes(r.date));
      } else if (timePreset === '30d') {
        const recentDates = dates.slice(-30);
        filtered = filtered.filter(r => recentDates.includes(r.date));
      } else if (timePreset === '90d') {
        const recentDates = dates.slice(-90);
        filtered = filtered.filter(r => recentDates.includes(r.date));
      } else if (timePreset === 'custom') {
        if (customStart) filtered = filtered.filter(r => r.date >= customStart);
        if (customEnd) filtered = filtered.filter(r => r.date <= customEnd);
      }
    }

    const grouped = {};
    filtered.forEach(r => {
      let groupKey = r.date;
      if (granularity === 'week') groupKey = getWeekKey(r.date);
      if (granularity === 'month') groupKey = getMonthKey(r.date);

      if (!grouped[groupKey]) {
        grouped[groupKey] = { date: groupKey };
      }

      if (chart4Metric === 'aqi') {
        const status = getAqiStatus(r.aqi);
        grouped[groupKey][status.key] = (grouped[groupKey][status.key] || 0) + 1;
      } else if (chart4Metric === 'temp') {
        const tier = getTempTier(r.temperature_mean);
        grouped[groupKey][tier.key] = (grouped[groupKey][tier.key] || 0) + 1;
      } else {
        const tier = getRainTier(r.rain_sum);
        grouped[groupKey][tier.key] = (grouped[groupKey][tier.key] || 0) + 1;
      }
    });

    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
  }, [data, selectedRegion, selectedProvince, dates, timePreset, customStart, customEnd, granularity, chart4Metric]);

  const activeChart4Tiers = useMemo(() => {
    if (chart4Metric === 'aqi') return AQI_TIERS;
    if (chart4Metric === 'temp') return TEMP_TIERS;
    return RAIN_TIERS;
  }, [chart4Metric]);

  /* ── KPI Insights ──────────────────────────────────────────────── */
  const kpis = useMemo(() => {
    if (!timeSeriesData.length) return null;
    const avg = (arr, key) => arr.reduce((s, r) => s + r[key], 0) / arr.length;

    const maxTempDay = timeSeriesData.reduce((m, r) => r['Nhiệt độ Max'] > m['Nhiệt độ Max'] ? r : m);
    const minTempDay = timeSeriesData.reduce((m, r) => r['Nhiệt độ Min'] < m['Nhiệt độ Min'] ? r : m);
    const maxRainDay = timeSeriesData.reduce((m, r) => r['Lượng mưa TB'] > m['Lượng mưa TB'] ? r : m);
    const maxAqiDay  = timeSeriesData.reduce((m, r) => r['Chỉ số AQI'] > m['Chỉ số AQI'] ? r : m);

    return {
      avgTemp:     avg(timeSeriesData, 'Nhiệt độ TB').toFixed(1),
      maxTempVal:  maxTempDay['Nhiệt độ Max'],
      maxTempDate: maxTempDay.date,
      minTempVal:  minTempDay['Nhiệt độ Min'],
      minTempDate: minTempDay.date,

      avgRain:     avg(timeSeriesData, 'Lượng mưa TB').toFixed(1),
      maxRainVal:  maxRainDay['Lượng mưa TB'],
      maxRainDate: maxRainDay.date,

      avgAqi:      Math.round(avg(timeSeriesData, 'Chỉ số AQI')),
      maxAqiVal:   maxAqiDay['Chỉ số AQI'],
      maxAqiDate:  maxAqiDay.date,

      avgHumidity: Math.round(avg(timeSeriesData, 'Độ ẩm TB')),
      avgCloud:    Math.round(avg(timeSeriesData, 'Độ che mây')),
    };
  }, [timeSeriesData]);

  const filteredObservationCount = useMemo(() => {
    let rows = data;

    if (selectedRegion !== 'all') {
      rows = rows.filter(row => getRegionByProvince(row.province) === selectedRegion);
    }
    if (selectedProvince !== 'all') {
      rows = rows.filter(row => row.province === selectedProvince);
    }

    if (timePreset === '7d') {
      const recentDates = new Set(dates.slice(-7));
      rows = rows.filter(row => recentDates.has(row.date));
    } else if (timePreset === '30d') {
      const recentDates = new Set(dates.slice(-30));
      rows = rows.filter(row => recentDates.has(row.date));
    } else if (timePreset === '90d') {
      const recentDates = new Set(dates.slice(-90));
      rows = rows.filter(row => recentDates.has(row.date));
    } else if (timePreset === 'custom') {
      if (customStart) rows = rows.filter(row => row.date >= customStart);
      if (customEnd) rows = rows.filter(row => row.date <= customEnd);
    }

    return rows.length;
  }, [
    data,
    dates,
    selectedRegion,
    selectedProvince,
    timePreset,
    customStart,
    customEnd,
  ]);

  const resetAllFilters = () => {
    setSelectedRegion('all');
    setSelectedProvince('all');
    setGranularity('day');
    setTimePreset('all');
    setCustomStart('');
    setCustomEnd('');
  };

  if (loading) return <DashboardSkeleton message="Đang kết nối Supabase & tổng hợp chuỗi thời gian..." />;
  if (error) return <div className="overview-empty"><p>Lỗi: {error}</p></div>;

  const aqiStatus = kpis ? getAqiStatus(kpis.avgAqi) : null;
  const chart4MetricTitle = chart4Metric === 'aqi' ? 'Chất lượng AQI' : chart4Metric === 'temp' ? 'Nhiệt độ' : 'Lượng mưa';

  return (
    <div className="time-trend-tab">
      <style>{`
        .dashboard-filter-bar {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-end;
          gap: 10px 16px;
          padding: 12px 14px;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
        }
        .dashboard-filter-actions {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 9px;
        }
        @media (max-width: 1180px) {
          .dashboard-filter-actions {
            margin-left: 0;
          }
        }
        @media (max-width: 760px) {
          .dashboard-filter-bar {
            align-items: stretch;
          }
          .dashboard-filter-bar .filter-group {
            width: 100%;
          }
          .dashboard-filter-actions {
            width: 100%;
            justify-content: space-between;
          }
        }
      `}</style>


      {/* ── Filter Controls Row ────────────────────────────────────── */}
      <section className="dashboard-filter-bar" id="time-trend-filters">
        <div className="filter-group">
          <label className="filter-label" htmlFor="time-filter-region">Phân vùng</label>
          <select
            id="time-filter-region"
            className="filter-select"
            value={selectedRegion}
            onChange={event => {
              setSelectedRegion(event.target.value);
              setSelectedProvince('all');
            }}
          >
            <option value="all">Tất cả các vùng</option>
            {REGIONS.map(region => (
              <option key={region} value={region}>{region}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label" htmlFor="time-filter-province">Tỉnh / Thành phố</label>
          <select
            id="time-filter-province"
            className="filter-select"
            value={selectedProvince}
            onChange={event => setSelectedProvince(event.target.value)}
          >
            <option value="all">Tất cả tỉnh/thành</option>
            {filteredProvinces.map(province => (
              <option key={province} value={province}>{province}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Đơn vị nhóm thời gian</label>
          <div className="metric-toggle">
            <button type="button" className={`toggle-btn ${granularity === 'day' ? 'active' : ''}`} onClick={() => setGranularity('day')}>Theo ngày</button>
            <button type="button" className={`toggle-btn ${granularity === 'week' ? 'active' : ''}`} onClick={() => setGranularity('week')}>Theo tuần</button>
            <button type="button" className={`toggle-btn ${granularity === 'month' ? 'active' : ''}`} onClick={() => setGranularity('month')}>Theo tháng</button>
          </div>
        </div>

        <div className="filter-group">
          <label className="filter-label">Khoảng thời gian</label>
          <div className="metric-toggle">
            <button type="button" className={`toggle-btn ${timePreset === '7d' ? 'active' : ''}`} onClick={() => setTimePreset('7d')}>7 ngày</button>
            <button type="button" className={`toggle-btn ${timePreset === '30d' ? 'active' : ''}`} onClick={() => setTimePreset('30d')}>30 ngày</button>
            <button type="button" className={`toggle-btn ${timePreset === '90d' ? 'active' : ''}`} onClick={() => setTimePreset('90d')}>90 ngày</button>
            <button type="button" className={`toggle-btn ${timePreset === 'all' ? 'active' : ''}`} onClick={() => setTimePreset('all')}>Tất cả</button>
            <button type="button" className={`toggle-btn ${timePreset === 'custom' ? 'active' : ''}`} onClick={() => setTimePreset('custom')}>Tùy chỉnh</button>
          </div>
        </div>

        {timePreset === 'custom' && (
          <div className="filter-group-custom-dates">
            <input
              type="date"
              className="filter-date-input"
              value={customStart}
              onChange={event => setCustomStart(event.target.value)}
            />
            <span className="date-sep">đến</span>
            <input
              type="date"
              className="filter-date-input"
              value={customEnd}
              onChange={event => setCustomEnd(event.target.value)}
            />
          </div>
        )}

        <div className="dashboard-filter-actions">
          <button type="button" className="toggle-btn" onClick={resetAllFilters}>
            <Filter size={14} /> Xóa lọc
          </button>
          <span className="chart-subtitle-badge">
            {filteredObservationCount.toLocaleString('vi-VN')} quan sát
          </span>
        </div>
      </section>

      {/* ── SECTION 1: Stat Summary Cards ──────────────────────────── */}
      {kpis && (
        <div className="stat-row">
          <div className="stat-tile">
            <div className="stat-tile-icon" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>
              <Thermometer size={22} />
            </div>
            <div className="stat-tile-body">
              <span className="stat-tile-label">Nhiệt độ Trung bình</span>
              <span className="stat-tile-value">{kpis.avgTemp}°C</span>
              <span className="stat-tile-delta">
                Đỉnh nóng {kpis.maxTempVal}°C ({kpis.maxTempDate}) · Thấp nhất {kpis.minTempVal}°C ({kpis.minTempDate})
              </span>
            </div>
          </div>

          <div className="stat-tile">
            <div className="stat-tile-icon" style={{ backgroundColor: 'rgba(14,165,233,0.1)', color: '#0EA5E9' }}>
              <Droplets size={22} />
            </div>
            <div className="stat-tile-body">
              <span className="stat-tile-label">Lượng mưa Trung bình</span>
              <span className="stat-tile-value">{kpis.avgRain} mm</span>
              <span className="stat-tile-delta">
                Đỉnh mưa: {kpis.maxRainVal} mm ({kpis.maxRainDate})
              </span>
            </div>
          </div>

          <div className="stat-tile">
            <div className="stat-tile-icon" style={{ backgroundColor: 'rgba(139,92,246,0.1)', color: '#8B5CF6' }}>
              <Cloud size={22} />
            </div>
            <div className="stat-tile-body">
              <span className="stat-tile-label">Chất lượng không khí (AQI)</span>
              <span className="stat-tile-value">{kpis.avgAqi}</span>
              <span className="stat-tile-delta" style={{ color: aqiStatus.color, fontWeight: 600 }}>
                {aqiStatus.label} · Đỉnh điểm AQI {kpis.maxAqiVal} ({kpis.maxAqiDate})
              </span>
            </div>
          </div>

          <div className="stat-tile">
            <div className="stat-tile-icon" style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#10B981' }}>
              <Wind size={22} />
            </div>
            <div className="stat-tile-body">
              <span className="stat-tile-label">Độ ẩm & Mây che phủ</span>
              <span className="stat-tile-value">{kpis.avgHumidity}%</span>
              <span className="stat-tile-delta">
                Độ che phủ mây trung bình: {kpis.avgCloud}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION 2: SYNCHRONIZED MULTI-METRIC COMPARISON CHARTS ──── */}
      <div className="synced-charts-container">
        
        {/* Pane 1: Temperature & AQI Synced Chart */}
        <figure className="chart-card">
          <div className="chart-card-header">
            <div className="chart-title-flex">
              <TrendingUp size={18} color="#2563EB" />
              <h3 className="chart-card-title m-0">
                1. So sánh Tương quan Nhiệt độ (°C) & Chỉ số AQI Mỹ ({granularity === 'day' ? 'Theo Ngày' : granularity === 'week' ? 'Theo Tuần' : 'Theo Tháng'})
              </h3>
            </div>
            <span className="chart-subtitle-badge">Hover để đối chiếu đồng bộ</span>
          </div>

          <div style={{ width: '100%', height: 290 }}>
            <ResponsiveContainer>
              <ComposedChart syncId="timeTrendSync" data={timeSeriesData} margin={{ top: 15, right: 20, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="syncedAqiGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={{ stroke: '#CBD5E1' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12, fill: '#64748B' }} unit="°C" domain={['dataMin - 2', 'dataMax + 2']} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: '#64748B' }} domain={[0, 'dataMax + 20']} />
                <RechartsTooltip content={<SyncedMasterTooltip />} cursor={{ stroke: '#94A3B8', strokeWidth: 1.5, strokeDasharray: '4 4' }} />
                <Legend
                  wrapperStyle={{ paddingTop: 5, fontSize: 12 }}
                  formatter={(val, entry) => (
                    <span className="rich-chart-legend-item">
                      <span className="legend-dot-indicator" style={{ backgroundColor: entry.color }} />
                      <strong style={{ color: '#0F172A' }}>{val}</strong>
                    </span>
                  )}
                />
                <ReferenceLine yAxisId="right" y={50} stroke="#10B981" strokeDasharray="3 3" label={{ value: 'AQI 50 (Tốt)', position: 'insideTopRight', fill: '#10B981', fontSize: 11 }} />
                <Line yAxisId="left" type="monotone" dataKey="Nhiệt độ TB" stroke="#EF4444" strokeWidth={3} dot={{ r: 4, stroke: '#ffffff', strokeWidth: 2 }} activeDot={{ r: 8, stroke: '#ffffff', strokeWidth: 3 }} />
                <Area yAxisId="right" type="monotone" dataKey="Chỉ số AQI" stroke="#8B5CF6" strokeWidth={2.5} fill="url(#syncedAqiGradient)" activeDot={{ r: 8, stroke: '#ffffff', strokeWidth: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </figure>

        {/* Pane 2: Rain, Humidity & Cloud Cover Synced Chart */}
        <figure className="chart-card">
          <div className="chart-card-header">
            <div className="chart-title-flex">
              <Droplets size={18} color="#0EA5E9" />
              <h3 className="chart-card-title m-0">
                2. So sánh Tương quan Lượng mưa (mm), Độ ẩm (%) & Che mây (%)
              </h3>
            </div>
            <span className="chart-subtitle-badge">Trục kép mưa & độ ẩm</span>
          </div>

          <div style={{ width: '100%', height: 290 }}>
            <ResponsiveContainer>
              <ComposedChart syncId="timeTrendSync" data={timeSeriesData} margin={{ top: 15, right: 20, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="syncedCloudGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#38BDF8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={{ stroke: '#CBD5E1' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12, fill: '#64748B' }} unit="mm" />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: '#64748B' }} unit="%" domain={[30, 100]} />
                <RechartsTooltip content={<SyncedMasterTooltip />} cursor={{ stroke: '#94A3B8', strokeWidth: 1.5, strokeDasharray: '4 4' }} />
                <Legend
                  wrapperStyle={{ paddingTop: 5, fontSize: 12 }}
                  formatter={(val, entry) => (
                    <span className="rich-chart-legend-item">
                      <span className="legend-dot-indicator" style={{ backgroundColor: entry.color }} />
                      <strong style={{ color: '#0F172A' }}>{val}</strong>
                    </span>
                  )}
                />
                <Bar yAxisId="left" dataKey="Lượng mưa TB" fill="#0EA5E9" barSize={22} radius={[4, 4, 0, 0]} opacity={0.85} activeBar={{ fill: '#0284C7', stroke: '#0F172A', strokeWidth: 1 }} />
                <Area yAxisId="right" type="monotone" dataKey="Độ che mây" stroke="#38BDF8" strokeWidth={2} fill="url(#syncedCloudGradient)" activeDot={{ r: 7 }} />
                <Line yAxisId="right" type="monotone" dataKey="Độ ẩm TB" stroke="#10B981" strokeWidth={3} dot={{ r: 4, stroke: '#ffffff', strokeWidth: 2 }} activeDot={{ r: 8, stroke: '#ffffff', strokeWidth: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </figure>

      </div>

      {/* ── SECTION 3: CHARTS 3 & 4 ─────────────────────────────────── */}
      <div className="trend-charts-grid">

        {/* CHART 3: Biến động Biên độ Nhiệt Ngày-Đêm (ΔT) & Tốc độ Gió Max */}
        <figure className="chart-card">
          <div className="chart-card-header">
            <div className="chart-title-flex">
              <Layers size={18} color="#F59E0B" />
              <h3 className="chart-card-title m-0">
                3. Biến động Biên độ Nhiệt (ΔT) & Tốc độ Gió max
              </h3>
            </div>
            <span className="chart-subtitle-badge">Trục kép ΔT (°C) / Sức gió (km/h)</span>
          </div>

          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <ComposedChart syncId="timeTrendSync" data={timeSeriesData} margin={{ top: 15, right: 20, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="deltaTempGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={{ stroke: '#CBD5E1' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12, fill: '#64748B' }} unit="°C" label={{ value: 'Biên độ ΔT (°C)', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#64748B' } }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: '#64748B' }} unit="km/h" />
                <RechartsTooltip content={<SyncedMasterTooltip />} cursor={{ stroke: '#94A3B8', strokeWidth: 1.5, strokeDasharray: '4 4' }} />
                <Legend
                  wrapperStyle={{ paddingTop: 5, fontSize: 12 }}
                  formatter={(val, entry) => (
                    <span className="rich-chart-legend-item">
                      <span className="legend-dot-indicator" style={{ backgroundColor: entry.color }} />
                      <strong style={{ color: '#0F172A' }}>{val}</strong>
                    </span>
                  )}
                />
                <Area yAxisId="left" type="monotone" dataKey="Biên độ nhiệt ΔT" stroke="#F59E0B" strokeWidth={2.5} fill="url(#deltaTempGradient)" activeDot={{ r: 7 }} />
                <Line yAxisId="right" type="monotone" dataKey="Gió Max TB" stroke="#8B5CF6" strokeWidth={3} dot={{ r: 4, stroke: '#ffffff', strokeWidth: 2 }} activeDot={{ r: 8, stroke: '#ffffff', strokeWidth: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </figure>

        {/* CHART 4: Stacked Area — Tỷ lệ Phân bố Phân cấp (AQI / Temp / Rain) qua Thời gian */}
        <figure className="chart-card">
          <div className="chart-card-header">
            <div className="chart-title-flex">
              <ShieldAlert size={18} color="#EF4444" />
              <h3 className="chart-card-title m-0">
                4. Phân bố Phân cấp {chart4MetricTitle} theo Thời gian
              </h3>
            </div>

            {/* Dedicated Metric Toggle for Chart 4 */}
            <div className="metric-toggle">
              <button
                className={`toggle-btn ${chart4Metric === 'aqi' ? 'active' : ''}`}
                onClick={() => setChart4Metric('aqi')}
              >
                Chất lượng AQI
              </button>
              <button
                className={`toggle-btn ${chart4Metric === 'temp' ? 'active' : ''}`}
                onClick={() => setChart4Metric('temp')}
              >
                Nhiệt độ
              </button>
              <button
                className={`toggle-btn ${chart4Metric === 'rain' ? 'active' : ''}`}
                onClick={() => setChart4Metric('rain')}
              >
                Lượng mưa
              </button>
            </div>
          </div>

          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <AreaChart data={chart4Distribution} margin={{ top: 15, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={{ stroke: '#CBD5E1' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748B' }} label={{ value: 'Số tỉnh/thành', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#64748B' } }} />
                <RechartsTooltip content={<StackedTierTooltip />} cursor={{ stroke: '#94A3B8', strokeWidth: 1.5, strokeDasharray: '4 4' }} />
                <Legend
                  wrapperStyle={{ paddingTop: 5, fontSize: 11 }}
                  formatter={(val, entry) => (
                    <span className="rich-chart-legend-item">
                      <span className="legend-dot-indicator" style={{ backgroundColor: entry.color }} />
                      <strong style={{ color: '#0F172A' }}>{val}</strong>
                    </span>
                  )}
                />
                {activeChart4Tiers.map(t => (
                  <Area
                    key={t.key}
                    type="monotone"
                    dataKey={t.key}
                    name={t.label}
                    stackId="1"
                    stroke={t.color}
                    fill={t.color}
                    fillOpacity={0.8}
                    activeDot={{ r: 6, stroke: '#ffffff', strokeWidth: 2 }}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </figure>

      </div>

    </div>
  );
};

export default TimeTrendTab;