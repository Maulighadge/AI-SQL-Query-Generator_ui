import React, { useState } from 'react';
import { Bookmark, Play, Trash2, X, Download, Plus, Search, Tag, Clock } from 'lucide-react';

export default function SavedQueriesModal({ 
  isOpen, 
  onClose, 
  savedQueries, 
  onLoadQuery, 
  onDeleteQuery,
  currentQueryToSave,
  onSaveCurrentQuery
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [newTitle, setNewTitle] = useState(currentQueryToSave?.prompt || 'My Custom Query');
  const [newCategory, setNewCategory] = useState('Analytics');

  if (!isOpen) return null;

  const filteredQueries = savedQueries.filter(q => 
    q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (q.sql && q.sql.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (q.category && q.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleCreateSave = (e) => {
    e.preventDefault();
    if (!currentQueryToSave?.sql) return;
    onSaveCurrentQuery({
      id: `saved-${Date.now()}`,
      title: newTitle.trim() || 'Untitled Query',
      prompt: currentQueryToSave.prompt || '',
      sql: currentQueryToSave.sql,
      category: newCategory,
      createdAt: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    });
  };

  const handleExportAll = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(savedQueries, null, 2));
    const dl = document.createElement('a');
    dl.setAttribute("href", dataStr);
    dl.setAttribute("download", `querycraft_saved_queries_${Date.now()}.json`);
    document.body.appendChild(dl);
    dl.click();
    dl.remove();
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="saved-queries-title">
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '780px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div className="metric-icon-box emerald" style={{ width: '32px', height: '32px' }}>
              <Bookmark size={16} />
            </div>
            <div>
              <h3 id="saved-queries-title" className="modal-title">Saved Queries Library</h3>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-subtle)' }}>
                {savedQueries.length} query templates stored locally
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {savedQueries.length > 0 && (
              <button 
                className="btn-header"
                onClick={handleExportAll}
                title="Export all saved queries as JSON"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
              >
                <Download size={13} />
                <span>Export JSON</span>
              </button>
            )}
            <button 
              className="btn-icon-subtle" 
              onClick={onClose}
              aria-label="Close saved queries modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="modal-body" style={{ maxHeight: '520px', overflowY: 'auto' }}>
          {/* Quick Save Box for Active Query */}
          {currentQueryToSave?.sql && (
            <div className="save-active-box">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Plus size={14} color="var(--accent-emerald)" />
                  Bookmark Current Query
                </span>
                <span className="col-badge">Active Tab</span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <input 
                  type="text"
                  className="form-input"
                  style={{ flex: 1, minWidth: '200px' }}
                  placeholder="Enter a descriptive title for this query..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
                <select 
                  className="form-input" 
                  style={{ width: '130px' }}
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                >
                  <option value="Analytics">Analytics</option>
                  <option value="Sales">Sales</option>
                  <option value="Inventory">Inventory</option>
                  <option value="Customers">Customers</option>
                  <option value="Custom">Custom</option>
                </select>
                <button 
                  className="btn-generate"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.82rem' }}
                  onClick={handleCreateSave}
                >
                  Save Query
                </button>
              </div>
            </div>
          )}

          {/* Search Filter */}
          <div className="schema-search-wrapper" style={{ margin: '0.75rem 0' }}>
            <Search size={14} className="schema-search-icon" />
            <input 
              type="text"
              className="schema-search-input"
              placeholder="Search saved queries by title, category, or SQL code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Queries List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredQueries.length > 0 ? (
              filteredQueries.map(item => (
                <div key={item.id} className="saved-query-card">
                  <div className="saved-query-header">
                    <div>
                      <div className="saved-query-title">{item.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                        <span className="saved-query-tag">
                          <Tag size={10} />
                          {item.category || 'General'}
                        </span>
                        {item.createdAt && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            <Clock size={10} />
                            {item.createdAt}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <button 
                        className="btn-generate"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                        onClick={() => {
                          onLoadQuery(item);
                          onClose();
                        }}
                        title="Load this query into active tab"
                      >
                        <Play size={12} />
                        <span>Load</span>
                      </button>

                      <button 
                        className="btn-icon-subtle danger"
                        onClick={() => onDeleteQuery(item.id)}
                        title="Delete query"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {item.prompt && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontStyle: 'italic' }}>
                      Prompt: "{item.prompt}"
                    </div>
                  )}

                  <pre className="saved-query-code">
                    {item.sql}
                  </pre>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-subtle)' }}>
                {searchTerm ? 'No saved queries match your search filter.' : 'No saved queries yet. Bookmark a query from the editor to store it here!'}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-header" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
