import React, { useState, useMemo, useRef } from 'react';
import { 
  Play, 
  Copy, 
  Check, 
  ShieldCheck, 
  ShieldAlert, 
  Code2, 
  Trash2, 
  RefreshCw, 
  Maximize2, 
  Minimize2, 
  ChevronDown,
  Wand2
} from 'lucide-react';

export default function SqlEditor({
  sql,
  onChange,
  onExecute,
  onFormat,
  onClear,
  isExecuting,
  validation,
  engine,
  onShowToast
}) {
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSnippets, setShowSnippets] = useState(false);
  const textareaRef = useRef(null);

  // Line numbers calculation
  const linesCount = useMemo(() => {
    return Math.max((sql || '').split('\n').length, 6);
  }, [sql]);

  const lineNumbers = useMemo(() => {
    return Array.from({ length: linesCount }, (_, i) => i + 1);
  }, [linesCount]);

  const handleCopy = () => {
    if (!sql) return;
    navigator.clipboard.writeText(sql);
    setCopied(true);
    if (onShowToast) {
      onShowToast({ type: 'success', title: 'SQL Copied', message: 'Query copied to clipboard.' });
    }
    setTimeout(() => setCopied(false), 2000);
  };

  const insertSnippet = (snippet) => {
    const current = sql || '';
    const updated = current ? `${current.trim()}\n${snippet}` : snippet;
    onChange(updated);
    setShowSnippets(false);
    if (onShowToast) {
      onShowToast({ type: 'info', title: 'Snippet Added', message: `Inserted ${snippet}` });
    }
  };

  // Keyboard shortcut listener within editor
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onExecute();
    } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'F' || e.key === 'f')) {
      e.preventDefault();
      onFormat();
    }
  };

  return (
    <div className={`glass-panel sql-panel ${isFullscreen ? 'sql-panel-fullscreen' : ''}`}>
      {/* Editor Top Bar */}
      <div className="sql-panel-header">
        <div className="sql-title-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Code2 size={16} color="var(--primary-light)" />
            <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>SQL Editor</span>
          </div>

          {validation && (
            <div className={`safety-badge ${validation.is_safe ? 'safety-safe' : 'safety-unsafe'}`}>
              {validation.is_safe ? (
                <>
                  <ShieldCheck size={13} />
                  <span>Read-Only Verified</span>
                </>
              ) : (
                <>
                  <ShieldAlert size={13} />
                  <span>Unsafe / Blocked</span>
                </>
              )}
            </div>
          )}

          {engine && (
            <span className="engine-badge" title="AI Generation & Execution Model">
              {engine}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="sql-actions">
          {/* Quick Snippets Dropdown */}
          <div style={{ position: 'relative' }}>
            <button 
              className="btn-sql-action"
              onClick={() => setShowSnippets(!showSnippets)}
              title="Insert common SQL clause snippets"
            >
              <Wand2 size={13} />
              <span>Snippets</span>
              <ChevronDown size={11} />
            </button>

            {showSnippets && (
              <div className="dropdown-menu animate-scale-up" style={{ width: '180px' }}>
                <div className="dropdown-item" onClick={() => insertSnippet('LIMIT 20;')}>
                  LIMIT 20
                </div>
                <div className="dropdown-item" onClick={() => insertSnippet('ORDER BY 1 DESC;')}>
                  ORDER BY 1 DESC
                </div>
                <div className="dropdown-item" onClick={() => insertSnippet('WHERE 1=1')}>
                  WHERE 1=1
                </div>
                <div className="dropdown-item" onClick={() => insertSnippet('GROUP BY 1, 2')}>
                  GROUP BY 1, 2
                </div>
                <div className="dropdown-item" onClick={() => insertSnippet('HAVING count(*) > 1')}>
                  HAVING count(*) &gt; 1
                </div>
              </div>
            )}
          </div>

          <button 
            className="btn-sql-action"
            onClick={onFormat}
            title="Format SQL (Ctrl+Shift+F)"
          >
            <Code2 size={13} />
            <span>Format</span>
          </button>

          <button 
            className="btn-sql-action"
            onClick={handleCopy}
            title="Copy SQL to Clipboard"
          >
            {copied ? <Check size={13} color="var(--accent-emerald)" /> : <Copy size={13} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button 
            className="btn-sql-action"
            onClick={onClear}
            title="Clear Editor"
          >
            <Trash2 size={13} />
            <span>Clear</span>
          </button>

          <button 
            className="btn-sql-action"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Editor'}
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>

          <button 
            className="btn-sql-action btn-execute"
            onClick={onExecute}
            disabled={isExecuting || !sql?.trim() || (validation && !validation.is_safe)}
            title="Execute SQL Query (Ctrl+Enter)"
            id="execute-query-button"
          >
            {isExecuting ? (
              <>
                <RefreshCw size={13} className="animate-spin" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <Play size={13} />
                <span>Execute (Ctrl+↵)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="editor-with-gutter">
        {/* Line Numbers Gutter */}
        <div className="editor-gutter" aria-hidden="true">
          {lineNumbers.map(num => (
            <div key={num}>{num}</div>
          ))}
        </div>

        {/* Textarea Code Input */}
        <div className="editor-content-area">
          <textarea
            ref={textareaRef}
            className="sql-textarea"
            value={sql || ''}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="-- Type, generate, or paste SQL query here..."
            spellCheck="false"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
          />
        </div>
      </div>

      {/* Editor Footer Bar */}
      <div className="editor-footer-status">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span>Lines: <strong>{linesCount}</strong></span>
          <span>Characters: <strong>{(sql || '').length}</strong></span>
          <span style={{ color: 'var(--text-subtle)' }}>•</span>
          <span style={{ color: 'var(--text-subtle)' }}>SQLite 3.x Dialect</span>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
          Shortcut: <kbd className="kbd-badge">Ctrl</kbd> + <kbd className="kbd-badge">Enter</kbd> to execute
        </div>
      </div>
    </div>
  );
}
