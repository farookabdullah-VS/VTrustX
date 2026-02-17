import React, { useState, useEffect, useCallback } from 'react';
import axios from '../../axiosConfig';
import { useToast } from '../common/Toast';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, GitMerge, User, Mail, Phone, AlertTriangle, CheckCircle } from 'lucide-react';

export default function DuplicateMergeManager() {
    const toast = useToast();
    const navigate = useNavigate();
    const [duplicateGroups, setDuplicateGroups] = useState([]);
    const [allContacts, setAllContacts] = useState({});
    const [loading, setLoading] = useState(true);
    const [merging, setMerging] = useState(null); // group key being merged
    const [primarySelections, setPrimarySelections] = useState({}); // groupKey -> primaryId

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [dupRes, contactsRes] = await Promise.all([
                axios.get('/api/advanced-contacts/duplicates'),
                axios.get('/api/contacts')
            ]);

            const groups = dupRes.data.duplicates || [];
            setDuplicateGroups(groups);

            // Build a lookup map from contacts list
            const map = {};
            (contactsRes.data || []).forEach(c => { map[c.id] = c; });
            setAllContacts(map);

            // Default primary = first (oldest) contact in each group
            const defaults = {};
            groups.forEach(g => {
                if (g.contact_ids?.length > 0) {
                    defaults[g.key] = g.contact_ids[0];
                }
            });
            setPrimarySelections(defaults);
        } catch (err) {
            toast.error('Failed to load duplicates: ' + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleMerge = async (group) => {
        const primaryId = primarySelections[group.key];
        if (!primaryId) return;

        const duplicateIds = group.contact_ids.filter(id => id !== primaryId);
        if (duplicateIds.length === 0) {
            toast.warning('Select a primary contact first');
            return;
        }

        if (!confirm(`Merge ${duplicateIds.length} contact(s) into the selected primary? This cannot be undone.`)) return;

        setMerging(group.key);
        try {
            await axios.post(`/api/advanced-contacts/${primaryId}/merge`, {
                duplicateContactIds: duplicateIds
            });
            toast.success('Contacts merged successfully');
            loadData();
        } catch (err) {
            toast.error('Merge failed: ' + (err.response?.data?.error || err.message));
        } finally {
            setMerging(null);
        }
    };

    const setPrimary = (groupKey, contactId) => {
        setPrimarySelections(prev => ({ ...prev, [groupKey]: contactId }));
    };

    return (
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '30px', fontFamily: "'Outfit', sans-serif" }}>
            <style>{`
                .dmm-group { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); margin-bottom: 24px; overflow: hidden; }
                .dmm-group-header { background: #fef3c7; padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #fde68a; }
                .dmm-group-key { font-weight: 600; color: #92400e; display: flex; align-items: center; gap: 8px; }
                .dmm-group-count { background: #f59e0b; color: white; border-radius: 20px; padding: 2px 10px; font-size: 0.8em; font-weight: 600; }
                .dmm-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; padding: 20px; }
                .dmm-contact-card { border: 2px solid #e2e8f0; border-radius: 10px; padding: 16px; position: relative; cursor: pointer; transition: all 0.2s; }
                .dmm-contact-card:hover { border-color: #94a3b8; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                .dmm-contact-card.primary { border-color: #059669; background: #f0fdf4; }
                .dmm-contact-card.primary .dmm-primary-badge { display: flex; }
                .dmm-primary-badge { display: none; align-items: center; gap: 4px; color: #059669; font-size: 0.8em; font-weight: 600; margin-bottom: 8px; }
                .dmm-field { display: flex; align-items: center; gap: 8px; color: #475569; font-size: 0.88em; margin-bottom: 6px; }
                .dmm-field-icon { color: #94a3b8; flex-shrink: 0; }
                .dmm-name { font-weight: 600; font-size: 1em; color: #1e293b; margin-bottom: 10px; }
                .dmm-select-btn { width: 100%; margin-top: 10px; padding: 7px; border: 1px solid #cbd5e1; border-radius: 6px; background: white; cursor: pointer; font-size: 0.85em; color: #334155; }
                .dmm-select-btn:hover { background: #f1f5f9; }
                .dmm-select-btn.selected { border-color: #059669; background: #dcfce7; color: #166534; font-weight: 600; }
                .dmm-merge-btn { padding: '10px 20px'; background: #1e293b; color: white; border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 0.9em; }
                .dmm-merge-btn:hover { background: #334155; }
                .dmm-merge-btn:disabled { opacity: 0.6; cursor: not-allowed; }
                .dmm-empty { text-align: center; padding: 60px; color: #94a3b8; }
                .dmm-empty-icon { font-size: 3em; margin-bottom: 12px; }
            `}</style>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
                <button
                    onClick={() => navigate('/contact-master')}
                    style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' }}
                >
                    <ArrowLeft size={16} /> Back to Contacts
                </button>
                <div>
                    <h1 style={{ margin: 0, color: '#1e293b' }}>Duplicate Contacts</h1>
                    <p style={{ margin: 0, color: '#64748b', marginTop: '4px' }}>
                        {loading ? 'Loading...' : `${duplicateGroups.length} duplicate group${duplicateGroups.length !== 1 ? 's' : ''} found`}
                    </p>
                </div>
            </div>

            {loading && (
                <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Loading duplicate contacts...</div>
            )}

            {!loading && duplicateGroups.length === 0 && (
                <div className="dmm-empty">
                    <div className="dmm-empty-icon">✅</div>
                    <h3 style={{ color: '#1e293b', margin: '0 0 8px' }}>No Duplicates Found</h3>
                    <p>All contacts have unique email addresses and phone numbers.</p>
                </div>
            )}

            {!loading && duplicateGroups.map(group => {
                const primaryId = primarySelections[group.key];
                const contacts = (group.contact_ids || []).map(id => allContacts[id]).filter(Boolean);

                return (
                    <div key={group.key} className="dmm-group">
                        <div className="dmm-group-header">
                            <div className="dmm-group-key">
                                <AlertTriangle size={16} />
                                <span>Matched by: {group.key}</span>
                                <span className="dmm-group-count">{group.count} contacts</span>
                            </div>
                            <button
                                className="dmm-merge-btn"
                                style={{ padding: '8px 18px', background: '#1e293b', color: 'white', border: 'none', borderRadius: '8px', cursor: merging === group.key ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', fontSize: '0.9em', opacity: merging === group.key ? 0.6 : 1 }}
                                onClick={() => handleMerge(group)}
                                disabled={merging === group.key}
                            >
                                <GitMerge size={15} />
                                {merging === group.key ? 'Merging...' : 'Merge Group'}
                            </button>
                        </div>

                        <div style={{ padding: '12px 20px', background: '#fffbeb', borderBottom: '1px solid #fde68a', fontSize: '0.85em', color: '#78350f' }}>
                            Click a contact card to select it as the <strong>primary</strong> (surviving) contact. All activities and data from the other contacts will be transferred to the primary, then they will be marked as merged.
                        </div>

                        <div className="dmm-cards">
                            {contacts.map(contact => {
                                const isPrimary = contact.id === primaryId;
                                return (
                                    <div
                                        key={contact.id}
                                        className={`dmm-contact-card ${isPrimary ? 'primary' : ''}`}
                                        onClick={() => setPrimary(group.key, contact.id)}
                                    >
                                        <div className="dmm-primary-badge">
                                            <CheckCircle size={14} />
                                            Primary (will be kept)
                                        </div>
                                        <div className="dmm-name">
                                            <User size={14} style={{ marginRight: '6px', verticalAlign: 'middle', color: '#94a3b8' }} />
                                            {contact.name || '(No name)'}
                                        </div>
                                        {contact.email && (
                                            <div className="dmm-field">
                                                <Mail size={13} className="dmm-field-icon" />
                                                {contact.email}
                                            </div>
                                        )}
                                        {contact.mobile && (
                                            <div className="dmm-field">
                                                <Phone size={13} className="dmm-field-icon" />
                                                {contact.mobile}
                                            </div>
                                        )}
                                        {contact.designation && (
                                            <div className="dmm-field">
                                                <span style={{ color: '#94a3b8', fontSize: '12px' }}>👤</span>
                                                {contact.designation}
                                                {contact.department ? ` · ${contact.department}` : ''}
                                            </div>
                                        )}
                                        <div style={{ marginTop: '10px', fontSize: '0.78em', color: '#94a3b8' }}>
                                            ID: {contact.id} · Added {contact.created_at ? new Date(contact.created_at).toLocaleDateString() : 'unknown'}
                                        </div>
                                        <button
                                            className={`dmm-select-btn ${isPrimary ? 'selected' : ''}`}
                                            onClick={(e) => { e.stopPropagation(); setPrimary(group.key, contact.id); }}
                                        >
                                            {isPrimary ? '✓ Selected as Primary' : 'Set as Primary'}
                                        </button>
                                    </div>
                                );
                            })}

                            {contacts.length < (group.contact_ids?.length || 0) && (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #e2e8f0', borderRadius: '10px', padding: '20px', color: '#94a3b8', fontSize: '0.85em' }}>
                                    {(group.contact_ids?.length || 0) - contacts.length} contact(s) not found in current list
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
