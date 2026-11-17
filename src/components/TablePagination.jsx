import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  Calculator, 
  ChevronDown, 
  ChevronUp
} from 'lucide-react';

export default function TablePagination({
  totalRows,
  pageSize,
  currentPage,
  onPageChange,
  onPageSizeChange,
  columns,
  allRows
}) {
  const [showStats, setShowStats] = useState(false);

  const totalPages = pageSize === 'all' ? 1 : Math.ceil(totalRows / Number(pageSize));
  const startRow = pageSize === 'all' ? 1 : totalRows === 0 ? 0 : (currentPage - 1) * Number(pageSize) + 1;
  const endRow = pageSize === 'all' ? totalRows : Math.min(currentPage * Number(pageSize), totalRows);

  // Compute column statistics for numeric columns
  const columnStats = useMemo(() => {
    if (!allRows || !allRows.length || !columns || !columns.length) return [];

    return columns.map((col, idx) => {
      const numericValues = allRows
        .map(r => r[idx])
        .filter(val => typeof val === 'number' && !isNaN(val));

      if (numericValues.length === 0) return null;

      const sum = numericValues.reduce((a, b) => a + b, 0);
      const avg = sum / numericValues.length;
      const min = Math.min(...numericValues);
      const max = Math.max(...numericValues);

      return {
        column: col,
        count: numericValues.length,
        sum,
        avg,
        min,
        max
      };
    }).filter(Boolean);
  }, [columns, allRows]);

  return (
    <div className="table-pagination-container">
      {/* Quick Summary Stats Drawer (Expandable) */}
      {columnStats.length > 0 && (
        <div className="stats-drawer-wrapper">
          <button 
            className="btn-stats-toggle"
            onClick={() => setShowStats(!showStats)}
            title="Toggle quick aggregation stats for numeric columns"
          >
            <Calculator size={13} />
            <span>Column Aggregates ({columnStats.length} metrics)</span>
            {showStats ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {showStats && (
            <div className="stats-grid animate-fade-in">
              {columnStats.map(stat => (
                <div key={stat.column} className="stat-card">
                  <div className="stat-card-title">{stat.column}</div>
                  <div className="stat-card-metrics">
                    <div>
                      <span className="stat-lbl">Sum:</span>
                      <span className="stat-val font-mono">
                        {stat.sum.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div>
                      <span className="stat-lbl">Avg:</span>
                      <span className="stat-val font-mono">
                        {stat.avg.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div>
                      <span className="stat-lbl">Min:</span>
                      <span className="stat-val font-mono">
                        {stat.min.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div>
                      <span className="stat-lbl">Max:</span>
                      <span className="stat-val font-mono">
                        {stat.max.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pagination Controls */}
      <div className="table-pagination-bar">
        <div className="pagination-info">
          <span>
            Showing <strong>{startRow}</strong> to <strong>{endRow}</strong> of <strong>{totalRows}</strong> rows
          </span>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: '1rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-subtle)' }}>Rows per page:</span>
            <select
              className="page-size-select"
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(e.target.value);
                onPageChange(1);
              }}
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="all">All</option>
            </select>
          </div>
        </div>

        {pageSize !== 'all' && totalPages > 1 && (
          <div className="pagination-nav">
            <button
              className="page-nav-btn"
              onClick={() => onPageChange(1)}
              disabled={currentPage <= 1}
              title="First Page"
            >
              <ChevronsLeft size={14} />
            </button>
            <button
              className="page-nav-btn"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              title="Previous Page"
            >
              <ChevronLeft size={14} />
            </button>

            <span className="page-current-indicator">
              Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
            </span>

            <button
              className="page-nav-btn"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              title="Next Page"
            >
              <ChevronRight size={14} />
            </button>
            <button
              className="page-nav-btn"
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage >= totalPages}
              title="Last Page"
            >
              <ChevronsRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
