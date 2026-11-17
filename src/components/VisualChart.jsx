import React, { useState, useMemo } from 'react';
import { BarChart3, PieChart } from 'lucide-react';

const PALETTE = [
  '#6366f1', // Indigo
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#3b82f6', // Blue
  '#14b8a6', // Teal
  '#f97316', // Orange
  '#84cc16'  // Lime
];

export default function VisualChart({ queryResults }) {
  const [chartType, setChartType] = useState('horizontal'); // 'horizontal' | 'vertical' | 'donut'
  const [selectedLabelCol, setSelectedLabelCol] = useState(null);
  const [selectedValueCol, setSelectedValueCol] = useState(null);

  const columns = useMemo(() => queryResults?.columns || [], [queryResults]);
  const rows = useMemo(() => queryResults?.rows || [], [queryResults]);

  // Identify numeric columns
  const numericColumns = useMemo(() => {
    if (!rows.length || !columns.length) return [];
    return columns.filter((_, colIdx) => {
      return rows.some(row => typeof row[colIdx] === 'number');
    });
  }, [columns, rows]);

  // Identify text/category columns
  const categoryColumns = useMemo(() => {
    return columns.filter(col => !numericColumns.includes(col));
  }, [columns, numericColumns]);

  // Default active columns
  const activeLabelCol = selectedLabelCol || categoryColumns[0] || columns[0] || '';
  const activeValueCol = selectedValueCol || numericColumns[0] || columns[1] || '';

  const labelColIdx = columns.indexOf(activeLabelCol);
  const valueColIdx = columns.indexOf(activeValueCol);

  // Compute parsed chart data
  const data = useMemo(() => {
    if (labelColIdx === -1 || valueColIdx === -1 || !rows.length) return null;

    const items = rows.map((row, idx) => {
      const rawVal = row[valueColIdx];
      const numVal = Number(rawVal) || 0;
      const label = String(row[labelColIdx] ?? `Item ${idx + 1}`);
      return {
        label,
        value: numVal,
        color: PALETTE[idx % PALETTE.length]
      };
    });

    const values = items.map(i => i.value);
    const sum = values.reduce((a, b) => a + b, 0);
    const max = Math.max(...values, 1);
    const avg = sum / (items.length || 1);

    return {
      items,
      sum,
      max,
      avg
    };
  }, [rows, labelColIdx, valueColIdx]);

  // SVG Donut calculation - called before any return
  const donutSlices = useMemo(() => {
    if (!data || chartType !== 'donut' || !data.sum) return [];
    let cumulativeAngle = 0;
    return data.items.slice(0, 10).map(item => {
      const percentage = (item.value / data.sum) * 100;
      const angle = (percentage / 100) * 360;
      const startAngle = cumulativeAngle;
      cumulativeAngle += angle;
      return {
        ...item,
        percentage: percentage.toFixed(1),
        startAngle,
        angle
      };
    });
  }, [chartType, data]);

  if (!data || !data.items.length) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-subtle)' }}>
        No numeric data available to visualize. Select a query with metric aggregations (e.g. SUM, COUNT, AVG).
      </div>
    );
  }

  return (
    <div className="chart-container animate-fade-in">
      {/* Chart Controls Bar */}
      <div className="chart-controls-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Chart Type Selector */}
          <div className="view-switcher">
            <button 
              className={`view-btn ${chartType === 'horizontal' ? 'active' : ''}`}
              onClick={() => setChartType('horizontal')}
              title="Horizontal Bar Chart"
            >
              <BarChart3 size={13} style={{ transform: 'rotate(90deg)', marginRight: '3px' }} />
              Bar
            </button>
            <button 
              className={`view-btn ${chartType === 'vertical' ? 'active' : ''}`}
              onClick={() => setChartType('vertical')}
              title="Vertical Column Chart"
            >
              <BarChart3 size={13} style={{ marginRight: '3px' }} />
              Column
            </button>
            <button 
              className={`view-btn ${chartType === 'donut' ? 'active' : ''}`}
              onClick={() => setChartType('donut')}
              title="Donut Distribution Chart"
            >
              <PieChart size={13} style={{ marginRight: '3px' }} />
              Donut
            </button>
          </div>

          {/* Dimension (Category / X-Axis) Picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span>Category:</span>
            <select 
              className="chart-col-select"
              value={activeLabelCol}
              onChange={(e) => setSelectedLabelCol(e.target.value)}
            >
              {columns.map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>

          {/* Metric (Value / Y-Axis) Picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span>Metric:</span>
            <select 
              className="chart-col-select"
              value={activeValueCol}
              onChange={(e) => setSelectedValueCol(e.target.value)}
            >
              {(numericColumns.length > 0 ? numericColumns : columns).map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Aggregate Summary */}
        <div className="chart-quick-stats">
          <div>Total: <strong className="font-mono">{data.sum.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong></div>
          <div>Avg: <strong className="font-mono">{data.avg.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong></div>
        </div>
      </div>

      {/* Render Chart Mode 1: Horizontal Bar Chart */}
      {chartType === 'horizontal' && (
        <div className="chart-horizontal-grid">
          {data.items.map((item, idx) => {
            const pct = Math.max(Math.round((item.value / data.max) * 100), 2);
            const shareOfTotal = data.sum > 0 ? ((item.value / data.sum) * 100).toFixed(1) : '0';

            return (
              <div key={idx} className="chart-bar-row">
                <div className="chart-bar-label">
                  <span className="chart-bar-title" title={item.label}>
                    <span className="chart-color-dot" style={{ backgroundColor: item.color }}></span>
                    {item.label}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>({shareOfTotal}%)</span>
                    <span style={{ fontWeight: 600, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                      {item.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
                <div className="chart-bar-track">
                  <div 
                    className="chart-bar-fill" 
                    style={{ 
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, ${item.color} 0%, var(--accent-cyan) 100%)`
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Render Chart Mode 2: Vertical Column Chart */}
      {chartType === 'vertical' && (
        <div className="chart-vertical-wrapper">
          <div className="chart-vertical-bars">
            {data.items.slice(0, 16).map((item, idx) => {
              const heightPct = Math.max(Math.round((item.value / data.max) * 100), 3);
              return (
                <div key={idx} className="chart-column-item" title={`${item.label}: ${item.value}`}>
                  <div className="chart-column-val">
                    {item.value >= 1000 ? `${(item.value / 1000).toFixed(1)}k` : item.value.toFixed(0)}
                  </div>
                  <div className="chart-column-track">
                    <div 
                      className="chart-column-fill" 
                      style={{ 
                        height: `${heightPct}%`,
                        backgroundColor: item.color 
                      }} 
                    />
                  </div>
                  <div className="chart-column-label" title={item.label}>
                    {item.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Render Chart Mode 3: SVG Donut Chart with Legend */}
      {chartType === 'donut' && (
        <div className="donut-chart-view">
          <div className="donut-svg-wrapper">
            <svg viewBox="0 0 160 160" className="donut-svg" width="160" height="160">
              {donutSlices.reduce((acc, slice, idx) => {
                const strokeDash = `${(slice.percentage / 100) * 314.15} 314.15`;
                const strokeDashOffset = -((slice.startAngle / 360) * 314.15);
                acc.elements.push(
                  <circle
                    key={idx}
                    cx="80"
                    cy="80"
                    r="50"
                    fill="transparent"
                    stroke={slice.color}
                    strokeWidth="24"
                    strokeDasharray={strokeDash}
                    strokeDashoffset={strokeDashOffset}
                    style={{ transition: 'stroke-dasharray 0.5s ease' }}
                  />
                );
                return acc;
              }, { elements: [] }).elements}
            </svg>
            <div className="donut-center-text">
              <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>Total</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                {data.sum >= 1000000 
                  ? `${(data.sum / 1000000).toFixed(1)}M` 
                  : data.sum >= 1000 
                    ? `${(data.sum / 1000).toFixed(1)}K` 
                    : data.sum.toFixed(0)}
              </div>
            </div>
          </div>

          {/* Donut Legend */}
          <div className="donut-legend-grid">
            {donutSlices.map((slice, idx) => (
              <div key={idx} className="donut-legend-row">
                <span className="chart-color-dot" style={{ backgroundColor: slice.color }}></span>
                <span className="donut-legend-label" title={slice.label}>{slice.label}</span>
                <span className="donut-legend-pct">{slice.percentage}%</span>
                <span className="donut-legend-val font-mono">{slice.value.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
