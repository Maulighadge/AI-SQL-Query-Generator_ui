import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Code2, 
  FileQuestion, 
  Info, 
  Clock, 
  CheckCircle2,
  Sun,
  Moon,
  Search,
  Plus,
  X,
  ArrowUpDown,
  Filter,
  Zap,
  Trash2
} from 'lucide-react';
import './App.css';

const DEFAULT_SAMPLE_PROMPT = 'Show monthly sales by category';

export default function App() {
  // Theme State (Dark / Light)
  const [theme, setTheme] = useState(() => localStorage.getItem('querycraft_theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('querycraft_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Multi-Tab Query Sessions
  const [tabs, setTabs] = useState([
    {
      id: 'tab-1',
      title: 'Query 1: Monthly Sales',
      prompt: DEFAULT_SAMPLE_PROMPT,
      sql: '',
      formattedSql: '',
      explanation: null,
      validation: null,
      queryResults: null,
      activeMode: 'generate', // 'generate' | 'explain' | 'playground'
      activeView: 'table', // 'table' | 'chart'
      resultsFilter: '',
      sortColumn: null,
      sortDirection: 'asc' // 'asc' | 'desc'
    }
  ]);
  const [activeTabId, setActiveTabId] = useState('tab-1');

  // Active Tab Pointer
  const activeTab = useMemo(() => {
    return tabs.find(t => t.id === activeTabId) || tabs[0];
  }, [tabs, activeTabId]);

  // Tab State Updater Helper
  const updateActiveTab = (updates) => {
    setTabs(prev => prev.map(t => (t.id === activeTabId ? { ...t, ...updates } : t)));
  };

  // Add / Close Tabs
  const handleAddNewTab = () => {
    const newId = `tab-${Date.now()}`;
    const newTab = {
      id: newId,
      title: `Query ${tabs.length + 1}`,
      prompt: '',
      sql: '',
      formattedSql: '',
      explanation: null,
      validation: null,
      queryResults: null,
      activeMode: 'generate',
      activeView: 'table',
      resultsFilter: '',
      sortColumn: null,
      sortDirection: 'asc'
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newId);
  };

  const handleCloseTab = (e, tabIdToClose) => {
    e.stopPropagation();
    if (tabs.length <= 1) return;
    const nextTabs = tabs.filter(t => t.id !== tabIdToClose);
    setTabs(nextTabs);
    if (activeTabId === tabIdToClose) {
      setActiveTabId(nextTabs[nextTabs.length - 1].id);
    }
  };

  // Loading & Transient States
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Schema & Sample Queries
  const [schema, setSchema] = useState(null);
  const [schemaSearch, setSchemaSearch] = useState('');
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

  // Fetch initial schema and sample queries
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

  // Filtered Schema tables according to search query
  const filteredTables = useMemo(() => {
    if (!schema?.tables) return [];
    if (!schemaSearch.trim()) return schema.tables;
    const q = schemaSearch.toLowerCase();
    return schema.tables.filter(table => {
      const tableNameMatch = table.name.toLowerCase().includes(q);
      const colMatch = table.columns?.some(c => c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q));
      return tableNameMatch || colMatch;
    });
  }, [schema, schemaSearch]);

  // Generate SQL from Natural Language
  const handleGenerate = async (queryPrompt = activeTab.prompt) => {
    if (!queryPrompt.trim()) return;
    setIsGenerating(true);
    setErrorMessage('');

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

      updateActiveTab({
        prompt: queryPrompt,
        title: queryPrompt.length > 20 ? queryPrompt.substring(0, 18) + '...' : queryPrompt,
        sql: data.sql,
        formattedSql: data.formatted_sql,
        validation: data.validation,
        explanation: {
          summary: data.summary,
          clauses_breakdown: data.clauses_breakdown,
          business_value: data.business_value,
          suggested_questions: data.suggested_questions,
          engine: data.engine
        }
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

      // Auto-execute query safely to show immediate results
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
    if (!activeTab.sql.trim()) return;
    setIsGenerating(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sql: activeTab.sql,
          api_key: apiKey.trim() || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to explain query');

      updateActiveTab({
        validation: data.validation,
        explanation: data.explanation
      });
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Execute SQL in read-only mode
  const handleExecute = async (queryToRun = activeTab.sql) => {
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

      updateActiveTab({
        queryResults: data.data,
        resultsFilter: '',
        sortColumn: null
      });
    } catch (err) {
      setErrorMessage(err.message);
      updateActiveTab({ queryResults: null });
    } finally {
      setIsExecuting(false);
    }
  };

  // Format SQL
  const handleFormat = async () => {
    if (!activeTab.sql.trim()) return;
    try {
      const res = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: activeTab.sql })
      });
      const data = await res.json();
      if (data.formatted_sql) {
        updateActiveTab({
          sql: data.formatted_sql,
          validation: data
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Copy SQL to clipboard
  const handleCopySql = () => {
    navigator.clipboard.writeText(activeTab.sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Clear current tab SQL
  const handleClearSql = () => {
    updateActiveTab({
      sql: '',
      formattedSql: '',
      queryResults: null,
      explanation: null,
      validation: null
    });
  };

  // Export results as CSV
  const handleExportCsv = () => {
    const qr = activeTab.queryResults;
    if (!qr || !qr.columns || !qr.rows) return;
    const header = qr.columns.join(',');
    const rows = qr.rows.map(r => r.map(val => `"${val !== null ? val : ''}"`).join(','));
    const csvContent = "data:text/csv;charset=utf-8," + [header, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `querycraft_results_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export results as JSON
  const handleExportJson = () => {
    const qr = activeTab.queryResults;
    if (!qr || !qr.columns || !qr.rows) return;
    const jsonList = qr.rows.map(row => {
      const obj = {};
      qr.columns.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return obj;
    });
    const blob = new Blob([JSON.stringify(jsonList, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `querycraft_results_${Date.now()}.json`);
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
    if (!activeTab.sql && schema) {
      handleGenerate(DEFAULT_SAMPLE_PROMPT);
    }
  }, [schema]);

  // Calculate line numbers for editor
  const sqlLines = useMemo(() => {
    const count = Math.max((activeTab.sql || '').split('\n').length, 5);
    return Array.from({ length: count }, (_, i) => i + 1);
  }, [activeTab.sql]);

  // Process & Sort Tabular Query Results
  const processedTableData = useMemo(() => {
    const qr = activeTab.queryResults;
    if (!qr || !qr.rows) return { columns: [], rows: [] };

    let rows = [...qr.rows];
    // Filter
    if (activeTab.resultsFilter.trim()) {
      const term = activeTab.resultsFilter.toLowerCase();
      rows = rows.filter(row => row.some(cell => String(cell ?? '').toLowerCase().includes(term)));
    }

    // Sort
    if (activeTab.sortColumn !== null) {
      const colIdx = qr.columns.indexOf(activeTab.sortColumn);
      if (colIdx !== -1) {
        rows.sort((a, b) => {
          const valA = a[colIdx];
          const valB = b[colIdx];
          if (valA === valB) return 0;
          if (valA === null) return 1;
          if (valB === null) return -1;
          if (typeof valA === 'number' && typeof valB === 'number') {
            return activeTab.sortDirection === 'asc' ? valA - valB : valB - valA;
          }
          return activeTab.sortDirection === 'asc' 
            ? String(valA).localeCompare(String(valB)) 
            : String(valB).localeCompare(String(valA));
        });
      }
    }

    return { columns: qr.columns, rows };
  }, [activeTab.queryResults, activeTab.resultsFilter, activeTab.sortColumn, activeTab.sortDirection]);

  // Determine if result data is chartable (has a label column and numeric metric column)
  const chartData = useMemo(() => {
    const qr = activeTab.queryResults;
    if (!qr || !qr.rows || qr.rows.length === 0) return null;
    const cols = qr.columns;
    if (cols.length < 2) return null;

    // Find numeric columns
    const firstRow = qr.rows[0];
    const numericColIndex = firstRow.findIndex(val => typeof val === 'number');
    if (numericColIndex === -1) return null;

    // Label column is usually col 0 or 1
    const labelColIndex = numericColIndex === 0 ? 1 : 0;
    const values = qr.rows.map(r => Number(r[numericColIndex]) || 0);
    const maxValue = Math.max(...values);
    const sumValue = values.reduce((acc, v) => acc + v, 0);

    return {
      labelCol: cols[labelColIndex],
      valueCol: cols[numericColIndex],
      totalSum: sumValue,
      items: qr.rows.map(r => ({
        label: String(r[labelColIndex] ?? 'N/A'),
        value: Number(r[numericColIndex]) || 0,
        subLabel: cols.length > 2 ? String(r[2] ?? '') : ''
      })),
      max: maxValue > 0 ? maxValue : 1
    };
  }, [activeTab.queryResults]);

  // Column header click to toggle sorting
  const handleSortClick = (col) => {
    if (activeTab.sortColumn === col) {
      updateActiveTab({
        sortDirection: activeTab.sortDirection === 'asc' ? 'desc' : 'asc'
      });
    } else {
      updateActiveTab({
        sortColumn: col,
        sortDirection: 'asc'
      });
    }
  };

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

          {/* Theme Toggle Button */}
          <button 
            className="btn-theme-toggle" 
            onClick={toggleTheme} 
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>

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
        {/* Left Sidebar: Schema Explorer & Recent Inquiries */}
        <aside className="schema-sidebar">
          <div className="glass-panel sidebar-card">
            <div className="sidebar-title">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={16} color="var(--primary-light)" />
                Database Schema
              </span>
              <button 
                onClick={fetchSchema} 
                style={{ background: 'none', color: 'var(--text-subtle)', padding: '2px' }}
                title="Refresh Schema"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            {/* Quick Schema Search Input */}
            <div className="schema-search-wrapper">
              <Search size={13} className="schema-search-icon" />
              <input 
                type="text"
                className="schema-search-input"
                placeholder="Search tables or columns..."
                value={schemaSearch}
                onChange={(e) => setSchemaSearch(e.target.value)}
              />
            </div>

            <div className="table-list">
              {filteredTables.length > 0 ? (
                filteredTables.map(table => {
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
                <div style={{ color: 'var(--text-subtle)', fontSize: '0.85rem', padding: '0.5rem 0' }}>
                  {schema ? 'No matching tables found.' : 'Loading schema...'}
                </div>
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
                <button
                  onClick={() => {
                    setQueryHistory([]);
                    localStorage.removeItem('querycraft_history');
                  }}
                  style={{ background: 'none', color: 'var(--text-subtle)', fontSize: '0.72rem' }}
                  title="Clear history"
                >
                  Clear
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '200px', overflowY: 'auto' }}>
                {queryHistory.map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      updateActiveTab({ prompt: item.prompt });
                      handleGenerate(item.prompt);
                    }}
                    style={{
                      background: 'var(--bg-subtle)',
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
                    <span style={{ color: 'var(--text-main)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.prompt}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>{item.timestamp}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Center Workspace */}
        <main className="center-content">
          {/* Query Session Tabs Bar */}
          <div className="tabs-bar">
            {tabs.map(tab => (
              <div 
                key={tab.id}
                className={`query-tab-item ${tab.id === activeTabId ? 'active' : ''}`}
                onClick={() => setActiveTabId(tab.id)}
              >
                <Code2 size={13} />
                <span>{tab.title}</span>
                {tabs.length > 1 && (
                  <button 
                    className="tab-close-btn" 
                    onClick={(e) => handleCloseTab(e, tab.id)}
                    title="Close tab"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}

            <button 
              className="btn-new-tab"
              onClick={handleAddNewTab}
              title="Open New Query Tab"
            >
              <Plus size={13} />
              <span>New Tab</span>
            </button>
          </div>

          {/* Mode Tabs & Prompt Input */}
          <div className="glass-panel prompt-card">
            <div className="mode-pills">
              <button 
                className={`mode-pill ${activeTab.activeMode === 'generate' ? 'active' : ''}`}
                onClick={() => updateActiveTab({ activeMode: 'generate' })}
              >
                <Sparkles size={13} />
                Natural Language to SQL
              </button>
              <button 
                className={`mode-pill ${activeTab.activeMode === 'explain' ? 'active' : ''}`}
                onClick={() => updateActiveTab({ activeMode: 'explain' })}
              >
                <FileQuestion size={13} />
                Explain SQL
              </button>
              <button 
                className={`mode-pill ${activeTab.activeMode === 'playground' ? 'active' : ''}`}
                onClick={() => updateActiveTab({ activeMode: 'playground' })}
              >
                <Code2 size={13} />
                Safe SQL Playground
              </button>
            </div>

            {/* Prompt input for 'generate' mode */}
            {activeTab.activeMode === 'generate' && (
              <>
                <div className="prompt-textarea-wrapper">
                  <textarea
                    className="prompt-textarea"
                    placeholder="Ask questions such as 'Show monthly sales by category', 'Top 5 products by revenue', or 'VIP customers by spend'..."
                    value={activeTab.prompt}
                    onChange={(e) => updateActiveTab({ prompt: e.target.value })}
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
                      disabled={isGenerating || !activeTab.prompt.trim()}
                      id="generate-sql-button"
                    >
                      {isGenerating ? (
                        <>
                          <RefreshCw size={15} className="animate-spin" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={15} />
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
                        updateActiveTab({ prompt: sample.prompt });
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
            {activeTab.activeMode === 'explain' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                  Paste or write any SQL query in the editor below and click <strong>Explain Query</strong> to get an instant breakdown of its logic, clauses, and analytics context.
                </div>
                <button 
                  className="btn-generate"
                  style={{ alignSelf: 'flex-start' }}
                  onClick={handleExplain}
                  disabled={isGenerating || !activeTab.sql.trim()}
                >
                  <FileQuestion size={15} />
                  <span>Explain Current SQL</span>
                </button>
              </div>
            )}

            {/* Playground instructions */}
            {activeTab.activeMode === 'playground' && (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Write and test any SQL query in the editor below. QueryCraft automatically checks syntax and ensures strictly read-only execution.
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
              <ShieldAlert size={18} color="var(--accent-rose)" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Generated SQL Code Panel with Line Numbers */}
          <div className="glass-panel sql-panel">
            <div className="sql-panel-header">
              <div className="sql-title-group">
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>SQL Editor</span>
                {activeTab.validation && (
                  <div className={`safety-badge ${activeTab.validation.is_safe ? 'safety-safe' : 'safety-unsafe'}`}>
                    {activeTab.validation.is_safe ? (
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
                {activeTab.explanation?.engine && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                    • {activeTab.explanation.engine}
                  </span>
                )}
              </div>

              <div className="sql-actions">
                <button 
                  className="btn-sql-action"
                  onClick={handleFormat}
                  title="Format SQL"
                >
                  <Code2 size={13} />
                  <span>Format</span>
                </button>

                <button 
                  className="btn-sql-action"
                  onClick={handleCopySql}
                  title="Copy to Clipboard"
                >
                  {copied ? <Check size={13} color="var(--accent-emerald)" /> : <Copy size={13} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>

                <button 
                  className="btn-sql-action"
                  onClick={handleClearSql}
                  title="Clear Query"
                >
                  <Trash2 size={13} />
                  <span>Clear</span>
                </button>

                <button 
                  className="btn-sql-action btn-execute"
                  onClick={() => handleExecute(activeTab.sql)}
                  disabled={isExecuting || !activeTab.sql.trim() || (activeTab.validation && !activeTab.validation.is_safe)}
                  id="execute-query-button"
                >
                  {isExecuting ? <RefreshCw size={13} className="animate-spin" /> : <Play size={13} />}
                  <span>Execute Safely</span>
                </button>
              </div>
            </div>

            {/* Line-Numbered Editor Container */}
            <div className="editor-with-gutter">
              <div className="editor-gutter">
                {sqlLines.map(line => (
                  <div key={line}>{line}</div>
                ))}
              </div>
              <div className="editor-content-area">
                <textarea
                  className="sql-textarea"
                  value={activeTab.sql}
                  onChange={(e) => {
                    const val = e.target.value;
                    const isDestructive = val.toUpperCase().includes('DROP') || val.toUpperCase().includes('DELETE') || val.toUpperCase().includes('TRUNCATE');
                    updateActiveTab({
                      sql: val,
                      validation: isDestructive 
                        ? { is_safe: false, reason: "Contains destructive keyword." }
                        : { is_safe: true, reason: "Read-only query verified." }
                    });
                  }}
                  placeholder="-- SQL query will appear here. You can also edit it directly..."
                />
              </div>
            </div>
          </div>

          {/* Real-Time Query Performance & Security Metrics */}
          {activeTab.queryResults && (
            <div className="metrics-banner animate-fade-in">
              <div className="metric-card">
                <div className="metric-icon-box emerald">
                  <TableIcon size={20} />
                </div>
                <div>
                  <div className="metric-label">Rows Returned</div>
                  <div className="metric-val">{activeTab.queryResults.row_count}</div>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-icon-box cyan">
                  <Zap size={20} />
                </div>
                <div>
                  <div className="metric-label">Execution Time</div>
                  <div className="metric-val">
                    {activeTab.queryResults.execution_time_ms} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--accent-emerald)' }}>ms (Fast)</span>
                  </div>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-icon-box indigo">
                  <Layers size={20} />
                </div>
                <div>
                  <div className="metric-label">Columns</div>
                  <div className="metric-val">{activeTab.queryResults.columns?.length || 0}</div>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-icon-box amber">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <div className="metric-label">Guardrail Status</div>
                  <div className="metric-val" style={{ fontSize: '0.95rem', color: 'var(--accent-emerald)' }}>Read-Only Protected</div>
                </div>
              </div>
            </div>
          )}

          {/* AI Explanation Breakdown */}
          {activeTab.explanation && (
            <div className="glass-panel explanation-card animate-fade-in">
              <div className="explanation-header">
                <Info size={17} color="var(--primary-light)" />
                <span>AI Query Explanation & Clause Breakdown</span>
              </div>

              {activeTab.explanation.summary && (
                <div className="explanation-summary">
                  {activeTab.explanation.summary}
                </div>
              )}

              {/* Clause by Clause Grid */}
              {activeTab.explanation.clauses_breakdown && activeTab.explanation.clauses_breakdown.length > 0 && (
                <div className="clauses-grid">
                  {activeTab.explanation.clauses_breakdown.map((item, idx) => (
                    <div key={idx} className="clause-card">
                      <span className="clause-badge">{item.clause}</span>
                      <p className="clause-desc">{item.explanation}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Business Value Insight */}
              {activeTab.explanation.business_value && (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
                  <strong style={{ color: 'var(--primary-light)' }}>Business Analytics Insight: </strong> 
                  {activeTab.explanation.business_value}
                </div>
              )}

              {/* Suggested Follow-up Questions */}
              {activeTab.explanation.suggested_questions && activeTab.explanation.suggested_questions.length > 0 && (
                <div className="followup-box">
                  <span className="followup-title">Recommended Follow-up Inquiries</span>
                  <div className="followup-pills">
                    {activeTab.explanation.suggested_questions.map((q, idx) => (
                      <button
                        key={idx}
                        className="followup-pill"
                        onClick={() => {
                          updateActiveTab({ prompt: q });
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
          {activeTab.queryResults && (
            <div className="glass-panel results-card animate-fade-in" id="query-results-panel">
              <div className="results-header">
                <div className="results-tools">
                  {/* Results Search Filter */}
                  <input 
                    type="text"
                    className="results-filter-input"
                    placeholder="Filter rows..."
                    value={activeTab.resultsFilter}
                    onChange={(e) => updateActiveTab({ resultsFilter: e.target.value })}
                  />

                  {chartData && (
                    <div className="view-switcher">
                      <button 
                        className={`view-btn ${activeTab.activeView === 'table' ? 'active' : ''}`}
                        onClick={() => updateActiveTab({ activeView: 'table' })}
                      >
                        <TableIcon size={12} style={{ display: 'inline', marginRight: '3px' }} />
                        Table
                      </button>
                      <button 
                        className={`view-btn ${activeTab.activeView === 'chart' ? 'active' : ''}`}
                        onClick={() => updateActiveTab({ activeView: 'chart' })}
                      >
                        <BarChart3 size={12} style={{ display: 'inline', marginRight: '3px' }} />
                        Visual
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
              {activeTab.activeView === 'table' && (
                <div className="table-responsive-wrapper">
                  <table className="query-table">
                    <thead>
                      <tr>
                        {processedTableData.columns.map((col, idx) => (
                          <th 
                            key={idx} 
                            className="sortable"
                            onClick={() => handleSortClick(col)}
                            title="Click to sort"
                          >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span>{col}</span>
                              <ArrowUpDown size={11} color={activeTab.sortColumn === col ? 'var(--primary)' : 'var(--text-subtle)'} />
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {processedTableData.rows.length > 0 ? (
                        processedTableData.rows.map((row, rIdx) => (
                          <tr key={rIdx}>
                            {row.map((cell, cIdx) => (
                              <td key={cIdx}>
                                {cell === null ? (
                                  <span style={{ color: 'var(--text-subtle)', fontStyle: 'italic', fontSize: '0.78rem' }}>NULL</span>
                                ) : typeof cell === 'number' && !Number.isInteger(cell) ? (
                                  Number(cell).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                ) : (
                                  String(cell)
                                )}
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={processedTableData.columns.length} style={{ textAlign: 'center', color: 'var(--text-subtle)', padding: '2rem' }}>
                            No rows matching the filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* View 2: Visual Bar Chart View for Aggregations */}
              {activeTab.activeView === 'chart' && chartData && (
                <div className="chart-container">
                  <div className="chart-controls-bar">
                    <div style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                      Distribution of <strong style={{ color: 'var(--accent-cyan)' }}>{chartData.valueCol}</strong> by <strong style={{ color: 'var(--primary-light)' }}>{chartData.labelCol}</strong>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>
                      Total: <strong style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>{chartData.totalSum.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
                    </div>
                  </div>

                  {chartData.items.map((item, idx) => {
                    const pct = Math.round((item.value / chartData.max) * 100);
                    return (
                      <div key={idx} className="chart-bar-row">
                        <div className="chart-bar-label">
                          <span>{item.label} {item.subLabel ? `(${item.subLabel})` : ''}</span>
                          <span style={{ fontWeight: 600, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
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
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
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
            <div className="modal-body" style={{ padding: '1rem', overflowX: 'auto', maxHeight: '450px' }}>
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
                  updateActiveTab({ sql: q, prompt: `Select all from ${selectedTableForPreview.name}` });
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
                background: 'var(--primary-glow)', 
                border: '1px solid var(--border-active)', 
                borderRadius: 'var(--radius-sm)', 
                padding: '0.75rem',
                fontSize: '0.8rem',
                color: 'var(--text-muted)'
              }}>
                <strong style={{ color: 'var(--text-main)' }}>Safety Guardrails: </strong> 
                QueryCraft runs strict read-only queries with multi-statement attack prevention, token inspection, and read-only database connections.
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
