import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Cell,
  BarChart,
  Bar,
  LabelList,
} from 'recharts';
import {
  Activity,
  BarChart3,
  CloudRain,
  Droplets,
  Filter,
  Gauge,
  Network,
  Sparkles,
  ThermometerSun,
  Wind,
} from 'lucide-react';
import useWeatherData from '../../hooks/useWeatherData';

const METRICS = [
  { key: 'temperature_mean', label: 'Nhiệt độ', shortLabel: 'Temp', fullLabel: 'Nhiệt độ trung bình', unit: '°C', icon: ThermometerSun },
  { key: 'rain_sum', label: 'Lượng mưa', shortLabel: 'Rain', fullLabel: 'Lượng mưa', unit: 'mm', icon: CloudRain },
  { key: 'humidity_mean', label: 'Độ ẩm', shortLabel: 'Humidity', fullLabel: 'Độ ẩm', unit: '%', icon: Droplets },
  { key: 'wind_speed_max', label: 'Gió tối đa', shortLabel: 'Wind', fullLabel: 'Tốc độ gió tối đa', unit: 'km/h', icon: Wind },
  { key: 'cloud_cover_mean', label: 'Mây che phủ', shortLabel: 'Cloud', fullLabel: 'Độ che phủ mây', unit: '%', icon: Network },
  { key: 'aqi', label: 'AQI', shortLabel: 'AQI', fullLabel: 'Chỉ số AQI', unit: '', icon: Gauge },
];

const AQI_FACTORS = METRICS.filter(metric => metric.key !== 'aqi');
const METRIC_BY_KEY = Object.fromEntries(METRICS.map(metric => [metric.key, metric]));
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

function average(rows, key) {
  const values = rows.map(row => toFiniteNumber(row[key])).filter(value => value !== null);
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sampleStandardDeviation(rows, key) {
  const values = rows.map(row => toFiniteNumber(row[key])).filter(value => value !== null);
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function pooledStandardDeviation(lowRows, highRows, key) {
  if (lowRows.length < 2 || highRows.length < 2) return 0;
  const lowSd = sampleStandardDeviation(lowRows, key);
  const highSd = sampleStandardDeviation(highRows, key);
  const denominator = lowRows.length + highRows.length - 2;
  if (denominator <= 0) return 0;
  return Math.sqrt(
    (((lowRows.length - 1) * lowSd ** 2) + ((highRows.length - 1) * highSd ** 2)) / denominator
  );
}

function effectSizeStrength(value) {
  const magnitude = Math.abs(value);
  if (magnitude >= 0.8) return 'Lớn';
  if (magnitude >= 0.5) return 'Trung bình';
  if (magnitude >= 0.2) return 'Nhỏ';
  return 'Không đáng kể';
}

function formatSigned(value, digits = 2) {
  const number = Number(value) || 0;
  return `${number > 0 ? '+' : ''}${number.toFixed(digits)}`;
}

function quantile(values, q) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * q;
  const base = Math.floor(position);
  const rest = position - base;
  return sorted[base + 1] === undefined
    ? sorted[base]
    : sorted[base] + rest * (sorted[base + 1] - sorted[base]);
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


function aqiLabel(value) {
  const aqi = Number(value) || 0;
  if (aqi <= 50) return 'Tốt';
  if (aqi <= 100) return 'Vừa phải';
  if (aqi <= 150) return 'Nhạy cảm';
  if (aqi <= 200) return 'Không khỏe';
  return 'Rất kém';
}

function sampleRows(rows, maxPoints = 650) {
  if (rows.length <= maxPoints) return rows;
  const step = rows.length / maxPoints;
  return Array.from({ length: maxPoints }, (_, index) => rows[Math.floor(index * step)]);
}

function getNiceStep(span, targetTickCount = 6) {
  if (!Number.isFinite(span) || span <= 0) return 1;

  const roughStep = span / Math.max(2, targetTickCount - 1);
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const normalized = roughStep / magnitude;

  let niceFactor = 1;
  if (normalized > 5) niceFactor = 10;
  else if (normalized > 2) niceFactor = 5;
  else if (normalized > 1) niceFactor = 2;

  return niceFactor * magnitude;
}

function decimalPlacesForStep(step) {
  if (!Number.isFinite(step) || step >= 1) return 0;
  return Math.min(4, Math.max(0, Math.ceil(-Math.log10(step))));
}

function roundSafely(value, digits = 6) {
  return Number(Number(value).toFixed(digits));
}

function formatAxisTick(value, key) {
  const number = Number(value);
  if (!Number.isFinite(number)) return value;

  if (key === 'aqi' || key === 'humidity_mean' || key === 'cloud_cover_mean') {
    return `${Math.round(number)}`;
  }

  return `${roundSafely(number, 1)}`;
}

function getPaddedDomain(rows, key, options = {}) {
  const {
    paddingRatio = 0.08,
    minPadding = 1,
    clampMin = null,
    clampMax = null,
    targetTickCount = 6,
  } = options;

  const values = rows
    .map(row => toFiniteNumber(row[key]))
    .filter(value => value !== null);

  if (!values.length) return ['auto', 'auto'];

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const padding = span === 0
    ? Math.max(Math.abs(min) * 0.06, minPadding)
    : Math.max(span * paddingRatio, minPadding);

  let lower = min - padding;
  let upper = max + padding;

  if (clampMin !== null) lower = Math.max(clampMin, lower);
  if (clampMax !== null) upper = Math.min(clampMax, upper);

  if (lower === upper) upper = lower + minPadding;

  const step = getNiceStep(upper - lower, targetTickCount);
  const digits = decimalPlacesForStep(step);

  lower = Math.floor((lower + Number.EPSILON) / step) * step;
  upper = Math.ceil((upper - Number.EPSILON) / step) * step;

  if (clampMin !== null) lower = Math.max(clampMin, lower);
  if (clampMax !== null) upper = Math.min(clampMax, upper);
  if (lower === upper) upper = lower + step;

  return [roundSafely(lower, digits), roundSafely(upper, digits)];
}

function CorrelationHeatmap({ matrix, animationKey }) {
  const cellSize = 44;
  const labelWidth = 78;
  const topLabelHeight = 66;
  const width = labelWidth + cellSize * METRICS.length + 14;
  const height = topLabelHeight + cellSize * METRICS.length + 10;

  return (
    <div className="aqi-heatmap-scroll">
      <svg
        key={animationKey}
        viewBox={`0 0 ${width} ${height}`}
        className="aqi-heatmap-svg"
        role="img"
        aria-label="Ma trận tương quan giữa AQI và các yếu tố thời tiết"
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
              className="aqi-heat-label"
              style={{ animationDelay: `${columnIndex * 28}ms` }}
            >
              {metric.shortLabel}
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
                className="aqi-heat-label"
                style={{ animationDelay: `${rowIndex * 28}ms` }}
              >
                {rowMetric.shortLabel}
              </text>

              {METRICS.map((columnMetric, columnIndex) => {
                const item = matrix[rowIndex][columnIndex];
                const x = labelWidth + columnIndex * cellSize;
                const delay = 80 + (rowIndex * METRICS.length + columnIndex) * 18;
                return (
                  <g
                    key={`${rowMetric.key}-${columnMetric.key}`}
                    tabIndex="0"
                    className="aqi-heat-cell"
                    style={{ animationDelay: `${delay}ms` }}
                  >
                    <title>{`${rowMetric.fullLabel} × ${columnMetric.fullLabel}: r = ${item.value.toFixed(3)}`}</title>
                    <rect
                      x={x + 1.5}
                      y={y + 1.5}
                      width={cellSize - 3}
                      height={cellSize - 3}
                      rx="6"
                      fill={heatColor(item.value)}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                    <text
                      x={x + cellSize / 2}
                      y={y + cellSize / 2 + 3.5}
                      textAnchor="middle"
                      style={{ fontSize: 10, fontWeight: 800, fill: heatTextColor(item.value) }}
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

function CorrelationRankingTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="viz-tooltip province-tooltip">
      <div className="viz-tooltip-header">
        <span className="viz-tooltip-label">{item.fullLabel} ↔ AQI</span>
      </div>
      <div className="viz-tooltip-divider" />
      <div className="viz-tooltip-body">
        <div className="viz-tooltip-row">
          <span className="viz-tooltip-metric">Hệ số Pearson</span>
          <span className="viz-tooltip-value">r = {item.correlation.toFixed(3)}</span>
        </div>
        <div className="viz-tooltip-row">
          <span className="viz-tooltip-metric">Diễn giải</span>
          <span className="viz-tooltip-value">{compactRelation(item.correlation)}</span>
        </div>
      </div>
    </div>
  );
}

function CorrelationBarLabel({ x, y, width, height, payload }) {
  if (!payload) return null;
  return (
    <text
      x={x + width + 8}
      y={y + height / 2 + 4}
      fill="#334155"
      fontSize="11"
      fontWeight="700"
    >
      r = {payload.correlation.toFixed(2)}
    </text>
  );
}

function ScatterTooltip({ active, payload, xKey }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  const xMetric = METRIC_BY_KEY[xKey];

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
          <span className="viz-tooltip-metric">AQI</span>
          <span className="viz-tooltip-value">{formatValue(item.aqi, '', 0)} · {aqiLabel(item.aqi)}</span>
        </div>
      </div>
    </div>
  );
}

function AqiGroupEffectChart({ data, animationKey }) {
  if (!data.length) {
    return <div className="overview-empty"><p>Không đủ dữ liệu để so sánh hai nhóm AQI.</p></div>;
  }

  const width = 940;
  const height = 330;
  const labelWidth = 132;
  const detailWidth = 250;
  const plotLeft = labelWidth;
  const plotRight = width - detailWidth;
  const plotWidth = plotRight - plotLeft;
  const top = 58;
  const rowGap = 48;
  const maxAbs = Math.max(0.5, ...data.map(item => Math.abs(item.effectSize)));
  const step = maxAbs <= 1 ? 0.5 : maxAbs <= 2 ? 1 : 2;
  const domainMax = Math.ceil(maxAbs / step) * step;
  const ticks = [];
  for (let value = -domainMax; value <= domainMax + step / 2; value += step) {
    ticks.push(roundSafely(value, 2));
  }
  const xScale = value => plotLeft + ((value + domainMax) / (domainMax * 2)) * plotWidth;
  const zeroX = xScale(0);

  return (
    <div className="aqi-effect-scroll">
      <svg
        key={animationKey}
        viewBox={`0 0 ${width} ${height}`}
        className="aqi-effect-svg"
        role="img"
        aria-label="So sánh điều kiện thời tiết giữa nhóm AQI cao và AQI thấp"
      >
        <text x={plotLeft} y={20} className="aqi-effect-axis-caption">Thấp hơn trong nhóm AQI cao</text>
        <text x={plotRight} y={20} textAnchor="end" className="aqi-effect-axis-caption">Cao hơn trong nhóm AQI cao</text>
        <text x={(plotLeft + plotRight) / 2} y={39} textAnchor="middle" className="aqi-effect-axis-title">
          Chênh lệch chuẩn hóa giữa nhóm AQI cao và thấp (Cohen&apos;s d)
        </text>

        {ticks.map(tick => {
          const x = xScale(tick);
          return (
            <g key={tick}>
              <line
                x1={x}
                x2={x}
                y1={top - 12}
                y2={top + rowGap * data.length - 14}
                stroke={tick === 0 ? '#64748B' : '#E2E8F0'}
                strokeWidth={tick === 0 ? 1.6 : 1}
                strokeDasharray={tick === 0 ? undefined : '3 4'}
              />
              <text x={x} y={height - 13} textAnchor="middle" className="aqi-effect-tick">
                {tick === 0 ? '0' : formatSigned(tick, tick % 1 === 0 ? 0 : 1)}
              </text>
            </g>
          );
        })}

        {data.map((item, index) => {
          const y = top + index * rowGap;
          const endX = xScale(item.effectSize);
          const isPositive = item.effectSize >= 0;
          const color = isPositive ? '#EF6A5B' : '#3B82F6';
          const lineStart = Math.min(zeroX, endX);
          const lineEnd = Math.max(zeroX, endX);
          const metric = METRIC_BY_KEY[item.key];
          const delay = 100 + index * 100;

          return (
            <g key={item.key}>
              <text x={plotLeft - 12} y={y + 4} textAnchor="end" className="aqi-effect-label">
                {item.label}
              </text>
              <line
                x1={lineStart}
                x2={lineEnd}
                y1={y}
                y2={y}
                stroke={color}
                strokeWidth={5}
                strokeLinecap="round"
                pathLength="1"
                className="aqi-effect-line"
                style={{ animationDelay: `${delay}ms` }}
              >
                <title>
                  {`${item.fullLabel}: nhóm AQI thấp ${formatValue(item.lowMean, metric.unit)}; nhóm AQI cao ${formatValue(item.highMean, metric.unit)}; d = ${item.effectSize.toFixed(2)}`}
                </title>
              </line>
              <circle
                cx={endX}
                cy={y}
                r={7}
                fill={color}
                stroke="#ffffff"
                strokeWidth={2.5}
                className="aqi-effect-dot"
                style={{ animationDelay: `${delay + 120}ms` }}
              >
                <title>
                  {`${item.fullLabel}: ${item.highMean >= item.lowMean ? 'cao hơn' : 'thấp hơn'} ${formatValue(Math.abs(item.rawDifference), metric.unit)} trong nhóm AQI cao`}
                </title>
              </circle>
              <text
                x={endX + (isPositive ? 11 : -11)}
                y={y + 4}
                textAnchor={isPositive ? 'start' : 'end'}
                className="aqi-effect-value"
              >
                d = {formatSigned(item.effectSize)}
              </text>
              <text x={plotRight + 20} y={y - 3} className="aqi-effect-detail">
                Thấp: {formatValue(item.lowMean, metric.unit)} · Cao: {formatValue(item.highMean, metric.unit)}
              </text>
              <text x={plotRight + 20} y={y + 14} className="aqi-effect-detail-note">
                {effectSizeStrength(item.effectSize)} · {item.effectSize >= 0 ? 'cao hơn' : 'thấp hơn'} trong nhóm AQI cao
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

const RelationshipAnalysisTab = () => {
  const { data, loading, error, dates, provinces } = useWeatherData();
  const [provinceScope, setProvinceScope] = useState('all');
  const [timePreset, setTimePreset] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedFactor, setSelectedFactor] = useState('humidity_mean');

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

  const factorRanking = useMemo(() => (
    AQI_FACTORS
      .map(metric => {
        const correlation = pearsonCorrelation(filteredRows, metric.key, 'aqi');
        return {
          ...metric,
          correlation,
          absCorrelation: Math.abs(correlation),
        };
      })
      .sort((a, b) => b.absCorrelation - a.absCorrelation)
  ), [filteredRows]);

  const strongestFactor = factorRanking[0] || null;
  const notableFactors = factorRanking.filter(item => item.absCorrelation >= NOTABLE_CORRELATION);
  const selectedMetric = METRIC_BY_KEY[selectedFactor];
  const selectedCorrelation = factorRanking.find(item => item.key === selectedFactor)?.correlation || 0;

  const aqiGroupComparison = useMemo(() => {
    if (filteredRows.length < 8) {
      return {
        lowThreshold: 0,
        highThreshold: 0,
        lowCount: 0,
        highCount: 0,
        factors: [],
      };
    }

    const aqiValues = filteredRows.map(row => row.aqi);
    const lowThreshold = quantile(aqiValues, 0.25);
    const highThreshold = quantile(aqiValues, 0.75);
    const lowRows = filteredRows.filter(row => row.aqi <= lowThreshold);
    const highRows = filteredRows.filter(row => row.aqi >= highThreshold);

    const factors = AQI_FACTORS
      .map(metric => {
        const lowMean = average(lowRows, metric.key);
        const highMean = average(highRows, metric.key);
        const pooledSd = pooledStandardDeviation(lowRows, highRows, metric.key);
        const rawDifference = highMean - lowMean;
        const effectSize = pooledSd > 0 ? rawDifference / pooledSd : 0;

        return {
          ...metric,
          lowMean,
          highMean,
          rawDifference,
          effectSize,
          absEffectSize: Math.abs(effectSize),
        };
      })
      .sort((a, b) => b.absEffectSize - a.absEffectSize);

    return {
      lowThreshold,
      highThreshold,
      lowCount: lowRows.length,
      highCount: highRows.length,
      factors,
    };
  }, [filteredRows]);

  const strongestGroupDifference = aqiGroupComparison.factors[0] || null;
  const scatterRows = useMemo(() => sampleRows(filteredRows, 650), [filteredRows]);

  const dataAnimationKey = `${provinceScope}-${timePreset}-${customStart}-${customEnd}-${filteredRows.length}`;
  const scatterAnimationKey = `${dataAnimationKey}-${selectedFactor}`;

  const selectedXDomain = useMemo(() => (
    getPaddedDomain(scatterRows, selectedFactor, {
      paddingRatio: 0.08,
      minPadding: selectedFactor === 'rain_sum' ? 0.5 : 1,
      clampMin: ['rain_sum', 'humidity_mean', 'wind_speed_max', 'cloud_cover_mean'].includes(selectedFactor) ? 0 : null,
      clampMax: ['humidity_mean', 'cloud_cover_mean'].includes(selectedFactor) ? 100 : null,
    })
  ), [scatterRows, selectedFactor]);

  const scatterAqiDomain = useMemo(() => (
    getPaddedDomain(scatterRows, 'aqi', { paddingRatio: 0.08, minPadding: 5, clampMin: 0 })
  ), [scatterRows]);


  const resetAllFilters = () => {
    setProvinceScope('all');
    setTimePreset('all');
    setCustomStart('');
    setCustomEnd('');
    setSelectedFactor('humidity_mean');
  };

  if (loading) return <div className="overview-empty"><p>Đang tải dữ liệu phân tích AQI...</p></div>;
  if (error) return <div className="overview-empty"><p>Lỗi: {error}</p></div>;

  return (
    <div className="aqi-relationship-tab">
      <style>{`
        @keyframes aqiTabEnter {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes aqiCardEnter {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes aqiHeatCellEnter {
          from { opacity: 0; transform: scale(0.72); transform-origin: center; }
          to { opacity: 1; transform: scale(1); transform-origin: center; }
        }
        @keyframes aqiLabelEnter {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes aqiEffectLineEnter {
          from { stroke-dashoffset: 1; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes aqiEffectDotEnter {
          from { opacity: 0; transform: scale(0.3); }
          to { opacity: 1; transform: scale(1); }
        }
        .aqi-relationship-tab {
          display: flex;
          flex-direction: column;
          gap: 14px;
          isolation: isolate;
          animation: aqiTabEnter 420ms ease-out both;
        }
        .aqi-goal-strip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 13px 15px;
          border-radius: 12px;
          border: 1px solid #dbeafe;
          background: linear-gradient(135deg, #eff6ff 0%, #ffffff 75%);
          animation: aqiCardEnter 440ms 20ms ease-out both;
        }
        .aqi-goal-copy h2 {
          margin: 0;
          color: #0f172a;
          font-size: 1rem;
          line-height: 1.3;
        }
        .aqi-goal-copy p {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 11.5px;
          line-height: 1.5;
        }
        .aqi-goal-badge {
          flex: 0 0 auto;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 10px;
          border-radius: 999px;
          color: #1d4ed8;
          background: #dbeafe;
          font-size: 11px;
          font-weight: 800;
        }
        .aqi-filter-bar {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-end;
          gap: 10px 16px;
          padding: 12px 14px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
          animation: aqiCardEnter 460ms 55ms ease-out both;
        }
        .aqi-filter-actions {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .aqi-summary-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }
        .aqi-summary-card {
          min-height: 76px;
          padding: 10px 13px;
          display: flex;
          align-items: center;
          gap: 10px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
          animation: aqiCardEnter 480ms ease-out both;
        }
        .aqi-summary-card:nth-child(1) { animation-delay: 90ms; }
        .aqi-summary-card:nth-child(2) { animation-delay: 145ms; }
        .aqi-summary-card:nth-child(3) { animation-delay: 200ms; }
        .aqi-summary-icon {
          width: 34px;
          height: 34px;
          border-radius: 9px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          color: #2563eb;
          background: rgba(37, 99, 235, 0.09);
        }
        .aqi-summary-copy { min-width: 0; }
        .aqi-summary-label {
          display: block;
          color: #64748b;
          font-size: 11px;
          font-weight: 700;
          margin-bottom: 2px;
        }
        .aqi-summary-value {
          display: block;
          color: #0f172a;
          font-size: 1.04rem;
          line-height: 1.2;
          font-weight: 800;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .aqi-summary-note {
          display: block;
          color: #64748b;
          font-size: 10.5px;
          margin-top: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .aqi-primary-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(360px, 0.8fr);
          gap: 14px;
          align-items: stretch;
        }
        .aqi-primary-grid > .chart-card,
        .aqi-scatter-card,
        .aqi-profile-card {
          margin: 0;
          overflow: hidden;
          animation: aqiCardEnter 520ms 230ms ease-out both;
        }
        .aqi-card-header {
          min-height: 34px;
          margin-bottom: 6px;
        }
        .aqi-ranking-frame {
          width: 100%;
          height: 300px;
        }
        .aqi-heatmap-scroll {
          width: 100%;
          overflow-x: auto;
          display: flex;
          justify-content: center;
        }
        .aqi-heatmap-svg {
          width: min(100%, 420px);
          min-width: 350px;
          display: block;
        }
        .aqi-heat-cell {
          opacity: 0;
          animation: aqiHeatCellEnter 360ms ease-out forwards;
          transform-box: fill-box;
          transform-origin: center;
        }
        .aqi-heat-label {
          opacity: 0;
          font-size: 9px;
          font-weight: 700;
          fill: #475569;
          animation: aqiLabelEnter 300ms ease-out forwards;
        }
        .aqi-heatmap-legend {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px 10px;
          padding-top: 7px;
          border-top: 1px solid #eef2f7;
          color: #64748b;
          font-size: 10.7px;
        }
        .aqi-legend-scale {
          width: 96px;
          height: 7px;
          border-radius: 999px;
          background: linear-gradient(90deg, hsl(215 78% 47%), #f8fafc, hsl(6 78% 47%));
        }
        .aqi-scatter-card {
          animation-delay: 290ms;
        }
        .aqi-scatter-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 6px;
        }
        .aqi-factor-toggle {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 5px;
        }
        .aqi-factor-toggle .toggle-btn {
          padding: 5px 8px;
          font-size: 10.5px;
        }
        .aqi-scatter-frame {
          width: 100%;
          height: 310px;
        }
        .aqi-scatter-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding-top: 6px;
          color: #64748b;
          font-size: 10.8px;
        }
        .aqi-scatter-footer strong { color: #334155; }
        .aqi-profile-card {
          animation-delay: 350ms;
        }
        .aqi-effect-frame {
          width: 100%;
          min-height: 330px;
        }
        .aqi-effect-scroll {
          width: 100%;
          overflow-x: auto;
        }
        .aqi-effect-svg {
          width: 100%;
          min-width: 760px;
          display: block;
        }
        .aqi-effect-axis-caption {
          fill: #64748b;
          font-size: 11px;
          font-weight: 700;
        }
        .aqi-effect-axis-title {
          fill: #334155;
          font-size: 11px;
          font-weight: 800;
        }
        .aqi-effect-tick {
          fill: #64748b;
          font-size: 10px;
        }
        .aqi-effect-label {
          fill: #334155;
          font-size: 11.5px;
          font-weight: 800;
        }
        .aqi-effect-value {
          fill: #334155;
          font-size: 10.5px;
          font-weight: 800;
        }
        .aqi-effect-detail {
          fill: #334155;
          font-size: 10.5px;
          font-weight: 700;
        }
        .aqi-effect-detail-note {
          fill: #64748b;
          font-size: 10px;
        }
        .aqi-effect-line {
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          animation: aqiEffectLineEnter 760ms ease-out forwards;
        }
        .aqi-effect-dot {
          opacity: 0;
          transform-box: fill-box;
          transform-origin: center;
          animation: aqiEffectDotEnter 320ms ease-out forwards;
        }
        .aqi-profile-footer {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 8px 14px;
          padding-top: 8px;
          color: #64748b;
          font-size: 10.8px;
        }
        .aqi-profile-legend {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
        }
        .aqi-profile-insight {
          color: #334155;
          font-weight: 700;
        }
        @media (prefers-reduced-motion: reduce) {
          .aqi-relationship-tab,
          .aqi-goal-strip,
          .aqi-filter-bar,
          .aqi-summary-card,
          .aqi-primary-grid > .chart-card,
          .aqi-scatter-card,
          .aqi-profile-card,
          .aqi-heat-cell,
          .aqi-heat-label,
          .aqi-effect-line,
          .aqi-effect-dot {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
        @media (max-width: 1100px) {
          .aqi-primary-grid { grid-template-columns: 1fr; }
          .aqi-filter-actions { margin-left: 0; }
        }
        @media (max-width: 820px) {
          .aqi-summary-grid { grid-template-columns: 1fr; }
          .aqi-scatter-header { flex-direction: column; }
          .aqi-factor-toggle { justify-content: flex-start; }
        }
        @media (max-width: 760px) {
          .aqi-goal-strip { align-items: flex-start; flex-direction: column; }
          .aqi-filter-bar { align-items: stretch; }
          .aqi-filter-bar .filter-group { width: 100%; }
          .aqi-filter-actions { width: 100%; justify-content: space-between; }
        }
      `}</style>

      <div className="aqi-goal-strip">
        <div className="aqi-goal-copy">
          <h2>Những điều kiện thời tiết nào thường đi kèm chất lượng không khí xấu?</h2>
          <p>
            Xác định yếu tố liên hệ rõ nhất với AQI và so sánh điều kiện thời tiết giữa nhóm AQI cao với nhóm AQI thấp.
          </p>
        </div>
        <span className="aqi-goal-badge"><Sparkles size={14} /> Trọng tâm: AQI</span>
      </div>

      <div className="aqi-filter-bar">
        <div className="filter-group">
          <label className="filter-label" htmlFor="aqi-relationship-province">Tỉnh / Thành phố</label>
          <select
            id="aqi-relationship-province"
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

        <div className="aqi-filter-actions">
          <button type="button" className="toggle-btn" onClick={resetAllFilters}>
            <Filter size={14} /> Xóa lọc
          </button>
          <span className="chart-subtitle-badge">{filteredRows.length.toLocaleString('vi-VN')} quan sát</span>
        </div>
      </div>

      <div className="aqi-summary-grid">
        <div className="aqi-summary-card">
          <div className="aqi-summary-icon"><Gauge size={18} /></div>
          <div className="aqi-summary-copy">
            <span className="aqi-summary-label">Liên hệ mạnh nhất với AQI</span>
            <span className="aqi-summary-value">{strongestFactor?.fullLabel || 'Chưa có dữ liệu'}</span>
            <span className="aqi-summary-note">
              r = {strongestFactor?.correlation.toFixed(2) || '0.00'} · {compactRelation(strongestFactor?.correlation || 0)}
            </span>
          </div>
        </div>

        <div className="aqi-summary-card">
          <div className="aqi-summary-icon"><BarChart3 size={18} /></div>
          <div className="aqi-summary-copy">
            <span className="aqi-summary-label">Yếu tố đáng chú ý</span>
            <span className="aqi-summary-value">{notableFactors.length} / {AQI_FACTORS.length} yếu tố</span>
            <span className="aqi-summary-note">Ngưỡng |r| ≥ {NOTABLE_CORRELATION.toFixed(2)}</span>
          </div>
        </div>

        <div className="aqi-summary-card">
          <div className="aqi-summary-icon"><Activity size={18} /></div>
          <div className="aqi-summary-copy">
            <span className="aqi-summary-label">Khác biệt nhóm lớn nhất</span>
            <span className="aqi-summary-value">{strongestGroupDifference?.fullLabel || 'Chưa có dữ liệu'}</span>
            <span className="aqi-summary-note">
              d = {strongestGroupDifference ? formatSigned(strongestGroupDifference.effectSize) : '0.00'} · {effectSizeStrength(strongestGroupDifference?.effectSize || 0)}
            </span>
          </div>
        </div>
      </div>

      <div className="aqi-primary-grid">
        <figure className="chart-card">
          <div className="chart-card-header aqi-card-header">
            <div className="chart-title-flex">
              <BarChart3 size={17} color="#2563EB" />
              <h3 className="chart-card-title m-0">Mức liên hệ của các yếu tố với AQI</h3>
            </div>
            <span className="chart-subtitle-badge">Xếp hạng theo |r|</span>
          </div>

          <div className="aqi-ranking-frame">
            <ResponsiveContainer>
              <BarChart
                data={factorRanking}
                layout="vertical"
                margin={{ top: 8, right: 58, bottom: 8, left: 16 }}
                barCategoryGap={10}
              >
                <CartesianGrid stroke="#E2E8F0" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 1]}
                  tick={{ fontSize: 10.5, fill: '#64748B' }}
                  axisLine={{ stroke: '#CBD5E1' }}
                  tickFormatter={value => value.toFixed(1)}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={92}
                  tick={{ fontSize: 11, fill: '#334155', fontWeight: 700 }}
                  axisLine={false}
                  tickLine={false}
                />
                <RechartsTooltip content={<CorrelationRankingTooltip />} cursor={{ fill: '#F8FAFC' }} />
                <Bar
                  dataKey="absCorrelation"
                  radius={[0, 5, 5, 0]}
                  maxBarSize={24}
                  isAnimationActive
                  animationBegin={120}
                  animationDuration={900}
                  animationEasing="ease-out"
                >
                  {factorRanking.map(item => (
                    <Cell key={item.key} fill={item.correlation >= 0 ? '#EF6A5B' : '#3B82F6'} />
                  ))}
                  <LabelList dataKey="absCorrelation" content={<CorrelationBarLabel />} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </figure>

        <figure className="chart-card">
          <div className="chart-card-header aqi-card-header">
            <div className="chart-title-flex">
              <Network size={17} color="#8B5CF6" />
              <h3 className="chart-card-title m-0">Ma trận tương quan tổng quan</h3>
            </div>
            <span className="chart-subtitle-badge">6 biến cốt lõi</span>
          </div>

          <CorrelationHeatmap matrix={correlationMatrix} animationKey={dataAnimationKey} />

          <div className="aqi-heatmap-legend">
            <span style={{ fontWeight: 700, color: '#334155' }}>Nghịch</span>
            <div className="aqi-legend-scale" />
            <span style={{ fontWeight: 700, color: '#334155' }}>Thuận</span>
            <span>Ô càng đậm, mối liên hệ càng mạnh.</span>
          </div>
        </figure>
      </div>

      <figure className="chart-card aqi-scatter-card">
        <div className="aqi-scatter-header">
          <div className="chart-title-flex">
            <Activity size={17} color="#0EA5E9" />
            <div>
              <h3 className="chart-card-title m-0">Khám phá quan hệ với AQI</h3>
              <p style={{ margin: '3px 0 0', color: '#64748B', fontSize: 10.8 }}>
                Chọn một yếu tố để xem phân bố, ngoại lệ và xu hướng tuyến tính.
              </p>
            </div>
          </div>
          <div className="aqi-factor-toggle">
            {AQI_FACTORS.map(metric => (
              <button
                key={metric.key}
                type="button"
                className={`toggle-btn ${selectedFactor === metric.key ? 'active' : ''}`}
                onClick={() => setSelectedFactor(metric.key)}
              >
                {metric.label}
              </button>
            ))}
          </div>
        </div>

        <div className="aqi-scatter-frame">
          <ResponsiveContainer>
            <ScatterChart margin={{ top: 8, right: 22, bottom: 28, left: 14 }}>
              <CartesianGrid stroke="#E2E8F0" vertical={false} strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey={selectedFactor}
                name={selectedMetric.fullLabel}
                unit={selectedMetric.unit}
                domain={selectedXDomain}
                allowDataOverflow={false}
                tickCount={6}
                allowDecimals={!['humidity_mean', 'cloud_cover_mean'].includes(selectedFactor)}
                tickFormatter={value => formatAxisTick(value, selectedFactor)}
                tick={{ fontSize: 10.5, fill: '#64748B' }}
                axisLine={{ stroke: '#CBD5E1' }}
                label={{ value: `${selectedMetric.fullLabel} (${selectedMetric.unit || 'điểm'})`, position: 'insideBottom', offset: -16, fill: '#64748B', fontSize: 10 }}
              />
              <YAxis
                type="number"
                dataKey="aqi"
                name="AQI"
                domain={scatterAqiDomain}
                allowDataOverflow={false}
                tickCount={6}
                allowDecimals={false}
                tickFormatter={value => formatAxisTick(value, 'aqi')}
                tick={{ fontSize: 10.5, fill: '#64748B' }}
                axisLine={{ stroke: '#CBD5E1' }}
                width={58}
                label={{ value: 'AQI (điểm)', angle: -90, position: 'insideLeft', offset: 8, fill: '#64748B', fontSize: 10 }}
              />
              <RechartsTooltip
                content={<ScatterTooltip xKey={selectedFactor} />}
                cursor={{ stroke: '#94A3B8', strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Scatter
                key={`${scatterAnimationKey}-scatter`}
                data={scatterRows}
                fill="#0EA5E9"
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

        <div className="aqi-scatter-footer">
          <span><strong>{selectedMetric.fullLabel} ↔ AQI:</strong> r = {selectedCorrelation.toFixed(2)}</span>
          <span>{compactRelation(selectedCorrelation)}</span>
        </div>
      </figure>

      <figure className="chart-card aqi-profile-card">
        <div className="chart-card-header aqi-card-header">
          <div className="chart-title-flex">
            <Activity size={17} color="#8B5CF6" />
            <div>
              <h3 className="chart-card-title m-0">Nhóm AQI cao khác nhóm AQI thấp như thế nào?</h3>
              <p style={{ margin: '3px 0 0', color: '#64748B', fontSize: 10.8 }}>
                So sánh top 25% AQI cao với bottom 25% AQI thấp bằng chênh lệch chuẩn hóa.
              </p>
            </div>
          </div>
          <span className="chart-subtitle-badge">Cohen&apos;s d · |d| càng lớn, khác biệt càng rõ</span>
        </div>

        <div className="aqi-effect-frame">
          <AqiGroupEffectChart data={aqiGroupComparison.factors} animationKey={`${dataAnimationKey}-profile`} />
        </div>

        <div className="aqi-profile-footer">
          <div className="aqi-profile-legend">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#3B82F6' }} />
              Thấp hơn trong nhóm AQI cao
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#EF6A5B' }} />
              Cao hơn trong nhóm AQI cao
            </span>
            <span>
              AQI thấp ≤ {aqiGroupComparison.lowThreshold.toFixed(0)} ({aqiGroupComparison.lowCount} quan sát) · AQI cao ≥ {aqiGroupComparison.highThreshold.toFixed(0)} ({aqiGroupComparison.highCount} quan sát)
            </span>
          </div>
          {strongestGroupDifference && (
            <span className="aqi-profile-insight">
              Khác biệt lớn nhất: {strongestGroupDifference.fullLabel} {strongestGroupDifference.effectSize >= 0 ? 'cao hơn' : 'thấp hơn'} trong nhóm AQI cao (d = {formatSigned(strongestGroupDifference.effectSize)}).
            </span>
          )}
        </div>
      </figure>
    </div>
  );
};

export default RelationshipAnalysisTab;