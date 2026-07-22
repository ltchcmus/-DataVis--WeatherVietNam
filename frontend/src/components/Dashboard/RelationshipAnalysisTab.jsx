import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Cell,
} from 'recharts';
import {
  Activity,
  Filter,
  Gauge,
  Network,
  Sparkles,
} from 'lucide-react';
import useWeatherData from '../../hooks/useWeatherData';

const METRICS = [
  { key: 'temperature_max', label: 'T. Max', fullLabel: 'Nhiệt độ tối đa', unit: '°C' },
  { key: 'temperature_min', label: 'T. Min', fullLabel: 'Nhiệt độ tối thiểu', unit: '°C' },
  { key: 'temperature_mean', label: 'T. Mean', fullLabel: 'Nhiệt độ trung bình', unit: '°C' },
  { key: 'rain_sum', label: 'Rain', fullLabel: 'Lượng mưa', unit: 'mm' },
  { key: 'humidity_mean', label: 'Humidity', fullLabel: 'Độ ẩm', unit: '%' },
  { key: 'wind_speed_max', label: 'Wind', fullLabel: 'Gió tối đa', unit: 'km/h' },
  { key: 'aqi', label: 'AQI', fullLabel: 'Chỉ số AQI', unit: '' },
  { key: 'cloud_cover_mean', label: 'Cloud', fullLabel: 'Độ che phủ mây', unit: '%' },
];

const METRIC_BY_KEY = Object.fromEntries(METRICS.map(metric => [metric.key, metric]));
const TEMP_KEYS = new Set(['temperature_max', 'temperature_min', 'temperature_mean']);
const NOTABLE_CORRELATION = 0.4;

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatValue(value, unit = '', digits = 1) {
  const number = toFiniteNumber(value);
  if (number === null) return 'N/A';
  return `${number.toFixed(digits)}${unit}`;
}

function pearsonCorrelation(rows, xKey, yKey) {
  const pairs = rows
    .map(row => [toFiniteNumber(row[xKey]), toFiniteNumber(row[yKey])])
    .filter(([x, y]) => x !== null && y !== null);

  if (pairs.length < 2) return 0;

  const xMean = pairs.reduce((sum, [x]) => sum + x, 0) / pairs.length;
  const yMean = pairs.reduce((sum, [, y]) => sum + y, 0) / pairs.length;

  let numerator = 0;
  let xVariance = 0;
  let yVariance = 0;

  pairs.forEach(([x, y]) => {
    const xDiff = x - xMean;
    const yDiff = y - yMean;
    numerator += xDiff * yDiff;
    xVariance += xDiff ** 2;
    yVariance += yDiff ** 2;
  });

  const denominator = Math.sqrt(xVariance * yVariance);
  return denominator === 0 ? 0 : numerator / denominator;
}

function correlationStrength(value) {
  const magnitude = Math.abs(value);
  if (magnitude >= 0.8) return 'Rất mạnh';
  if (magnitude >= 0.6) return 'Mạnh';
  if (magnitude >= 0.4) return 'Trung bình';
  if (magnitude >= 0.2) return 'Yếu';
  return 'Rất yếu';
}

function correlationDirection(value) {
  if (value > 0.05) return 'Thuận';
  if (value < -0.05) return 'Nghịch';
  return 'Gần 0';
}

function compactRelation(value) {
  return `${correlationDirection(value)} · ${correlationStrength(value)}`;
}

function pairLabel(pair) {
  if (!pair) return 'Chưa có dữ liệu';
  return `${pair.left.label} ↔ ${pair.right.label}`;
}

function pairDescription(pair) {
  if (!pair) return 'Không đủ dữ liệu để đánh giá.';
  const direction = correlationDirection(pair.value).toLowerCase();
  const strength = correlationStrength(pair.value).toLowerCase();
  return `${pair.left.fullLabel} và ${pair.right.fullLabel} có tương quan ${direction} ${strength}.`;
}

function heatColor(value) {
  const t = Math.max(-1, Math.min(1, value));
  if (t >= 0) {
    const lightness = 96 - t * 49;
    return `hsl(6 78% ${lightness}%)`;
  }
  const lightness = 96 - Math.abs(t) * 49;
  return `hsl(215 78% ${lightness}%)`;
}

function heatTextColor(value) {
  return Math.abs(value) >= 0.58 ? '#ffffff' : '#0f172a';
}

function humidityColor(value) {
  const humidity = Math.max(0, Math.min(100, Number(value) || 0));
  const hue = 212 - humidity * 0.9;
  return `hsl(${hue} 72% 50%)`;
}

function sampleRows(rows, maxPoints = 900) {
  if (rows.length <= maxPoints) return rows;
  const step = rows.length / maxPoints;
  return Array.from({ length: maxPoints }, (_, index) => rows[Math.floor(index * step)]);
}

function ScatterTooltip({ active, payload, xKey, yKey }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  const xMetric = METRIC_BY_KEY[xKey];
  const yMetric = METRIC_BY_KEY[yKey];

  return (
    <div className="viz-tooltip province-tooltip">
      <div className="viz-tooltip-header">
        <span className="viz-tooltip-label">{item.province || 'Không xác định'}</span>
      </div>
      <div className="viz-tooltip-divider" />
      <div className="viz-tooltip-body">
        <div className="viz-tooltip-row">
          <span className="viz-tooltip-metric">Ngày</span>
          <span className="viz-tooltip-value">{item.date || 'N/A'}</span>
        </div>
        <div className="viz-tooltip-row">
          <span className="viz-tooltip-metric">{xMetric.fullLabel}</span>
          <span className="viz-tooltip-value">{formatValue(item[xKey], xMetric.unit)}</span>
        </div>
        <div className="viz-tooltip-row">
          <span className="viz-tooltip-metric">{yMetric.fullLabel}</span>
          <span className="viz-tooltip-value">{formatValue(item[yKey], yMetric.unit, yKey === 'aqi' ? 0 : 1)}</span>
        </div>
      </div>
    </div>
  );
}

function BubbleTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;

  return (
    <div className="viz-tooltip province-tooltip">
      <div className="viz-tooltip-header">
        <span className="viz-tooltip-label">{item.province || 'Không xác định'}</span>
      </div>
      <div className="viz-tooltip-divider" />
      <div className="viz-tooltip-body">
        <div className="viz-tooltip-row">
          <span className="viz-tooltip-metric">Ngày</span>
          <span className="viz-tooltip-value">{item.date || 'N/A'}</span>
        </div>
        <div className="viz-tooltip-row">
          <span className="viz-tooltip-metric">Nhiệt độ / AQI</span>
          <span className="viz-tooltip-value">
            {formatValue(item.temperature_mean, '°C')} · AQI {formatValue(item.aqi, '', 0)}
          </span>
        </div>
        <div className="viz-tooltip-row">
          <span className="viz-tooltip-metric">Mưa / Độ ẩm</span>
          <span className="viz-tooltip-value">
            {formatValue(item.rain_sum, ' mm')} · {formatValue(item.humidity_mean, '%', 0)}
          </span>
        </div>
      </div>
    </div>
  );
}

function CorrelationHeatmap({ matrix, animationKey }) {
  if (!matrix.length) {
    return <div className="overview-empty"><p>Không đủ dữ liệu để tính ma trận tương quan.</p></div>;
  }

  const cellSize = 42;
  const labelWidth = 82;
  const topLabelHeight = 66;
  const width = labelWidth + cellSize * METRICS.length + 14;
  const height = topLabelHeight + cellSize * METRICS.length + 12;

  return (
    <div className="relationship-heatmap-scroll">
      <svg
        key={animationKey}
        viewBox={`0 0 ${width} ${height}`}
        className="relationship-heatmap-svg"
        role="img"
        aria-label="Ma trận tương quan Pearson giữa các yếu tố thời tiết"
      >
        {METRICS.map((metric, columnIndex) => {
          const x = labelWidth + columnIndex * cellSize + cellSize / 2;
          return (
            <text
              key={`column-${metric.key}`}
              x={x}
              y={topLabelHeight - 9}
              textAnchor="start"
              transform={`rotate(-42 ${x} ${topLabelHeight - 9})`}
              className="relationship-heat-label relationship-heat-label-column"
              style={{ animationDelay: `${columnIndex * 24}ms` }}
            >
              {metric.label}
            </text>
          );
        })}

        {METRICS.map((rowMetric, rowIndex) => {
          const y = topLabelHeight + rowIndex * cellSize;
          return (
            <g key={rowMetric.key}>
              <text
                x={labelWidth - 7}
                y={y + cellSize / 2 + 3}
                textAnchor="end"
                className="relationship-heat-label"
                style={{ animationDelay: `${rowIndex * 28}ms` }}
              >
                {rowMetric.label}
              </text>

              {METRICS.map((columnMetric, columnIndex) => {
                const item = matrix[rowIndex][columnIndex];
                const x = labelWidth + columnIndex * cellSize;
                const delay = 80 + (rowIndex * METRICS.length + columnIndex) * 12;
                return (
                  <g
                    key={`${rowMetric.key}-${columnMetric.key}`}
                    tabIndex="0"
                    className="relationship-heat-cell"
                    style={{ animationDelay: `${delay}ms` }}
                  >
                    <title>{`${rowMetric.fullLabel} × ${columnMetric.fullLabel}: r = ${item.value.toFixed(3)}`}</title>
                    <rect
                      x={x + 1.5}
                      y={y + 1.5}
                      width={cellSize - 3}
                      height={cellSize - 3}
                      rx="5"
                      fill={heatColor(item.value)}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                    <text
                      x={x + cellSize / 2}
                      y={y + cellSize / 2 + 3.5}
                      textAnchor="middle"
                      style={{ fontSize: 9.6, fontWeight: 800, fill: heatTextColor(item.value) }}
                    >
                      {item.value.toFixed(2)}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function RelationshipScatter({ data, xKey, yKey, color, title, badge, animationKey }) {
  const xMetric = METRIC_BY_KEY[xKey];
  const yMetric = METRIC_BY_KEY[yKey];

  return (
    <figure className="chart-card relationship-scatter-card relationship-enter-card">
      <div className="chart-card-header relationship-card-header">
        <div className="chart-title-flex">
          <Activity size={17} color={color} />
          <h3 className="chart-card-title m-0">{title}</h3>
        </div>
        <span className="chart-subtitle-badge">{badge}</span>
      </div>
      <div className="relationship-scatter-frame">
        <ResponsiveContainer>
          <ScatterChart margin={{ top: 6, right: 16, bottom: 20, left: 0 }}>
            <CartesianGrid stroke="#E2E8F0" vertical={false} strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey={xKey}
              name={xMetric.fullLabel}
              unit={xMetric.unit}
              tick={{ fontSize: 10.5, fill: '#64748B' }}
              axisLine={{ stroke: '#CBD5E1' }}
              label={{
                value: `${xMetric.fullLabel} (${xMetric.unit || 'điểm'})`,
                position: 'insideBottom',
                offset: -11,
                fill: '#64748B',
                fontSize: 10,
              }}
            />
            <YAxis
              type="number"
              dataKey={yKey}
              name={yMetric.fullLabel}
              unit={yMetric.unit}
              tick={{ fontSize: 10.5, fill: '#64748B' }}
              axisLine={{ stroke: '#CBD5E1' }}
              width={40}
            />
            <RechartsTooltip
              content={<ScatterTooltip xKey={xKey} yKey={yKey} />}
              cursor={{ stroke: '#94A3B8', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            <Scatter
              key={`${animationKey}-${xKey}-${yKey}`}
              data={data}
              fill={color}
              fillOpacity={0.58}
              stroke="#ffffff"
              strokeWidth={1.2}
              isAnimationActive
              animationBegin={120}
              animationDuration={900}
              animationEasing="ease-out"
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

function InsightRow({ pair, index }) {
  return (
    <div className="relationship-insight-row" style={{ animationDelay: `${180 + index * 90}ms` }}>
      <div className="relationship-insight-rank">{index + 1}</div>
      <div className="relationship-insight-copy">
        <div className="relationship-insight-line">
          <span>{pairLabel(pair)}</span>
          <strong>r = {pair.value.toFixed(2)}</strong>
        </div>
        <p>{pairDescription(pair)}</p>
      </div>
    </div>
  );
}

const RelationshipAnalysisTab = () => {
  const { data, loading, error, dates, provinces } = useWeatherData();
  const [provinceScope, setProvinceScope] = useState('all');
  const [timePreset, setTimePreset] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const filteredRows = useMemo(() => {
    let rows = data.filter(row => METRICS.every(metric => toFiniteNumber(row[metric.key]) !== null));

    if (provinceScope !== 'all') rows = rows.filter(row => row.province === provinceScope);

    if (timePreset === '30d') {
      const recentDates = new Set(dates.slice(-30));
      rows = rows.filter(row => recentDates.has(row.date));
    } else if (timePreset === '90d') {
      const recentDates = new Set(dates.slice(-90));
      rows = rows.filter(row => recentDates.has(row.date));
    } else if (timePreset === 'custom') {
      if (customStart) rows = rows.filter(row => row.date >= customStart);
      if (customEnd) rows = rows.filter(row => row.date <= customEnd);
    }

    return rows;
  }, [data, dates, provinceScope, timePreset, customStart, customEnd]);

  const correlationMatrix = useMemo(() => (
    METRICS.map(rowMetric => METRICS.map(columnMetric => ({
      xKey: columnMetric.key,
      yKey: rowMetric.key,
      value: rowMetric.key === columnMetric.key
        ? 1
        : pearsonCorrelation(filteredRows, columnMetric.key, rowMetric.key),
    })))
  ), [filteredRows]);

  const correlationInsights = useMemo(() => {
    if (!filteredRows.length) return null;

    const pairs = [];
    METRICS.forEach((left, leftIndex) => {
      METRICS.slice(leftIndex + 1).forEach(right => {
        pairs.push({ left, right, value: pearsonCorrelation(filteredRows, left.key, right.key) });
      });
    });

    const usefulPairs = pairs
      .filter(pair => !(TEMP_KEYS.has(pair.left.key) && TEMP_KEYS.has(pair.right.key)))
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

    const strongestAqi = usefulPairs
      .filter(pair => pair.left.key === 'aqi' || pair.right.key === 'aqi')
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))[0];

    const notablePairs = usefulPairs
      .filter(pair => Math.abs(pair.value) >= NOTABLE_CORRELATION)
      .slice(0, 3);

    return {
      strongestMeaningful: usefulPairs[0],
      strongestAqi,
      notablePairs,
      notableCount: usefulPairs.filter(pair => Math.abs(pair.value) >= NOTABLE_CORRELATION).length,
      usefulPairCount: usefulPairs.length,
      humidityAqi: pearsonCorrelation(filteredRows, 'humidity_mean', 'aqi'),
      rainAqi: pearsonCorrelation(filteredRows, 'rain_sum', 'aqi'),
    };
  }, [filteredRows]);

  const scatterRows = useMemo(() => sampleRows(filteredRows, 650), [filteredRows]);
  const bubbleRows = useMemo(() => sampleRows(filteredRows, 550), [filteredRows]);

  const rainRange = useMemo(() => {
    const values = bubbleRows.map(row => row.rain_sum).filter(Number.isFinite);
    if (!values.length) return [34, 150];
    const min = Math.min(...values);
    const max = Math.max(...values);
    return min === max ? [48, 105] : [36, 170];
  }, [bubbleRows]);

  const animationKey = `${provinceScope}-${timePreset}-${customStart}-${customEnd}-${filteredRows.length}`;

  const resetAllFilters = () => {
    setProvinceScope('all');
    setTimePreset('all');
    setCustomStart('');
    setCustomEnd('');
  };

  if (loading) return <div className="overview-empty"><p>Đang tải dữ liệu phân tích mối quan hệ...</p></div>;
  if (error) return <div className="overview-empty"><p>Lỗi: {error}</p></div>;

  const strongestAqiMetric = correlationInsights?.strongestAqi
    ? (correlationInsights.strongestAqi.left.key === 'aqi'
      ? correlationInsights.strongestAqi.right
      : correlationInsights.strongestAqi.left)
    : null;

  return (
    <div className="relationship-analysis-tab">
      <style>{`
        @keyframes relationshipTabEnter {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes relationshipCardEnter {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes relationshipHeatCellEnter {
          from { opacity: 0; transform: scale(0.72); transform-origin: center; }
          to { opacity: 1; transform: scale(1); transform-origin: center; }
        }
        @keyframes relationshipLabelEnter {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .relationship-analysis-tab {
          display: flex;
          flex-direction: column;
          gap: 14px;
          isolation: isolate;
          animation: relationshipTabEnter 420ms ease-out both;
        }
        .relationship-filter-bar {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-end;
          gap: 10px 16px;
          padding: 12px 14px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
          animation: relationshipCardEnter 460ms 30ms ease-out both;
        }
        .relationship-filter-actions {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .relationship-summary-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }
        .relationship-summary-card {
          min-height: 72px;
          padding: 10px 13px;
          display: flex;
          align-items: center;
          gap: 10px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
          animation: relationshipCardEnter 480ms ease-out both;
        }
        .relationship-summary-card:nth-child(1) { animation-delay: 70ms; }
        .relationship-summary-card:nth-child(2) { animation-delay: 130ms; }
        .relationship-summary-card:nth-child(3) { animation-delay: 190ms; }
        .relationship-summary-icon {
          width: 34px;
          height: 34px;
          border-radius: 9px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          color: #2563eb;
          background: rgba(37, 99, 235, 0.09);
        }
        .relationship-summary-copy {
          min-width: 0;
        }
        .relationship-summary-label {
          display: block;
          color: #64748b;
          font-size: 11px;
          font-weight: 700;
          margin-bottom: 2px;
        }
        .relationship-summary-value {
          display: block;
          color: #0f172a;
          font-size: 1.05rem;
          line-height: 1.18;
          font-weight: 800;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .relationship-summary-note {
          display: block;
          color: #64748b;
          font-size: 10.5px;
          margin-top: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .relationship-primary-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.34fr) minmax(280px, 0.66fr);
          gap: 14px;
          align-items: start;
          position: relative;
          z-index: 2;
        }
        .relationship-primary-grid > .chart-card {
          margin: 0;
          position: relative;
          overflow: hidden;
          animation: relationshipCardEnter 520ms 210ms ease-out both;
        }
        .relationship-card-header {
          min-height: 34px;
          margin-bottom: 6px;
        }
        .relationship-heatmap-scroll {
          width: 100%;
          overflow-x: auto;
          display: flex;
          justify-content: center;
          padding: 0;
        }
        .relationship-heatmap-svg {
          width: min(100%, 505px);
          min-width: 438px;
          display: block;
        }
        .relationship-heat-cell {
          opacity: 0;
          animation: relationshipHeatCellEnter 360ms ease-out forwards;
          transform-box: fill-box;
          transform-origin: center;
        }
        .relationship-heat-label {
          opacity: 0;
          font-size: 9px;
          font-weight: 700;
          fill: #475569;
          animation: relationshipLabelEnter 300ms ease-out forwards;
        }
        .relationship-heatmap-legend {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px 10px;
          padding-top: 8px;
          margin-top: 2px;
          border-top: 1px solid #eef2f7;
          color: #64748b;
          font-size: 10.8px;
        }
        .relationship-legend-scale {
          width: 104px;
          height: 7px;
          border-radius: 999px;
          background: linear-gradient(90deg, hsl(215 78% 47%), #f8fafc, hsl(6 78% 47%));
        }
        .relationship-insight-card {
          min-height: 0;
        }
        .relationship-insight-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .relationship-insight-row {
          display: flex;
          gap: 9px;
          padding: 9px 10px;
          border: 1px solid #eef2f7;
          border-radius: 9px;
          background: #fbfdff;
          opacity: 0;
          animation: relationshipCardEnter 420ms ease-out forwards;
        }
        .relationship-insight-rank {
          width: 26px;
          height: 26px;
          border-radius: 8px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          color: #2563eb;
          background: #eff6ff;
          font-size: 11px;
          font-weight: 800;
        }
        .relationship-insight-copy {
          min-width: 0;
          flex: 1;
        }
        .relationship-insight-line {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          color: #334155;
          font-size: 11.5px;
          font-weight: 700;
        }
        .relationship-insight-line strong {
          color: #0f172a;
          white-space: nowrap;
        }
        .relationship-insight-copy p {
          margin: 2px 0 0;
          color: #64748b;
          font-size: 10.7px;
          line-height: 1.38;
        }
        .relationship-no-insight {
          padding: 14px 12px;
          border-radius: 10px;
          border: 1px dashed #cbd5e1;
          background: #f8fafc;
          color: #475569;
          font-size: 11.5px;
          line-height: 1.55;
        }
        .relationship-no-insight strong {
          display: block;
          color: #0f172a;
          margin-bottom: 3px;
        }
        .relationship-scatter-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
          position: relative;
          z-index: 1;
          margin-top: 2px;
          clear: both;
        }
        .relationship-scatter-card {
          margin: 0;
          overflow: hidden;
        }
        .relationship-scatter-frame {
          width: 100%;
          height: 235px;
          min-height: 235px;
        }
        .relationship-bubble-card {
          margin: 0;
          overflow: hidden;
          animation: relationshipCardEnter 520ms 340ms ease-out both;
        }
        .relationship-bubble-frame {
          width: 100%;
          height: 285px;
        }
        .relationship-bubble-footer {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 7px 11px;
          padding-top: 6px;
          color: #64748b;
          font-size: 10.8px;
        }
        .relationship-bubble-footer .relationship-aqi-insight {
          margin-left: auto;
          color: #334155;
          font-weight: 700;
        }
        @media (prefers-reduced-motion: reduce) {
          .relationship-analysis-tab,
          .relationship-filter-bar,
          .relationship-summary-card,
          .relationship-primary-grid > .chart-card,
          .relationship-insight-row,
          .relationship-bubble-card,
          .relationship-heat-cell,
          .relationship-heat-label {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
        @media (max-width: 1100px) {
          .relationship-primary-grid {
            grid-template-columns: 1fr;
          }
          .relationship-filter-actions {
            margin-left: 0;
          }
        }
        @media (max-width: 820px) {
          .relationship-summary-grid {
            grid-template-columns: 1fr;
          }
          .relationship-scatter-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 760px) {
          .relationship-filter-bar {
            align-items: stretch;
          }
          .relationship-filter-bar .filter-group {
            width: 100%;
          }
          .relationship-filter-actions {
            width: 100%;
            justify-content: space-between;
          }
        }
      `}</style>

      <div className="relationship-filter-bar">
        <div className="filter-group">
          <label className="filter-label" htmlFor="relationship-province">Tỉnh / Thành phố</label>
          <select
            id="relationship-province"
            className="filter-select"
            value={provinceScope}
            onChange={event => setProvinceScope(event.target.value)}
          >
            <option value="all">Toàn quốc</option>
            {provinces.map(province => <option key={province} value={province}>{province}</option>)}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Khoảng thời gian</label>
          <div className="metric-toggle">
            <button type="button" className={`toggle-btn ${timePreset === 'all' ? 'active' : ''}`} onClick={() => setTimePreset('all')}>Tất cả</button>
            <button type="button" className={`toggle-btn ${timePreset === '30d' ? 'active' : ''}`} onClick={() => setTimePreset('30d')}>30 ngày</button>
            <button type="button" className={`toggle-btn ${timePreset === '90d' ? 'active' : ''}`} onClick={() => setTimePreset('90d')}>90 ngày</button>
            <button type="button" className={`toggle-btn ${timePreset === 'custom' ? 'active' : ''}`} onClick={() => setTimePreset('custom')}>Tùy chỉnh</button>
          </div>
        </div>

        {timePreset === 'custom' && (
          <div className="filter-group-custom-dates">
            <input type="date" className="filter-date-input" value={customStart} onChange={event => setCustomStart(event.target.value)} />
            <span className="date-sep">đến</span>
            <input type="date" className="filter-date-input" value={customEnd} onChange={event => setCustomEnd(event.target.value)} />
          </div>
        )}

        <div className="relationship-filter-actions">
          <button type="button" className="toggle-btn" onClick={resetAllFilters}>
            <Filter size={14} /> Xóa lọc
          </button>
          <span className="chart-subtitle-badge">{filteredRows.length.toLocaleString('vi-VN')} quan sát</span>
        </div>
      </div>

      {correlationInsights && (
        <div className="relationship-summary-grid">
          <div className="relationship-summary-card">
            <div className="relationship-summary-icon"><Network size={18} /></div>
            <div className="relationship-summary-copy">
              <span className="relationship-summary-label">Cặp nổi bật nhất</span>
              <span className="relationship-summary-value">{pairLabel(correlationInsights.strongestMeaningful)}</span>
              <span className="relationship-summary-note">
                r = {correlationInsights.strongestMeaningful?.value.toFixed(2)} · {compactRelation(correlationInsights.strongestMeaningful?.value || 0)}
              </span>
            </div>
          </div>

          <div className="relationship-summary-card">
            <div className="relationship-summary-icon"><Gauge size={18} /></div>
            <div className="relationship-summary-copy">
              <span className="relationship-summary-label">Liên hệ mạnh nhất với AQI</span>
              <span className="relationship-summary-value">{strongestAqiMetric?.fullLabel || 'Chưa có dữ liệu'}</span>
              <span className="relationship-summary-note">
                r = {correlationInsights.strongestAqi?.value.toFixed(2) || '0.00'} · {compactRelation(correlationInsights.strongestAqi?.value || 0)}
              </span>
            </div>
          </div>

          <div className="relationship-summary-card">
            <div className="relationship-summary-icon"><Sparkles size={18} /></div>
            <div className="relationship-summary-copy">
              <span className="relationship-summary-label">Cặp đáng chú ý</span>
              <span className="relationship-summary-value">{correlationInsights.notableCount} cặp</span>
              <span className="relationship-summary-note">Ngưỡng |r| ≥ {NOTABLE_CORRELATION.toFixed(2)} trên {correlationInsights.usefulPairCount} cặp hữu ích</span>
            </div>
          </div>
        </div>
      )}

      <div className="relationship-primary-grid">
        <figure className="chart-card relationship-heatmap-card">
          <div className="chart-card-header relationship-card-header">
            <div className="chart-title-flex">
              <Network size={17} color="#2563EB" />
              <h3 className="chart-card-title m-0">Ma trận tương quan</h3>
            </div>
            <span className="chart-subtitle-badge">Pearson r: -1 đến +1</span>
          </div>

          <CorrelationHeatmap matrix={correlationMatrix} animationKey={animationKey} />

          <div className="relationship-heatmap-legend">
            <span style={{ fontWeight: 700, color: '#334155' }}>Nghịch</span>
            <div className="relationship-legend-scale" />
            <span style={{ fontWeight: 700, color: '#334155' }}>Thuận</span>
            <span>Ưu tiên đọc các ô đậm, có |r| từ 0,40 trở lên.</span>
          </div>
        </figure>

        <aside className="chart-card relationship-insight-card">
          <div className="chart-card-header relationship-card-header">
            <div className="chart-title-flex">
              <Sparkles size={17} color="#8B5CF6" />
              <h3 className="chart-card-title m-0">Insight nổi bật</h3>
            </div>
            <span className="chart-subtitle-badge">|r| ≥ 0,40</span>
          </div>

          {correlationInsights?.notablePairs.length ? (
            <div className="relationship-insight-list">
              {correlationInsights.notablePairs.map((pair, index) => (
                <InsightRow key={`${pair.left.key}-${pair.right.key}`} pair={pair} index={index} />
              ))}
            </div>
          ) : (
            <div className="relationship-no-insight">
              <strong>Chưa có tương quan tuyến tính đáng chú ý</strong>
              Không có cặp biến ngoài nhóm nhiệt độ đạt |r| ≥ {NOTABLE_CORRELATION.toFixed(2)} theo bộ lọc hiện tại. Đây là một kết quả có ý nghĩa: các biến không thể hiện quan hệ tuyến tính đủ rõ trong lát cắt dữ liệu này.
            </div>
          )}
        </aside>
      </div>

      <div className="relationship-scatter-grid">
        <RelationshipScatter
          data={scatterRows}
          xKey="humidity_mean"
          yKey="aqi"
          color="#0EA5E9"
          title="AQI và Độ ẩm"
          badge={`r = ${correlationInsights?.humidityAqi.toFixed(2) || '0.00'}`}
          animationKey={animationKey}
        />

        <RelationshipScatter
          data={scatterRows}
          xKey="rain_sum"
          yKey="aqi"
          color="#3B82F6"
          title="AQI và Lượng mưa"
          badge={`r = ${correlationInsights?.rainAqi.toFixed(2) || '0.00'}`}
          animationKey={animationKey}
        />
      </div>

      <figure className="chart-card relationship-bubble-card">
        <div className="chart-card-header relationship-card-header">
          <div className="chart-title-flex">
            <Gauge size={17} color="#8B5CF6" />
            <h3 className="chart-card-title m-0">Nhiệt độ, AQI, Mưa và Độ ẩm</h3>
          </div>
          <span className="chart-subtitle-badge">X: Nhiệt độ · Y: AQI · Size: Mưa · Color: Độ ẩm</span>
        </div>

        <div className="relationship-bubble-frame">
          <ResponsiveContainer>
            <ScatterChart margin={{ top: 8, right: 20, bottom: 25, left: 0 }}>
              <CartesianGrid stroke="#E2E8F0" vertical={false} strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="temperature_mean"
                name="Nhiệt độ trung bình"
                unit="°C"
                tick={{ fontSize: 10.5, fill: '#64748B' }}
                axisLine={{ stroke: '#CBD5E1' }}
                label={{ value: 'Nhiệt độ trung bình (°C)', position: 'insideBottom', offset: -14, fill: '#64748B', fontSize: 10 }}
              />
              <YAxis
                type="number"
                dataKey="aqi"
                name="AQI"
                tick={{ fontSize: 10.5, fill: '#64748B' }}
                axisLine={{ stroke: '#CBD5E1' }}
                width={40}
              />
              <ZAxis type="number" dataKey="rain_sum" name="Lượng mưa" unit="mm" range={rainRange} />
              <RechartsTooltip
                content={<BubbleTooltip />}
                cursor={{ stroke: '#94A3B8', strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Scatter
                key={`${animationKey}-bubble`}
                data={bubbleRows}
                fillOpacity={0.62}
                stroke="#ffffff"
                strokeWidth={1.2}
                isAnimationActive
                animationBegin={160}
                animationDuration={1000}
                animationEasing="ease-out"
              >
                {bubbleRows.map((row, index) => (
                  <Cell key={`${row.province}-${row.date}-${index}`} fill={humidityColor(row.humidity_mean)} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <div className="relationship-bubble-footer">
          <span style={{ fontWeight: 700, color: '#334155' }}>Màu độ ẩm:</span>
          {[40, 55, 70, 85, 100].map(value => (
            <span key={value} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: humidityColor(value) }} />
              {value}%
            </span>
          ))}
          {strongestAqiMetric && correlationInsights?.strongestAqi && (
            <span className="relationship-aqi-insight">
              Liên hệ AQI mạnh nhất: {strongestAqiMetric.label} (r = {correlationInsights.strongestAqi.value.toFixed(2)})
            </span>
          )}
        </div>
      </figure>
    </div>
  );
};

export default RelationshipAnalysisTab;