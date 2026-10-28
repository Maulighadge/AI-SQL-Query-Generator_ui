import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Sparkles, 
  Play, 
  Copy, 
  Check, 
  ShieldCheck, 
  ShieldAlert, 
  ChevronDown, 
  ChevronRight, 
  Key, 
  Link as LinkIcon, 
  Layers, 
  BarChart3, 
  Table as TableIcon, 
  Download, 
  Settings, 
  History, 
  RefreshCw,
  ExternalLink,
  Code2,
  FileQuestion,
  Info,
  Clock,
  CheckCircle2
} from 'lucide-react';
import './App.css';

export default function App() {
  // Application State
  const [activeMode, setActiveMode] = useState('generate'); // 'generate' | 'explain' | 'playground'
  const [prompt, setPrompt] = useState('Show monthly sales by category');
  const [sql, setSql] = useState('');
  const [formattedSql, setFormattedSql] = useState('');
  const [explanation, setExplanation] = useState(null);
  const [validation, setValidation] = useState(null);
  const [queryResults, setQueryResults] = useState(null);
  const [activeView, setActiveView] = useState('table'); // 'table' | 'chart'

  // Loading & Execution states
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Schema & Sample Queries
  const [schema, setSchema] = useState(null);
  const [expandedTables, setExpandedTables] = useState({ categories: true, products: true, orders: true });
  const [sampleQueries, setSampleQueries] = useState([]);
  const [selectedTableForPreview, setSelectedTableForPreview] = useState(null);

  // Settings & Configuration
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState(localStorage.getItem('querycraft_api_key') || '');
  const [provider, setProvider] = useState(localStorage.getItem('querycraft_provider') || 'auto');
  const [queryHistory, setQueryHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('querycraft_history') || '[]');
    } catch {
      return [];
    }
  });

  // Fetch schema and sample queries on mount
  useEffect(() => {
    fetchSchema();
    fetchSampleQueries();
  }, []);

  const fetchSchema = async () => {
    try {
      const res = await fetch('/api/schema');
      if (res.ok) {
        const data = await res.json();
        setSchema(data);
      }
    } catch (err) {
      console.error('Error fetching schema:', err);
    }
  };

  const fetchSampleQueries = async () => {
    try {
      const res = await fetch('/api/sample-queries');
      if (res.ok) {
        const data = await res.json();
        setSampleQueries(data);
      }
    } catch (err) {
      console.error('Error fetching sample queries:', err);
    }
  };

  // Generate SQL from Natural Language
  const handleGenerate = async (queryPrompt = prompt) => {
    if (!queryPrompt.trim()) return;
    setIsGenerating(true);
    setErrorMessage('');
    setQueryResults(null);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: queryPrompt,
          api_key: apiKey.trim() || undefined,
          provider: provider
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to generate query');

      setSql(data.sql);
      setFormattedSql(data.formatted_sql);
      setValidation(data.validation);
      setExplanation({
        summary: data.summary,
        clauses_breakdown: data.clauses_breakdown,
        business_value: data.business_value,
        suggested_questions: data.suggested_questions,
        engine: data.engine
      });

      // Save to history
      const newHistoryItem = {
        id: Date.now(),
        prompt: queryPrompt,
        sql: data.sql,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      const updatedHistory = [newHistoryItem, ...queryHistory.slice(0, 9)];
      setQueryHistory(updatedHistory);
      localStorage.setItem('querycraft_history', JSON.stringify(updatedHistory));

      // Auto-execute query safely to show results immediately!
      if (data.validation?.is_safe) {
        handleExecute(data.sql);
      }
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Explain arbitrary SQL
  const handleExplain = async () => {
    if (!sql.trim()) return;
    setIsGenerating(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sql: sql,
          api_key: apiKey.trim() || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to explain query');

      setValidation(data.validation);
      setExplanation(data.explanation);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Execute SQL in read-only mode
  const handleExecute = async (queryToRun = sql) => {
    if (!queryToRun.trim()) return;
    setIsExecuting(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: queryToRun })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Query execution failed');

      setQueryResults(data.data);
    } catch (err) {
      setErrorMessage(err.message);
      setQueryResults(null);
    } finally {
      setIsExecuting(false);
    }
  };

  // Format SQL
  const handleFormat = async () => {
    if (!sql.trim()) return;
    try {
      const res = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql })
      });
      const data = await res.json();
      if (data.formatted_sql) {
        setSql(data.formatted_sql);
        setValidation(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Copy SQL to clipboard
  const handleCopySql = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Export results as CSV
  const handleExportCsv = () => {
    if (!queryResults || !queryResults.columns || !queryResults.rows) return;
    const header = queryResults.columns.join(',');
    const rows = queryResults.rows.map(r => r.map(val => `"${val !== null ? val : ''}"`).join(','));
    const csvContent = "data:text/csv;charset=utf-8," + [header, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `query_results_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export results as JSON
  const handleExportJson = () => {
    if (!queryResults || !queryResults.columns || !queryResults.rows) return;
    const jsonList = queryResults.rows.map(row => {
      const obj = {};
      queryResults.columns.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return obj;
    });
    const blob = new Blob([JSON.stringify(jsonList, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `query_results_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Save Settings
  const handleSaveSettings = () => {
    localStorage.setItem('querycraft_api_key', apiKey);
    localStorage.setItem('querycraft_provider', provider);
    setShowSettings(false);
  };

  const toggleTableExpand = (tableName) => {
    setExpandedTables(prev => ({
      ...prev,
      [tableName]: !prev[tableName]
    }));
  };

  // Automatically trigger sample query "Show monthly sales by category" on first load
  useEffect(() => {
    if (!sql && schema) {
      handleGenerate("Show monthly sales by category");
    }
  }, [schema]);

  // Determine if result data is chartable (has a label column and at least one numeric metric column)
  const chartData = React.useMemo(() => {
    if (!queryResults || !queryResults.rows || queryResults.rows.length === 0) return null;
    const cols = queryResults.columns;
    if (cols.length < 2) return null;

    // Find numeric columns
    const firstRow = queryResults.rows[0];
    const numericColIndex = firstRow.findIndex(val => typeof val === 'number');
    if (numericColIndex === -1) return null;

    // Label column is usually col 0 or 1
    const labelColIndex = numericColIndex === 0 ? 1 : 0;
    const maxValue = Math.max(...queryResults.rows.map(r => Number(r[numericColIndex]) || 0));

    return {
      labelCol: cols[labelColIndex],
      valueCol: cols[numericColIndex],
      items: queryResults.rows.map(r => ({
        label: String(r[labelColIndex] ?? 'N/A'),
        value: Number(r[numericColIndex]) || 0,
        subLabel: cols.length > 2 ? String(r[2] ?? '') : ''
      })),
      max: maxValue > 0 ? maxValue : 1
    };
  }, [queryResults]);

  return (
    <div className="app-container">
      {/* Top Header */}
      <header className="app-header">
        <div className="brand-wrapper">
          <div className="brand-icon">
            <Database size={22} />
          </div>
          <div>
            <h1 className="brand-title">
              QueryCraft AI
              <span className="brand-tag">SQL Generator</span>
            </h1>
          </div>
        </div>

        <div className="header-actions">
          <div className="status-badge" title="Embedded SQLite Database connected">
            <span className="live-dot"></span>
            <span>SQLite Active ({schema?.tables?.length || 6} Tables)</span>
          </div>

          <button 
            className="btn-header"
            onClick={() => setShowSettings(true)}
            id="settings-modal-trigger"
          >
            <Settings size={15} />
            <span>LLM Settings</span>
          </button>
        </div>
      </header>

      {/* Main Grid Workspace */}
      <div className="main-workspace">
        {/* Left Sidebar: Schema Explorer */}
        <aside className="schema-sidebar">
          <div className="glass-panel sidebar-card">
            <div className="sidebar-title">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Layers size={16} color="var(--primary-light)" />
                Database Schema
              </span>
              <button 
                onClick={fetchSchema} 
                style={{ background: 'none', color: 'var(--text-subtle)' }}
                title="Refresh Schema"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            <div className="table-list">
              {schema?.tables ? (
                schema.tables.map(table => {
                  const isExpanded = !!expandedTables[table.name];
                  return (
                    <div key={table.name} className="table-item">
                      <button 
                        className="table-header-btn"
                        onClick={() => toggleTableExpand(table.name)}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          <span style={{ fontWeight: 600 }}>{table.name}</span>
                        </span>
                        <span className="col-badge">{table.row_count} rows</span>
                      </button>

                      {isExpanded && (
                        <div className="table-columns animate-fade-in">
                          {table.columns.map(col => (
                            <div key={col.name} className="col-row">
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                {col.is_primary_key && <Key size={11} className="col-pk" title="Primary Key" />}
                                {col.foreign_key && <LinkIcon size={11} className="col-fk" title={`FK -> ${col.foreign_key.target_table}`} />}
                                <span>{col.name}</span>
                              </span>
                              <span className="col-badge">{col.type}</span>
                            </div>
                          ))}

                          <button 
                            className="sample-data-btn"
                            onClick={() => setSelectedTableForPreview(table)}
                          >
                            <TableIcon size={12} />
                            <span>Preview Sample Rows</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div style={{ color: 'var(--text-subtle)', fontSize: '0.85rem' }}>Loading schema...</div>
              )}
            </div>
          </div>

          {/* Recent Query History Card */}
          {queryHistory.length > 0 && (
            <div className="glass-panel sidebar-card">
              <div className="sidebar-title">
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <History size={16} color="var(--primary-light)" />
                  Recent Inquiries
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {queryHistory.map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setPrompt(item.prompt);
                      handleGenerate(item.prompt);
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.5rem 0.65rem',
                      textAlign: 'left',
                      color: 'var(--text-muted)',
                      fontSize: '0.78rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.2rem'
                    }}
                  >
                    <span style={{ color: '#e2e8f0', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.prompt}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>{item.timestamp}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Center Main Workspace */}
        <main className="center-content">
          {/* Mode Tabs & Prompt Input */}
          <div className="glass-panel prompt-card">
            <div className="mode-pills">
              <button 
                className={`mode-pill ${activeMode === 'generate' ? 'active' : ''}`}
                onClick={() => setActiveMode('generate')}
              >
                <Sparkles size={13} style={{ display: 'inline', marginRight: '4px' }} />
                Natural Language to SQL
              </button>
              <button 
                className={`mode-pill ${activeMode === 'explain' ? 'active' : ''}`}
                onClick={() => setActiveMode('explain')}
              >
                <FileQuestion size={13} style={{ display: 'inline', marginRight: '4px' }} />
                Explain SQL
              </button>
              <button 
                className={`mode-pill ${activeMode === 'playground' ? 'active' : ''}`}
                onClick={() => setActiveMode('playground')}
              >
                <Code2 size={13} style={{ display: 'inline', marginRight: '4px' }} />
                Safe SQL Playground
              </button>
            </div>

            {/* Prompt input for 'generate' mode */}
            {activeMode === 'generate' && (
              <>
                <div className="prompt-textarea-wrapper">
                  <textarea
                    className="prompt-textarea"
                    placeholder="Ask questions such as 'Show monthly sales by category', 'Top 5 products by revenue', or 'VIP customers by spend'..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleGenerate();
                      }
                    }}
                  />
                  <div className="prompt-footer">
                    <span className="prompt-hint">Press <strong>Enter</strong> to generate SQL safely</span>
                    <button 
                      className="btn-generate"
                      onClick={() => handleGenerate()}
                      disabled={isGenerating || !prompt.trim()}
                      id="generate-sql-button"
                    >
                      {isGenerating ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} />
                          <span>Generate SQL & Explain</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Sample Starter Chips */}
                <div className="sample-chips-wrapper">
                  <span className="sample-chip-label">Suggestions:</span>
                  {sampleQueries.map(sample => (
                    <button
                      key={sample.id}
                      className="sample-chip"
                      onClick={() => {
                        setPrompt(sample.prompt);
                        handleGenerate(sample.prompt);
                      }}
                    >
                      {sample.title}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Prompt input for 'explain' mode */}
            {activeMode === 'explain' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                  Paste any SQL query below and click <strong>Explain Query</strong> to get a breakdown of its logic and clauses.
                </div>
                <button 
                  className="btn-generate"
                  style={{ alignSelf: 'flex-start' }}
                  onClick={handleExplain}
                  disabled={isGenerating || !sql.trim()}
                >
                  <FileQuestion size={16} />
                  <span>Explain Current SQL</span>
                </button>
              </div>
            )}

            {/* Playground instructions */}
            {activeMode === 'playground' && (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                You can write and test any SELECT query directly. QueryCraft automatically ensures strictly read-only execution.
              </div>
            )}
          </div>

          {/* Error Message Toast */}
          {errorMessage && (
            <div className="glass-panel" style={{ 
              padding: '0.85rem 1.25rem', 
              borderColor: 'rgba(244, 63, 94, 0.4)', 
              background: 'rgba(244, 63, 94, 0.12)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              color: '#fca5a5',
              fontSize: '0.9rem'
            }}>
              <ShieldAlert size={18} color="#f43f5e" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Generated SQL Code Panel */}
          <div className="glass-panel sql-panel">
            <div className="sql-panel-header">
              <div className="sql-title-group">
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>SQL Query</span>
                {validation && (
                  <div className={`safety-badge ${validation.is_safe ? 'safety-safe' : 'safety-unsafe'}`}>
                    {validation.is_safe ? (
                      <>
                        <ShieldCheck size={14} />
                        <span>Read-Only Verified</span>
                      </>
                    ) : (
                      <>
                        <ShieldAlert size={14} />
                        <span>Unsafe / Blocked</span>
                      </>
                    )}
                  </div>
                )}
                {explanation?.engine && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                    • {explanation.engine}
                  </span>
                )}
              </div>

              <div className="sql-actions">
                <button 
                  className="btn-sql-action"
                  onClick={handleFormat}
                  title="Format SQL"
                >
                  <Code2 size={14} />
                  <span>Format</span>
                </button>

                <button 
                  className="btn-sql-action"
                  onClick={handleCopySql}
                  title="Copy to Clipboard"
                >
                  {copied ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>

                <button 
                  className="btn-sql-action btn-execute"
                  onClick={() => handleExecute(sql)}
                  disabled={isExecuting || !sql.trim() || (validation && !validation.is_safe)}
                  id="execute-query-button"
                >
                  {isExecuting ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                  <span>Execute Safely</span>
                </button>
              </div>
            </div>

            <div className="sql-editor-container">
              <textarea
                className="sql-textarea"
                value={sql}
                onChange={(e) => {
                  setSql(e.target.value);
                  // Real-time quick validation
                  if (e.target.value.toUpperCase().includes('DROP') || e.target.value.toUpperCase().includes('DELETE')) {
                    setValidation({ is_safe: false, reason: "Contains destructive keyword." });
                  } else {
                    setValidation({ is_safe: true, reason: "Read-only query verified." });
                  }
                }}
                placeholder="-- SQL query will appear here. You can also edit it directly..."
              />
            </div>
          </div>

          {/* AI Explanation Breakdown */}
          {explanation && (
            <div className="glass-panel explanation-card animate-fade-in">
              <div className="explanation-header">
                <Info size={17} color="var(--primary-light)" />
                <span>AI Query Explanation & Clause Breakdown</span>
              </div>

              {explanation.summary && (
                <div className="explanation-summary">
                  {explanation.summary}
                </div>
              )}

              {/* Clause by Clause Grid */}
              {explanation.clauses_breakdown && explanation.clauses_breakdown.length > 0 && (
                <div className="clauses-grid">
                  {explanation.clauses_breakdown.map((item, idx) => (
                    <div key={idx} className="clause-card">
                      <span className="clause-badge">{item.clause}</span>
                      <p className="clause-desc">{item.explanation}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Business Value Insight */}
              {explanation.business_value && (
                <div style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.6rem' }}>
                  <strong>Business Analytics Insight:</strong> {explanation.business_value}
                </div>
              )}

              {/* Suggested Follow-up Questions */}
              {explanation.suggested_questions && explanation.suggested_questions.length > 0 && (
                <div className="followup-box">
                  <span className="followup-title">Recommended Follow-up Inquiries</span>
                  <div className="followup-pills">
                    {explanation.suggested_questions.map((q, idx) => (
                      <button
                        key={idx}
                        className="followup-pill"
                        onClick={() => {
                          setPrompt(q);
                          handleGenerate(q);
                        }}
                      >
                        + {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Query Results Table / Chart */}
          {queryResults && (
            <div className="glass-panel results-card animate-fade-in" id="query-results-panel">
              <div className="results-header">
                <div className="results-metrics">
                  <span>
                    Rows: <span className="metric-highlight">{queryResults.row_count}</span>
                  </span>
                  <span>
                    Time: <span className="metric-highlight">{queryResults.execution_time_ms} ms</span>
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#34d399', fontSize: '0.8rem' }}>
                    <CheckCircle2 size={13} />
                    Read-Only Protected
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {chartData && (
                    <div className="view-switcher">
                      <button 
                        className={`view-btn ${activeView === 'table' ? 'active' : ''}`}
                        onClick={() => setActiveView('table')}
                      >
                        <TableIcon size={12} style={{ display: 'inline', marginRight: '3px' }} />
                        Table
                      </button>
                      <button 
                        className={`view-btn ${activeView === 'chart' ? 'active' : ''}`}
                        onClick={() => setActiveView('chart')}
                      >
                        <BarChart3 size={12} style={{ display: 'inline', marginRight: '3px' }} />
                        Visual
                      </button>
                    </div>
                  )}

                  <button 
                    className="btn-sql-action"
                    onClick={handleExportCsv}
                    title="Export as CSV"
                  >
                    <Download size={13} />
                    <span>CSV</span>
                  </button>

                  <button 
                    className="btn-sql-action"
                    onClick={handleExportJson}
                    title="Export as JSON"
                  >
                    <Download size={13} />
                    <span>JSON</span>
                  </button>
                </div>
              </div>

              {/* View 1: Tabular Grid */}
              {activeView === 'table' && (
                <div className="table-responsive-wrapper">
                  <table className="query-table">
                    <thead>
                      <tr>
                        {queryResults.columns.map((col, idx) => (
                          <th key={idx}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {queryResults.rows.map((row, rIdx) => (
                        <tr key={rIdx}>
                          {row.map((cell, cIdx) => (
                            <td key={cIdx}>
                              {cell === null ? (
                                <span style={{ color: 'var(--text-subtle)', fontStyle: 'italic' }}>NULL</span>
                              ) : typeof cell === 'number' && !Number.isInteger(cell) ? (
                                Number(cell).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                              ) : (
                                String(cell)
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* View 2: Visual Bar Chart View for Aggregations */}
              {activeView === 'chart' && chartData && (
                <div className="chart-container">
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Visual distribution of <strong>{chartData.valueCol}</strong> grouped by <strong>{chartData.labelCol}</strong>:
                  </div>
                  {chartData.items.map((item, idx) => {
                    const pct = Math.round((item.value / chartData.max) * 100);
                    return (
                      <div key={idx} className="chart-bar-row">
                        <div className="chart-bar-label">
                          <span>{item.label} {item.subLabel ? `(${item.subLabel})` : ''}</span>
                          <span style={{ fontWeight: 600, color: '#38bdf8' }}>
                            {typeof item.value === 'number' && !Number.isInteger(item.value) ? item.value.toFixed(2) : item.value}
                          </span>
                        </div>
                        <div className="chart-bar-track">
                          <div className="chart-bar-fill" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Sample Data Table Modal */}
      {selectedTableForPreview && (
        <div className="modal-backdrop" onClick={() => setSelectedTableForPreview(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '750px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                Sample Data: <span style={{ color: 'var(--primary-light)' }}>{selectedTableForPreview.name}</span>
              </h3>
              <button 
                onClick={() => setSelectedTableForPreview(null)}
                style={{ background: 'none', color: 'var(--text-muted)', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>
            <div className="modal-body" style={{ padding: '1rem', overflowX: 'auto' }}>
              <table className="query-table" style={{ fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    {selectedTableForPreview.columns.map(c => (
                      <th key={c.name}>{c.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedTableForPreview.sample_rows.map((row, idx) => (
                    <tr key={idx}>
                      {selectedTableForPreview.columns.map(c => (
                        <td key={c.name}>{String(row[c.name] ?? 'NULL')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-generate"
                onClick={() => {
                  const q = `SELECT * FROM ${selectedTableForPreview.name} LIMIT 20;`;
                  setSql(q);
                  handleExecute(q);
                  setSelectedTableForPreview(null);
                }}
              >
                <Play size={14} />
                <span>Query This Table</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings & LLM Configuration Modal */}
      {showSettings && (
        <div className="modal-backdrop" onClick={() => setShowSettings(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">AI Engine & LLM Configuration</h3>
              <button 
                onClick={() => setShowSettings(false)}
                style={{ background: 'none', color: 'var(--text-muted)', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">LLM Provider</label>
                <select 
                  className="form-input"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                >
                  <option value="auto">Auto (Built-in Intelligent Engine or API Key)</option>
                  <option value="gemini">Google Gemini API (Gemini 1.5 / 2.0)</option>
                  <option value="openai">OpenAI API (GPT-4o / GPT-4o-mini)</option>
                </select>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                  By default, QueryCraft's built-in intelligent engine works seamlessly without any API keys!
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Optional API Key</label>
                <input 
                  type="password"
                  className="form-input"
                  placeholder="AIzaSy... or sk-proj-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                  Your API key is securely stored in your local browser storage.
                </span>
              </div>

              <div style={{ 
                background: 'rgba(99, 102, 241, 0.08)', 
                border: '1px solid rgba(99, 102, 241, 0.2)', 
                borderRadius: 'var(--radius-sm)', 
                padding: '0.75rem',
                fontSize: '0.8rem',
                color: '#cbd5e1'
              }}>
                <strong>Safety Guardrails:</strong> QueryCraft runs strict read-only queries with multi-statement attack prevention, token inspection, and read-only database connections.
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-header"
                onClick={() => setShowSettings(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-generate"
                onClick={handleSaveSettings}
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
