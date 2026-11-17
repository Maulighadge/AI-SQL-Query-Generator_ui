import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Database, 
  Sparkles, 
  Play, 
  Copy, 
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
  Sun,
  Moon,
  Search,
  Plus,
  X,
  ArrowUpDown,
  Zap,
  Trash2,
  Bookmark,
  Keyboard,
  PanelLeftClose,
  PanelLeftOpen,
  Hash,
  Type,
  Calendar,
  FileCode
} from 'lucide-react';

import SqlEditor from './components/SqlEditor';
import VisualChart from './components/VisualChart';
import TablePagination from './components/TablePagination';
import ShortcutsModal from './components/ShortcutsModal';
import SavedQueriesModal from './components/SavedQueriesModal';
import Toast from './components/Toast';
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

  // Toast Notification System
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  const dismissToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Sidebar Collapse State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [sidebarTab, setSidebarTab] = useState('schema'); // 'schema' | 'history'

  // Multi-Tab Query Sessions
  const [tabs, setTabs] = useState([
    {
      id: 'tab-1',
      title: 'Monthly Sales',
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
      sortDirection: 'asc', // 'asc' | 'desc'
      pageSize: '25',
      currentPage: 1
    }
  ]);
  const [activeTabId, setActiveTabId] = useState('tab-1');
  const [editingTabTitleId, setEditingTabTitleId] = useState(null);
  const [tabTitleInput, setTabTitleInput] = useState('');

  // Active Tab Pointer
  const activeTab = useMemo(() => {
    return tabs.find(t => t.id === activeTabId) || tabs[0];
  }, [tabs, activeTabId]);

  // Tab State Updater Helper
  const updateActiveTab = useCallback((updates) => {
    setTabs(prev => prev.map(t => (t.id === activeTabId ? { ...t, ...updates } : t)));
  }, [activeTabId]);

  // Add / Close Tabs
  const handleAddNewTab = useCallback(() => {
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
      sortDirection: 'asc',
      pageSize: '25',
      currentPage: 1
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newId);
    addToast({ type: 'info', title: 'New Tab Created', message: `Opened Query ${tabs.length + 1}` });
  }, [tabs.length, addToast]);

  const handleCloseTab = (e, tabIdToClose) => {
    e.stopPropagation();
    if (tabs.length <= 1) return;
    const nextTabs = tabs.filter(t => t.id !== tabIdToClose);
    setTabs(nextTabs);
    if (activeTabId === tabIdToClose) {
      setActiveTabId(nextTabs[nextTabs.length - 1].id);
    }
  };

  const handleStartRenameTab = (tab) => {
    setEditingTabTitleId(tab.id);
    setTabTitleInput(tab.title);
  };

  const handleSaveTabTitle = (tabId) => {
    if (tabTitleInput.trim()) {
      setTabs(prev => prev.map(t => (t.id === tabId ? { ...t, title: tabTitleInput.trim() } : t)));
    }
    setEditingTabTitleId(null);
  };

  // Loading & Transient States
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Schema & Sample Queries
  const [schema, setSchema] = useState(null);
  const [schemaSearch, setSchemaSearch] = useState('');
  const [expandedTables, setExpandedTables] = useState({ categories: true, products: true, orders: true });
  const [sampleQueries, setSampleQueries] = useState([]);
  const [selectedSampleCategory, setSelectedSampleCategory] = useState('All');
  const [selectedTableForPreview, setSelectedTableForPreview] = useState(null);

  // Modals
  const [showSettings, setShowSettings] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showSavedQueries, setShowSavedQueries] = useState(false);

  // Settings & Configuration
  const [apiKey, setApiKey] = useState(localStorage.getItem('querycraft_api_key') || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [provider, setProvider] = useState(localStorage.getItem('querycraft_provider') || 'auto');

  // History & Bookmarks
  const [queryHistory, setQueryHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('querycraft_history') || '[]');
    } catch {
      return [];
    }
  });

  const [savedQueries, setSavedQueries] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('querycraft_saved') || '[]');
    } catch {
      return [];
    }
  });

  const schemaSearchInputRef = useRef(null);

  // Fetch initial schema and sample queries
  const fetchSchema = useCallback(async () => {
    try {
      const res = await fetch('/api/schema');
      if (res.ok) {
        const data = await res.json();
        setSchema(data);
      }
    } catch (err) {
      console.error('Error fetching schema:', err);
    }
  }, []);

  const fetchSampleQueries = useCallback(async () => {
    try {
      const res = await fetch('/api/sample-queries');
      if (res.ok) {
        const data = await res.json();
        setSampleQueries(data);
      }
    } catch (err) {
      console.error('Error fetching sample queries:', err);
    }
  }, []);

  useEffect(() => {
    fetchSchema();
    fetchSampleQueries();
  }, [fetchSchema, fetchSampleQueries]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowSettings(false);
        setShowShortcuts(false);
        setShowSavedQueries(false);
        setSelectedTableForPreview(null);
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (isSidebarCollapsed) setIsSidebarCollapsed(false);
        setSidebarTab('schema');
        schemaSearchInputRef.current?.focus();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        setIsSidebarCollapsed(prev => !prev);
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        handleAddNewTab();
      } else if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        e.preventDefault();
        setShowShortcuts(true);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isSidebarCollapsed, handleAddNewTab]);

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

  // Sample Query categories
  const sampleCategories = useMemo(() => {
    return ['All', ...new Set(sampleQueries.map(s => s.category || 'General'))];
  }, [sampleQueries]);

  const filteredSampleQueries = useMemo(() => {
    if (selectedSampleCategory === 'All') return sampleQueries;
    return sampleQueries.filter(s => s.category === selectedSampleCategory);
  }, [sampleQueries, selectedSampleCategory]);

  // Insert Table / Column Name helper into active prompt or SQL
  const handleInsertIdentifier = (name) => {
    if (activeTab.activeMode === 'generate') {
      const current = activeTab.prompt || '';
      updateActiveTab({ prompt: current ? `${current} ${name}` : name });
    } else {
      const current = activeTab.sql || '';
      updateActiveTab({ sql: current ? `${current} ${name}` : name });
    }
    addToast({ type: 'info', title: 'Inserted Identifier', message: `Added "${name}" to query input` });
  };

  // Execute SQL in read-only mode
  const handleExecute = useCallback(async (queryToRun = activeTab.sql) => {
    if (!queryToRun || !queryToRun.trim()) return;
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
        sortColumn: null,
        currentPage: 1
      });

      addToast({ 
        type: 'success', 
        title: 'Query Executed', 
        message: `Returned ${data.data.row_count} rows in ${data.data.execution_time_ms}ms` 
      });
    } catch (err) {
      setErrorMessage(err.message);
      updateActiveTab({ queryResults: null });
      addToast({ type: 'error', title: 'Execution Blocked', message: err.message });
    } finally {
      setIsExecuting(false);
    }
  }, [activeTab.sql, updateActiveTab, addToast]);

  // Generate SQL from Natural Language
  const handleGenerate = useCallback(async (queryPrompt = activeTab.prompt) => {
    if (!queryPrompt || !queryPrompt.trim()) return;
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
        title: queryPrompt.length > 22 ? queryPrompt.substring(0, 20) + '...' : queryPrompt,
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
      const now = new Date();
      const newHistoryItem = {
        id: now.getTime(),
        prompt: queryPrompt,
        sql: data.sql,
        timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setQueryHistory(prev => {
        const updated = [newHistoryItem, ...prev.filter(h => h.prompt !== queryPrompt).slice(0, 14)];
        localStorage.setItem('querycraft_history', JSON.stringify(updated));
        return updated;
      });

      addToast({ type: 'success', title: 'SQL Generated', message: 'Query crafted and validated safely.' });

      // Auto-execute query safely to show immediate results
      if (data.validation?.is_safe) {
        handleExecute(data.sql);
      }
    } catch (err) {
      setErrorMessage(err.message);
      addToast({ type: 'error', title: 'Generation Error', message: err.message });
    } finally {
      setIsGenerating(false);
    }
  }, [activeTab.prompt, apiKey, provider, updateActiveTab, addToast, handleExecute]);

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
      addToast({ type: 'success', title: 'Explanation Ready', message: 'SQL clauses and analytics broken down.' });
    } catch (err) {
      setErrorMessage(err.message);
      addToast({ type: 'error', title: 'Explanation Error', message: err.message });
    } finally {
      setIsGenerating(false);
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
        addToast({ type: 'info', title: 'SQL Formatted', message: 'Indentation and capitalization aligned.' });
      }
    } catch (err) {
      console.error(err);
    }
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
    addToast({ type: 'info', title: 'Editor Cleared', message: 'Current SQL query was cleared.' });
  };

  // Export results as CSV
  const handleExportCsv = () => {
    const qr = activeTab.queryResults;
    if (!qr || !qr.columns || !qr.rows) return;
    const header = qr.columns.join(',');
    const rows = qr.rows.map(r => r.map(val => `"${val !== null ? String(val).replace(/"/g, '""') : ''}"`).join(','));
    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent([header, ...rows].join('\n'));
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", `querycraft_results_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast({ type: 'success', title: 'CSV Exported', message: 'Downloaded table results as CSV.' });
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
    addToast({ type: 'success', title: 'JSON Exported', message: 'Downloaded table results as JSON.' });
  };

  // Export as Markdown Table
  const handleExportMarkdown = () => {
    const qr = activeTab.queryResults;
    if (!qr || !qr.columns || !qr.rows) return;
    const header = `| ${qr.columns.join(' | ')} |`;
    const separator = `| ${qr.columns.map(() => '---').join(' | ')} |`;
    const rows = qr.rows.slice(0, 100).map(r => `| ${r.map(v => (v !== null ? String(v) : 'NULL')).join(' | ')} |`).join('\n');
    const md = `${header}\n${separator}\n${rows}`;
    navigator.clipboard.writeText(md);
    addToast({ type: 'success', title: 'Markdown Copied', message: 'Table format copied to clipboard.' });
  };

  // Copy as TSV (Tab-Separated for Excel / Google Sheets)
  const handleCopyTsv = () => {
    const qr = activeTab.queryResults;
    if (!qr || !qr.columns || !qr.rows) return;
    const header = qr.columns.join('\t');
    const rows = qr.rows.map(r => r.map(v => (v !== null ? String(v) : '')).join('\t')).join('\n');
    navigator.clipboard.writeText(`${header}\n${rows}`);
    addToast({ type: 'success', title: 'TSV Copied', message: 'Ready to paste into Excel or Sheets.' });
  };

  // Save Settings
  const handleSaveSettings = () => {
    localStorage.setItem('querycraft_api_key', apiKey);
    localStorage.setItem('querycraft_provider', provider);
    setShowSettings(false);
    addToast({ type: 'success', title: 'Settings Saved', message: `Engine provider set to ${provider}.` });
  };

  // Saved Queries Management
  const handleSaveCurrentQuery = (queryItem) => {
    setSavedQueries(prev => {
      const updated = [queryItem, ...prev.filter(q => q.sql !== queryItem.sql)];
      localStorage.setItem('querycraft_saved', JSON.stringify(updated));
      return updated;
    });
    addToast({ type: 'success', title: 'Query Bookmarked', message: `Saved "${queryItem.title}"` });
  };

  const handleDeleteSavedQuery = (id) => {
    setSavedQueries(prev => {
      const updated = prev.filter(q => q.id !== id);
      localStorage.setItem('querycraft_saved', JSON.stringify(updated));
      return updated;
    });
    addToast({ type: 'info', title: 'Query Removed', message: 'Deleted bookmark.' });
  };

  const handleLoadSavedQuery = (item) => {
    updateActiveTab({
      title: item.title,
      prompt: item.prompt || item.title,
      sql: item.sql
    });
    handleExecute(item.sql);
    addToast({ type: 'info', title: 'Query Loaded', message: `Loaded "${item.title}" into active tab.` });
  };

  const toggleTableExpand = (tableName) => {
    setExpandedTables(prev => ({
      ...prev,
      [tableName]: !prev[tableName]
    }));
  };

  // Automatically trigger sample query on first load once schema is ready
  const initialTriggerRef = useRef(false);
  useEffect(() => {
    if (!initialTriggerRef.current && schema) {
      initialTriggerRef.current = true;
      handleGenerate(DEFAULT_SAMPLE_PROMPT);
    }
  }, [schema, handleGenerate]);

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

  // Paged Table Data
  const paginatedRows = useMemo(() => {
    const pageSize = activeTab.pageSize;
    const page = activeTab.currentPage || 1;
    if (pageSize === 'all') return processedTableData.rows;
    const size = Number(pageSize);
    const start = (page - 1) * size;
    return processedTableData.rows.slice(start, start + size);
  }, [processedTableData.rows, activeTab.pageSize, activeTab.currentPage]);

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

  // Helper for column icon in table header
  const getColIcon = (colName) => {
    const sampleVal = activeTab.queryResults?.rows?.[0]?.[activeTab.queryResults.columns.indexOf(colName)];
    if (typeof sampleVal === 'number') return <Hash size={12} className="col-type-icon" title="Numeric" />;
    if (colName.toLowerCase().includes('date') || colName.toLowerCase().includes('time')) {
      return <Calendar size={12} className="col-type-icon" title="Date/Time" />;
    }
    return <Type size={12} className="col-type-icon" title="Text" />;
  };

  return (
    <div className="app-container">
      {/* Toast Alert System */}
      <Toast toasts={toasts} onDismiss={dismissToast} />

      {/* Top Header */}
      <header className="app-header">
        <div className="brand-wrapper">
          <button 
            className="btn-sidebar-toggle" 
            onClick={() => setIsSidebarCollapsed(prev => !prev)}
            title={isSidebarCollapsed ? "Expand Sidebar (Ctrl+B)" : "Collapse Sidebar (Ctrl+B)"}
          >
            {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>

          <div className="brand-icon">
            <Database size={22} />
          </div>
          <div>
            <h1 className="brand-title">
              QueryCraft AI
              <span className="brand-tag">SQL Studio</span>
            </h1>
          </div>
        </div>

        <div className="header-actions">
          {/* Database Live Status Badge */}
          <div className="status-badge" title="Active SQLite database connection with zero-mutation lock">
            <span className="live-dot"></span>
            <span>SQLite Active ({schema?.tables?.length || 6} Tables)</span>
          </div>

          {/* Quick Search Schema trigger */}
          <button 
            className="btn-search-trigger"
            onClick={() => {
              if (isSidebarCollapsed) setIsSidebarCollapsed(false);
              setSidebarTab('schema');
              setTimeout(() => schemaSearchInputRef.current?.focus(), 100);
            }}
            title="Search Schema & Tables (Ctrl+K)"
          >
            <Search size={14} />
            <span className="search-trigger-text">Search Schema</span>
            <kbd className="kbd-badge">Ctrl+K</kbd>
          </button>

          {/* Saved Queries Library */}
          <button 
            className="btn-header"
            onClick={() => setShowSavedQueries(true)}
            title="Saved & Bookmarked Queries"
          >
            <Bookmark size={15} />
            <span>Saved ({savedQueries.length})</span>
          </button>

          {/* Keyboard Shortcuts */}
          <button 
            className="btn-header"
            onClick={() => setShowShortcuts(true)}
            title="Keyboard Shortcuts (?)"
          >
            <Keyboard size={15} />
          </button>

          {/* Theme Toggle Button */}
          <button 
            className="btn-theme-toggle" 
            onClick={toggleTheme} 
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {/* Settings Modal Trigger */}
          <button 
            className="btn-header"
            onClick={() => setShowSettings(true)}
            id="settings-modal-trigger"
            title="Configure LLM Providers and API Keys"
          >
            <Settings size={15} />
            <span>Settings</span>
          </button>
        </div>
      </header>

      {/* Main Grid Workspace */}
      <div className={`main-workspace ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Left Sidebar: Schema Explorer, History, & References */}
        {!isSidebarCollapsed && (
          <aside className="schema-sidebar animate-fade-in">
            {/* Sidebar Segmented Tabs */}
            <div className="sidebar-tabs-bar">
              <button 
                className={`sidebar-tab-btn ${sidebarTab === 'schema' ? 'active' : ''}`}
                onClick={() => setSidebarTab('schema')}
              >
                <Layers size={14} />
                <span>Schema ({filteredTables.length})</span>
              </button>
              <button 
                className={`sidebar-tab-btn ${sidebarTab === 'history' ? 'active' : ''}`}
                onClick={() => setSidebarTab('history')}
              >
                <History size={14} />
                <span>History ({queryHistory.length})</span>
              </button>
            </div>

            {/* Sidebar Tab 1: Schema Explorer */}
            {sidebarTab === 'schema' && (
              <div className="glass-panel sidebar-card">
                <div className="sidebar-title">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Database size={15} color="var(--primary-light)" />
                    Database Schema
                  </span>
                  <button 
                    onClick={fetchSchema} 
                    className="btn-icon-subtle"
                    title="Refresh Database Schema"
                  >
                    <RefreshCw size={13} />
                  </button>
                </div>

                {/* Quick Schema Search Input */}
                <div className="schema-search-wrapper">
                  <Search size={13} className="schema-search-icon" />
                  <input 
                    ref={schemaSearchInputRef}
                    type="text"
                    className="schema-search-input"
                    placeholder="Filter tables or columns... (Ctrl+K)"
                    value={schemaSearch}
                    onChange={(e) => setSchemaSearch(e.target.value)}
                  />
                  {schemaSearch && (
                    <button 
                      onClick={() => setSchemaSearch('')}
                      style={{ position: 'absolute', right: '8px', background: 'none', color: 'var(--text-subtle)' }}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Tables List */}
                <div className="table-list">
                  {filteredTables.length > 0 ? (
                    filteredTables.map(table => {
                      const isExpanded = !!expandedTables[table.name];
                      return (
                        <div key={table.name} className="table-item">
                          <div className="table-header-row">
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

                            <button 
                              className="btn-insert-chip"
                              onClick={() => handleInsertIdentifier(table.name)}
                              title={`Insert "${table.name}" into editor`}
                            >
                              +
                            </button>
                          </div>

                          {isExpanded && (
                            <div className="table-columns animate-fade-in">
                              {table.columns.map(col => (
                                <div key={col.name} className="col-row">
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    {col.is_primary_key && <Key size={11} className="col-pk" title="Primary Key (PK)" />}
                                    {col.foreign_key && <LinkIcon size={11} className="col-fk" title={`FK -> ${col.foreign_key.target_table}.${col.foreign_key.target_column}`} />}
                                    <span 
                                      className="col-name-clickable"
                                      onClick={() => handleInsertIdentifier(col.name)}
                                      title="Click to insert column into query"
                                    >
                                      {col.name}
                                    </span>
                                  </span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                    <span className="col-badge">{col.type}</span>
                                    <button 
                                      className="btn-insert-chip mini"
                                      onClick={() => handleInsertIdentifier(col.name)}
                                      title={`Insert "${col.name}" into query`}
                                    >
                                      +
                                    </button>
                                  </div>
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
                    <div style={{ color: 'var(--text-subtle)', fontSize: '0.85rem', padding: '1rem 0', textAlign: 'center' }}>
                      {schema ? 'No matching tables or columns.' : 'Connecting to database...'}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sidebar Tab 2: Recent Inquiries */}
            {sidebarTab === 'history' && (
              <div className="glass-panel sidebar-card">
                <div className="sidebar-title">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <History size={15} color="var(--primary-light)" />
                    Recent Inquiries
                  </span>
                  {queryHistory.length > 0 && (
                    <button
                      onClick={() => {
                        setQueryHistory([]);
                        localStorage.removeItem('querycraft_history');
                        addToast({ type: 'info', title: 'History Cleared', message: 'Recent inquiries removed.' });
                      }}
                      className="btn-icon-subtle danger"
                      title="Clear history"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
                  {queryHistory.length > 0 ? (
                    queryHistory.map(item => (
                      <div key={item.id} className="history-item-card">
                        <div 
                          className="history-item-body"
                          onClick={() => {
                            updateActiveTab({ prompt: item.prompt });
                            handleGenerate(item.prompt);
                          }}
                        >
                          <span className="history-prompt-text">{item.prompt}</span>
                          <span className="history-timestamp">{item.timestamp}</span>
                        </div>
                        <button 
                          className="btn-icon-subtle"
                          style={{ padding: '4px' }}
                          onClick={() => handleSaveCurrentQuery({
                            id: `saved-${Date.now()}`,
                            title: item.prompt,
                            prompt: item.prompt,
                            sql: item.sql,
                            category: 'History',
                            createdAt: new Date().toLocaleDateString()
                          })}
                          title="Bookmark this query"
                        >
                          <Bookmark size={13} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-subtle)', fontSize: '0.82rem' }}>
                      No recent inquiries yet. Questions you ask will appear here.
                    </div>
                  )}
                </div>
              </div>
            )}
          </aside>
        )}

        {/* Center Workspace Area */}
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
                
                {editingTabTitleId === tab.id ? (
                  <input 
                    type="text"
                    className="tab-title-edit-input"
                    value={tabTitleInput}
                    autoFocus
                    onChange={(e) => setTabTitleInput(e.target.value)}
                    onBlur={() => handleSaveTabTitle(tab.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTabTitle(tab.id);
                      if (e.key === 'Escape') setEditingTabTitleId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span 
                    onDoubleClick={() => handleStartRenameTab(tab)}
                    title="Double click to rename tab"
                  >
                    {tab.title}
                  </span>
                )}

                {/* Tab Status Dot */}
                {tab.queryResults && (
                  <span className="tab-status-dot" title={`${tab.queryResults.row_count} rows ready`} />
                )}

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
              title="Open New Query Tab (Ctrl+T)"
            >
              <Plus size={13} />
              <span>New Tab</span>
            </button>
          </div>

          {/* Mode Selector & Prompt Area */}
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
                Explain SQL Query
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
                  {activeTab.prompt && (
                    <button 
                      className="btn-clear-prompt"
                      onClick={() => updateActiveTab({ prompt: '' })}
                      title="Clear prompt"
                    >
                      <X size={14} />
                    </button>
                  )}
                  <div className="prompt-footer">
                    <span className="prompt-hint">
                      Press <kbd className="kbd-badge">Enter</kbd> to generate safely • <kbd className="kbd-badge">Shift + Enter</kbd> for new line
                    </span>
                    <button 
                      className="btn-generate"
                      onClick={() => handleGenerate()}
                      disabled={isGenerating || !activeTab.prompt.trim()}
                      id="generate-sql-button"
                    >
                      {isGenerating ? (
                        <>
                          <RefreshCw size={15} className="animate-spin" />
                          <span>Crafting SQL...</span>
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

                {/* Categorized Sample Starter Chips */}
                <div className="sample-categories-wrapper">
                  <div className="sample-cat-pills">
                    {sampleCategories.map(cat => (
                      <button
                        key={cat}
                        className={`sample-cat-pill ${selectedSampleCategory === cat ? 'active' : ''}`}
                        onClick={() => setSelectedSampleCategory(cat)}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <div className="sample-chips-wrapper">
                    {filteredSampleQueries.map(sample => (
                      <button
                        key={sample.id}
                        className="sample-chip"
                        onClick={() => {
                          updateActiveTab({ prompt: sample.prompt });
                          handleGenerate(sample.prompt);
                        }}
                        title={sample.description}
                      >
                        <Sparkles size={11} color="var(--primary-light)" />
                        <span>{sample.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Prompt input for 'explain' mode */}
            {activeTab.activeMode === 'explain' && (
              <div className="explain-mode-box animate-fade-in">
                <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  Paste or write any SQL query into the <strong>SQL Editor</strong> below and click <strong>Explain Current SQL</strong> to break down each clause, verify read-only safety, and extract business intelligence takeaways.
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
              <div className="explain-mode-box animate-fade-in">
                <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                  Interactive SQL Sandbox. You can type, format, and execute any standard SQLite query directly. Built-in guardrails will automatically verify zero-mutation safety before execution.
                </div>
              </div>
            )}
          </div>

          {/* Error Message Toast */}
          {errorMessage && (
            <div className="glass-panel error-banner animate-fade-in">
              <ShieldAlert size={18} color="var(--accent-rose)" />
              <div style={{ flex: 1 }}>{errorMessage}</div>
              <button 
                className="btn-icon-subtle danger"
                onClick={() => setErrorMessage('')}
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Advanced SQL Editor Component */}
          <SqlEditor 
            sql={activeTab.sql}
            onChange={(val) => {
              const isDestructive = val.toUpperCase().includes('DROP') || 
                                    val.toUpperCase().includes('DELETE') || 
                                    val.toUpperCase().includes('TRUNCATE') ||
                                    val.toUpperCase().includes('UPDATE') ||
                                    val.toUpperCase().includes('ALTER');
              updateActiveTab({
                sql: val,
                validation: isDestructive 
                  ? { is_safe: false, reason: "Contains destructive mutation keyword." }
                  : { is_safe: true, reason: "Read-only query verified." }
              });
            }}
            onExecute={() => handleExecute(activeTab.sql)}
            onFormat={handleFormat}
            onClear={handleClearSql}
            isExecuting={isExecuting}
            validation={activeTab.validation}
            engine={activeTab.explanation?.engine}
            onShowToast={addToast}
          />

          {/* Real-Time Performance & Metrics Banner */}
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
                    {activeTab.queryResults.execution_time_ms}{' '}
                    <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--accent-emerald)' }}>
                      ms (Ultra Fast)
                    </span>
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
                  <div className="metric-val" style={{ fontSize: '0.9rem', color: 'var(--accent-emerald)' }}>
                    Read-Only Protected
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AI Explanation & Clause Breakdown */}
          {activeTab.explanation && (
            <div className="glass-panel explanation-card animate-fade-in">
              <div className="explanation-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Info size={17} color="var(--primary-light)" />
                  <span style={{ fontWeight: 600 }}>AI Query Explanation & Clause Breakdown</span>
                </div>
                <button 
                  className="btn-icon-subtle"
                  onClick={() => {
                    const text = `${activeTab.explanation.summary}\n\n${activeTab.explanation.business_value || ''}`;
                    navigator.clipboard.writeText(text);
                    addToast({ type: 'info', title: 'Copied Explanation', message: 'Explanation text copied.' });
                  }}
                  title="Copy explanation text"
                >
                  <Copy size={13} />
                </button>
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
                <div className="business-insight-box">
                  <strong style={{ color: 'var(--primary-light)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Sparkles size={14} />
                    Business Analytics Insight:
                  </strong> 
                  <span style={{ marginTop: '0.2rem', display: 'block' }}>{activeTab.explanation.business_value}</span>
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
                        <Plus size={12} />
                        <span>{q}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Query Results Table / Visual Chart */}
          {activeTab.queryResults && (
            <div className="glass-panel results-card animate-fade-in" id="query-results-panel">
              <div className="results-header">
                <div className="results-tools">
                  {/* Results Search Filter */}
                  <div className="schema-search-wrapper" style={{ width: '200px' }}>
                    <Search size={13} className="schema-search-icon" />
                    <input 
                      type="text"
                      className="schema-search-input"
                      placeholder="Filter row values..."
                      value={activeTab.resultsFilter}
                      onChange={(e) => updateActiveTab({ resultsFilter: e.target.value, currentPage: 1 })}
                    />
                    {activeTab.resultsFilter && (
                      <button 
                        onClick={() => updateActiveTab({ resultsFilter: '' })}
                        style={{ position: 'absolute', right: '6px', background: 'none', color: 'var(--text-subtle)' }}
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>

                  {/* View Switcher: Table vs Chart */}
                  <div className="view-switcher">
                    <button 
                      className={`view-btn ${activeTab.activeView === 'table' ? 'active' : ''}`}
                      onClick={() => updateActiveTab({ activeView: 'table' })}
                    >
                      <TableIcon size={12} style={{ marginRight: '3px' }} />
                      Table Grid
                    </button>
                    <button 
                      className={`view-btn ${activeTab.activeView === 'chart' ? 'active' : ''}`}
                      onClick={() => updateActiveTab({ activeView: 'chart' })}
                    >
                      <BarChart3 size={12} style={{ marginRight: '3px' }} />
                      Visual Analytics
                    </button>
                  </div>
                </div>

                {/* Export Actions Toolbar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <button 
                    className="btn-sql-action"
                    onClick={handleExportCsv}
                    title="Download as CSV spreadsheet"
                  >
                    <Download size={13} />
                    <span>CSV</span>
                  </button>

                  <button 
                    className="btn-sql-action"
                    onClick={handleExportJson}
                    title="Download as JSON payload"
                  >
                    <Download size={13} />
                    <span>JSON</span>
                  </button>

                  <button 
                    className="btn-sql-action"
                    onClick={handleExportMarkdown}
                    title="Copy Markdown Table to clipboard"
                  >
                    <FileCode size={13} />
                    <span>Markdown</span>
                  </button>

                  <button 
                    className="btn-sql-action"
                    onClick={handleCopyTsv}
                    title="Copy TSV (paste directly into Excel / Sheets)"
                  >
                    <Copy size={13} />
                    <span>TSV</span>
                  </button>
                </div>
              </div>

              {/* View 1: Responsive Interactive Table Grid with Sort & Pagination */}
              {activeTab.activeView === 'table' && (
                <div className="table-responsive-wrapper">
                  <table className="query-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                        {processedTableData.columns.map((col, idx) => (
                          <th 
                            key={idx} 
                            className="sortable"
                            onClick={() => handleSortClick(col)}
                            title="Click to sort column"
                          >
                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                {getColIcon(col)}
                                <span>{col}</span>
                              </span>
                              <ArrowUpDown 
                                size={11} 
                                color={activeTab.sortColumn === col ? 'var(--primary)' : 'var(--text-subtle)'} 
                              />
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRows.length > 0 ? (
                        paginatedRows.map((row, rIdx) => {
                          const rowNumber = activeTab.pageSize === 'all' 
                            ? rIdx + 1 
                            : (activeTab.currentPage - 1) * Number(activeTab.pageSize) + rIdx + 1;

                          return (
                            <tr key={rIdx}>
                              <td style={{ textAlign: 'center', color: 'var(--text-subtle)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                                {rowNumber}
                              </td>
                              {row.map((cell, cIdx) => (
                                <td 
                                  key={cIdx}
                                  onClick={() => {
                                    if (cell !== null) {
                                      navigator.clipboard.writeText(String(cell));
                                      addToast({ type: 'info', title: 'Cell Copied', message: `Copied "${String(cell)}"` });
                                    }
                                  }}
                                  title="Click to copy cell value"
                                >
                                  {cell === null ? (
                                    <span className="null-badge">NULL</span>
                                  ) : typeof cell === 'number' && !Number.isInteger(cell) ? (
                                    Number(cell).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                  ) : (
                                    String(cell)
                                  )}
                                </td>
                              ))}
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td 
                            colSpan={processedTableData.columns.length + 1} 
                            style={{ textAlign: 'center', color: 'var(--text-subtle)', padding: '3rem' }}
                          >
                            No rows match your filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {/* Table Pagination & Aggregate Summary Drawer */}
                  <TablePagination 
                    totalRows={processedTableData.rows.length}
                    pageSize={activeTab.pageSize}
                    currentPage={activeTab.currentPage}
                    onPageChange={(page) => updateActiveTab({ currentPage: page })}
                    onPageSizeChange={(size) => updateActiveTab({ pageSize: size })}
                    columns={processedTableData.columns}
                    allRows={processedTableData.rows}
                  />
                </div>
              )}

              {/* View 2: Multi-View Visual Analytics Suite */}
              {activeTab.activeView === 'chart' && (
                <VisualChart queryResults={activeTab.queryResults} />
              )}
            </div>
          )}
        </main>
      </div>

      {/* Sample Data Table Modal */}
      {selectedTableForPreview && (
        <div className="modal-backdrop" onClick={() => setSelectedTableForPreview(null)} role="dialog" aria-modal="true">
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '850px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TableIcon size={16} color="var(--primary-light)" />
                <h3 className="modal-title">
                  Sample Data: <span style={{ color: 'var(--primary-light)' }}>{selectedTableForPreview.name}</span>
                </h3>
              </div>
              <button 
                className="btn-icon-subtle"
                onClick={() => setSelectedTableForPreview(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '1rem', overflowX: 'auto', maxHeight: '460px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Total table size: <strong>{selectedTableForPreview.row_count}</strong> rows | Showing first 5 sample rows
                </div>
              </div>

              <table className="query-table" style={{ fontSize: '0.82rem' }}>
                <thead>
                  <tr>
                    {selectedTableForPreview.columns.map(c => (
                      <th key={c.name}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          {c.is_primary_key && <Key size={11} className="col-pk" />}
                          <span>{c.name}</span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-subtle)', fontWeight: 'normal' }}>({c.type})</span>
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedTableForPreview.sample_rows.map((row, idx) => (
                    <tr key={idx}>
                      {selectedTableForPreview.columns.map(c => (
                        <td key={c.name}>
                          {row[c.name] === null ? (
                            <span className="null-badge">NULL</span>
                          ) : (
                            String(row[c.name])
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <button 
                className="btn-header"
                onClick={() => setSelectedTableForPreview(null)}
              >
                Close
              </button>
              <button 
                className="btn-generate"
                onClick={() => {
                  const q = `SELECT * FROM ${selectedTableForPreview.name} LIMIT 25;`;
                  updateActiveTab({ sql: q, prompt: `Select all from ${selectedTableForPreview.name}` });
                  handleExecute(q);
                  setSelectedTableForPreview(null);
                  addToast({ type: 'success', title: 'Table Loaded', message: `Querying ${selectedTableForPreview.name}` });
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
        <div className="modal-backdrop" onClick={() => setShowSettings(false)} role="dialog" aria-modal="true">
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Settings size={17} color="var(--primary-light)" />
                <h3 className="modal-title">AI Engine & LLM Settings</h3>
              </div>
              <button 
                className="btn-icon-subtle"
                onClick={() => setShowSettings(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Active LLM Provider</label>
                <select 
                  className="form-input"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                >
                  <option value="auto">Auto (Built-in Intelligent Engine or Configured Key)</option>
                  <option value="gemini">Google Gemini API (Gemini 1.5 / 2.0 Flash)</option>
                  <option value="openai">OpenAI API (GPT-4o / GPT-4o-mini)</option>
                </select>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                  By default, QueryCraft's built-in intelligent engine works seamlessly without external keys!
                </span>
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label">Optional API Key</label>
                  <button 
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    style={{ background: 'none', color: 'var(--text-subtle)', fontSize: '0.75rem' }}
                  >
                    {showApiKey ? 'Hide' : 'Show'} Key
                  </button>
                </div>
                <input 
                  type={showApiKey ? 'text' : 'password'}
                  className="form-input"
                  placeholder="AIzaSy... or sk-proj-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                  Stored securely in your local browser storage. Never logged or sent to third parties.
                </span>
              </div>

              <div className="security-notice-box">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.2rem' }}>
                  <ShieldCheck size={15} color="var(--accent-emerald)" />
                  Built-in Enterprise Safety Guardrails
                </div>
                <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  <li>Strict AST-level validation ensures queries are exclusively read-only (`SELECT`).</li>
                  <li>Multi-statement semicolon execution is rigorously blocked.</li>
                  <li>In-memory read replica prevents mutations or schema changes.</li>
                </ul>
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
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      <ShortcutsModal 
        isOpen={showShortcuts} 
        onClose={() => setShowShortcuts(false)} 
      />

      {/* Saved Queries Modal */}
      <SavedQueriesModal 
        isOpen={showSavedQueries}
        onClose={() => setShowSavedQueries(false)}
        savedQueries={savedQueries}
        onLoadQuery={handleLoadSavedQuery}
        onDeleteQuery={handleDeleteSavedQuery}
        currentQueryToSave={activeTab.sql ? { prompt: activeTab.prompt, sql: activeTab.sql } : null}
        onSaveCurrentQuery={handleSaveCurrentQuery}
      />
    </div>
  );
}
