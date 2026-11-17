import React from 'react';
import { Keyboard, X } from 'lucide-react';

export default function ShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Enter', action: 'Generate SQL from natural language prompt', scope: 'Prompt Input' },
    { key: 'Ctrl + Enter / ⌘ + Enter', action: 'Execute SQL query immediately', scope: 'Global / Editor' },
    { key: 'Ctrl + K / ⌘ + K', action: 'Focus Schema & Table search', scope: 'Global' },
    { key: 'Ctrl + B / ⌘ + B', action: 'Toggle Sidebar collapse / expand', scope: 'Global' },
    { key: 'Ctrl + Shift + F', action: 'Format SQL query with clean indentation', scope: 'SQL Editor' },
    { key: 'Ctrl + T', action: 'Open a new query session tab', scope: 'Global' },
    { key: 'Shift + Enter', action: 'Insert new line in prompt without submitting', scope: 'Prompt Input' },
    { key: 'Esc', action: 'Close any active modal or dropdown', scope: 'Modals' },
    { key: '?', action: 'Open this Keyboard Shortcuts cheat sheet', scope: 'Global' },
  ];

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="shortcuts-title">
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div className="metric-icon-box indigo" style={{ width: '32px', height: '32px' }}>
              <Keyboard size={16} />
            </div>
            <h3 id="shortcuts-title" className="modal-title">Keyboard Shortcuts</h3>
          </div>
          <button 
            className="btn-icon-subtle" 
            onClick={onClose}
            aria-label="Close shortcuts modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '480px', overflowY: 'auto' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            Accelerate your workflow with quick keyboard actions designed for rapid query building and exploration.
          </p>

          <div className="shortcuts-list">
            {shortcuts.map((sc, idx) => (
              <div key={idx} className="shortcut-row">
                <div className="shortcut-keys">
                  {sc.key.split(' / ').map((k, kIdx) => (
                    <React.Fragment key={kIdx}>
                      {kIdx > 0 && <span style={{ color: 'var(--text-subtle)', margin: '0 4px', fontSize: '0.75rem' }}>or</span>}
                      <kbd className="kbd-badge">{k}</kbd>
                    </React.Fragment>
                  ))}
                </div>
                <div className="shortcut-desc">
                  <span>{sc.action}</span>
                  <span className="shortcut-scope">{sc.scope}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
            Tip: Press <kbd className="kbd-badge" style={{ padding: '0.1rem 0.4rem', fontSize: '0.7rem' }}>?</kbd> anytime to open this guide.
          </span>
          <button className="btn-header" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
