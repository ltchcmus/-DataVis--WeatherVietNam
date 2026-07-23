import React, { useMemo, useState, useEffect } from 'react';
import {
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, BarChart, Bar, LabelList, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar,
} from 'recharts';
import {
  BarChart3, Boxes, Flame, Gauge, Layers3, Compass, ThermometerSun,
} from 'lucide-react';
import useWeatherData from '../../hooks/useWeatherData';
import { REGIONS, getRegionByProvince } from '../../constants/regions';
import DashboardSkeleton from './DashboardSkeleton';

const SERIES = ['#2a78d6', '#eb6834', '#1baf7a'];
const OTHER_COLOR = '#94A3B8';

const METRICS = [
  { key: 'temperature_mean', label: 'Temp', fullLabel: 'Nhiệt độ TB', unit: '°C' },
  { key: 'rain_sum', label: 'Rain', fullLabel: 'Lượng mưa', unit: 'mm' },
  { key: 'humidity_mean', label: 'Humidity', fullLabel: 'Độ ẩm', unit: '%' },
  { key: 'wind_speed_max', label: 'Wind', fullLabel: 'Gió max', unit: 'km/h' },
  { key: 'aqi', label: 'AQI', fullLabel: 'AQI', unit: '' },
];

function average(rows, key) {
  if (!rows.length) return 0;
  return rows.reduce((sum, row) => sum + (Number(row[key]) || 0), 0) / rows.length;
}

function quantile(sortedValues, q) {
  if (!sortedValues.length) return 0;
  const pos = (sortedValues.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sortedValues[base + 1];
  return next === undefined
    ? sortedValues[base]
    : sortedValues[base] + rest * (next - sortedValues[base]);
}

function normalize(value, min, max) {
  if (max === min) return 0.5;
  return (value - min) / (max - min);
}

function formatValue(value, unit = '', digits = 1) {
  const rounded = Number(value || 0).toFixed(digits);
  return `${rounded}${unit}`;
}

function getHeatColor(value) {
  const t = Math.max(0, Math.min(1, value));
  const lightness = 94 - t * 48;
  return `hsl(212 76% ${lightness}%)`;
}

function RadarTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const dataPoint = payload[0].payload;
  const { subject, unit } = dataPoint;
  return (
    <div className="viz-tooltip radar-tooltip">
      <div className="viz-tooltip-header">
        <span className="viz-tooltip-label">{subject}</span>
      </div>
      <div className="viz-tooltip-divider" />
      <div className="viz-tooltip-body">
        {payload.map((entry) => {
          const provName = entry.name;
          const rawValue = dataPoint[`${provName}_raw`];
          const digits = (dataPoint.key === 'aqi' || dataPoint.key === 'humidity_mean') ? 0 : 1;
          return (
            <div key={provName} className="viz-tooltip-row" style={{ color: entry.color, display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
              <span className="viz-tooltip-metric" style={{ fontWeight: 600 }}>{provName}:</span>
              <span className="viz-tooltip-value">
                {formatValue(rawValue, unit, digits)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RankingBarTooltip({ active, payload, metric }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="viz-tooltip province-tooltip">
      <div className="viz-tooltip-header">
        <span className="viz-tooltip-label">{item.province}</span>
      </div>
      <div className="viz-tooltip-divider" />
      <div className="viz-tooltip-body">
        <div className="viz-tooltip-row">
          <span className="viz-tooltip-metric">{metric.fullLabel}</span>
          <span className="viz-tooltip-value">{formatValue(item[metric.key], metric.unit, metric.key === 'aqi' || metric.key === 'humidity_mean' ? 0 : 1)}</span>
        </div>
        <div className="viz-tooltip-row">
          <span className="viz-tooltip-metric">Số ngày quan sát</span>
          <span className="viz-tooltip-value">{item.count}</span>
        </div>
      </div>
    </div>
  );
}

function BoxplotChart({ data }) {
  if (!data.length) return <div className="overview-empty"><p>Không có dữ liệu để vẽ boxplot.</p></div>;

  const values = data.flatMap(d => [d.min, d.max]);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const width = 980;
  const rowHeight = 38;
  const margin = { top: 28, right: 48, bottom: 42, left: 150 };
  const plotWidth = width - margin.left - margin.right;
  const height = margin.top + margin.bottom + rowHeight * data.length;
  const xScale = value => margin.left + normalize(value, minValue, maxValue) * plotWidth;
  const ticks = Array.from({ length: 5 }, (_, i) => minValue + ((maxValue - minValue) * i) / 4);

  return (
    <div className="boxplot-scroll">
      <svg className="boxplot-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Boxplot nhiệt độ theo tỉnh">
        {ticks.map(tick => (
          <g key={tick}>
            <line
              x1={xScale(tick)}
              x2={xScale(tick)}
              y1={margin.top - 10}
              y2={height - margin.bottom}
              stroke="#e1e0d9"
              strokeWidth="1"
            />
            <text x={xScale(tick)} y={height - 16} textAnchor="middle" className="boxplot-axis-text">
              {tick.toFixed(1)}°C
            </text>
          </g>
        ))}
        <line
          x1={margin.left}
          x2={width - margin.right}
          y1={height - margin.bottom}
          y2={height - margin.bottom}
          stroke="#c3c2b7"
          strokeWidth="1"
        />
        {data.map((row, index) => {
          const y = margin.top + index * rowHeight + rowHeight / 2;
          const boxTop = y - 9;
          return (
            <g key={row.province} tabIndex="0">
              <title>{`${row.province}: min ${row.min.toFixed(1)}°C, Q1 ${row.q1.toFixed(1)}°C, median ${row.median.toFixed(1)}°C, Q3 ${row.q3.toFixed(1)}°C, max ${row.max.toFixed(1)}°C`}</title>
              <text x={margin.left - 12} y={y + 4} textAnchor="end" className="boxplot-label">
                {row.province}
              </text>
              <line x1={xScale(row.min)} x2={xScale(row.max)} y1={y} y2={y} stroke="#52514e" strokeWidth="2" />
              <line x1={xScale(row.min)} x2={xScale(row.min)} y1={y - 7} y2={y + 7} stroke="#52514e" strokeWidth="2" />
              <line x1={xScale(row.max)} x2={xScale(row.max)} y1={y - 7} y2={y + 7} stroke="#52514e" strokeWidth="2" />
              <rect
                x={xScale(row.q1)}
                y={boxTop}
                width={Math.max(4, xScale(row.q3) - xScale(row.q1))}
                height="18"
                rx="4"
                fill="#86b6ef"
                stroke="#1c5cab"
                strokeWidth="1"
              />
              <line x1={xScale(row.median)} x2={xScale(row.median)} y1={boxTop - 3} y2={boxTop + 21} stroke="#0b0b0b" strokeWidth="2" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

const ProvinceComparisonTab = () => {
  const { data, loading, error, dates, provinces } = useWeatherData();
  const [timePreset, setTimePreset] = useState('all');
  const [regionScope, setRegionScope] = useState('all');
  const [provinceScope, setProvinceScope] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [rankingMetric, setRankingMetric] = useState('temperature_mean');

  const filteredProvinces = useMemo(() => {
    if (regionScope === 'all') return provinces;
    return provinces.filter(p => getRegionByProvince(p) === regionScope);
  }, [provinces, regionScope]);

  const filteredRows = useMemo(() => {
    let rows = data;
    if (timePreset === '30d') rows = rows.filter(r => dates.slice(-30).includes(r.date));
    if (timePreset === '90d') rows = rows.filter(r => dates.slice(-90).includes(r.date));
    if (timePreset === 'custom') {
      if (customStart) rows = rows.filter(r => r.date >= customStart);
      if (customEnd) rows = rows.filter(r => r.date <= customEnd);
    }
    if (regionScope !== 'all') rows = rows.filter(r => getRegionByProvince(r.province) === regionScope);
    if (provinceScope !== 'all') rows = rows.filter(r => r.province === provinceScope);
    return rows;
  }, [data, dates, timePreset, customStart, customEnd, regionScope, provinceScope]);

  const provinceSummary = useMemo(() => {
    const grouped = new Map();
    filteredRows.forEach(row => {
      if (!grouped.has(row.province)) grouped.set(row.province, []);
      grouped.get(row.province).push(row);
    });

    return [...grouped.entries()].map(([province, rows]) => {
      const values = rows.map(r => r.temperature_mean).sort((a, b) => a - b);
      return {
        province,
        count: rows.length,
        temperature_mean: average(rows, 'temperature_mean'),
        rain_sum: average(rows, 'rain_sum'),
        humidity_mean: average(rows, 'humidity_mean'),
        wind_speed_max: average(rows, 'wind_speed_max'),
        aqi: average(rows, 'aqi'),
        min: values[0] || 0,
        q1: quantile(values, 0.25),
        median: quantile(values, 0.5),
        q3: quantile(values, 0.75),
        max: values[values.length - 1] || 0,
      };
    }).sort((a, b) => b.temperature_mean - a.temperature_mean);
  }, [filteredRows]);

  const heatmapRows = useMemo(() => {
    const ranges = {};
    METRICS.forEach(metric => {
      const vals = provinceSummary.map(row => row[metric.key]);
      ranges[metric.key] = { min: Math.min(...vals), max: Math.max(...vals) };
    });

    return provinceSummary.map(row => ({
      ...row,
      normalized: Object.fromEntries(METRICS.map(metric => [
        metric.key,
        normalize(row[metric.key], ranges[metric.key].min, ranges[metric.key].max),
      ])),
    }));
  }, [provinceSummary]);

  const [radarProv1, setRadarProv1] = useState('Hà Nội');
  const [radarProv2, setRadarProv2] = useState('TP.HCM');

  useEffect(() => {
    if (provinces.length > 0) {
      if (!radarProv1 || !provinces.includes(radarProv1)) {
        setRadarProv1(provinces[0]);
      }
      if (!radarProv2 || !provinces.includes(radarProv2)) {
        const nextProv = provinces.find(p => p !== (radarProv1 || provinces[0])) || '';
        setRadarProv2(nextProv);
      }
    }
  }, [provinces]);

  useEffect(() => {
    if (provinceScope !== 'all' && provinces.includes(provinceScope)) {
      setRadarProv1(provinceScope);
      if (provinceScope === radarProv2) {
        setRadarProv2('');
      }
    }
  }, [provinceScope, provinces, radarProv2]);

  const filteredRowsForRadar = useMemo(() => {
    let rows = data;
    if (timePreset === '30d') rows = rows.filter(r => dates.slice(-30).includes(r.date));
    if (timePreset === '90d') rows = rows.filter(r => dates.slice(-90).includes(r.date));
    if (timePreset === 'custom') {
      if (customStart) rows = rows.filter(r => r.date >= customStart);
      if (customEnd) rows = rows.filter(r => r.date <= customEnd);
    }
    return rows;
  }, [data, dates, timePreset, customStart, customEnd]);

  const radarProvinceSummary = useMemo(() => {
    const grouped = new Map();
    filteredRowsForRadar.forEach(row => {
      if (!grouped.has(row.province)) grouped.set(row.province, []);
      grouped.get(row.province).push(row);
    });

    return [...grouped.entries()].map(([province, rows]) => {
      return {
        province,
        temperature_mean: average(rows, 'temperature_mean'),
        rain_sum: average(rows, 'rain_sum'),
        humidity_mean: average(rows, 'humidity_mean'),
        wind_speed_max: average(rows, 'wind_speed_max'),
        aqi: average(rows, 'aqi'),
      };
    });
  }, [filteredRowsForRadar]);

  const radarChartData = useMemo(() => {
    if (!radarProvinceSummary.length) return [];

    return METRICS.map(metric => {
      const item = {
        subject: metric.fullLabel,
        key: metric.key,
        unit: metric.unit,
      };

      const vals = radarProvinceSummary.map(p => p[metric.key]);
      const minVal = Math.min(...vals);
      const maxVal = Math.max(...vals);
      const range = maxVal - minVal;

      const provincesToProcess = [radarProv1, radarProv2].filter(Boolean);
      provincesToProcess.forEach(provName => {
        const summary = radarProvinceSummary.find(p => p.province === provName);
        if (summary) {
          const val = summary[metric.key];
          const normalized = range === 0 ? 60 : 20 + ((val - minVal) / range) * 80;
          item[provName] = normalized;
          item[`${provName}_raw`] = val;
        } else {
          item[provName] = 20;
          item[`${provName}_raw`] = 0;
        }
      });

      return item;
    });
  }, [radarProvinceSummary, radarProv1, radarProv2]);

  const boxplotRows = useMemo(() => {
    return [...provinceSummary]
      .sort((a, b) => (b.q3 - b.q1) - (a.q3 - a.q1))
      .slice(0, provinceScope === 'all' ? 14 : 1);
  }, [provinceSummary, provinceScope]);

  const rankedRows = useMemo(() => {
    return [...provinceSummary].sort((a, b) => {
      if (rankingMetric === 'aqi') return a.aqi - b.aqi;
      return b[rankingMetric] - a[rankingMetric];
    });
  }, [provinceSummary, rankingMetric]);

  const rankingMetricConfig = useMemo(
    () => METRICS.find(metric => metric.key === rankingMetric) || METRICS[0],
    [rankingMetric],
  );

  const top10Rows = useMemo(() => rankedRows.slice(0, 10), [rankedRows]);

  const rankingTitle = rankingMetric === 'aqi'
    ? 'Top 10 tỉnh/thành phố có AQI tốt nhất'
    : `Top 10 tỉnh/thành phố theo ${rankingMetricConfig.fullLabel.toLowerCase()}`;

  const headline = useMemo(() => {
    if (!provinceSummary.length) return null;
    const hottest = [...provinceSummary].sort((a, b) => b.temperature_mean - a.temperature_mean)[0];
    const rainiest = [...provinceSummary].sort((a, b) => b.rain_sum - a.rain_sum)[0];
    const cleanest = [...provinceSummary].sort((a, b) => a.aqi - b.aqi)[0];
    const windiest = [...provinceSummary].sort((a, b) => b.wind_speed_max - a.wind_speed_max)[0];
    return { hottest, rainiest, cleanest, windiest };
  }, [provinceSummary]);

  if (loading) return <DashboardSkeleton message="Đang kết nối Supabase & xử lý so sánh tỉnh..." />;
  if (error) return <div className="overview-empty"><p>Lỗi: {error}</p></div>;

  return (
    <div className="province-comparison-tab">
      {/* <div className="tab-intro-panel">
        <div>
          <p className="tab-kicker">Tab 3. So sánh giữa các tỉnh</p>
          <h2>Các tỉnh khác nhau như thế nào về khí hậu?</h2>
          <p>
            View này so sánh phân bố nhiệt độ, mức mưa, độ ẩm, gió và AQI theo cùng một lát cắt dữ liệu để tìm tỉnh nóng,
            mưa nhiều, AQI tốt và các cụm khí hậu gần giống nhau.
          </p>
        </div>
      </div> */}

      <div className="filter-row-complex">
        <div className="filter-group">
          <label className="filter-label" htmlFor="compare-region">Phân vùng</label>
          <select
            id="compare-region"
            className="filter-select"
            value={regionScope}
            onChange={e => {
              setRegionScope(e.target.value);
              setProvinceScope('all');
            }}
          >
            <option value="all">Tất cả các vùng</option>
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label" htmlFor="compare-province">Tỉnh / Thành phố</label>
          <select
            id="compare-province"
            className="filter-select"
            value={provinceScope}
            onChange={e => setProvinceScope(e.target.value)}
          >
            <option value="all">Tất cả tỉnh/thành</option>
            {filteredProvinces.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Khoảng thời gian</label>
          <div className="metric-toggle">
            <button className={`toggle-btn ${timePreset === 'all' ? 'active' : ''}`} onClick={() => setTimePreset('all')}>Tất cả</button>
            <button className={`toggle-btn ${timePreset === '30d' ? 'active' : ''}`} onClick={() => setTimePreset('30d')}>30 ngày</button>
            <button className={`toggle-btn ${timePreset === '90d' ? 'active' : ''}`} onClick={() => setTimePreset('90d')}>90 ngày</button>
            <button className={`toggle-btn ${timePreset === 'custom' ? 'active' : ''}`} onClick={() => setTimePreset('custom')}>Tùy chỉnh</button>
          </div>
        </div>

        {timePreset === 'custom' && (
          <div className="filter-group-custom-dates">
            <input type="date" className="filter-date-input" value={customStart} onChange={e => setCustomStart(e.target.value)} />
            <span className="date-sep">đến</span>
            <input type="date" className="filter-date-input" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
          </div>
        )}
      </div>

      {headline && (
        <div className="stat-row compare-stat-row">
          <div className="stat-tile">
            <div className="stat-tile-icon compare-hot"><Flame size={22} /></div>
            <div className="stat-tile-body">
              <span className="stat-tile-label">Nóng nhất</span>
              <span className="stat-tile-value">{headline.hottest.province}</span>
              <span className="stat-tile-delta">{formatValue(headline.hottest.temperature_mean, '°C')}</span>
            </div>
          </div>
          <div className="stat-tile">
            <div className="stat-tile-icon compare-rain"><Layers3 size={22} /></div>
            <div className="stat-tile-body">
              <span className="stat-tile-label">Mưa nhiều nhất</span>
              <span className="stat-tile-value">{headline.rainiest.province}</span>
              <span className="stat-tile-delta">{formatValue(headline.rainiest.rain_sum, ' mm')}</span>
            </div>
          </div>
          <div className="stat-tile">
            <div className="stat-tile-icon compare-clean"><Gauge size={22} /></div>
            <div className="stat-tile-body">
              <span className="stat-tile-label">AQI tốt nhất</span>
              <span className="stat-tile-value">{headline.cleanest.province}</span>
              <span className="stat-tile-delta">AQI {formatValue(headline.cleanest.aqi, '', 0)}</span>
            </div>
          </div>
          <div className="stat-tile">
            <div className="stat-tile-icon compare-wind"><BarChart3 size={22} /></div>
            <div className="stat-tile-body">
              <span className="stat-tile-label">Gió mạnh nhất</span>
              <span className="stat-tile-value">{headline.windiest.province}</span>
              <span className="stat-tile-delta">{formatValue(headline.windiest.wind_speed_max, ' km/h')}</span>
            </div>
          </div>
        </div>
      )}

      <div className="comparison-grid">
        <figure className="chart-card">
          <div className="chart-card-header">
            <div className="chart-title-flex">
              <Boxes size={18} color="#2563EB" />
              <h3 className="chart-card-title m-0">Boxplot nhiệt độ theo tỉnh</h3>
            </div>
            <span className="chart-subtitle-badge">Top tỉnh có độ phân tán cao</span>
          </div>
          <BoxplotChart data={boxplotRows} />
        </figure>

        <figure className="chart-card">
          <div className="chart-card-header">
            <div className="chart-title-flex">
              <ThermometerSun size={18} color="#2563EB" />
              <h3 className="chart-card-title m-0">Heatmap khí hậu</h3>
            </div>
            <span className="chart-subtitle-badge">0 thấp - 1 cao</span>
          </div>
          <div className="heatmap-table" role="table" aria-label="Heatmap các biến khí hậu đã normalize">
            <div className="heatmap-row heatmap-head" role="row">
              <div role="columnheader">Tỉnh</div>
              {METRICS.map(metric => <div key={metric.key} role="columnheader">{metric.label}</div>)}
            </div>
            {heatmapRows.slice(0, 18).map(row => (
              <div className="heatmap-row" role="row" key={row.province}>
                <div className="heatmap-province" role="cell">{row.province}</div>
                {METRICS.map(metric => {
                  const normalized = row.normalized[metric.key];
                  return (
                    <div
                      key={metric.key}
                      className="heatmap-cell"
                      role="cell"
                      tabIndex="0"
                      style={{ backgroundColor: getHeatColor(normalized), color: normalized > 0.62 ? '#ffffff' : '#0b0b0b' }}
                      title={`${row.province} - ${metric.fullLabel}: ${formatValue(row[metric.key], metric.unit)}; normalized ${normalized.toFixed(2)}`}
                    >
                      {normalized.toFixed(2)}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </figure>

        <figure className="chart-card">
          <div className="chart-card-header">
            <div className="chart-title-flex">
              <Compass size={18} color="#2563EB" />
              <h3 className="chart-card-title m-0">Hồ sơ khí hậu theo tỉnh</h3>
            </div>
            <span className="chart-subtitle-badge">Biểu đồ Radar</span>
          </div>

          <div className="radar-selector-row">
            <div className="radar-select-group">
              <label className="radar-select-label" htmlFor="radar-prov-1">Tỉnh 1</label>
              <select
                id="radar-prov-1"
                value={radarProv1}
                onChange={e => {
                  setRadarProv1(e.target.value);
                  if (e.target.value === radarProv2) setRadarProv2('');
                }}
                className="filter-select radar-select"
              >
                {provinces.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="radar-select-group">
              <label className="radar-select-label" htmlFor="radar-prov-2">Tỉnh 2</label>
              <select
                id="radar-prov-2"
                value={radarProv2}
                onChange={e => setRadarProv2(e.target.value)}
                className="filter-select radar-select"
              >
                <option value="">(Không so sánh)</option>
                {provinces.filter(p => p !== radarProv1).map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="comparison-chart-frame">
            <ResponsiveContainer>
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarChartData}>
                <PolarGrid stroke="#cbd5e1" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name={radarProv1} dataKey={radarProv1} stroke="#2563EB" fill="#2563EB" fillOpacity={0.25} />
                {radarProv2 && (
                  <Radar name={radarProv2} dataKey={radarProv2} stroke="#EA580C" fill="#EA580C" fillOpacity={0.25} />
                )}
                <RechartsTooltip content={<RadarTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </figure>

        <div className="chart-card ranking-section comparison-ranking">
          <div className="ranking-section-header-flex">
            <div className="ranking-section-title">
              <h2>{rankingTitle}</h2>
              <p className="ranking-section-subtitle">Đổi biến để trả lời nhanh tỉnh nóng, mưa nhiều, AQI tốt, ẩm cao hoặc gió mạnh.</p>
            </div>
            <div className="metric-toggle">
              {METRICS.map(metric => (
                <button
                  key={metric.key}
                  className={`toggle-btn ${rankingMetric === metric.key ? 'active' : ''}`}
                  onClick={() => setRankingMetric(metric.key)}
                >
                  {metric.label}
                </button>
              ))}
            </div>
          </div>

          <div className="top10-chart-frame">
            <ResponsiveContainer>
              <BarChart
                data={top10Rows}
                layout="vertical"
                margin={{ top: 12, right: 72, bottom: 8, left: 36 }}
                barCategoryGap={8}
              >
                <CartesianGrid stroke="#e1e0d9" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 12, fill: '#64748B' }}
                  axisLine={{ stroke: '#c3c2b7' }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="province"
                  width={116}
                  tick={{ fontSize: 12, fill: '#334155', fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <RechartsTooltip content={<RankingBarTooltip metric={rankingMetricConfig} />} cursor={{ fill: '#F1F5F9' }} />
                <Bar
                  dataKey={rankingMetric}
                  name={rankingMetricConfig.fullLabel}
                  fill="#2a78d6"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={24}
                  activeBar={{ fill: '#1c5cab' }}
                >
                  <LabelList
                    dataKey={rankingMetric}
                    position="right"
                    formatter={value => formatValue(value, rankingMetricConfig.unit, rankingMetric === 'aqi' || rankingMetric === 'humidity_mean' ? 0 : 1)}
                    className="top10-bar-label"
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProvinceComparisonTab;
