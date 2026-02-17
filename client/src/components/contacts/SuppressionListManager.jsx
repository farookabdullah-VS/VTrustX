import React, { useState, useEffect, useCallback } from 'react';
import axios from '../../axiosConfig';
import { useToast } from '../common/Toast';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Ban, CheckCircle, Search, Mail, Phone, User, RefreshCw } from 'lucide-react';

const PAGE_SIZE = 50;

const SUPPRESSION_REASONS = [
    { value: 'unsubscribed', label: 'Unsubscribed' },
    { value: 'do_not_contact', label: 'Do Not Contact' },
    { value: 'bounced', label: 'Email Bounced' },
    { value: 'opted_out', label: 'Opted Out' },
    { value: 'manual', label: 'Manual Override' },
    { value: 'other', label: 'Other' }
];

export default function SuppressionListManager() {
    const toast = useToast();
    const navigate = useNavigate();
    const [suppressed, setSuppressed] = useState([]);
    const [loading, setLoading] = useState(true);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [search, setSearch] = useState('');
    const [unsuppressing, setUnsuppressing] = useState(null);

    // Suppress a regular contact
    const [suppressModal, setSuppressModal] = useState(false);
    const [suppressSearch, setSuppressSearch] = useState('');
    const [suppressResults, setSuppressResults] = useState([]);
    const [suppressReason, setSuppressReason] = useState('manual');
    const [suppressTarget, setSuppressTarget] = useState(null);
    const [suppressing, setSuppressing] = useState(false);

    const loadSuppressed = useCallback(async (newOffset = 0) => {
        setLoading(true);
        try {
            const res = await axios.get('/api/advanced-contacts/suppressed', {
                params: { limit: PAGE_SIZE, offset: newOffset }
            });
            const contacts = res.data.contacts || [];
            setSuppressed(prev => newOffset === 0 ? contacts : [...prev, ...contacts]);
            setHasMore(contacts.length === PAGE_SIZE);
        } catch (err) {
            toast.error('Failed to load suppressed contacts: ' + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => { loadSuppressed(0); }, [loadSuppressed]);

    const handleUnsuppress = async (contact) => {
        if (!confirm(`Remove ${contact.name} from the suppression list? They will receive future communications.`)) return;
        setUnsuppressing(contact.id);
        try {
            await axios.post(`/api/advanced-contacts/${contact.id}/unsuppress`);
            toast.success(`${contact.name} removed from suppression list`);
            setSuppressed(prev => prev.filter(c => c.id !== contact.id));
        } catch (err) {
            toast.error('Failed to unsuppress: ' + (err.response?.data?.error || err.message));
        } finally {
            setUnsuppressing(null);
        }
    };

    const handleLoadMore = () => {
        const newOffset = offset + PAGE_SIZE;
        setOffset(newOffset);
        loadSuppressed(newOffset);
    };

    // Search for contacts to suppress
    const handleSuppressSearch = async (q) => {
        setSuppressSearch(q);
        if (q.length < 2) { setSuppressResults([]); return; }
        try {
            const res = await axios.get('/api/contacts');
            const all = res.data || [];
            const lq = q.toLowerCase();
            setSuppressResults(
                all.filter(c =>
                    !c.is_suppressed &&
                    (c.name?.toLowerCase().includes(lq) || c.email?.toLowerCase().includes(lq) || c.mobile?.includes(q))
                ).slice(0, 8)
            );
        } catch (err) {
            // silent
        }
    };

    const handleSuppress = async () => {
        if (!suppressTarget) { toast.warning('Select a contact first'); return; }
        setSuppressing(true);
        try {
            await axios.post(`/api/advanced-contacts/${suppressTarget.id}/suppress`, {
                reason: suppressReason
            });
            toast.success(`${suppressTarget.name} added to suppression list`);
            setSuppressModal(false);
            setSuppressTarget(null);
            setSuppressSearch('');
            setSuppressResults([]);
            setOffset(0);
            loadSuppressed(0);
        } catch (err) {
            toast.error('Failed to suppress: ' + (err.response?.data?.error || err.message));
        } finally {
            setSuppressing(false);
        }
    };

    const filtered = suppressed.filter(c => {
        if (!search) return true;
        const lq = search.toLowerCase();
        return c.name?.toLowerCase().includes(lq) || c.email?.toLowerCase().includes(lq) || c.mobile?.includes(search);
    });

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

    return (
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '30px', fontFamily: "'Outfit', sans-serif" }}>
            <style>{`
                .slm-row { display: grid; grid-template-columns: 1fr 1fr 1fr 160px 120px; gap: 12px; align-items: center; padding: 14px 20px; border-bottom: 1px solid #f1f5f9; }
                .slm-row:hover { background: #f8fafc; }
                .slm-header { background: #f8fafc; font-size: 0.8em; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #e2e8f0; }
                .slm-reason-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 0.78em; font-weight: 600; background: #fee2e2; color: #991b1b; }
                .slm-unsuppress-btn { padding: 7px 14px; border: 1px solid #d1fae5; background: #ecfdf5; color: #065f46; border-radius: 6px; cursor: pointer; font-size: 0.85em; font-weight: 500; display: flex; align-items: center; gap: 5px; }
                .slm-unsuppress-btn:hover { background: #d1fae5; }
                .slm-unsuppress-btn:disabled { opacity: 0.5; cursor: not-allowed; }
                .slm-search-results { position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.1); z-index: 100; max-height: 280px; overflow-y: auto; }
                .slm-search-result-item { padding: 10px 14px; cursor: pointer; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; gap: 10px; }
                .slm-search-result-item:hover { background: #f8fafc; }
                .slm-search-result-item.selected { background: #f0fdf4; }
            `}</style>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button
                        onClick={() => navigate('/contact-master')}
                        style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' }}
                    >
                        <ArrowLeft size={16} /> Back to Contacts
                    </button>
                    <div>
                        <h1 style={{ margin: 0, color: '#1e293b' }}>Suppression List</h1>
                        <p style={{ margin: 0, color: '#64748b', marginTop: '4px' }}>
                            Contacts excluded from all communications
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => { setOffset(0); loadSuppressed(0); }}
                        style={{ padding: '9px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' }}
                    >
                        <RefreshCw size={15} /> Refresh
                    </button>
                    <button
                        onClick={() => setSuppressModal(true)}
                        style={{ padding: '9px 18px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}
                    >
                        <Ban size={15} /> Suppress Contact
                    </button>
                </div>
            </div>

            {/* Stats bar */}
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '14px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Ban size={18} color="#dc2626" />
                <span style={{ color: '#991b1b', fontWeight: '500' }}>
                    {loading ? 'Loading...' : `${suppressed.length}${hasMore ? '+' : ''} suppressed contact${suppressed.length !== 1 ? 's' : ''}`}
                </span>
                <span style={{ color: '#b91c1c', fontSize: '0.85em' }}>— These contacts will not receive any distribution emails, SMS, or WhatsApp messages.</span>
            </div>

            {/* Search */}
            <div style={{ position: 'relative', marginBottom: '16px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                    placeholder="Search suppressed contacts by name, email, or phone..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px 10px 38px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9em', boxSizing: 'border-box' }}
                />
            </div>

            {/* Table */}
            <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                <div className="slm-row slm-header">
                    <div>Contact</div>
                    <div>Email</div>
                    <div>Phone</div>
                    <div>Reason</div>
                    <div>Actions</div>
                </div>

                {loading && suppressed.length === 0 && (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading...</div>
                )}

                {!loading && filtered.length === 0 && (
                    <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
                        <div style={{ fontSize: '2.5em', marginBottom: '10px' }}>✅</div>
                        <div style={{ fontWeight: '500', color: '#1e293b', marginBottom: '4px' }}>
                            {search ? 'No contacts match your search' : 'No suppressed contacts'}
                        </div>
                        <div style={{ fontSize: '0.9em' }}>All contacts are eligible to receive communications.</div>
                    </div>
                )}

                {filtered.map(contact => (
                    <div key={contact.id} className="slm-row">
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <User size={15} color="#dc2626" />
                                </div>
                                <div>
                                    <div style={{ fontWeight: '500', color: '#1e293b' }}>{contact.name}</div>
                                    <div style={{ fontSize: '0.78em', color: '#94a3b8' }}>
                                        Suppressed {formatDate(contact.suppressed_at)}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div style={{ color: '#64748b', fontSize: '0.9em' }}>
                            {contact.email ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Mail size={13} color="#94a3b8" /> {contact.email}
                                </div>
                            ) : <span style={{ color: '#cbd5e1' }}>—</span>}
                        </div>
                        <div style={{ color: '#64748b', fontSize: '0.9em' }}>
                            {contact.mobile ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Phone size={13} color="#94a3b8" /> {contact.mobile}
                                </div>
                            ) : <span style={{ color: '#cbd5e1' }}>—</span>}
                        </div>
                        <div>
                            <span className="slm-reason-badge">
                                {contact.suppression_reason || 'manual'}
                            </span>
                        </div>
                        <div>
                            <button
                                className="slm-unsuppress-btn"
                                onClick={() => handleUnsuppress(contact)}
                                disabled={unsuppressing === contact.id}
                            >
                                <CheckCircle size={13} />
                                {unsuppressing === contact.id ? 'Removing...' : 'Unsuppress'}
                            </button>
                        </div>
                    </div>
                ))}

                {hasMore && (
                    <div style={{ padding: '16px', textAlign: 'center', borderTop: '1px solid #f1f5f9' }}>
                        <button
                            onClick={handleLoadMore}
                            disabled={loading}
                            style={{ padding: '8px 24px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', cursor: 'pointer', color: '#475569' }}
                        >
                            {loading ? 'Loading...' : 'Load More'}
                        </button>
                    </div>
                )}
            </div>

            {/* Suppress Contact Modal */}
            {suppressModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'white', borderRadius: '16px', padding: '32px', width: '500px', maxWidth: '95%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ margin: 0, color: '#1e293b' }}>Suppress a Contact</h2>
                            <button onClick={() => { setSuppressModal(false); setSuppressTarget(null); setSuppressSearch(''); setSuppressResults([]); }} style={{ border: 'none', background: 'none', fontSize: '1.5em', cursor: 'pointer', color: '#94a3b8' }}>&times;</button>
                        </div>

                        <p style={{ color: '#64748b', marginBottom: '20px', fontSize: '0.9em' }}>
                            Suppressed contacts will not receive any future email, SMS, or WhatsApp communications.
                        </p>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9em', fontWeight: '500', color: '#374151' }}>Search Contact</label>
                            <div style={{ position: 'relative' }}>
                                <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <input
                                    placeholder="Name, email, or phone..."
                                    value={suppressSearch}
                                    onChange={e => handleSuppressSearch(e.target.value)}
                                    style={{ width: '100%', padding: '10px 10px 10px 34px', border: '1px solid #e2e8f0', borderRadius: '8px', boxSizing: 'border-box' }}
                                />
                                {suppressResults.length > 0 && (
                                    <div className="slm-search-results">
                                        {suppressResults.map(c => (
                                            <div
                                                key={c.id}
                                                className={`slm-search-result-item ${suppressTarget?.id === c.id ? 'selected' : ''}`}
                                                onClick={() => { setSuppressTarget(c); setSuppressSearch(c.name); setSuppressResults([]); }}
                                            >
                                                <User size={14} color="#94a3b8" />
                                                <div>
                                                    <div style={{ fontWeight: '500', fontSize: '0.9em' }}>{c.name}</div>
                                                    <div style={{ fontSize: '0.78em', color: '#94a3b8' }}>{c.email} {c.mobile}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {suppressTarget && (
                                <div style={{ marginTop: '8px', padding: '8px 12px', background: '#fef2f2', borderRadius: '6px', fontSize: '0.85em', color: '#991b1b' }}>
                                    Selected: <strong>{suppressTarget.name}</strong> ({suppressTarget.email || suppressTarget.mobile})
                                </div>
                            )}
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9em', fontWeight: '500', color: '#374151' }}>Reason</label>
                            <select
                                value={suppressReason}
                                onChange={e => setSuppressReason(e.target.value)}
                                style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', boxSizing: 'border-box' }}
                            >
                                {SUPPRESSION_REASONS.map(r => (
                                    <option key={r.value} value={r.value}>{r.label}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button onClick={() => { setSuppressModal(false); setSuppressTarget(null); setSuppressSearch(''); setSuppressResults([]); }} style={{ padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', cursor: 'pointer', color: '#475569' }}>Cancel</button>
                            <button
                                onClick={handleSuppress}
                                disabled={!suppressTarget || suppressing}
                                style={{ padding: '10px 20px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', cursor: suppressTarget && !suppressing ? 'pointer' : 'not-allowed', fontWeight: '600', opacity: suppressTarget && !suppressing ? 1 : 0.6 }}
                            >
                                {suppressing ? 'Suppressing...' : 'Add to Suppression List'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
