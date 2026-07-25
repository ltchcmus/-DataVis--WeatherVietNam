import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Cell,
  BarChart,
  Bar,
  LabelList,
  LineChart,
  Line,
  ReferenceLine,
} from 'recharts';
import {
  Activity,
  BarChart3,
  CloudRain,
  Droplets,
  Filter,
  Gauge,
  MapPinned,
  Network,
  Sparkles,
  ThermometerSun,
  Wind,
} from 'lucide-react';
import useWeatherData from '../../hooks/useWeatherData';
import { REGIONS, getRegionByProvince } from '../../constants/regions';
import DashboardSkeleton from './DashboardSkeleton';

const WEATHER_FACTORS = [
  {
    key: 'temperature_mean',
    label: 'Nhiệt độ',
    shortLabel: 'Nhiệt độ',
    fullLabel: 'Nhiệt độ trung bình',
    unit: '°C',
    icon: ThermometerSun,
  },
  {
    key: 'humidity_mean',
    label: 'Độ ẩm',
    shortLabel: 'Độ ẩm',
    fullLabel: 'Độ ẩm trung bình',
    unit: '%',
    icon: Droplets,
  },
  {
    key: 'rain_sum',
    label: 'Lượng mưa',
    shortLabel: 'Mưa',
    fullLabel: 'Tổng lượng mưa',
    unit: 'mm',
    icon: CloudRain,
  },
  {
    key: 'wind_speed_max',
    label: 'Gió tối đa',
    shortLabel: 'Gió',
    fullLabel: 'Tốc độ gió tối đa',
    unit: 'km/h',
    icon: Wind,
  },
  {
    key: 'cloud_cover_mean',
    label: 'Mây che phủ',
    shortLabel: 'Mây',
    fullLabel: 'Độ che phủ mây',
    unit: '%',
    icon: Network,
  },
];

const FACTOR_BY_KEY = Object.fromEntries(WEATHER_FACTORS.map(factor => [factor.key, factor]));
const TREND_LEVELS = ['Rất thấp', 'Thấp', 'Trung bình', 'Cao', 'Rất cao'];
const RAIN_THRESHOLD = 1;
const BAD_AQI_THRESHOLD = 100;
const MIN_CORRELATION_ROWS = 4;
const MIN_PROVINCE_GROUP_ROWS = 2;

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function numericRows(rows, keys) {
  return rows.filter(row => keys.every(key => toFiniteNumber(row[key]) !== null));
}

function averageValues(values) {
  const clean = values.filter(value => Number.isFinite(value));
  if (!clean.length) return null;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function medianValues(values) {
  const clean = values.filter(value => Number.isFinite(value)).sort((a, b) => a - b);
  if (!clean.length) return null;
  const middle = Math.floor(clean.length / 2);
  return clean.length % 2 === 0
    ? (clean[middle - 1] + clean[middle]) / 2
    : clean[middle];
}

function quantile(values, q) {
  const clean = values.filter(value => Number.isFinite(value)).sort((a, b) => a - b);
  if (!clean.length) return null;
  const position = (clean.length - 1) * q;
  const base = Math.floor(position);
  const rest = position - base;
  return clean[base + 1] === undefined
    ? clean[base]
    : clean[base] + rest * (clean[base + 1] - clean[base]);
}

function medianByKey(rows, key) {
  return medianValues(rows.map(row => toFiniteNumber(row[key])).filter(value => value !== null));
}

function pearsonCorrelation(rows, xKey, yKey) {
  const pairs = rows
    .map(row => [toFiniteNumber(row[xKey]), toFiniteNumber(row[yKey])])
    .filter(([x, y]) => x !== null && y !== null);

  if (pairs.length < MIN_CORRELATION_ROWS) return null;

  const xMean = averageValues(pairs.map(([x]) => x));
  const yMean = averageValues(pairs.map(([, y]) => y));

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

function formatNumber(value, digits = 1) {
  return Number.isFinite(value) ? value.toFixed(digits) : 'N/A';
}

function formatValue(value, unit = '', digits = 1) {
  return Number.isFinite(value) ? `${value.toFixed(digits)}${unit}` : 'N/A';
}

function formatSigned(value, digits = 1) {
  if (!Number.isFinite(value)) return 'N/A';
  return `${value > 0 ? '+' : ''}${value.toFixed(digits)}`;
}

function correlationDirection(value) {
  if (!Number.isFinite(value) || Math.abs(value) < 0.05) return 'Gần như không đổi';
  return value > 0 ? 'AQI có xu hướng tăng' : 'AQI có xu hướng giảm';
}

function correlationStrength(value) {
  if (!Number.isFinite(value)) return 'Chưa đủ dữ liệu';
  const magnitude = Math.abs(value);
  if (magnitude >= 0.7) return 'Rất rõ';
  if (magnitude >= 0.5) return 'Khá rõ';
  if (magnitude >= 0.3) return 'Trung bình';
  if (magnitude >= 0.15) return 'Yếu';
  return 'Rất yếu';
}

function heatColor(value) {
  if (!Number.isFinite(value)) return '#F1F5F9';
  const bounded = Math.max(-1, Math.min(1, value));
  if (bounded < 0) {
    const lightness = 96 - Math.abs(bounded) * 49;
    return `hsl(214 78% ${lightness}%)`;
  }
  const lightness = 96 - bounded * 49;
  return `hsl(8 78% ${lightness}%)`;
}

function heatTextColor(value) {
  return Number.isFinite(value) && Math.abs(value) >= 0.56 ? '#FFFFFF' : '#0F172A';
}

function cleaningColor(value) {
  if (!Number.isFinite(value)) return '#CBD5E1';
  return value >= 0 ? '#10B981' : '#F97316';
}

function getScopeLabel(regionScope, provinceScope) {
  if (provinceScope !== 'all') return provinceScope;
  if (regionScope !== 'all') return regionScope;
  return 'Toàn quốc';
}

function createRankBins(rows, factorKey) {
  const usableRows = numericRows(rows, [factorKey, 'aqi'])
    .slice()
    .sort((a, b) => Number(a[factorKey]) - Number(b[factorKey]));

  if (!usableRows.length) return [];

  const bins = Array.from({ length: 5 }, () => []);
  usableRows.forEach((row, index) => {
    const binIndex = Math.min(4, Math.floor((index * 5) / usableRows.length));
    bins[binIndex].push(row);
  });

  return bins
    .map((binRows, index) => {
      if (!binRows.length) return null;
      const factorValues = binRows.map(row => Number(row[factorKey]));
      const aqiValues = binRows.map(row => Number(row.aqi));
      return {
        level: TREND_LEVELS[index],
        levelIndex: index,
        factorMin: Math.min(...factorValues),
        factorMax: Math.max(...factorValues),
        factorMedian: medianValues(factorValues),
        aqiMedian: medianValues(aqiValues),
        aqiMean: averageValues(aqiValues),
        aqiQ1: quantile(aqiValues, 0.25),
        aqiQ3: quantile(aqiValues, 0.75),
        badRate: (aqiValues.filter(value => value > BAD_AQI_THRESHOLD).length / aqiValues.length) * 100,
        count: binRows.length,
      };
    })
    .filter(Boolean);
}

function buildCleaningGroups(rows) {
  const usableRows = numericRows(rows, ['aqi', 'rain_sum', 'wind_speed_max']);
  if (!usableRows.length) {
    return {
      groups: [],
      windLowThreshold: null,
      windHighThreshold: null,
    };
  }

  const windValues = usableRows.map(row => Number(row.wind_speed_max));
  const windLowThreshold = quantile(windValues, 0.25);
  const windHighThreshold = quantile(windValues, 0.75);

  const definitions = [
    {
      key: 'dryWeak',
      label: 'Không mưa\nGió yếu',
      shortLabel: 'Khô + gió yếu',
      predicate: row => Number(row.rain_sum) < RAIN_THRESHOLD && Number(row.wind_speed_max) <= windLowThreshold,
    },
    {
      key: 'rainWeak',
      label: 'Có mưa\nGió yếu',
      shortLabel: 'Mưa + gió yếu',
      predicate: row => Number(row.rain_sum) >= RAIN_THRESHOLD && Number(row.wind_speed_max) <= windLowThreshold,
    },
    {
      key: 'dryStrong',
      label: 'Không mưa\nGió mạnh',
      shortLabel: 'Khô + gió mạnh',
      predicate: row => Number(row.rain_sum) < RAIN_THRESHOLD && Number(row.wind_speed_max) >= windHighThreshold,
    },
    {
      key: 'rainStrong',
      label: 'Có mưa\nGió mạnh',
      shortLabel: 'Mưa + gió mạnh',
      predicate: row => Number(row.rain_sum) >= RAIN_THRESHOLD && Number(row.wind_speed_max) >= windHighThreshold,
    },
  ];

  const rawGroups = definitions.map(definition => {
    const groupRows = usableRows.filter(definition.predicate);
    const aqiValues = groupRows.map(row => Number(row.aqi));
    return {
      ...definition,
      rows: groupRows,
      count: groupRows.length,
      aqiMedian: medianValues(aqiValues),
      aqiMean: averageValues(aqiValues),
      badRate: groupRows.length
        ? (aqiValues.filter(value => value > BAD_AQI_THRESHOLD).length / groupRows.length) * 100
        : null,
    };
  });

  const baseline = rawGroups.find(group => group.key === 'dryWeak')?.aqiMedian;
  const groups = rawGroups.map(group => ({
    ...group,
    reductionFromBaseline:
      Number.isFinite(baseline) && Number.isFinite(group.aqiMedian)
        ? baseline - group.aqiMedian
        : null,
  }));

  return {
    groups,
    windLowThreshold,
    windHighThreshold,
  };
}

function cleaningEffectForRows(rows, mode) {
  const usableRows = numericRows(rows, ['aqi', 'rain_sum', 'wind_speed_max']);
  if (!usableRows.length) return null;

  const windValues = usableRows.map(row => Number(row.wind_speed_max));
  const windLow = quantile(windValues, 0.25);
  const windHigh = quantile(windValues, 0.75);

  let baselineRows = [];
  let cleanRows = [];

  if (mode === 'rain') {
    baselineRows = usableRows.filter(row => Number(row.rain_sum) < RAIN_THRESHOLD);
    cleanRows = usableRows.filter(row => Number(row.rain_sum) >= RAIN_THRESHOLD);
  } else if (mode === 'wind') {
    baselineRows = usableRows.filter(row => Number(row.wind_speed_max) <= windLow);
    cleanRows = usableRows.filter(row => Number(row.wind_speed_max) >= windHigh);
  } else {
    baselineRows = usableRows.filter(
      row => Number(row.rain_sum) < RAIN_THRESHOLD && Number(row.wind_speed_max) <= windLow,
    );
    cleanRows = usableRows.filter(
      row => Number(row.rain_sum) >= RAIN_THRESHOLD && Number(row.wind_speed_max) >= windHigh,
    );
  }

  if (
    baselineRows.length < MIN_PROVINCE_GROUP_ROWS
    || cleanRows.length < MIN_PROVINCE_GROUP_ROWS
  ) {
    return null;
  }

  const baselineMedian = medianByKey(baselineRows, 'aqi');
  const cleanMedian = medianByKey(cleanRows, 'aqi');
  if (!Number.isFinite(baselineMedian) || !Number.isFinite(cleanMedian)) return null;

  const reduction = baselineMedian - cleanMedian;
  return {
    reduction,
    reductionPercent: baselineMedian !== 0 ? (reduction / baselineMedian) * 100 : 0,
    baselineMedian,
    cleanMedian,
    baselineCount: baselineRows.length,
    cleanCount: cleanRows.length,
  };
}

function RegionFactorHeatmap({ rows, selectedFactor, onSelectFactor, animationKey }) {
  const cellWidth = 122;
  const cellHeight = 48;
  const labelWidth = 238;
  const topHeight = 64;
  const visibleRegions = rows.map(item => item.region);
  const width = labelWidth + WEATHER_FACTORS.length * cellWidth + 18;
  const height = topHeight + visibleRegions.length * cellHeight + 14;

  if (!rows.length) {
    return <div className="overview-empty"><p>Không đủ dữ liệu để so sánh giữa các vùng.</p></div>;
  }

  return (
    <div className="rel-heatmap-scroll">
      <svg
        key={animationKey}
        viewBox={`0 0 ${width} ${height}`}
        className="rel-heatmap-svg"
        role="img"
        aria-label="Heatmap mức liên hệ giữa các yếu tố thời tiết và AQI theo vùng"
      >
        {WEATHER_FACTORS.map((factor, columnIndex) => {
          const x = labelWidth + columnIndex * cellWidth;
          const isSelected = factor.key === selectedFactor;
          return (
            <g
              key={factor.key}
              className="rel-heatmap-column-label"
              onClick={() => onSelectFactor(factor.key)}
              style={{ cursor: 'pointer' }}
            >
              <rect
                x={x + 5}
                y={12}
                width={cellWidth - 10}
                height={38}
                rx={9}
                fill={isSelected ? '#DBEAFE' : '#F8FAFC'}
                stroke={isSelected ? '#3B82F6' : '#E2E8F0'}
              />
              <text
                x={x + cellWidth / 2}
                y={36}
                textAnchor="middle"
                className="rel-heatmap-column-text"
                fill={isSelected ? '#1D4ED8' : '#475569'}
              >
                {factor.shortLabel}
              </text>
            </g>
          );
        })}

        {rows.map((regionItem, rowIndex) => {
          const y = topHeight + rowIndex * cellHeight;
          return (
            <g key={regionItem.region}>
              <text
                x={labelWidth - 12}
                y={y + cellHeight / 2 + 4}
                textAnchor="end"
                className="rel-heatmap-row-label"
              >
                {regionItem.region}
              </text>

              {WEATHER_FACTORS.map((factor, columnIndex) => {
                const cell = regionItem.values[factor.key];
                const x = labelWidth + columnIndex * cellWidth;
                const isSelected = factor.key === selectedFactor;
                return (
                  <g
                    key={`${regionItem.region}-${factor.key}`}
                    className="rel-heatmap-cell"
                    style={{ animationDelay: `${70 + (rowIndex * WEATHER_FACTORS.length + columnIndex) * 24}ms` }}
                    onClick={() => onSelectFactor(factor.key)}
                  >
                    <title>
                      {`${regionItem.region} · ${factor.fullLabel}: ${Number.isFinite(cell.correlation) ? `r = ${cell.correlation.toFixed(3)}` : 'chưa đủ dữ liệu'} · n = ${cell.count}`}
                    </title>
                    <rect
                      x={x + 5}
                      y={y + 3}
                      width={cellWidth - 10}
                      height={cellHeight - 6}
                      rx={8}
                      fill={heatColor(cell.correlation)}
                      stroke={isSelected ? '#2563EB' : '#FFFFFF'}
                      strokeWidth={isSelected ? 2.2 : 1.4}
                    />
                    <text
                      x={x + cellWidth / 2}
                      y={y + cellHeight / 2 + 4}
                      textAnchor="middle"
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        fill: heatTextColor(cell.correlation),
                      }}
                    >
                      {Number.isFinite(cell.correlation) ? cell.correlation.toFixed(2) : 'N/A'}
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

function TrendTooltip({ active, payload, factor }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="viz-tooltip province-tooltip">
      <div className="viz-tooltip-header">
        <span className="viz-tooltip-label">Mức {item.level.toLowerCase()}</span>
      </div>
      <div className="viz-tooltip-divider" />
      <div className="viz-tooltip-body">
        <div className="viz-tooltip-row">
          <span className="viz-tooltip-metric">Khoảng {factor.label.toLowerCase()}</span>
          <span className="viz-tooltip-value">
            {formatValue(item.factorMin, factor.unit)} – {formatValue(item.factorMax, factor.unit)}
          </span>
        </div>
        <div className="viz-tooltip-row">
          <span className="viz-tooltip-metric">AQI trung vị</span>
          <span className="viz-tooltip-value">{formatNumber(item.aqiMedian, 1)}</span>
        </div>
        <div className="viz-tooltip-row">
          <span className="viz-tooltip-metric">Khoảng 50% dữ liệu</span>
          <span className="viz-tooltip-value">{formatNumber(item.aqiQ1, 1)} – {formatNumber(item.aqiQ3, 1)}</span>
        </div>
        <div className="viz-tooltip-row">
          <span className="viz-tooltip-metric">Tỷ lệ AQI &gt; 100</span>
          <span className="viz-tooltip-value">{formatNumber(item.badRate, 1)}%</span>
        </div>
        <div className="viz-tooltip-row">
          <span className="viz-tooltip-metric">Số quan sát</span>
          <span className="viz-tooltip-value">n = {item.count}</span>
        </div>
      </div>
    </div>
  );
}

function CleaningTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="viz-tooltip province-tooltip">
      <div className="viz-tooltip-header">
        <span className="viz-tooltip-label">{item.shortLabel}</span>
      </div>
      <div className="viz-tooltip-divider" />
      <div className="viz-tooltip-body">
        <div className="viz-tooltip-row">
          <span className="viz-tooltip-metric">AQI trung vị</span>
          <span className="viz-tooltip-value">{formatNumber(item.aqiMedian, 1)}</span>
        </div>
        <div className="viz-tooltip-row">
          <span className="viz-tooltip-metric">So với khô + gió yếu</span>
          <span className="viz-tooltip-value">
            {Number.isFinite(item.reductionFromBaseline)
              ? `${item.reductionFromBaseline >= 0 ? 'Giảm' : 'Tăng'} ${formatNumber(Math.abs(item.reductionFromBaseline), 1)} điểm`
              : 'N/A'}
          </span>
        </div>
        <div className="viz-tooltip-row">
          <span className="viz-tooltip-metric">Tỷ lệ AQI &gt; 100</span>
          <span className="viz-tooltip-value">{formatNumber(item.badRate, 1)}%</span>
        </div>
        <div className="viz-tooltip-row">
          <span className="viz-tooltip-metric">Số quan sát</span>
          <span className="viz-tooltip-value">n = {item.count}</span>
        </div>
      </div>
    </div>
  );
}

function ProvinceTooltip({ active, payload, mode }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  const modeLabel = mode === 'wind' ? 'gió mạnh' : mode === 'rain' ? 'có mưa' : 'mưa + gió mạnh';
  return (
    <div className="viz-tooltip province-tooltip">
      <div className="viz-tooltip-header">
        <span className="viz-tooltip-label">{item.province}</span>
      </div>
      <div className="viz-tooltip-divider" />
      <div className="viz-tooltip-body">
        <div className="viz-tooltip-row">
          <span className="viz-tooltip-metric">Mức giảm AQI</span>
          <span className="viz-tooltip-value">{formatSigned(item.effect.reduction, 1)} điểm</span>
        </div>
        <div className="viz-tooltip-row">
          <span className="viz-tooltip-metric">Theo tỷ lệ</span>
          <span className="viz-tooltip-value">{formatSigned(item.effect.reductionPercent, 1)}%</span>
        </div>
        <div className="viz-tooltip-row">
          <span className="viz-tooltip-metric">Điều kiện nền</span>
          <span className="viz-tooltip-value">AQI {formatNumber(item.effect.baselineMedian, 1)}</span>
        </div>
        <div className="viz-tooltip-row">
          <span className="viz-tooltip-metric">Khi {modeLabel}</span>
          <span className="viz-tooltip-value">AQI {formatNumber(item.effect.cleanMedian, 1)}</span>
        </div>
        <div className="viz-tooltip-row">
          <span className="viz-tooltip-metric">Cỡ mẫu</span>
          <span className="viz-tooltip-value">{item.effect.baselineCount} / {item.effect.cleanCount}</span>
        </div>
      </div>
    </div>
  );
}

function ProvinceBarLabel({ x, y, width, height, payload }) {
  if (!payload) return null;
  const isPositive = payload.reduction >= 0;
  return (
    <text
      x={isPositive ? x + width + 7 : x - 7}
      y={y + height / 2 + 4}
      textAnchor={isPositive ? 'start' : 'end'}
      fill="#334155"
      fontSize="10.5"
      fontWeight="800"
    >
      {formatSigned(payload.reduction, 1)}
    </text>
  );
}

const RelationshipAnalysisTab = () => {
  const { data, loading, error, dates, provinces } = useWeatherData();
  const [regionScope, setRegionScope] = useState('all');
  const [provinceScope, setProvinceScope] = useState('all');
  const [timePreset, setTimePreset] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedFactor, setSelectedFactor] = useState('wind_speed_max');
  const [cleaningMode, setCleaningMode] = useState('combined');

  const filteredProvinces = useMemo(() => {
    if (regionScope === 'all') return provinces;
    return provinces.filter(province => getRegionByProvince(province) === regionScope);
  }, [provinces, regionScope]);

  const filteredRows = useMemo(() => {
    let rows = data.filter(row => toFiniteNumber(row.aqi) !== null);

    if (regionScope !== 'all') {
      rows = rows.filter(row => getRegionByProvince(row.province) === regionScope);
    }
    if (provinceScope !== 'all') {
      rows = rows.filter(row => row.province === provinceScope);
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

    return rows;
  }, [data, dates, regionScope, provinceScope, timePreset, customStart, customEnd]);

  const scopeLabel = getScopeLabel(regionScope, provinceScope);
  const selectedMetric = FACTOR_BY_KEY[selectedFactor];

  const regionHeatmapRows = useMemo(() => {
    const targetRegions = regionScope === 'all' ? REGIONS : [regionScope];

    return targetRegions
      .map(region => {
        const regionRows = filteredRows.filter(
          row => getRegionByProvince(row.province) === region,
        );
        const values = Object.fromEntries(
          WEATHER_FACTORS.map(factor => {
            const usable = numericRows(regionRows, [factor.key, 'aqi']);
            return [factor.key, {
              correlation: pearsonCorrelation(usable, factor.key, 'aqi'),
              count: usable.length,
            }];
          }),
        );
        return {
          region,
          count: regionRows.length,
          values,
        };
      })
      .filter(item => item.count > 0);
  }, [filteredRows, regionScope]);

  const globalFactorRanking = useMemo(() => (
    WEATHER_FACTORS
      .map(factor => {
        const usable = numericRows(filteredRows, [factor.key, 'aqi']);
        const correlation = pearsonCorrelation(usable, factor.key, 'aqi');
        return {
          ...factor,
          correlation,
          absCorrelation: Number.isFinite(correlation) ? Math.abs(correlation) : -1,
          count: usable.length,
        };
      })
      .sort((a, b) => b.absCorrelation - a.absCorrelation)
  ), [filteredRows]);

  const strongestFactor = globalFactorRanking.find(item => Number.isFinite(item.correlation)) || null;

  const strongestRegionCell = useMemo(() => {
    const cells = regionHeatmapRows.flatMap(regionItem => (
      WEATHER_FACTORS.map(factor => ({
        region: regionItem.region,
        factor,
        ...regionItem.values[factor.key],
      }))
    ));
    return cells
      .filter(cell => Number.isFinite(cell.correlation))
      .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))[0] || null;
  }, [regionHeatmapRows]);

  const trendData = useMemo(
    () => createRankBins(filteredRows, selectedFactor),
    [filteredRows, selectedFactor],
  );

  const trendChange = useMemo(() => {
    if (trendData.length < 2) return null;
    const first = trendData[0]?.aqiMedian;
    const last = trendData[trendData.length - 1]?.aqiMedian;
    return Number.isFinite(first) && Number.isFinite(last) ? first - last : null;
  }, [trendData]);

  const cleaningComparison = useMemo(
    () => buildCleaningGroups(filteredRows),
    [filteredRows],
  );

  const rainEffect = useMemo(
    () => cleaningEffectForRows(filteredRows, 'rain'),
    [filteredRows],
  );

  const provinceRanking = useMemo(() => {
    const provinceSet = [...new Set(filteredRows.map(row => row.province).filter(Boolean))];
    return provinceSet
      .map(province => {
        const provinceRows = filteredRows.filter(row => row.province === province);
        const effect = cleaningEffectForRows(provinceRows, cleaningMode);
        return effect
          ? {
              province,
              region: getRegionByProvince(province),
              reduction: effect.reduction,
              effect,
            }
          : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.reduction - a.reduction)
      .slice(0, 10);
  }, [filteredRows, cleaningMode]);

  const strongestProvince = provinceRanking[0] || null;
  const dataAnimationKey = [
    regionScope,
    provinceScope,
    timePreset,
    customStart,
    customEnd,
    filteredRows.length,
  ].join('-');

  const cleaningBaseline = cleaningComparison.groups.find(group => group.key === 'dryWeak');
  const cleaningBest = cleaningComparison.groups
    .filter(group => Number.isFinite(group.aqiMedian))
    .sort((a, b) => a.aqiMedian - b.aqiMedian)[0] || null;

  const insightSentences = useMemo(() => {
    const insights = [];

    if (strongestFactor) {
      insights.push(
        `${strongestFactor.fullLabel} là yếu tố có liên hệ rõ nhất với AQI trong phạm vi đang chọn (r = ${strongestFactor.correlation.toFixed(2)}).`,
      );
    }

    if (strongestRegionCell) {
      insights.push(
        `${strongestRegionCell.region} thể hiện mối liên hệ nổi bật nhất ở yếu tố ${strongestRegionCell.factor.label.toLowerCase()} (r = ${strongestRegionCell.correlation.toFixed(2)}).`,
      );
    }

    if (
      Number.isFinite(cleaningBaseline?.aqiMedian)
      && Number.isFinite(cleaningBest?.aqiMedian)
      && cleaningBest.key !== cleaningBaseline.key
    ) {
      const difference = cleaningBaseline.aqiMedian - cleaningBest.aqiMedian;
      insights.push(
        `${cleaningBest.shortLabel} đi kèm AQI trung vị thấp hơn ${Math.abs(difference).toFixed(1)} điểm so với khô + gió yếu.`,
      );
    }

    return insights.slice(0, 3);
  }, [strongestFactor, strongestRegionCell, cleaningBaseline, cleaningBest]);

  const resetAllFilters = () => {
    setRegionScope('all');
    setProvinceScope('all');
    setTimePreset('all');
    setCustomStart('');
    setCustomEnd('');
    setSelectedFactor('wind_speed_max');
    setCleaningMode('combined');
  };

  if (loading) {
    return <DashboardSkeleton message="Đang phân tích khác biệt vùng và hiệu ứng làm sạch không khí..." />;
  }
  if (error) return <div className="overview-empty"><p>Lỗi: {error}</p></div>;

  return (
    <div className="rel-tab">
      <style>{`
        @keyframes relEnter {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes relCellEnter {
          from { opacity: 0; transform: scale(0.82); }
          to { opacity: 1; transform: scale(1); }
        }
        .rel-tab {
          display: flex;
          flex-direction: column;
          gap: 14px;
          isolation: isolate;
          animation: relEnter 420ms ease-out both;
        }        .rel-filter-bar {
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
        .rel-filter-actions {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 9px;
        }
        .rel-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 11px;
        }
        .rel-kpi-card {
          min-height: 92px;
          padding: 12px;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          border-radius: 12px;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
        }
        .rel-kpi-icon {
          width: 35px;
          height: 35px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border-radius: 10px;
          color: #2563EB;
          background: #EFF6FF;
        }
        .rel-kpi-copy { min-width: 0; }
        .rel-kpi-label {
          display: block;
          margin-bottom: 3px;
          color: #64748B;
          font-size: 10.5px;
          font-weight: 750;
        }
        .rel-kpi-value {
          display: block;
          color: #0F172A;
          font-size: 0.98rem;
          line-height: 1.25;
          font-weight: 850;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .rel-kpi-note {
          display: block;
          margin-top: 4px;
          color: #64748B;
          font-size: 10.2px;
          line-height: 1.35;
        }
        .rel-grid-two {
          display: grid;
          grid-template-columns: minmax(0, 1.25fr) minmax(390px, 0.75fr);
          gap: 14px;
          align-items: stretch;
        }
        .rel-grid-cleaning {
          display: grid;
          grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
          gap: 14px;
          align-items: stretch;
        }
        .rel-card {
          margin: 0;
          overflow: hidden;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 13px;
          padding: 13px 14px;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
        }
        .rel-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 7px;
        }
        .rel-card-title {
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }
        .rel-card-title h3 {
          margin: 0;
          color: #0F172A;
          font-size: 0.88rem;
          line-height: 1.35;
        }
        .rel-card-title p {
          margin: 3px 0 0;
          color: #64748B;
          font-size: 10.5px;
          line-height: 1.45;
        }
        .rel-badge {
          flex: 0 0 auto;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 8px;
          border-radius: 999px;
          color: #475569;
          background: #F1F5F9;
          font-size: 9.8px;
          font-weight: 800;
        }
        .rel-heatmap-scroll {
          width: 100%;
          overflow-x: hidden;
        }
        .rel-heatmap-svg {
          width: 100%;
          height: auto;
          display: block;
        }
        .rel-heatmap-cell {
          cursor: pointer;
          opacity: 0;
          transform-box: fill-box;
          transform-origin: center;
          animation: relCellEnter 340ms ease-out forwards;
        }
        .rel-heatmap-column-text {
          font-size: 10px;
          font-weight: 850;
        }
        .rel-heatmap-row-label {
          fill: #334155;
          font-size: 10.6px;
          font-weight: 800;
        }
        .rel-legend {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 7px 10px;
          padding-top: 8px;
          border-top: 1px solid #EEF2F7;
          color: #64748B;
          font-size: 10.3px;
        }
        .rel-legend-scale {
          width: 110px;
          height: 8px;
          border-radius: 999px;
          background: linear-gradient(90deg, hsl(214 78% 47%), #F8FAFC, hsl(8 78% 47%));
        }
        .rel-factor-toggle,
        .rel-mode-toggle {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 5px;
        }
        .rel-factor-toggle .toggle-btn,
        .rel-mode-toggle .toggle-btn {
          padding: 5px 8px;
          font-size: 10px;
        }
        .rel-chart-frame { width: 100%; height: 315px; }
        .rel-cleaning-frame { width: 100%; height: 295px; }
        .rel-ranking-frame { width: 100%; height: 330px; }
        .rel-chart-note {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 8px 12px;
          padding-top: 7px;
          color: #64748B;
          font-size: 10.3px;
        }
        .rel-chart-note strong { color: #334155; }
        .rel-insight-box {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 12px;
          border: 1px solid #C7D2FE;
          background: linear-gradient(135deg, #EEF2FF 0%, #FFFFFF 80%);
        }
        .rel-insight-icon {
          width: 32px;
          height: 32px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border-radius: 9px;
          color: #6D28D9;
          background: #EDE9FE;
        }
        .rel-insight-content h3 {
          margin: 0 0 5px;
          color: #312E81;
          font-size: 0.82rem;
        }
        .rel-insight-content p {
          margin: 2px 0;
          color: #475569;
          font-size: 10.8px;
          line-height: 1.48;
        }
        @media (prefers-reduced-motion: reduce) {
          .rel-tab,
          .rel-heatmap-cell {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
        @media (max-width: 1180px) {
          .rel-kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .rel-grid-two,
          .rel-grid-cleaning { grid-template-columns: 1fr; }
          .rel-filter-actions { margin-left: 0; }
        }
        @media (max-width: 760px) {
          .rel-filter-bar { align-items: stretch; }
          .rel-filter-bar .filter-group { width: 100%; }
          .rel-filter-actions { width: 100%; justify-content: space-between; }
          .rel-kpi-grid { grid-template-columns: 1fr; }
          .rel-card-header { flex-direction: column; }
          .rel-factor-toggle,
          .rel-mode-toggle { justify-content: flex-start; }
        }
      `}</style>
      <section className="rel-filter-bar">
        <div className="filter-group">
          <label className="filter-label" htmlFor="rel-region">Phân vùng</label>
          <select
            id="rel-region"
            className="filter-select"
            value={regionScope}
            onChange={event => {
              setRegionScope(event.target.value);
              setProvinceScope('all');
            }}
          >
            <option value="all">Tất cả các vùng</option>
            {REGIONS.map(region => <option key={region} value={region}>{region}</option>)}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label" htmlFor="rel-province">Tỉnh / Thành phố</label>
          <select
            id="rel-province"
            className="filter-select"
            value={provinceScope}
            onChange={event => setProvinceScope(event.target.value)}
          >
            <option value="all">Tất cả tỉnh/thành</option>
            {filteredProvinces.map(province => (
              <option key={province} value={province}>{province}</option>
            ))}
          </select>
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
            <input type="date" className="filter-date-input" value={customStart} onChange={event => setCustomStart(event.target.value)} />
            <span className="date-sep">đến</span>
            <input type="date" className="filter-date-input" value={customEnd} onChange={event => setCustomEnd(event.target.value)} />
          </div>
        )}

        <div className="rel-filter-actions">
          <button type="button" className="toggle-btn" onClick={resetAllFilters}>
            <Filter size={14} /> Xóa lọc
          </button>
          <span className="chart-subtitle-badge">{filteredRows.length.toLocaleString('vi-VN')} quan sát</span>
        </div>
      </section>

      <section className="rel-kpi-grid">
        <article className="rel-kpi-card">
          <div className="rel-kpi-icon"><Gauge size={18} /></div>
          <div className="rel-kpi-copy">
            <span className="rel-kpi-label">Yếu tố liên hệ rõ nhất</span>
            <span className="rel-kpi-value">{strongestFactor?.fullLabel || 'Chưa đủ dữ liệu'}</span>
            <span className="rel-kpi-note">
              {strongestFactor
                ? `r = ${strongestFactor.correlation.toFixed(2)} · ${correlationDirection(strongestFactor.correlation)}`
                : 'Không đủ quan sát hợp lệ'}
            </span>
          </div>
        </article>

        <article className="rel-kpi-card">
          <div className="rel-kpi-icon"><MapPinned size={18} /></div>
          <div className="rel-kpi-copy">
            <span className="rel-kpi-label">Mối liên hệ nổi bật theo vùng</span>
            <span className="rel-kpi-value">{strongestRegionCell?.region || 'Chưa đủ dữ liệu'}</span>
            <span className="rel-kpi-note">
              {strongestRegionCell
                ? `${strongestRegionCell.factor.label} · r = ${strongestRegionCell.correlation.toFixed(2)}`
                : 'Không đủ quan sát theo vùng'}
            </span>
          </div>
        </article>

        <article className="rel-kpi-card">
          <div className="rel-kpi-icon"><CloudRain size={18} /></div>
          <div className="rel-kpi-copy">
            <span className="rel-kpi-label">Chênh lệch khi có mưa</span>
            <span className="rel-kpi-value">
              {rainEffect
                ? `${rainEffect.reduction >= 0 ? 'Giảm' : 'Tăng'} ${formatNumber(Math.abs(rainEffect.reduction), 1)} điểm AQI`
                : 'Chưa đủ dữ liệu'}
            </span>
            <span className="rel-kpi-note">
              {rainEffect
                ? `Khô ${formatNumber(rainEffect.baselineMedian, 1)} → Mưa ${formatNumber(rainEffect.cleanMedian, 1)}`
                : `Cần tối thiểu ${MIN_PROVINCE_GROUP_ROWS} quan sát mỗi nhóm`}
            </span>
          </div>
        </article>

        <article className="rel-kpi-card">
          <div className="rel-kpi-icon"><BarChart3 size={18} /></div>
          <div className="rel-kpi-copy">
            <span className="rel-kpi-label">Tỉnh có mức giảm lớn nhất</span>
            <span className="rel-kpi-value">{strongestProvince?.province || 'Chưa đủ dữ liệu'}</span>
            <span className="rel-kpi-note">
              {strongestProvince
                ? `${formatSigned(strongestProvince.effect.reduction, 1)} điểm · ${formatSigned(strongestProvince.effect.reductionPercent, 1)}%`
                : 'Phụ thuộc chế độ xếp hạng đang chọn'}
            </span>
          </div>
        </article>
      </section>

      <section className="rel-grid-two">
        <figure className="rel-card">
          <div className="rel-card-header">
            <div className="rel-card-title">
              <MapPinned size={17} color="#2563EB" />
              <div>
                <h3>Câu 6 · Yếu tố nào liên hệ rõ nhất với AQI ở từng vùng?</h3>
                <p>Mỗi ô là hệ số tương quan giữa một yếu tố thời tiết và AQI trong vùng tương ứng.</p>
              </div>
            </div>
            <span className="rel-badge">Bấm cột để khám phá</span>
          </div>

          <RegionFactorHeatmap
            rows={regionHeatmapRows}
            selectedFactor={selectedFactor}
            onSelectFactor={setSelectedFactor}
            animationKey={`${dataAnimationKey}-heatmap`}
          />

          <div className="rel-legend">
            <strong style={{ color: '#334155' }}>AQI giảm</strong>
            <div className="rel-legend-scale" />
            <strong style={{ color: '#334155' }}>AQI tăng</strong>
            <span>Màu đậm hơn = mối liên hệ rõ hơn.</span>
          </div>
        </figure>

        <figure className="rel-card">
          <div className="rel-card-header">
            <div className="rel-card-title">
              <Activity size={17} color="#0EA5E9" />
              <div>
                <h3>AQI thay đổi thế nào khi {selectedMetric.label.toLowerCase()} tăng?</h3>
                <p>So sánh AQI trung vị theo 5 mức của yếu tố được chọn.</p>
              </div>
            </div>
            <div className="rel-factor-toggle">
              {WEATHER_FACTORS.map(factor => (
                <button
                  key={factor.key}
                  type="button"
                  className={`toggle-btn ${selectedFactor === factor.key ? 'active' : ''}`}
                  onClick={() => setSelectedFactor(factor.key)}
                >
                  {factor.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rel-chart-frame">
            {trendData.length ? (
              <ResponsiveContainer>
                <LineChart data={trendData} margin={{ top: 18, right: 18, bottom: 16, left: 0 }}>
                  <CartesianGrid stroke="#E2E8F0" vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="level"
                    tick={{ fontSize: 10.5, fill: '#475569', fontWeight: 700 }}
                    axisLine={{ stroke: '#CBD5E1' }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={['auto', 'auto']}
                    tick={{ fontSize: 10.5, fill: '#64748B' }}
                    axisLine={false}
                    tickLine={false}
                    width={46}
                    label={{ value: 'AQI trung vị', angle: -90, position: 'insideLeft', offset: 7, fill: '#64748B', fontSize: 10 }}
                  />
                  <ReferenceLine y={BAD_AQI_THRESHOLD} stroke="#F59E0B" strokeDasharray="5 4" label={{ value: 'AQI 100', position: 'insideTopRight', fill: '#B45309', fontSize: 9.5 }} />
                  <RechartsTooltip content={<TrendTooltip factor={selectedMetric} />} />
                  <Line
                    type="monotone"
                    dataKey="aqiMedian"
                    stroke="#0284C7"
                    strokeWidth={3}
                    dot={{ r: 5, fill: '#0284C7', stroke: '#FFFFFF', strokeWidth: 2 }}
                    activeDot={{ r: 7 }}
                    isAnimationActive
                    animationDuration={850}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="overview-empty"><p>Không đủ dữ liệu để chia thành các nhóm.</p></div>
            )}
          </div>

          <div className="rel-chart-note">
            <span><strong>Phạm vi:</strong> {scopeLabel}</span>
            <span>
              <strong>Từ mức rất thấp đến rất cao:</strong>{' '}
              {Number.isFinite(trendChange)
                ? `${trendChange >= 0 ? 'AQI giảm' : 'AQI tăng'} ${formatNumber(Math.abs(trendChange), 1)} điểm`
                : 'N/A'}
            </span>
          </div>
        </figure>
      </section>

      <section className="rel-grid-cleaning">
        <figure className="rel-card">
          <div className="rel-card-header">
            <div className="rel-card-title">
              <Wind size={17} color="#059669" />
              <div>
                <h3>Câu 7 · Mưa và gió mạnh có đi kèm AQI thấp hơn không?</h3>
                <p>So sánh bốn tổ hợp thời tiết bằng AQI trung vị.</p>
              </div>
            </div>
            <span className="rel-badge">Mưa ≥ {RAIN_THRESHOLD} mm</span>
          </div>

          <div className="rel-cleaning-frame">
            {cleaningComparison.groups.some(group => Number.isFinite(group.aqiMedian)) ? (
              <ResponsiveContainer>
                <BarChart data={cleaningComparison.groups} margin={{ top: 18, right: 10, bottom: 24, left: 0 }}>
                  <CartesianGrid stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="shortLabel"
                    interval={0}
                    tick={{ fontSize: 9.8, fill: '#475569', fontWeight: 700 }}
                    axisLine={{ stroke: '#CBD5E1' }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 'auto']}
                    tick={{ fontSize: 10.5, fill: '#64748B' }}
                    axisLine={false}
                    tickLine={false}
                    width={44}
                  />
                  <ReferenceLine y={BAD_AQI_THRESHOLD} stroke="#F59E0B" strokeDasharray="5 4" />
                  <RechartsTooltip content={<CleaningTooltip />} cursor={{ fill: '#F8FAFC' }} />
                  <Bar
                    dataKey="aqiMedian"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={62}
                    isAnimationActive
                    animationDuration={850}
                  >
                    {cleaningComparison.groups.map(group => (
                      <Cell
                        key={group.key}
                        fill={group.key === 'dryWeak' ? '#94A3B8' : '#10B981'}
                        fillOpacity={Number.isFinite(group.aqiMedian) ? 1 : 0.22}
                      />
                    ))}
                    <LabelList
                      dataKey="aqiMedian"
                      position="top"
                      formatter={value => Number.isFinite(value) ? value.toFixed(1) : ''}
                      style={{ fill: '#334155', fontSize: 10, fontWeight: 800 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="overview-empty"><p>Không đủ dữ liệu để tạo bốn tổ hợp gió – mưa.</p></div>
            )}
          </div>

          <div className="rel-chart-note">
            <span>
              <strong>Gió yếu:</strong> ≤ {formatValue(cleaningComparison.windLowThreshold, ' km/h')}
            </span>
            <span>
              <strong>Gió mạnh:</strong> ≥ {formatValue(cleaningComparison.windHighThreshold, ' km/h')}
            </span>
          </div>
        </figure>

        <figure className="rel-card">
          <div className="rel-card-header">
            <div className="rel-card-title">
              <BarChart3 size={17} color="#7C3AED" />
              <div>
                <h3>Tỉnh nào có mức giảm AQI quan sát được lớn nhất?</h3>
                <p>So sánh mức chênh lệch AQI giữa điều kiện nền và điều kiện thời tiết được chọn.</p>
              </div>
            </div>
            <div className="rel-mode-toggle">
              <button type="button" className={`toggle-btn ${cleaningMode === 'wind' ? 'active' : ''}`} onClick={() => setCleaningMode('wind')}>Gió</button>
              <button type="button" className={`toggle-btn ${cleaningMode === 'rain' ? 'active' : ''}`} onClick={() => setCleaningMode('rain')}>Mưa</button>
              <button type="button" className={`toggle-btn ${cleaningMode === 'combined' ? 'active' : ''}`} onClick={() => setCleaningMode('combined')}>Gió + mưa</button>
            </div>
          </div>

          <div className="rel-ranking-frame">
            {provinceRanking.length ? (
              <ResponsiveContainer>
                <BarChart
                  data={provinceRanking}
                  layout="vertical"
                  margin={{ top: 8, right: 58, bottom: 10, left: 22 }}
                  barCategoryGap={9}
                >
                  <CartesianGrid stroke="#E2E8F0" horizontal={false} strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    domain={['auto', 'auto']}
                    tick={{ fontSize: 10, fill: '#64748B' }}
                    axisLine={{ stroke: '#CBD5E1' }}
                    tickFormatter={value => Number(value).toFixed(0)}
                  />
                  <YAxis
                    type="category"
                    dataKey="province"
                    width={102}
                    tick={{ fontSize: 10.3, fill: '#334155', fontWeight: 750 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <ReferenceLine x={0} stroke="#64748B" strokeWidth={1.2} />
                  <RechartsTooltip content={<ProvinceTooltip mode={cleaningMode} />} cursor={{ fill: '#F8FAFC' }} />
                  <Bar
                    dataKey="reduction"
                    radius={[0, 5, 5, 0]}
                    maxBarSize={22}
                    isAnimationActive
                    animationDuration={900}
                  >
                    {provinceRanking.map(item => (
                      <Cell key={item.province} fill={cleaningColor(item.reduction)} />
                    ))}
                    <LabelList dataKey="reduction" content={<ProvinceBarLabel />} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="overview-empty">
                <p>Chưa đủ dữ liệu ở cấp tỉnh cho hai nhóm điều kiện đang so sánh.</p>
              </div>
            )}
          </div>

          <div className="rel-chart-note">
            <span><strong>Xếp hạng theo:</strong> mức giảm AQI trung vị</span>
            <span><strong>Phạm vi:</strong> tối đa 10 tỉnh đủ dữ liệu</span>
          </div>
        </figure>
      </section>
    </div>
  );
};

export default RelationshipAnalysisTab;