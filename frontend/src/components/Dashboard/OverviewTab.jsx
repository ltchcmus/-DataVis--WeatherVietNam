import React, { useState, useMemo } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import {
  MapContainer, TileLayer, CircleMarker, ZoomControl,
  Tooltip as LeafletTooltip,
} from 'react-leaflet';
import {
  Thermometer, Droplets, Cloud, Wind, MapPin,
  Sun, CloudSun, CloudRain, CloudDrizzle, Gauge, Map, SunMedium, Filter,
} from 'lucide-react';
import useWeatherData from '../../hooks/useWeatherData';
import 'leaflet/dist/leaflet.css';

import { REGIONS, getRegionByProvince } from '../../constants/regions';

/* ── AQI Tiers & Colors ────────────────────────────────────────────── */
const AQI_TIERS = [
  { key: 'good',        min: 0,   max: 50,  label: 'Tốt (Good)',                     color: '#10B981' },
  { key: 'moderate',    min: 51,  max: 100, label: 'Vừa phải (Moderate)',            color: '#FBBF24' },
  { key: 'sensitive',   min: 101, max: 150, label: 'Nhóm nhạy cảm',                 color: '#F97316' },
  { key: 'unhealthy',   min: 151, max: 200, label: 'Không khỏe mạnh',               color: '#EF4444' },
  { key: 'veryBad',     min: 201, max: 999, label: 'Rất không tốt',                 color: '#8B5CF6' },
];

/* ── Temp Tiers & Colors ───────────────────────────────────────────── */
const TEMP_TIERS = [
  { key: 'cold',     min: -50, max: 22,  label: 'Mát mẻ (<22°C)',                 color: '#3B82F6' },
  { key: 'mild',     min: 22.1,max: 28,  label: 'Dễ chịu (22 - 28°C)',           color: '#10B981' },
  { key: 'warm',     min: 28.1,max: 33,  label: 'Ấm / Nóng (28 - 33°C)',         color: '#FBBF24' },
  { key: 'hot',      min: 33.1,max: 99,  label: 'Nắng nóng (>33°C)',              color: '#EF4444' },
];

/* ── Rain Tiers & Colors ───────────────────────────────────────────── */
const RAIN_TIERS = [
  { key: 'dry',        min: 0,    max: 2,   label: 'Không mưa (<2mm)',            color: '#38BDF8' },
  { key: 'light',      min: 2.1,  max: 10,  label: 'Mưa vừa (2 - 10mm)',          color: '#3B82F6' },
  { key: 'heavy',      min: 10.1, max: 25,  label: 'Mưa to (10 - 25mm)',          color: '#1D4ED8' },
  { key: 'torrential', min: 25.1, max: 999, label: 'Mưa rất to (>25mm)',          color: '#6366F1' },
];

/* ── Wind Tiers & Colors ───────────────────────────────────────────── */
const WIND_TIERS = [
  { key: 'light',    min: 0,    max: 15,  label: 'Gió nhẹ (<15 km/h)',            color: '#10B981' },
  { key: 'moderate', min: 15.1, max: 30,  label: 'Gió vừa (15 - 30 km/h)',        color: '#3B82F6' },
  { key: 'strong',   min: 30.1, max: 50,  label: 'Gió mạnh (30 - 50 km/h)',       color: '#F59E0B' },
  { key: 'gale',     min: 50.1, max: 999, label: 'Gió rất mạnh (>50 km/h)',       color: '#EF4444' },
];

/* ── Humidity Tiers & Colors ───────────────────────────────────────── */
const HUMIDITY_TIERS = [
  { key: 'dry',         min: 0,    max: 60,  label: 'Hanh khô (<60%)',             color: '#F59E0B' },
  { key: 'comfortable', min: 60.1, max: 75,  label: 'Thoải mái (60 - 75%)',        color: '#10B981' },
  { key: 'humid',       min: 75.1, max: 85,  label: 'Ẩm ướt (75 - 85%)',           color: '#3B82F6' },
  { key: 'veryHumid',   min: 85.1, max: 100, label: 'Rất ẩm (>85%)',               color: '#6366F1' },
];

function getAqiTier(val) {
  return AQI_TIERS.find(t => val >= t.min && val <= t.max) || AQI_TIERS[AQI_TIERS.length - 1];
}

function getTempTier(val) {
  return TEMP_TIERS.find(t => val >= t.min && val <= t.max) || TEMP_TIERS[TEMP_TIERS.length - 1];
}

function getRainTier(val) {
  return RAIN_TIERS.find(t => val >= t.min && val <= t.max) || RAIN_TIERS[RAIN_TIERS.length - 1];
}

function getWindTier(val) {
  return WIND_TIERS.find(t => val >= t.min && val <= t.max) || WIND_TIERS[WIND_TIERS.length - 1];
}

function getHumidityTier(val) {
  return HUMIDITY_TIERS.find(t => val >= t.min && val <= t.max) || HUMIDITY_TIERS[HUMIDITY_TIERS.length - 1];
}

function getTierForMetric(metric, row) {
  if (metric === 'aqi') return getAqiTier(row.aqi);
  if (metric === 'temp') return getTempTier(row.temperature_mean);
  if (metric === 'rain') return getRainTier(row.rain_sum);
  if (metric === 'wind') return getWindTier(row.wind_speed_max);
  return getHumidityTier(row.humidity_mean);
}

function getWeatherCondition(rain, cloud) {
  if (rain > 10) return { key: 'heavyRain', icon: CloudRain, label: 'Mưa lớn (>10mm)', color: '#1D4ED8' };
  if (rain > 0.5) return { key: 'rain', icon: CloudDrizzle, label: 'Có mưa rào', color: '#0EA5E9' };
  if (cloud > 75) return { key: 'overcast', icon: Cloud, label: 'Nhiều mây', color: '#64748B' };
  if (cloud > 35) return { key: 'partlyCloudy', icon: CloudSun, label: 'Nắng gián đoạn', color: '#F59E0B' };
  return { key: 'sunny', icon: Sun, label: 'Nắng đẹp', color: '#EAB308' };
}

function aggregateByProvince(rows) {
  const grouped = {};
  rows.forEach(r => {
    const k = r.province;
    if (!grouped[k]) {
      grouped[k] = {
        province: k, latitude: r.latitude, longitude: r.longitude,
        city_id: r.city_id,
        temperature_max: 0, temperature_min: 0, temperature_mean: 0,
        rain_sum: 0, humidity_mean: 0, wind_speed_max: 0,
        aqi: 0, cloud_cover_mean: 0, count: 0,
      };
    }
    const g = grouped[k];
    g.temperature_max  += r.temperature_max;
    g.temperature_min  += r.temperature_min;
    g.temperature_mean += r.temperature_mean;
    g.rain_sum         += r.rain_sum;
    g.humidity_mean    += r.humidity_mean;
    g.wind_speed_max   += r.wind_speed_max;
    g.aqi              += r.aqi;
    g.cloud_cover_mean += r.cloud_cover_mean;
    g.count++;
  });

  return Object.values(grouped).map(g => ({
    ...g,
    temperature_max:  +(g.temperature_max  / g.count).toFixed(1),
    temperature_min:  +(g.temperature_min  / g.count).toFixed(1),
    temperature_mean: +(g.temperature_mean / g.count).toFixed(1),
    rain_sum:         +(g.rain_sum         / g.count).toFixed(1),
    humidity_mean:    Math.round(g.humidity_mean    / g.count),
    wind_speed_max:   +(g.wind_speed_max   / g.count).toFixed(1),
    aqi:              Math.round(g.aqi              / g.count),
    cloud_cover_mean: Math.round(g.cloud_cover_mean / g.count),
  }));
}

/* ── Rich Vivid Weather Card Tooltip Component ─────────────────────── */
const RichWeatherCard = ({ data }) => {
  const aqiTier = getAqiTier(data.aqi);
  const condition = getWeatherCondition(data.rain_sum, data.cloud_cover_mean || 40);
  const WeatherIcon = condition.icon;

  return (
    <div className="rich-tooltip-card">
      <div className="rich-tooltip-header">
        <div className="rich-tooltip-title-wrap">
          <MapPin size={16} color="#3B82F6" />
          <h4 className="rich-tooltip-province">{data.province}</h4>
        </div>
        <span className="rich-tooltip-aqi-pill" style={{ backgroundColor: aqiTier.color }}>
          AQI {data.aqi} • {aqiTier.label}
        </span>
      </div>

      <div className="rich-tooltip-banner">
        <div className="banner-icon-wrap" style={{ backgroundColor: `${condition.color}15` }}>
          <WeatherIcon size={28} color={condition.color} />
        </div>
        <div className="banner-info">
          <span className="banner-condition-text">{condition.label}</span>
          <span className="banner-temp-main">{data.temperature_mean}°C</span>
        </div>
      </div>

      <div className="rich-tooltip-grid">
        <div className="rich-metric-item">
          <Thermometer size={14} color="#EF4444" />
          <div className="rich-metric-text">
            <span className="metric-label">Nhiệt độ Min/Max</span>
            <span className="metric-val">{data.temperature_min}°C ~ {data.temperature_max}°C</span>
          </div>
        </div>

        <div className="rich-metric-item">
          <Droplets size={14} color="#0EA5E9" />
          <div className="rich-metric-text">
            <span className="metric-label">Lượng mưa</span>
            <span className="metric-val">{data.rain_sum} mm</span>
          </div>
        </div>

        <div className="rich-metric-item">
          <Wind size={14} color="#10B981" />
          <div className="rich-metric-text">
            <span className="metric-label">Độ ẩm TB</span>
            <span className="metric-val">{data.humidity_mean}%</span>
          </div>
        </div>

        <div className="rich-metric-item">
          <Gauge size={14} color="#8B5CF6" />
          <div className="rich-metric-text">
            <span className="metric-label">Gió tối đa</span>
            <span className="metric-val">{data.wind_speed_max} km/h</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Custom Infographic Regional Bar Tooltip ───────────────────────── */
const RegionalBarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="viz-tooltip infographic-tooltip">
      <div className="viz-tooltip-header">
        <Map size={14} color="#2563EB" />
        <span className="viz-tooltip-label">Vùng {label}</span>
      </div>
      <div className="viz-tooltip-divider" />
      <div className="viz-tooltip-body">
        {payload.map((p, i) => (
          <div key={i} className="viz-tooltip-row">
            <span className="viz-tooltip-key" style={{ backgroundColor: p.color }} />
            <span className="viz-tooltip-metric">{p.name}</span>
            <span className="viz-tooltip-value-pill" style={{ color: p.color, backgroundColor: `${p.color}15` }}>
              {p.value} {p.name.includes('Nhiệt độ') ? '°C' : p.name.includes('Lượng mưa') ? 'mm' : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ── Custom Infographic Tooltip for Stacked Weather Condition Chart ── */
const StackedConditionTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((sum, p) => sum + (p.value || 0), 0);

  return (
    <div className="viz-tooltip infographic-tooltip">
      <div className="viz-tooltip-header">
        <SunMedium size={14} color="#F59E0B" />
        <span className="viz-tooltip-label">Trạng thái tại Vùng {label}</span>
        <span className="total-prov-badge">{total} tỉnh/thành</span>
      </div>
      <div className="viz-tooltip-divider" />
      <div className="viz-tooltip-body">
        {payload.slice().reverse().map((p, i) => {
          if (!p.value) return null;
          const pct = total ? +((p.value / total) * 100).toFixed(1) : 0;
          return (
            <div key={i} className="viz-tooltip-row">
              <span className="viz-tooltip-key" style={{ backgroundColor: p.color }} />
              <span className="viz-tooltip-metric">{p.name}</span>
              <div className="pct-progress-bar-wrap">
                <div className="pct-progress-bar-fill" style={{ width: `${pct}%`, backgroundColor: p.color }} />
              </div>
              <span className="viz-tooltip-value-pill" style={{ color: p.color, backgroundColor: `${p.color}15` }}>
                {p.value} tỉnh ({pct}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const OverviewTab = () => {
  const { data, loading, error, dates, provinces } = useWeatherData();
  const [selectedDate, setSelectedDate]         = useState('all');
  const [selectedRegion, setSelectedRegion]     = useState('all');
  const [selectedProvince, setSelectedProvince] = useState('all');
  const [viewMetric, setViewMetric]             = useState('aqi'); // 'aqi' | 'temp' | 'rain'
  const [rankingMetric, setRankingMetric]       = useState('aqi'); // 'aqi' | 'temp' | 'rain'
  const [activePieIndex, setActivePieIndex]     = useState(null);

  /* ── Filtered Provinces based on Region ───────────────────────── */
  const filteredProvinces = useMemo(() => {
    if (selectedRegion === 'all') return provinces;
    return provinces.filter(p => getRegionByProvince(p) === selectedRegion);
  }, [provinces, selectedRegion]);

  /* ── Table Row Hover Tooltip State ─────────────────────────────── */
  const [hoveredTableRow, setHoveredTableRow]   = useState(null);
  const [tablePos, setTablePos]                 = useState({ x: 0, y: 0 });

  const handleRowMouseEnter = (row, e) => {
    setHoveredTableRow(row);
    setTablePos({ x: e.clientX + 16, y: e.clientY - 50 });
  };

  const handleRowMouseMove = (e) => {
    setTablePos({ x: e.clientX + 16, y: e.clientY - 50 });
  };

  const handleRowMouseLeave = () => {
    setHoveredTableRow(null);
  };

  /* ── Filtered data ─────────────────────────────────────────────── */
  const provinceRows = useMemo(() => {
    if (!data.length) return [];
    let base = selectedDate === 'all' ? aggregateByProvince(data) : data.filter(r => r.date === selectedDate);
    if (selectedRegion !== 'all') {
      base = base.filter(r => getRegionByProvince(r.province) === selectedRegion);
    }
    if (selectedProvince === 'all') return base;
    return base.filter(r => r.province === selectedProvince);
  }, [data, selectedDate, selectedRegion, selectedProvince]);

  /* ── 6 Macro-Regions Aggregation ────────────────────────────────── */
  const regionalData = useMemo(() => {
    if (!provinceRows.length) return [];
    const grouped = {};
    REGIONS.forEach(reg => {
      grouped[reg] = { region: reg, tempSum: 0, rainSum: 0, aqiSum: 0, humiditySum: 0, windSum: 0, count: 0 };
    });

    provinceRows.forEach(r => {
      const reg = getRegionByProvince(r.province);
      if (grouped[reg]) {
        grouped[reg].tempSum     += r.temperature_mean;
        grouped[reg].rainSum     += r.rain_sum;
        grouped[reg].aqiSum      += r.aqi;
        grouped[reg].humiditySum += r.humidity_mean;
        grouped[reg].windSum     += r.wind_speed_max;
        grouped[reg].count++;
      }
    });

    return Object.values(grouped).filter(g => g.count > 0).map(g => ({
      region: g.region,
      'Nhiệt độ TB': g.count ? +(g.tempSum / g.count).toFixed(1) : 0,
      'Lượng mưa TB': g.count ? +(g.rainSum / g.count).toFixed(1) : 0,
      'Chỉ số AQI Mỹ': g.count ? Math.round(g.aqiSum / g.count) : 0,
      'Độ ẩm TB': g.count ? Math.round(g.humiditySum / g.count) : 0,
      'Gió Max TB': g.count ? +(g.windSum / g.count).toFixed(1) : 0,
      count: g.count,
    }));
  }, [provinceRows]);

  /* ── Stacked Weather Condition Breakdown per Region ─────────────── */
  const regionalConditionData = useMemo(() => {
    if (!provinceRows.length) return [];
    const grouped = {};
    REGIONS.forEach(reg => {
      grouped[reg] = { region: reg, sunny: 0, partlyCloudy: 0, overcast: 0, rain: 0, heavyRain: 0, count: 0 };
    });

    provinceRows.forEach(r => {
      const reg = getRegionByProvince(r.province);
      if (grouped[reg]) {
        const cond = getWeatherCondition(r.rain_sum, r.cloud_cover_mean || 40);
        grouped[reg][cond.key]++;
        grouped[reg].count++;
      }
    });

    return Object.values(grouped).filter(g => g.count > 0);
  }, [provinceRows]);

  /* ── KPI calculations ─────────────────────────────────────────── */
  const kpis = useMemo(() => {
    if (!provinceRows.length) return null;
    const avg = (arr, key) => arr.reduce((s, r) => s + r[key], 0) / arr.length;

    const hottest = provinceRows.reduce((m, r) => r.temperature_mean > m.temperature_mean ? r : m);
    const coldest = provinceRows.reduce((m, r) => r.temperature_mean < m.temperature_mean ? r : m);
    const maxRain = provinceRows.reduce((m, r) => r.rain_sum > m.rain_sum ? r : m);

    return {
      avgTemp:         avg(provinceRows, 'temperature_mean').toFixed(1),
      hottestProvince: hottest.province,
      hottestTemp:     hottest.temperature_mean,
      coldestProvince: coldest.province,
      coldestTemp:     coldest.temperature_mean,
      avgAqi:          Math.round(avg(provinceRows, 'aqi')),
      avgRain:         avg(provinceRows, 'rain_sum').toFixed(1),
      maxRainProvince: maxRain.province,
      maxRainVal:      maxRain.rain_sum,
      avgHumidity:     Math.round(avg(provinceRows, 'humidity_mean')),
    };
  }, [provinceRows]);

  /* ── Tiers for active metric ───────────────────────────────────── */
  const activeTiers = useMemo(() => {
    if (viewMetric === 'aqi') return AQI_TIERS;
    if (viewMetric === 'temp') return TEMP_TIERS;
    if (viewMetric === 'rain') return RAIN_TIERS;
    if (viewMetric === 'wind') return WIND_TIERS;
    return HUMIDITY_TIERS;
  }, [viewMetric]);

  /* ── Donut chart pie distribution ──────────────────────────────── */
  const pieDistribution = useMemo(() => {
    if (!provinceRows.length) return [];
    const total = provinceRows.length;
    const counts = {};
    activeTiers.forEach(t => { counts[t.key] = 0; });

    provinceRows.forEach(r => {
      const tier = getTierForMetric(viewMetric, r);
      if (tier) counts[tier.key]++;
    });

    return activeTiers
      .map(t => {
        const count = counts[t.key] || 0;
        const pct = +((count / total) * 100).toFixed(1);
        return {
          name: t.label,
          key: t.key,
          value: count,
          percentage: pct,
          color: t.color,
        };
      })
      .filter(d => d.value > 0);
  }, [provinceRows, viewMetric, activeTiers]);

  // Dominant tier for center text
  const dominantTier = useMemo(() => {
    if (!pieDistribution.length) return { percentage: 0, name: 'N/A', value: 0, color: '#10B981' };
    return [...pieDistribution].sort((a, b) => b.value - a.value)[0];
  }, [pieDistribution]);

  // Currently active displayed item in Donut center
  const activeCenterDisplay = useMemo(() => {
    if (activePieIndex !== null && pieDistribution[activePieIndex]) {
      return pieDistribution[activePieIndex];
    }
    return dominantTier;
  }, [activePieIndex, pieDistribution, dominantTier]);

  /* ── Top Rankings based on rankingMetric ───────────────────────── */
  const topHigh = useMemo(() => {
    return [...provinceRows]
      .sort((a, b) => {
        if (rankingMetric === 'aqi') return b.aqi - a.aqi;
        if (rankingMetric === 'temp') return b.temperature_mean - a.temperature_mean;
        if (rankingMetric === 'rain') return b.rain_sum - a.rain_sum;
        if (rankingMetric === 'wind') return b.wind_speed_max - a.wind_speed_max;
        return b.humidity_mean - a.humidity_mean;
      })
      .slice(0, 8);
  }, [provinceRows, rankingMetric]);

  const topLow = useMemo(() => {
    return [...provinceRows]
      .sort((a, b) => {
        if (rankingMetric === 'aqi') return a.aqi - b.aqi;
        if (rankingMetric === 'temp') return a.temperature_mean - b.temperature_mean;
        if (rankingMetric === 'rain') return a.rain_sum - b.rain_sum;
        if (rankingMetric === 'wind') return a.wind_speed_max - a.wind_speed_max;
        return a.humidity_mean - b.humidity_mean;
      })
      .slice(0, 8);
  }, [provinceRows, rankingMetric]);

  if (loading) return <div className="overview-empty"><p>Đang tải dữ liệu…</p></div>;
  if (error) return <div className="overview-empty"><p>Lỗi: {error}</p></div>;

  const currentAqiTier = kpis ? getAqiTier(kpis.avgAqi) : null;
  const metricTitle = viewMetric === 'aqi' ? 'Chất lượng AQI'
    : viewMetric === 'temp' ? 'Nhiệt độ'
    : viewMetric === 'rain' ? 'Lượng mưa'
    : viewMetric === 'wind' ? 'Tốc độ gió'
    : 'Độ ẩm';

  const rankingMetricTitle = rankingMetric === 'aqi' ? 'AQI Mỹ'
    : rankingMetric === 'temp' ? 'Nhiệt độ TB'
    : rankingMetric === 'rain' ? 'Lượng mưa'
    : rankingMetric === 'wind' ? 'Tốc độ gió'
    : 'Độ ẩm';

  const rankingValFormatter = (r) => {
    if (rankingMetric === 'aqi') return `${r.aqi}`;
    if (rankingMetric === 'temp') return `${r.temperature_mean}°C`;
    if (rankingMetric === 'rain') return `${r.rain_sum} mm`;
    if (rankingMetric === 'wind') return `${r.wind_speed_max} km/h`;
    return `${r.humidity_mean}%`;
  };

  return (
    <div className="overview-tab">

      {/* ── Floating Rich Tooltip for Table Rows ──────────────────── */}
      {hoveredTableRow && (
        <div
          className="table-floating-card-popover"
          style={{
            position: 'fixed',
            left: tablePos.x,
            top: tablePos.y,
            zIndex: 9999,
            pointerEvents: 'none',
          }}
        >
          <RichWeatherCard data={hoveredTableRow} />
        </div>
      )}

      {/* ── Filter Row ────────────────────────────────────────────── */}
      <div className="filter-row" id="overview-filters">
        <div className="filter-group">
          <label className="filter-label" htmlFor="filter-date">Thời gian</label>
          <select
            id="filter-date"
            className="filter-select"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
          >
            <option value="all">Tất cả thời gian</option>
            {dates.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label" htmlFor="filter-region">Phân vùng</label>
          <select
            id="filter-region"
            className="filter-select"
            value={selectedRegion}
            onChange={e => {
              setSelectedRegion(e.target.value);
              setSelectedProvince('all');
            }}
          >
            <option value="all">Tất cả các vùng</option>
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label" htmlFor="filter-province">Tỉnh / Thành phố</label>
          <select
            id="filter-province"
            className="filter-select"
            value={selectedProvince}
            onChange={e => setSelectedProvince(e.target.value)}
          >
            <option value="all">Tất cả tỉnh/thành</option>
            {filteredProvinces.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {/* ── SECTION 1: KPI Stat Tiles Row ─────────────────────────── */}
      {kpis && (
        <div className="stat-row">
          <div className="stat-tile" id="kpi-temp">
            <div className="stat-tile-icon" style={{ backgroundColor: 'rgba(59,130,246,0.1)', color: '#3B82F6' }}>
              <Thermometer size={22} />
            </div>
            <div className="stat-tile-body">
              <span className="stat-tile-label">Nhiệt độ trung bình</span>
              <span className="stat-tile-value">{kpis.avgTemp}°C</span>
              <span className="stat-tile-delta">
                Cao nhất {kpis.hottestTemp}°C ({kpis.hottestProvince}) · Thấp nhất {kpis.coldestTemp}°C ({kpis.coldestProvince})
              </span>
            </div>
          </div>

          <div className="stat-tile" id="kpi-aqi">
            <div className="stat-tile-icon" style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}>
              <Cloud size={22} />
            </div>
            <div className="stat-tile-body">
              <span className="stat-tile-label">Chỉ số AQI trung bình</span>
              <span className="stat-tile-value">{kpis.avgAqi}</span>
              <span className="stat-tile-delta" style={{ color: currentAqiTier.color, fontWeight: 600 }}>
                {currentAqiTier.label}
              </span>
            </div>
          </div>

          <div className="stat-tile" id="kpi-rain">
            <div className="stat-tile-icon" style={{ backgroundColor: 'rgba(14,165,233,0.1)', color: '#0EA5E9' }}>
              <Droplets size={22} />
            </div>
            <div className="stat-tile-body">
              <span className="stat-tile-label">Lượng mưa trung bình</span>
              <span className="stat-tile-value">{kpis.avgRain} mm</span>
              <span className="stat-tile-delta">
                Mưa nhiều nhất: {kpis.maxRainProvince} ({kpis.maxRainVal} mm)
              </span>
            </div>
          </div>

          <div className="stat-tile" id="kpi-humidity">
            <div className="stat-tile-icon" style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#10B981' }}>
              <Wind size={22} />
            </div>
            <div className="stat-tile-body">
              <span className="stat-tile-label">Độ ẩm trung bình</span>
              <span className="stat-tile-value">{kpis.avgHumidity}%</span>
              <span className="stat-tile-delta">Độ ẩm không khí toàn quốc</span>
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION 2: Fixed Vietnam Map & Dynamic Donut Chart ────── */}
      <div className="top-viz-grid">

        {/* Map Card */}
        <figure className="chart-card map-container-card">
          <div className="chart-header-overlay">
            <h3 className="chart-card-title m-0">Bản đồ thời tiết Việt Nam</h3>
            <div className="metric-toggle">
              <button
                className={`toggle-btn ${viewMetric === 'aqi' ? 'active' : ''}`}
                onClick={() => setViewMetric('aqi')}
              >
                Chất lượng AQI
              </button>
              <button
                className={`toggle-btn ${viewMetric === 'temp' ? 'active' : ''}`}
                onClick={() => setViewMetric('temp')}
              >
                Nhiệt độ (°C)
              </button>
              <button
                className={`toggle-btn ${viewMetric === 'rain' ? 'active' : ''}`}
                onClick={() => setViewMetric('rain')}
              >
                Lượng mưa (mm)
              </button>
              <button
                className={`toggle-btn ${viewMetric === 'wind' ? 'active' : ''}`}
                onClick={() => setViewMetric('wind')}
              >
                Tốc độ gió (km/h)
              </button>
              <button
                className={`toggle-btn ${viewMetric === 'humidity' ? 'active' : ''}`}
                onClick={() => setViewMetric('humidity')}
              >
                Độ ẩm (%)
              </button>
            </div>
          </div>

          <div className="map-wrap-rel">
            {/* Glassmorphism Legend Overlay */}
            <div className="aqi-legend-overlay">
              <span className="legend-overlay-title">
                Chỉ số {metricTitle}
              </span>
              {activeTiers.slice().reverse().map(t => (
                <div key={t.key} className="legend-overlay-item">
                  <span className="legend-color-strip" style={{ backgroundColor: t.color }} />
                  <span className="legend-overlay-text">{t.label}</span>
                </div>
              ))}
            </div>

            {/* Bounded Map for Vietnam */}
            <MapContainer
              center={[16.0, 106.5]}
              zoom={6}
              minZoom={5}
              maxZoom={9}
              maxBounds={[[7.0, 100.0], [24.5, 118.5]]}
              maxBoundsViscosity={1.0}
              style={{ height: '440px', width: '100%' }}
              scrollWheelZoom={false}
              zoomControl={false}
            >
              <ZoomControl position="bottomright" />
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; CARTO'
              />
              {provinceRows.map((row, i) => {
                const tier = getTierForMetric(viewMetric, row);
                const isSelected = selectedProvince !== 'all' && row.province === selectedProvince;
                return (
                  <CircleMarker
                    key={`${row.province}-${i}`}
                    center={[row.latitude, row.longitude]}
                    radius={isSelected ? 14 : 9}
                    pathOptions={{
                      fillColor: tier.color,
                      color: isSelected ? '#0b0b0b' : '#ffffff',
                      weight: isSelected ? 3 : 2,
                      fillOpacity: 0.88,
                    }}
                  >
                    <LeafletTooltip direction="top" offset={[0, -8]} className="custom-leaflet-tooltip">
                      <RichWeatherCard data={row} />
                    </LeafletTooltip>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>
        </figure>

        {/* Dynamic High-End Donut Chart Card */}
        <figure className="chart-card donut-card">
          <div className="chart-header-simple">
            <h3 className="chart-card-title text-center">Tỷ lệ phân bố {metricTitle}</h3>
            <span className="donut-hint-badge">Rê chuột lên quạt để xem chi tiết</span>
          </div>

          <div className="donut-wrap">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={68}
                  outerRadius={98}
                  paddingAngle={4}
                  dataKey="value"
                  onMouseEnter={(_, idx) => setActivePieIndex(idx)}
                  onMouseLeave={() => setActivePieIndex(null)}
                  animationBegin={0}
                  animationDuration={1000}
                  animationEasing="ease-out"
                >
                  {pieDistribution.map((entry, index) => {
                    const isHovered = index === activePieIndex;
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        stroke="#ffffff"
                        strokeWidth={isHovered ? 3 : 2}
                        className="donut-slice-cell"
                        style={{
                          filter: isHovered ? `drop-shadow(0px 6px 12px ${entry.color}80)` : 'none',
                          transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                          transformOrigin: 'center center',
                          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                          cursor: 'pointer',
                        }}
                      />
                    );
                  })}
                </Pie>
                <RechartsTooltip
                  formatter={(val, name, entry) => [`${entry.payload.percentage}% (${val} tỉnh)`, name]}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Dynamic Center Label inside Donut */}
            <div className="donut-center-label">
              <span className="donut-percentage" style={{ color: activeCenterDisplay.color }}>
                {activeCenterDisplay.percentage}%
              </span>
              <span className="donut-status">{activeCenterDisplay.name}</span>
              <span className="donut-count-sub">{activeCenterDisplay.value} tỉnh/thành</span>
            </div>
          </div>

          {/* Interactive Donut Legend Pills */}
          <div className="donut-legend-container">
            {pieDistribution.map((item, idx) => {
              const isHovered = idx === activePieIndex;
              return (
                <div
                  key={item.key}
                  className={`donut-legend-pill ${isHovered ? 'active-pill' : ''}`}
                  onMouseEnter={() => setActivePieIndex(idx)}
                  onMouseLeave={() => setActivePieIndex(null)}
                  style={{
                    borderColor: isHovered ? item.color : '#E2E8F0',
                    backgroundColor: isHovered ? `${item.color}10` : '#F8FAFC',
                  }}
                >
                  <span className="donut-dot" style={{ backgroundColor: item.color }} />
                  <span className="donut-legend-label">{item.name}</span>
                  <span
                    className="donut-legend-badge"
                    style={{ backgroundColor: `${item.color}18`, color: item.color }}
                  >
                    {item.percentage}% ({item.value})
                  </span>
                </div>
              );
            })}
          </div>
        </figure>

      </div>

      {/* ── SECTION 3: 2 REGIONAL OVERVIEW CHARTS ────────────────────── */}
      <div className="extra-charts-grid">

        {/* CHART 1: So sánh Chỉ số Khí hậu & Môi trường giữa 4 Vùng Miền */}
        <figure className="chart-card">
          <div className="chart-card-header">
            <div className="chart-title-flex">
              <Map size={18} color="#2563EB" />
              <h3 className="chart-card-title m-0">So sánh Chỉ số Thời tiết & AQI theo 4 Vùng Miền</h3>
            </div>
            <span className="chart-subtitle-badge">Bắc • Trung • Tây Nguyên • Nam</span>
          </div>

          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={regionalData} margin={{ top: 15, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="region" tick={{ fontSize: 12, fill: '#1E293B', fontWeight: 600 }} axisLine={{ stroke: '#CBD5E1' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748B' }} />
                <RechartsTooltip content={<RegionalBarTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: 5, fontSize: 12 }}
                  formatter={(val, entry) => (
                    <span className="rich-chart-legend-item">
                      <span className="legend-dot-indicator" style={{ backgroundColor: entry.color }} />
                      <strong style={{ color: '#0F172A' }}>{val}</strong>
                    </span>
                  )}
                />
                <Bar dataKey="Nhiệt độ TB" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={18} />
                <Bar dataKey="Chỉ số AQI Mỹ" fill="#8B5CF6" radius={[4, 4, 0, 0]} barSize={18} />
                <Bar dataKey="Lượng mưa TB" fill="#0EA5E9" radius={[4, 4, 0, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </figure>

        {/* CHART 2: Phân bố Trạng thái Thời tiết Thực tế theo 4 Vùng Miền */}
        <figure className="chart-card">
          <div className="chart-card-header">
            <div className="chart-title-flex">
              <SunMedium size={18} color="#F59E0B" />
              <h3 className="chart-card-title m-0">Phân bố Trạng thái Thời tiết theo 4 Vùng Miền</h3>
            </div>
            <span className="chart-subtitle-badge">Số lượng tỉnh/thành</span>
          </div>

          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={regionalConditionData} margin={{ top: 15, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="region" tick={{ fontSize: 12, fill: '#1E293B', fontWeight: 600 }} axisLine={{ stroke: '#CBD5E1' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748B' }} label={{ value: 'Số tỉnh/thành', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#64748B' } }} />
                <RechartsTooltip content={<StackedConditionTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: 5, fontSize: 11 }}
                  formatter={(val, entry) => (
                    <span className="rich-chart-legend-item">
                      <span className="legend-dot-indicator" style={{ backgroundColor: entry.color }} />
                      <strong style={{ color: '#0F172A' }}>{val}</strong>
                    </span>
                  )}
                />
                <Bar dataKey="sunny" name="Nắng đẹp" stackId="a" fill="#EAB308" />
                <Bar dataKey="partlyCloudy" name="Nắng gián đoạn" stackId="a" fill="#F59E0B" />
                <Bar dataKey="overcast" name="Nhiều mây" stackId="a" fill="#64748B" />
                <Bar dataKey="rain" name="Có mưa rào" stackId="a" fill="#0EA5E9" />
                <Bar dataKey="heavyRain" name="Mưa lớn (>10mm)" stackId="a" fill="#1D4ED8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </figure>

      </div>

      {/* ── SECTION 4: Rankings with Dedicated Metric Filter ───────── */}
      <div className="ranking-section">
        <div className="ranking-section-header-flex">
          <div className="ranking-section-title">
            <h2>Bảng xếp hạng trực tiếp các Tỉnh/thành</h2>
            <p className="ranking-section-subtitle">
              Cập nhật chỉ số theo thời gian thực từ dataset thời tiết Việt Nam • <em>Rê chuột lên dòng để xem chi tiết</em>
            </p>
          </div>

          {/* Metric Filter for Ranking Tables */}
          <div className="metric-toggle">
            <button
              className={`toggle-btn ${rankingMetric === 'aqi' ? 'active' : ''}`}
              onClick={() => setRankingMetric('aqi')}
            >
              AQI Mỹ
            </button>
            <button
              className={`toggle-btn ${rankingMetric === 'temp' ? 'active' : ''}`}
              onClick={() => setRankingMetric('temp')}
            >
              Nhiệt độ (°C)
            </button>
            <button
              className={`toggle-btn ${rankingMetric === 'rain' ? 'active' : ''}`}
              onClick={() => setRankingMetric('rain')}
            >
              Lượng mưa (mm)
            </button>
            <button
              className={`toggle-btn ${rankingMetric === 'wind' ? 'active' : ''}`}
              onClick={() => setRankingMetric('wind')}
            >
              Tốc độ gió (km/h)
            </button>
            <button
              className={`toggle-btn ${rankingMetric === 'humidity' ? 'active' : ''}`}
              onClick={() => setRankingMetric('humidity')}
            >
              Độ ẩm (%)
            </button>
          </div>
        </div>

        <div className="ranking-tables-grid">

          {/* Table 1: Top High */}
          <div className="ranking-card">
            <div className="ranking-card-header">
              <h3>
                {rankingMetric === 'aqi' ? 'Top Tỉnh/Thành AQI cao nhất (Ô nhiễm)' :
                 rankingMetric === 'temp' ? 'Top Tỉnh/Thành nóng nhất' :
                 rankingMetric === 'rain' ? 'Top Tỉnh/Thành mưa nhiều nhất' :
                 rankingMetric === 'wind' ? 'Top Tỉnh/Thành gió mạnh nhất' :
                 'Top Tỉnh/Thành độ ẩm cao nhất'}
              </h3>
              <p>Danh sách các tỉnh thành có chỉ số cao nhất</p>
            </div>

            <table className="ranking-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th>Tỉnh/thành</th>
                  <th className="text-right">{rankingMetricTitle}</th>
                </tr>
              </thead>
              <tbody>
                {topHigh.map((r, idx) => {
                  const tier = getTierForMetric(rankingMetric, r);
                  return (
                    <tr
                      key={r.province}
                      className="ranking-table-row"
                      onMouseEnter={(e) => handleRowMouseEnter(r, e)}
                      onMouseMove={handleRowMouseMove}
                      onMouseLeave={handleRowMouseLeave}
                    >
                      <td className="rank-num">{idx + 1}</td>
                      <td className="province-cell">
                        <span className="province-flag" style={{ backgroundColor: tier.color }}>
                          <MapPin size={10} color="#ffffff" />
                        </span>
                        <span className="province-name">{r.province}</span>
                      </td>
                      <td className="text-right">
                        <span className="aqi-badge" style={{ backgroundColor: tier.color }}>
                          {rankingValFormatter(r)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table 2: Top Low */}
          <div className="ranking-card">
            <div className="ranking-card-header">
              <h3>
                {rankingMetric === 'aqi' ? 'Top Tỉnh/Thành AQI thấp nhất (Trong lành)' :
                 rankingMetric === 'temp' ? 'Top Tỉnh/Thành mát nhất / lạnh nhất' :
                 rankingMetric === 'rain' ? 'Top Tỉnh/Thành mưa ít nhất / không mưa' :
                 rankingMetric === 'wind' ? 'Top Tỉnh/Thành gió nhẹ nhất' :
                 'Top Tỉnh/Thành hanh khô nhất'}
              </h3>
              <p>Danh sách các tỉnh thành có chỉ số thấp nhất</p>
            </div>

            <table className="ranking-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th>Tỉnh/thành</th>
                  <th className="text-right">{rankingMetricTitle}</th>
                </tr>
              </thead>
              <tbody>
                {topLow.map((r, idx) => {
                  const tier = getTierForMetric(rankingMetric, r);
                  return (
                    <tr
                      key={r.province}
                      className="ranking-table-row"
                      onMouseEnter={(e) => handleRowMouseEnter(r, e)}
                      onMouseMove={handleRowMouseMove}
                      onMouseLeave={handleRowMouseLeave}
                    >
                      <td className="rank-num">{idx + 1}</td>
                      <td className="province-cell">
                        <span className="province-flag" style={{ backgroundColor: tier.color }}>
                          <MapPin size={10} color="#ffffff" />
                        </span>
                        <span className="province-name">{r.province}</span>
                      </td>
                      <td className="text-right">
                        <span className="aqi-badge" style={{ backgroundColor: tier.color }}>
                          {rankingValFormatter(r)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>
      </div>

    </div>
  );
};

export default OverviewTab;
