import React from 'react';
import { ArrowLeft, Save, Share, Download, MessageCircle, History, BarChart3, Users } from 'lucide-react';

export function CJMHeader({
    title, onTitleChange, onSave, onBack,
    onShareClick, onExportClick, onCommentsClick, onVersionsClick, onAnalyticsClick,
    commentCount, saveStatus, personas, selectedPersonaId, onPersonaChange
}) {
    return (
        <header className="cjm-header">
            <div className="cjm-header-left">
                <button onClick={onBack} className="cjm-icon-btn"><ArrowLeft size={20} /></button>
                <input
                    type="text"
                    value={title}
                    onChange={e => onTitleChange(e.target.value)}
                    className="cjm-title-input"
                    placeholder="Journey Name"
                />
                {saveStatus && (
                    <span className={`cjm-autosave ${saveStatus}`}>
                        {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : ''}
                    </span>
                )}
            </div>

            <div className="cjm-header-right">
                {personas && personas.length > 0 && (
                    <select
                        value={selectedPersonaId || ''}
                        onChange={e => onPersonaChange && onPersonaChange(e.target.value || null)}
                        style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#334155', background: 'white' }}
                    >
                        <option value="">No Persona</option>
                        {personas.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                )}

                {onAnalyticsClick && (
                    <button className="cjm-btn secondary" onClick={onAnalyticsClick} title="Analytics">
                        <BarChart3 size={18} />
                    </button>
                )}

                {onCommentsClick && (
                    <button className="cjm-btn secondary" onClick={onCommentsClick} title="Comments" style={{ position: 'relative' }}>
                        <MessageCircle size={18} />
                        {commentCount > 0 && (
                            <span style={{
                                position: 'absolute', top: -4, right: -4,
                                background: '#ef4444', color: 'white', borderRadius: '50%',
                                width: '18px', height: '18px', fontSize: '0.65rem', fontWeight: '700',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>{commentCount}</span>
                        )}
                    </button>
                )}

                {onVersionsClick && (
                    <button className="cjm-btn secondary" onClick={onVersionsClick} title="Version History">
                        <History size={18} />
                    </button>
                )}

                <button className="cjm-btn secondary" onClick={onExportClick} title="Export"><Download size={18} /> Export</button>
                <button className="cjm-btn secondary" onClick={onShareClick} title="Share"><Share size={18} /> Share</button>
                <button className="cjm-btn primary" onClick={onSave}><Save size={18} /> Save</button>
            </div>
        </header>
    );
}
