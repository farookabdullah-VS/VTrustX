/**
 * Responses Tab — Draft, send, and track responses to social media mentions
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    MessageSquare, Plus, Send, Trash2, Edit2, X, RefreshCw,
    CheckCircle, Clock, AlertCircle, Sparkles, ChevronDown,
    Twitter, Instagram, Facebook, Linkedin, Youtube
} from 'lucide-react';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import socialListeningApi from '../../../services/socialListeningApi';

// ─── helpers ────────────────────────────────────────────────────────────────

const PLATFORM_ICONS = {
    twitter: Twitter,
    instagram: Instagram,
    facebook: Facebook,
    linkedin: Linkedin,
    youtube: Youtube,
};

function PlatformIcon({ platform, size = 14 }) {
    const Icon = PLATFORM_ICONS[platform?.toLowerCase()];
    if (!Icon) return <MessageSquare size={size} />;
    return <Icon size={size} />;
}

function StatusBadge({ status }) {
    const cfg = {
        draft:  { bg: '#fef9c3', color: '#a16207', icon: Edit2,        label: 'Draft' },
        sent:   { bg: '#d1fae5', color: '#065f46', icon: CheckCircle,   label: 'Sent' },
        failed: { bg: '#fee2e2', color: '#991b1b', icon: AlertCircle,   label: 'Failed' },
    }[status] || { bg: '#f3f4f6', color: '#6b7280', icon: Clock, label: status };
    const Icon = cfg.icon;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '3px 9px', borderRadius: 6,
            background: cfg.bg, color: cfg.color, fontSize: 12, fontWeight: 500,
        }}>
            <Icon size={12} />{cfg.label}
        </span>
    );
}

// ─── New-Response / AI-Generate Modal ───────────────────────────────────────

function ResponseModal({ mentionId, onClose, onSaved }) {
    const [mentions, setMentions] = useState([]);
    const [selectedMentionId, setSelectedMentionId] = useState(mentionId || '');
    const [responseText, setResponseText] = useState('');
    const [responseType, setResponseType] = useState('manual');
    const [sendNow, setSendNow] = useState(false);
    const [tone, setTone] = useState('professional');
    const [aiInstructions, setAiInstructions] = useState('');
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        socialListeningApi.mentions.list({ limit: 100, status: 'new,pending' })
            .then(r => setMentions(r.data?.mentions || r.data || []))
            .catch(() => {});
    }, []);

    const generateAI = async () => {
        if (!selectedMentionId) { setError('Select a mention first'); return; }
        setGenerating(true);
        setError('');
        try {
            const res = await socialListeningApi.responses.aiGenerate({
                mentionId: selectedMentionId,
                tone,
                instructions: aiInstructions || undefined,
            });
            setResponseText(res.data.response || '');
            setResponseType('ai_generated');
        } catch (e) {
            setError('AI generation failed — try again or write manually');
        } finally {
            setGenerating(false);
        }
    };

    const handleSave = async () => {
        if (!selectedMentionId) { setError('Select a mention'); return; }
        if (!responseText.trim()) { setError('Response text is required'); return; }
        setSaving(true);
        setError('');
        try {
            await socialListeningApi.responses.create({
                mentionId: selectedMentionId,
                responseText,
                responseType,
                sendNow,
            });
            onSaved();
        } catch (e) {
            setError(e.response?.data?.error || 'Failed to save response');
        } finally {
            setSaving(false);
        }
    };

    const selectedMention = mentions.find(m => m.id === selectedMentionId);

    return (
        <div className="rt-overlay" onClick={onClose}>
            <div className="rt-modal" onClick={e => e.stopPropagation()}>
                <div className="rt-modal-header">
                    <h3>New Response</h3>
                    <button className="rt-icon-btn" onClick={onClose}><X size={18} /></button>
                </div>

                <div className="rt-modal-body">
                    {error && <div className="rt-error">{error}</div>}

                    {/* Mention picker */}
                    <label className="rt-label">
                        Mention to respond to *
                        <select className="rt-input" value={selectedMentionId}
                            onChange={e => setSelectedMentionId(e.target.value)}
                            disabled={!!mentionId}>
                            <option value="">— select a mention —</option>
                            {mentions.map(m => (
                                <option key={m.id} value={m.id}>
                                    @{m.author_handle || m.author_name} · {(m.content || '').slice(0, 60)}
                                </option>
                            ))}
                        </select>
                    </label>

                    {/* Preview original */}
                    {selectedMention && (
                        <div className="rt-mention-preview">
                            <div className="rt-mention-meta">
                                <PlatformIcon platform={selectedMention.platform} size={13} />
                                <strong>@{selectedMention.author_handle || selectedMention.author_name}</strong>
                                <span style={{ color: '#9ca3af' }}>·</span>
                                <span style={{ color: '#9ca3af', fontSize: 12 }}>
                                    {selectedMention.platform}
                                </span>
                            </div>
                            <p className="rt-mention-text">{selectedMention.content}</p>
                        </div>
                    )}

                    {/* AI generate section */}
                    <div className="rt-ai-section">
                        <div className="rt-ai-row">
                            <label className="rt-label" style={{ flex: 1 }}>
                                Tone
                                <select className="rt-input" value={tone} onChange={e => setTone(e.target.value)}>
                                    <option value="professional">Professional</option>
                                    <option value="friendly">Friendly</option>
                                    <option value="empathetic">Empathetic</option>
                                    <option value="formal">Formal</option>
                                </select>
                            </label>
                            <label className="rt-label" style={{ flex: 2 }}>
                                Instructions (optional)
                                <input className="rt-input" type="text" value={aiInstructions}
                                    onChange={e => setAiInstructions(e.target.value)}
                                    placeholder="e.g. Apologise and offer a solution" />
                            </label>
                            <button className="rt-ai-btn" onClick={generateAI} disabled={generating || !selectedMentionId}>
                                <Sparkles size={14} />
                                {generating ? 'Generating…' : 'AI Draft'}
                            </button>
                        </div>
                    </div>

                    {/* Response text */}
                    <label className="rt-label">
                        Response *
                        <textarea className="rt-textarea" rows={5} value={responseText}
                            onChange={e => setResponseText(e.target.value)}
                            placeholder="Type your response…" />
                        <div className="rt-char-count">{responseText.length} characters</div>
                    </label>

                    {/* Send now toggle */}
                    <label className="rt-checkbox-label">
                        <input type="checkbox" checked={sendNow}
                            onChange={e => setSendNow(e.target.checked)} />
                        Send immediately (uncheck to save as draft)
                    </label>
                </div>

                <div className="rt-modal-footer">
                    <button className="rt-btn secondary" onClick={onClose}>Cancel</button>
                    <button className="rt-btn primary" onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving…' : sendNow ? 'Send Now' : 'Save as Draft'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Edit / Resend Modal ─────────────────────────────────────────────────────

function EditResponseModal({ response, onClose, onSaved }) {
    const [responseText, setResponseText] = useState(response.response_text || '');
    const [sendNow, setSendNow] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSave = async () => {
        if (!responseText.trim()) { setError('Response text is required'); return; }
        setSaving(true);
        setError('');
        try {
            await socialListeningApi.responses.update(response.id, { responseText, sendNow });
            onSaved();
        } catch (e) {
            setError(e.response?.data?.error || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="rt-overlay" onClick={onClose}>
            <div className="rt-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                <div className="rt-modal-header">
                    <h3>Edit Response</h3>
                    <button className="rt-icon-btn" onClick={onClose}><X size={18} /></button>
                </div>
                <div className="rt-modal-body">
                    {error && <div className="rt-error">{error}</div>}
                    {response.mention_content && (
                        <div className="rt-mention-preview">
                            <p className="rt-mention-text">{response.mention_content}</p>
                        </div>
                    )}
                    <label className="rt-label">
                        Response *
                        <textarea className="rt-textarea" rows={5} value={responseText}
                            onChange={e => setResponseText(e.target.value)} />
                    </label>
                    <label className="rt-checkbox-label">
                        <input type="checkbox" checked={sendNow}
                            onChange={e => setSendNow(e.target.checked)} />
                        Send immediately after saving
                    </label>
                </div>
                <div className="rt-modal-footer">
                    <button className="rt-btn secondary" onClick={onClose}>Cancel</button>
                    <button className="rt-btn primary" onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving…' : sendNow ? 'Save & Send' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Tab ────────────────────────────────────────────────────────────────

const ResponsesTab = () => {
    const [responses, setResponses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const [showNewModal, setShowNewModal] = useState(false);
    const [editingResponse, setEditingResponse] = useState(null);
    const [sendingId, setSendingId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 30 });

    const fetchResponses = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                page: pagination.page,
                limit: pagination.limit,
                ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
            };
            const res = await socialListeningApi.responses.list(params);
            const data = res.data;
            setResponses(Array.isArray(data) ? data : (data?.responses || []));
            if (data?.pagination) {
                setPagination(prev => ({ ...prev, total: data.pagination.total }));
            }
        } catch (e) {
            console.error('Failed to fetch responses:', e);
            setResponses([]);
        } finally {
            setLoading(false);
        }
    }, [statusFilter, pagination.page, pagination.limit]);

    useEffect(() => {
        fetchResponses();
    }, [fetchResponses]);

    const handleSend = async (id) => {
        setSendingId(id);
        try {
            await socialListeningApi.responses.send(id);
            fetchResponses();
        } catch (e) {
            console.error('Failed to send:', e);
        } finally {
            setSendingId(null);
        }
    };

    const handleDelete = async (id) => {
        setDeletingId(id);
        try {
            await socialListeningApi.responses.delete(id);
            setDeleteConfirmId(null);
            fetchResponses();
        } catch (e) {
            console.error('Failed to delete:', e);
        } finally {
            setDeletingId(null);
        }
    };

    const STATUS_FILTERS = [
        { value: 'all', label: 'All' },
        { value: 'draft', label: 'Drafts' },
        { value: 'sent', label: 'Sent' },
        { value: 'failed', label: 'Failed' },
    ];

    const counts = {
        all: responses.length,
        draft: responses.filter(r => r.status === 'draft').length,
        sent: responses.filter(r => r.status === 'sent').length,
        failed: responses.filter(r => r.status === 'failed').length,
    };

    return (
        <div className="responses-tab">
            {/* Header */}
            <div className="sl-tab-section">
                <div className="sl-section-header">
                    <h2 className="sl-section-title">
                        <MessageSquare size={20} />
                        Responses
                    </h2>
                    <button className="sl-button" onClick={() => setShowNewModal(true)}>
                        <Plus size={18} />
                        New Response
                    </button>
                </div>

                {/* Status filter chips */}
                <div className="rt-filter-chips">
                    {STATUS_FILTERS.map(f => (
                        <button key={f.value}
                            className={`rt-chip ${statusFilter === f.value ? 'active' : ''}`}
                            onClick={() => { setStatusFilter(f.value); setPagination(p => ({ ...p, page: 1 })); }}>
                            {f.label}
                            <span className="rt-chip-count">{counts[f.value] ?? 0}</span>
                        </button>
                    ))}
                    <button className="rt-icon-btn" style={{ marginLeft: 'auto' }} onClick={fetchResponses} title="Refresh">
                        <RefreshCw size={15} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="sl-tab-section">
                {loading ? (
                    <div className="sl-loading-container"><LoadingSpinner /></div>
                ) : responses.length === 0 ? (
                    <div className="sl-empty-state">
                        <MessageSquare size={48} className="sl-empty-icon" />
                        <h3>No responses yet</h3>
                        <p>
                            {statusFilter === 'all'
                                ? 'Start responding to mentions to build engagement'
                                : `No ${statusFilter} responses`}
                        </p>
                        {statusFilter === 'all' && (
                            <button className="sl-button" onClick={() => setShowNewModal(true)}>
                                <Plus size={18} /> New Response
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="rt-list">
                        {responses.map(r => (
                            <div key={r.id} className={`rt-card rt-card--${r.status}`}>
                                {/* Mention context */}
                                <div className="rt-card-mention">
                                    <div className="rt-card-mention-meta">
                                        <PlatformIcon platform={r.platform} size={13} />
                                        <strong>@{r.author_handle || r.author_name || 'unknown'}</strong>
                                        {r.platform && <span className="rt-platform-badge">{r.platform}</span>}
                                        <span className="rt-separator" />
                                        <span className="rt-date">
                                            {new Date(r.created_at).toLocaleDateString(undefined, {
                                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                    {r.mention_content && (
                                        <p className="rt-card-original">
                                            "{r.mention_content.length > 140
                                                ? r.mention_content.slice(0, 140) + '…'
                                                : r.mention_content}"
                                        </p>
                                    )}
                                </div>

                                {/* Response body */}
                                <div className="rt-card-response">
                                    <div className="rt-card-response-header">
                                        <div className="rt-card-response-label">
                                            {r.response_type === 'ai_generated' && (
                                                <span className="rt-ai-badge"><Sparkles size={11} /> AI</span>
                                            )}
                                            Response
                                        </div>
                                        <StatusBadge status={r.status} />
                                    </div>
                                    <p className="rt-card-response-text">{r.response_text}</p>
                                    {r.sent_at && (
                                        <div className="rt-sent-info">
                                            Sent {new Date(r.sent_at).toLocaleString()}
                                            {r.sent_by_name && ` by ${r.sent_by_name}`}
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="rt-card-actions">
                                    {r.status === 'draft' && (
                                        <>
                                            <button className="rt-action-btn send"
                                                onClick={() => handleSend(r.id)}
                                                disabled={sendingId === r.id}>
                                                <Send size={13} />
                                                {sendingId === r.id ? 'Sending…' : 'Send'}
                                            </button>
                                            <button className="rt-action-btn edit"
                                                onClick={() => setEditingResponse(r)}>
                                                <Edit2 size={13} /> Edit
                                            </button>
                                        </>
                                    )}
                                    {r.status === 'failed' && (
                                        <button className="rt-action-btn edit"
                                            onClick={() => setEditingResponse(r)}>
                                            <RefreshCw size={13} /> Edit &amp; Resend
                                        </button>
                                    )}
                                    {r.status === 'draft' && (
                                        deleteConfirmId === r.id ? (
                                            <div className="rt-delete-confirm">
                                                <span>Delete draft?</span>
                                                <button className="rt-action-btn danger"
                                                    onClick={() => handleDelete(r.id)}
                                                    disabled={deletingId === r.id}>
                                                    {deletingId === r.id ? '…' : 'Delete'}
                                                </button>
                                                <button className="rt-action-btn cancel"
                                                    onClick={() => setDeleteConfirmId(null)}>
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <button className="rt-icon-btn danger"
                                                onClick={() => setDeleteConfirmId(r.id)}>
                                                <Trash2 size={14} />
                                            </button>
                                        )
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {pagination.total > pagination.limit && (
                    <div className="rt-pagination">
                        <button className="rt-btn secondary"
                            disabled={pagination.page === 1}
                            onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}>
                            Previous
                        </button>
                        <span className="rt-page-info">
                            Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)}
                        </span>
                        <button className="rt-btn secondary"
                            disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
                            onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}>
                            Next
                        </button>
                    </div>
                )}
            </div>

            {/* Modals */}
            {showNewModal && (
                <ResponseModal
                    onClose={() => setShowNewModal(false)}
                    onSaved={() => { setShowNewModal(false); fetchResponses(); }} />
            )}
            {editingResponse && (
                <EditResponseModal
                    response={editingResponse}
                    onClose={() => setEditingResponse(null)}
                    onSaved={() => { setEditingResponse(null); fetchResponses(); }} />
            )}

            <style>{`
                .responses-tab { padding: 0; }

                /* Filter chips */
                .rt-filter-chips { display: flex; gap: 6px; align-items: center; margin-top: 12px; flex-wrap: wrap; }
                .rt-chip {
                    display: inline-flex; align-items: center; gap: 6px;
                    padding: 5px 12px; border: 1px solid #e5e7eb; border-radius: 20px;
                    font-size: 13px; cursor: pointer; background: #fff; color: #6b7280;
                }
                .rt-chip.active { background: #3b82f6; color: #fff; border-color: #3b82f6; }
                .rt-chip:hover:not(.active) { border-color: #93c5fd; color: #2563eb; }
                .rt-chip-count {
                    background: rgba(0,0,0,0.08); border-radius: 10px;
                    padding: 0 6px; font-size: 11px; font-weight: 600;
                }
                .rt-chip.active .rt-chip-count { background: rgba(255,255,255,0.25); }

                /* Cards */
                .rt-list { display: flex; flex-direction: column; gap: 12px; }
                .rt-card {
                    background: #fff; border: 1px solid #e5e7eb; border-radius: 10px;
                    overflow: hidden;
                }
                .rt-card--sent { border-left: 3px solid #10b981; }
                .rt-card--draft { border-left: 3px solid #f59e0b; }
                .rt-card--failed { border-left: 3px solid #ef4444; }

                .rt-card-mention { padding: 12px 16px 10px; background: #f9fafb; border-bottom: 1px solid #f0f0f0; }
                .rt-card-mention-meta { display: flex; align-items: center; gap: 7px; font-size: 13px; margin-bottom: 5px; flex-wrap: wrap; }
                .rt-card-original { font-size: 13px; color: #6b7280; font-style: italic; margin: 0; line-height: 1.5; }
                .rt-platform-badge {
                    font-size: 11px; padding: 1px 7px; background: #e5e7eb;
                    border-radius: 4px; color: #6b7280; text-transform: capitalize;
                }
                .rt-separator { width: 1px; height: 12px; background: #e5e7eb; }
                .rt-date { font-size: 12px; color: #9ca3af; }

                .rt-card-response { padding: 12px 16px; }
                .rt-card-response-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
                .rt-card-response-label { font-size: 12px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.04em; display: flex; align-items: center; gap: 5px; }
                .rt-card-response-text { font-size: 14px; color: #111827; line-height: 1.6; margin: 0; }
                .rt-ai-badge {
                    display: inline-flex; align-items: center; gap: 3px;
                    padding: 1px 6px; background: #ede9fe; color: #7c3aed;
                    border-radius: 4px; font-size: 11px;
                }
                .rt-sent-info { font-size: 12px; color: #9ca3af; margin-top: 6px; }

                .rt-card-actions { padding: 8px 16px 12px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
                .rt-action-btn {
                    display: inline-flex; align-items: center; gap: 5px;
                    padding: 5px 12px; border-radius: 6px; font-size: 12px;
                    cursor: pointer; border: 1px solid transparent; font-weight: 500;
                }
                .rt-action-btn.send { background: #dbeafe; color: #1d4ed8; border-color: #bfdbfe; }
                .rt-action-btn.send:hover { background: #bfdbfe; }
                .rt-action-btn.edit { background: #f3f4f6; color: #374151; border-color: #e5e7eb; }
                .rt-action-btn.edit:hover { background: #e5e7eb; }
                .rt-action-btn.danger { background: #fee2e2; color: #dc2626; border-color: #fecaca; }
                .rt-action-btn.danger:hover { background: #fecaca; }
                .rt-action-btn.cancel { background: #f3f4f6; color: #6b7280; border-color: #e5e7eb; }
                .rt-action-btn:disabled { opacity: 0.55; cursor: not-allowed; }

                .rt-delete-confirm { display: flex; align-items: center; gap: 8px; font-size: 13px; }

                /* Pagination */
                .rt-pagination { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 16px 0; }
                .rt-page-info { font-size: 13px; color: #6b7280; }

                /* Modal */
                .rt-overlay {
                    position: fixed; inset: 0; background: rgba(0,0,0,0.5);
                    display: flex; align-items: center; justify-content: center;
                    z-index: 1000; padding: 20px;
                }
                .rt-modal {
                    background: #fff; border-radius: 12px; width: 100%;
                    max-width: 600px; max-height: 90vh; display: flex; flex-direction: column;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.2);
                }
                .rt-modal-header {
                    display: flex; justify-content: space-between; align-items: center;
                    padding: 20px 24px 16px; border-bottom: 1px solid #f0f0f0;
                }
                .rt-modal-header h3 { margin: 0; font-size: 16px; font-weight: 600; }
                .rt-modal-body { padding: 20px 24px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 14px; }
                .rt-modal-footer {
                    padding: 14px 24px; border-top: 1px solid #f0f0f0;
                    display: flex; justify-content: flex-end; gap: 8px;
                }

                .rt-label { display: flex; flex-direction: column; gap: 5px; font-size: 13px; font-weight: 500; color: #374151; }
                .rt-input { padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; outline: none; }
                .rt-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.1); }
                .rt-textarea { padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; resize: vertical; outline: none; }
                .rt-textarea:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.1); }
                .rt-char-count { font-size: 11px; color: #9ca3af; text-align: right; }
                .rt-checkbox-label { display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer; }
                .rt-error { background: #fef2f2; color: #ef4444; padding: 8px 12px; border-radius: 6px; font-size: 13px; }

                .rt-mention-preview { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 14px; }
                .rt-mention-meta { display: flex; align-items: center; gap: 7px; font-size: 13px; margin-bottom: 4px; }
                .rt-mention-text { font-size: 13px; color: #6b7280; margin: 0; line-height: 1.5; }

                .rt-ai-section { background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 8px; padding: 12px; }
                .rt-ai-row { display: flex; gap: 10px; align-items: flex-end; }
                .rt-ai-btn {
                    display: inline-flex; align-items: center; gap: 5px;
                    padding: 8px 14px; background: #7c3aed; color: #fff;
                    border: none; border-radius: 6px; font-size: 13px; cursor: pointer;
                    white-space: nowrap; flex-shrink: 0;
                }
                .rt-ai-btn:hover { background: #6d28d9; }
                .rt-ai-btn:disabled { opacity: 0.6; cursor: not-allowed; }

                .rt-btn {
                    padding: 8px 18px; border-radius: 6px; font-size: 13px;
                    cursor: pointer; font-weight: 500; border: none;
                }
                .rt-btn.primary { background: #3b82f6; color: #fff; }
                .rt-btn.primary:hover { background: #2563eb; }
                .rt-btn.primary:disabled { opacity: 0.6; cursor: not-allowed; }
                .rt-btn.secondary { background: #f3f4f6; color: #374151; }
                .rt-btn.secondary:hover { background: #e5e7eb; }
                .rt-btn.secondary:disabled { opacity: 0.55; cursor: not-allowed; }

                .rt-icon-btn {
                    background: none; border: none; cursor: pointer; padding: 5px;
                    border-radius: 5px; color: #9ca3af; display: inline-flex; align-items: center;
                }
                .rt-icon-btn:hover { background: #f3f4f6; color: #374151; }
                .rt-icon-btn.danger:hover { background: #fee2e2; color: #ef4444; }
            `}</style>
        </div>
    );
};

export default ResponsesTab;
