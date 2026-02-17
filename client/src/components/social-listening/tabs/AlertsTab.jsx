import React, { useState, useEffect } from 'react';
import {
    Bell, Plus, AlertCircle, CheckCircle, Clock, X, Edit2,
    Trash2, ToggleLeft, ToggleRight, ChevronDown, MessageSquare
} from 'lucide-react';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import socialListeningApi from '../../../services/socialListeningApi';

const RULE_TYPES = [
    { value: 'sentiment_threshold', label: 'Sentiment Threshold' },
    { value: 'keyword_match', label: 'Keyword Match' },
    { value: 'influencer_mention', label: 'Influencer Mention' },
    { value: 'volume_spike', label: 'Volume Spike' },
    { value: 'competitor_spike', label: 'Competitor Spike' },
];

const ACTION_TYPES = [
    { value: 'notification', label: 'In-App Notification' },
    { value: 'email', label: 'Email Alert' },
    { value: 'ctl_alert', label: 'CTL Alert' },
    { value: 'ticket', label: 'Create Ticket' },
    { value: 'webhook', label: 'Webhook' },
];

const PLATFORMS = ['twitter', 'facebook', 'instagram', 'linkedin', 'youtube', 'reddit'];

const DEFAULT_FORM = {
    name: '',
    rule_type: 'sentiment_threshold',
    cooldown_minutes: 60,
    platforms: [],
    conditions: { threshold: -0.5, sentimentType: 'negative' },
    actions: [{ type: 'notification', config: {} }],
};

function ConditionsFields({ ruleType, conditions, onChange }) {
    const set = (key, val) => onChange({ ...conditions, [key]: val });

    if (ruleType === 'sentiment_threshold') return (
        <div className="form-grid">
            <label>
                Sentiment Threshold (−1 to 1)
                <input type="number" min="-1" max="1" step="0.1"
                    value={conditions.threshold ?? -0.5}
                    onChange={e => set('threshold', parseFloat(e.target.value))} />
            </label>
            <label>
                Sentiment Type
                <select value={conditions.sentimentType || 'negative'} onChange={e => set('sentimentType', e.target.value)}>
                    <option value="negative">Negative</option>
                    <option value="positive">Positive</option>
                </select>
            </label>
        </div>
    );

    if (ruleType === 'keyword_match') return (
        <div className="form-grid">
            <label style={{ gridColumn: '1/-1' }}>
                Keywords (comma-separated)
                <input type="text"
                    value={(conditions.keywords || []).join(', ')}
                    onChange={e => set('keywords', e.target.value.split(',').map(k => k.trim()).filter(Boolean))}
                    placeholder="refund, scam, lawsuit" />
            </label>
            <label>
                Match Type
                <select value={conditions.matchType || 'any'} onChange={e => set('matchType', e.target.value)}>
                    <option value="any">Any keyword</option>
                    <option value="all">All keywords</option>
                </select>
            </label>
        </div>
    );

    if (ruleType === 'influencer_mention') return (
        <div className="form-grid">
            <label>
                Min Followers
                <input type="number" min="0"
                    value={conditions.minFollowers ?? 10000}
                    onChange={e => set('minFollowers', parseInt(e.target.value))} />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox"
                    checked={!!conditions.requireVerified}
                    onChange={e => set('requireVerified', e.target.checked)} />
                Require Verified Account
            </label>
        </div>
    );

    if (ruleType === 'volume_spike') return (
        <div className="form-grid">
            <label>
                Time Window (minutes)
                <input type="number" min="5"
                    value={conditions.timeWindow ?? 60}
                    onChange={e => set('timeWindow', parseInt(e.target.value))} />
            </label>
            <label>
                Increase % Threshold
                <input type="number" min="1"
                    value={conditions.increasePercentage ?? 50}
                    onChange={e => set('increasePercentage', parseInt(e.target.value))} />
            </label>
            <label>
                Min Mentions
                <input type="number" min="1"
                    value={conditions.minMentions ?? 10}
                    onChange={e => set('minMentions', parseInt(e.target.value))} />
            </label>
        </div>
    );

    if (ruleType === 'competitor_spike') return (
        <div className="form-grid">
            <label>
                Competitor ID
                <input type="text"
                    value={conditions.competitorId || ''}
                    onChange={e => set('competitorId', e.target.value)}
                    placeholder="Competitor identifier" />
            </label>
            <label>
                Increase % Threshold
                <input type="number" min="1"
                    value={conditions.increasePercentage ?? 30}
                    onChange={e => set('increasePercentage', parseInt(e.target.value))} />
            </label>
        </div>
    );

    return null;
}

function ActionConfig({ action, onChange, onRemove, index }) {
    const setConfig = (key, val) => onChange({ ...action, config: { ...action.config, [key]: val } });

    return (
        <div className="action-row">
            <select value={action.type} onChange={e => onChange({ ...action, type: e.target.value, config: {} })}>
                {ACTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            {action.type === 'email' && (
                <input type="text"
                    placeholder="recipient@example.com, ..."
                    value={(action.config.recipients || []).join(', ')}
                    onChange={e => setConfig('recipients', e.target.value.split(',').map(r => r.trim()).filter(Boolean))} />
            )}
            {action.type === 'ticket' && (
                <select value={action.config.priority || 'medium'} onChange={e => setConfig('priority', e.target.value)}>
                    <option value="low">Low priority</option>
                    <option value="medium">Medium priority</option>
                    <option value="high">High priority</option>
                    <option value="critical">Critical priority</option>
                </select>
            )}
            {action.type === 'webhook' && (
                <input type="text"
                    placeholder="https://your-webhook-url.com"
                    value={action.config.url || ''}
                    onChange={e => setConfig('url', e.target.value)} />
            )}
            {index > 0 && (
                <button className="icon-btn danger" onClick={onRemove} title="Remove action">
                    <X size={14} />
                </button>
            )}
        </div>
    );
}

function AlertRuleModal({ rule, onClose, onSaved }) {
    const isEdit = !!rule?.id;
    const [form, setForm] = useState(() => rule ? {
        name: rule.name || '',
        rule_type: rule.rule_type || 'sentiment_threshold',
        cooldown_minutes: rule.cooldown_minutes || 60,
        platforms: rule.platforms || [],
        conditions: rule.conditions || {},
        actions: rule.actions?.length ? rule.actions : [{ type: 'notification', config: {} }],
    } : { ...DEFAULT_FORM });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const setField = (key, val) => setForm(f => ({ ...f, [key]: val }));

    const togglePlatform = (p) => {
        setForm(f => ({
            ...f,
            platforms: f.platforms.includes(p) ? f.platforms.filter(x => x !== p) : [...f.platforms, p]
        }));
    };

    const updateAction = (i, action) => {
        const actions = [...form.actions];
        actions[i] = action;
        setField('actions', actions);
    };

    const addAction = () => setField('actions', [...form.actions, { type: 'notification', config: {} }]);
    const removeAction = (i) => setField('actions', form.actions.filter((_, idx) => idx !== i));

    const handleSubmit = async () => {
        if (!form.name.trim()) { setError('Name is required'); return; }
        setSaving(true);
        setError('');
        try {
            if (isEdit) {
                await socialListeningApi.alerts.update(rule.id, form);
            } else {
                await socialListeningApi.alerts.create(form);
            }
            onSaved();
        } catch (e) {
            setError(e.response?.data?.error || 'Failed to save rule');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{isEdit ? 'Edit Alert Rule' : 'Create Alert Rule'}</h3>
                    <button className="icon-btn" onClick={onClose}><X size={18} /></button>
                </div>

                <div className="modal-body">
                    {error && <div className="form-error">{error}</div>}

                    <label className="form-label">
                        Rule Name *
                        <input className="form-input" type="text" value={form.name}
                            onChange={e => setField('name', e.target.value)}
                            placeholder="e.g. Critical Negative Sentiment" />
                    </label>

                    <label className="form-label">
                        Rule Type
                        <select className="form-input" value={form.rule_type}
                            onChange={e => {
                                const defaults = {
                                    sentiment_threshold: { threshold: -0.5, sentimentType: 'negative' },
                                    keyword_match: { keywords: [], matchType: 'any' },
                                    influencer_mention: { minFollowers: 10000, requireVerified: false },
                                    volume_spike: { timeWindow: 60, increasePercentage: 50, minMentions: 10 },
                                    competitor_spike: { competitorId: '', increasePercentage: 30 },
                                };
                                setForm(f => ({ ...f, rule_type: e.target.value, conditions: defaults[e.target.value] || {} }));
                            }}>
                            {RULE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                    </label>

                    <div className="form-section-title">Conditions</div>
                    <ConditionsFields
                        ruleType={form.rule_type}
                        conditions={form.conditions}
                        onChange={c => setField('conditions', c)} />

                    <div className="form-section-title">Platforms (leave empty for all)</div>
                    <div className="platform-chips">
                        {PLATFORMS.map(p => (
                            <button key={p} type="button"
                                className={`platform-chip ${form.platforms.includes(p) ? 'selected' : ''}`}
                                onClick={() => togglePlatform(p)}>
                                {p}
                            </button>
                        ))}
                    </div>

                    <label className="form-label">
                        Cooldown (minutes)
                        <input className="form-input" type="number" min="1"
                            value={form.cooldown_minutes}
                            onChange={e => setField('cooldown_minutes', parseInt(e.target.value))} />
                    </label>

                    <div className="form-section-title">Actions</div>
                    {form.actions.map((action, i) => (
                        <ActionConfig key={i} action={action} index={i}
                            onChange={a => updateAction(i, a)}
                            onRemove={() => removeAction(i)} />
                    ))}
                    <button className="add-action-btn" onClick={addAction}>
                        <Plus size={14} /> Add Action
                    </button>
                </div>

                <div className="modal-footer">
                    <button className="sl-button secondary" onClick={onClose}>Cancel</button>
                    <button className="sl-button" onClick={handleSubmit} disabled={saving}>
                        {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Rule'}
                    </button>
                </div>
            </div>
        </div>
    );
}

const AlertsTab = () => {
    const [alerts, setAlerts] = useState([]);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeView, setActiveView] = useState('events');
    const [showModal, setShowModal] = useState(false);
    const [editingRule, setEditingRule] = useState(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const [togglingId, setTogglingId] = useState(null);

    useEffect(() => {
        fetchAlerts();
        fetchEvents();
    }, []);

    const fetchAlerts = async () => {
        try {
            const response = await socialListeningApi.alerts.list();
            setAlerts(Array.isArray(response.data) ? response.data : (response.data?.rules || []));
        } catch (error) {
            console.error('Failed to fetch alerts:', error);
        }
    };

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const response = await socialListeningApi.alerts.events.list({ limit: 50 });
            setEvents(Array.isArray(response.data) ? response.data : (response.data?.events || []));
        } catch (error) {
            console.error('Failed to fetch alert events:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEventAction = async (eventId, status) => {
        try {
            await socialListeningApi.alerts.events.action(eventId, status);
            fetchEvents();
        } catch (error) {
            console.error('Failed to update event:', error);
        }
    };

    const handleToggle = async (rule) => {
        setTogglingId(rule.id);
        try {
            await socialListeningApi.alerts.update(rule.id, { is_active: !rule.is_active });
            fetchAlerts();
        } catch (error) {
            console.error('Failed to toggle rule:', error);
        } finally {
            setTogglingId(null);
        }
    };

    const handleDelete = async (id) => {
        try {
            await socialListeningApi.alerts.delete(id);
            setDeleteConfirmId(null);
            fetchAlerts();
        } catch (error) {
            console.error('Failed to delete rule:', error);
        }
    };

    const handleModalSaved = () => {
        setShowModal(false);
        setEditingRule(null);
        fetchAlerts();
    };

    const getRuleTypeLabel = (type) => {
        const labels = {
            sentiment_threshold: 'Sentiment Alert',
            volume_spike: 'Volume Spike',
            keyword_match: 'Keyword Match',
            influencer_mention: 'Influencer Mention',
            competitor_spike: 'Competitor Activity'
        };
        return labels[type] || type;
    };

    const getEventStatusBadge = (status) => {
        const badges = {
            pending: { icon: Clock, color: '#3b82f6', bg: '#dbeafe', label: 'Pending' },
            actioned: { icon: CheckCircle, color: '#10b981', bg: '#d1fae5', label: 'Actioned' },
            dismissed: { icon: X, color: '#6b7280', bg: '#f3f4f6', label: 'Dismissed' },
        };
        const badge = badges[status] || badges.pending;
        const Icon = badge.icon;
        return (
            <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                padding: '3px 8px', backgroundColor: badge.bg, color: badge.color,
                borderRadius: '6px', fontSize: '12px', fontWeight: 500
            }}>
                <Icon size={12} />{badge.label}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="sl-loading-container">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="alerts-tab">
            {/* Header */}
            <div className="sl-tab-section">
                <div className="sl-section-header">
                    <h2 className="sl-section-title">
                        <Bell size={20} />
                        Alerts &amp; Notifications
                    </h2>
                    <button className="sl-button" onClick={() => { setEditingRule(null); setShowModal(true); }}>
                        <Plus size={18} />
                        Create Alert Rule
                    </button>
                </div>

                {/* View Toggle */}
                <div className="view-toggle">
                    <button className={`toggle-btn ${activeView === 'events' ? 'active' : ''}`}
                        onClick={() => setActiveView('events')}>
                        Recent Events ({events.length})
                    </button>
                    <button className={`toggle-btn ${activeView === 'rules' ? 'active' : ''}`}
                        onClick={() => setActiveView('rules')}>
                        Alert Rules ({alerts.length})
                    </button>
                </div>
            </div>

            {/* Recent Events View */}
            {activeView === 'events' && (
                <div className="sl-tab-section">
                    {events.length === 0 ? (
                        <div className="sl-empty-state">
                            <Bell size={48} className="sl-empty-icon" />
                            <h3>No alert events</h3>
                            <p>Alert events will appear here when rules are triggered</p>
                        </div>
                    ) : (
                        <div className="events-list">
                            {events.map((event) => (
                                <div key={event.id} className="event-card">
                                    <div className="event-icon">
                                        <AlertCircle size={20} />
                                    </div>
                                    <div className="event-content">
                                        <div className="event-header">
                                            <div className="event-title">{event.alert_name || 'Alert Triggered'}</div>
                                            {getEventStatusBadge(event.status)}
                                        </div>
                                        {event.mention_content && (
                                            <div className="event-message" title={event.mention_content}>
                                                {event.mention_content.length > 120
                                                    ? event.mention_content.slice(0, 120) + '…'
                                                    : event.mention_content}
                                            </div>
                                        )}
                                        <div className="event-meta">
                                            <span>{new Date(event.created_at).toLocaleString()}</span>
                                            {event.author_handle && <span>• @{event.author_handle}</span>}
                                            <span>• {getRuleTypeLabel(event.event_type)}</span>
                                        </div>
                                    </div>
                                    {event.status === 'pending' && (
                                        <div className="event-actions">
                                            <button className="action-btn-ack"
                                                onClick={() => handleEventAction(event.id, 'actioned')}>
                                                Action
                                            </button>
                                            <button className="action-btn-resolve"
                                                onClick={() => handleEventAction(event.id, 'dismissed')}>
                                                Dismiss
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Alert Rules View */}
            {activeView === 'rules' && (
                <div className="sl-tab-section">
                    {alerts.length === 0 ? (
                        <div className="sl-empty-state">
                            <Bell size={48} className="sl-empty-icon" />
                            <h3>No alert rules</h3>
                            <p>Create alert rules to get notified of important events</p>
                            <button className="sl-button" onClick={() => { setEditingRule(null); setShowModal(true); }}>
                                <Plus size={18} />
                                Create Your First Alert Rule
                            </button>
                        </div>
                    ) : (
                        <div className="rules-list">
                            {alerts.map((alert) => (
                                <div key={alert.id} className="rule-card">
                                    <div className="rule-header">
                                        <div className="rule-title">{alert.name}</div>
                                        <div className="rule-header-actions">
                                            <span className={`rule-status ${alert.is_active ? 'active' : 'inactive'}`}>
                                                {alert.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                            <button className="icon-btn" title="Toggle active"
                                                onClick={() => handleToggle(alert)}
                                                disabled={togglingId === alert.id}>
                                                {alert.is_active
                                                    ? <ToggleRight size={18} color="#10b981" />
                                                    : <ToggleLeft size={18} color="#9ca3af" />}
                                            </button>
                                            <button className="icon-btn" title="Edit rule"
                                                onClick={() => { setEditingRule(alert); setShowModal(true); }}>
                                                <Edit2 size={15} />
                                            </button>
                                            <button className="icon-btn danger" title="Delete rule"
                                                onClick={() => setDeleteConfirmId(alert.id)}>
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="rule-type">{getRuleTypeLabel(alert.rule_type)}</div>
                                    <div className="rule-meta">
                                        <span>Triggered {alert.trigger_count || 0} times</span>
                                        {alert.cooldown_minutes && <span>• {alert.cooldown_minutes}min cooldown</span>}
                                        {alert.platforms?.length > 0 && (
                                            <span>• {alert.platforms.join(', ')}</span>
                                        )}
                                    </div>
                                    <div className="rule-actions-chips">
                                        {(Array.isArray(alert.actions) ? alert.actions : []).map((action, i) => (
                                            <span key={i} className="action-chip">
                                                {typeof action === 'string' ? action : action.type}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Delete Confirm */}
                                    {deleteConfirmId === alert.id && (
                                        <div className="delete-confirm">
                                            <span>Delete this rule?</span>
                                            <button className="sl-button danger-small" onClick={() => handleDelete(alert.id)}>Delete</button>
                                            <button className="sl-button secondary-small" onClick={() => setDeleteConfirmId(null)}>Cancel</button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Create / Edit Modal */}
            {showModal && (
                <AlertRuleModal
                    rule={editingRule}
                    onClose={() => { setShowModal(false); setEditingRule(null); }}
                    onSaved={handleModalSaved} />
            )}

            <style>{`
                .alerts-tab { padding: 0; }
                .modal-overlay {
                    position: fixed; inset: 0; background: rgba(0,0,0,0.5);
                    display: flex; align-items: center; justify-content: center;
                    z-index: 1000; padding: 20px;
                }
                .modal-box {
                    background: #fff; border-radius: 12px; width: 100%;
                    max-width: 560px; max-height: 90vh; display: flex; flex-direction: column;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.2);
                }
                .modal-header {
                    display: flex; justify-content: space-between; align-items: center;
                    padding: 20px 24px 16px; border-bottom: 1px solid #f0f0f0;
                }
                .modal-header h3 { margin: 0; font-size: 16px; font-weight: 600; }
                .modal-body { padding: 20px 24px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 14px; }
                .modal-footer {
                    padding: 16px 24px; border-top: 1px solid #f0f0f0;
                    display: flex; justify-content: flex-end; gap: 8px;
                }
                .form-label { display: flex; flex-direction: column; gap: 5px; font-size: 13px; font-weight: 500; color: #374151; }
                .form-input { padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; outline: none; }
                .form-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.1); }
                .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
                .form-grid label { display: flex; flex-direction: column; gap: 5px; font-size: 13px; font-weight: 500; color: #374151; }
                .form-grid input, .form-grid select { padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; }
                .form-section-title { font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px; }
                .form-error { background: #fef2f2; color: #ef4444; padding: 8px 12px; border-radius: 6px; font-size: 13px; }
                .platform-chips { display: flex; flex-wrap: wrap; gap: 6px; }
                .platform-chip {
                    padding: 5px 12px; border: 1px solid #d1d5db; border-radius: 20px;
                    font-size: 12px; cursor: pointer; background: #fff; transition: all 0.15s;
                }
                .platform-chip.selected { background: #3b82f6; color: #fff; border-color: #3b82f6; }
                .platform-chip:hover:not(.selected) { border-color: #3b82f6; color: #3b82f6; }
                .action-row { display: flex; gap: 8px; align-items: center; }
                .action-row select, .action-row input { flex: 1; padding: 7px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; }
                .add-action-btn {
                    display: inline-flex; align-items: center; gap: 5px;
                    padding: 6px 12px; border: 1px dashed #d1d5db; border-radius: 6px;
                    font-size: 12px; color: #6b7280; cursor: pointer; background: none;
                    width: fit-content;
                }
                .add-action-btn:hover { border-color: #3b82f6; color: #3b82f6; }
                .icon-btn {
                    background: none; border: none; cursor: pointer; padding: 4px;
                    border-radius: 4px; color: #6b7280; display: inline-flex; align-items: center;
                }
                .icon-btn:hover { background: #f3f4f6; color: #374151; }
                .icon-btn.danger:hover { background: #fef2f2; color: #ef4444; }
                .events-list, .rules-list { display: flex; flex-direction: column; gap: 10px; }
                .event-card {
                    display: flex; gap: 14px; align-items: flex-start;
                    padding: 14px 16px; background: #fff; border: 1px solid #e5e7eb;
                    border-radius: 8px;
                }
                .event-icon { color: #f59e0b; padding-top: 2px; flex-shrink: 0; }
                .event-content { flex: 1; min-width: 0; }
                .event-header { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; flex-wrap: wrap; }
                .event-title { font-size: 14px; font-weight: 600; color: #111827; }
                .event-message { font-size: 13px; color: #6b7280; margin: 4px 0; line-height: 1.5; }
                .event-meta { font-size: 12px; color: #9ca3af; display: flex; gap: 6px; flex-wrap: wrap; }
                .event-actions { display: flex; flex-direction: column; gap: 6px; flex-shrink: 0; }
                .action-btn-ack {
                    padding: 5px 10px; background: #dbeafe; color: #2563eb;
                    border: none; border-radius: 5px; font-size: 12px; cursor: pointer; font-weight: 500;
                }
                .action-btn-ack:hover { background: #bfdbfe; }
                .action-btn-resolve {
                    padding: 5px 10px; background: #f3f4f6; color: #6b7280;
                    border: none; border-radius: 5px; font-size: 12px; cursor: pointer;
                }
                .action-btn-resolve:hover { background: #e5e7eb; }
                .rule-card {
                    padding: 14px 16px; background: #fff; border: 1px solid #e5e7eb;
                    border-radius: 8px;
                }
                .rule-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
                .rule-title { font-size: 14px; font-weight: 600; color: #111827; }
                .rule-header-actions { display: flex; align-items: center; gap: 4px; }
                .rule-type { font-size: 12px; color: #6b7280; margin-bottom: 4px; }
                .rule-meta { font-size: 12px; color: #9ca3af; margin-bottom: 8px; display: flex; gap: 6px; flex-wrap: wrap; }
                .rule-status {
                    padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;
                    text-transform: uppercase; letter-spacing: 0.04em;
                }
                .rule-status.active { background: #d1fae5; color: #065f46; }
                .rule-status.inactive { background: #f3f4f6; color: #6b7280; }
                .rule-actions-chips { display: flex; gap: 5px; flex-wrap: wrap; }
                .action-chip {
                    padding: 2px 8px; background: #f0f9ff; color: #0369a1;
                    border-radius: 4px; font-size: 11px; border: 1px solid #bae6fd;
                }
                .delete-confirm {
                    display: flex; align-items: center; gap: 8px; margin-top: 10px;
                    padding: 8px 10px; background: #fef2f2; border-radius: 6px; font-size: 13px; color: #374151;
                }
                .sl-button.danger-small {
                    padding: 4px 10px; font-size: 12px;
                    background: #ef4444; color: #fff; border: none;
                }
                .sl-button.secondary-small {
                    padding: 4px 10px; font-size: 12px;
                    background: #f3f4f6; color: #374151; border: none;
                }
                .sl-button.secondary {
                    background: #f3f4f6; color: #374151; border: none;
                }
                .view-toggle { display: flex; gap: 4px; margin-top: 12px; }
                .toggle-btn {
                    padding: 6px 16px; border: 1px solid #e5e7eb; border-radius: 6px;
                    background: #fff; font-size: 13px; cursor: pointer; color: #6b7280;
                }
                .toggle-btn.active { background: #3b82f6; color: #fff; border-color: #3b82f6; }
            `}</style>
        </div>
    );
};

export default AlertsTab;
