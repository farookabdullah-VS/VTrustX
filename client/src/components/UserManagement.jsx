import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Edit2, Trash2, UserCheck, UserX, X, Check, AlertCircle } from 'lucide-react';

export function UserManagement() {
    const { t, i18n } = useTranslation();
    const isRtl = i18n.language === 'ar';
    const [users, setUsers] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const limit = 20;

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    // Form State
    const [formData, setFormData] = useState({ username: '', password: '', name: '', name_ar: '', email: '', phone: '', role: 'user', role_id: '' });
    const [formErrors, setFormErrors] = useState({});

    const [subscription, setSubscription] = useState(null);
    const [availableRoles, setAvailableRoles] = useState([]);

    // Toast
    const [toast, setToast] = useState(null);
    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    useEffect(() => {
        loadRoles();
        loadSubscription();
    }, []);

    const loadUsers = useCallback(() => {
        setLoading(true);
        const params = new URLSearchParams({ page, limit });
        if (search) params.set('search', search);
        if (statusFilter) params.set('status', statusFilter);

        axios.get(`/api/users?${params}`)
            .then(res => {
                const data = res.data;
                setUsers(data.users || data);
                setTotal(data.total || (data.users || data).length);
                setLoading(false);
            })
            .catch(err => {
                setError(err.response?.data?.error || err.message);
                setLoading(false);
            });
    }, [page, search, statusFilter]);

    useEffect(() => { loadUsers(); }, [loadUsers]);

    const loadRoles = () => {
        axios.get('/api/roles')
            .then(res => setAvailableRoles(res.data))
            .catch(() => {});
    };

    const loadSubscription = () => {
        axios.get('/api/settings/subscription')
            .then(res => setSubscription(res.data))
            .catch(() => {});
    };

    const validateForm = () => {
        const errs = {};
        if (!formData.username.trim()) errs.username = 'Username is required';
        if (!editingUser && !formData.password) errs.password = 'Password is required';
        if (formData.password && formData.password.length < 6) errs.password = 'Min 6 characters';
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = 'Invalid email';
        setFormErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const openCreateModal = () => {
        setEditingUser(null);
        setFormData({ username: '', password: '', name: '', name_ar: '', email: '', phone: '', role: 'user', role_id: '' });
        setFormErrors({});
        setIsModalOpen(true);
    };

    const openEditModal = (user) => {
        setEditingUser(user);
        setFormData({
            username: user.username || '',
            password: '',
            name: user.name || '',
            name_ar: user.name_ar || '',
            email: user.email || '',
            phone: user.phone || '',
            role: user.role || 'user',
            role_id: user.role_id || ''
        });
        setFormErrors({});
        setIsModalOpen(true);
    };

    const handleSave = () => {
        if (!validateForm()) return;

        if (editingUser) {
            const payload = { ...formData };
            if (!payload.password) delete payload.password;
            axios.put(`/api/users/${editingUser.id}`, payload)
                .then(() => {
                    showToast('User updated successfully');
                    setIsModalOpen(false);
                    loadUsers();
                })
                .catch(err => showToast(err.response?.data?.error || 'Update failed', 'error'));
        } else {
            if (subscription && subscription.users && subscription.users.current >= subscription.users.limit) {
                showToast('User limit reached. Upgrade your plan.', 'error');
                return;
            }
            axios.post('/api/users', { ...formData, role_id: formData.role_id || null })
                .then(() => {
                    showToast('User created successfully');
                    setIsModalOpen(false);
                    loadUsers();
                    loadSubscription();
                })
                .catch(err => showToast(err.response?.data?.error || 'Create failed', 'error'));
        }
    };

    const handleToggleStatus = (user) => {
        const newStatus = user.status === 'active' ? 'inactive' : 'active';
        axios.patch(`/api/users/${user.id}/status`, { status: newStatus })
            .then(() => {
                showToast(`User ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
                loadUsers();
            })
            .catch(err => showToast(err.response?.data?.error || 'Failed', 'error'));
    };

    const handleDelete = (user) => {
        if (!window.confirm(`Delete user "${user.username}"? This cannot be undone.`)) return;
        axios.delete(`/api/users/${user.id}`)
            .then(() => { showToast('User deleted'); loadUsers(); loadSubscription(); })
            .catch(err => showToast(err.response?.data?.error || 'Delete failed', 'error'));
    };

    const totalPages = Math.ceil(total / limit);

    const inputStyle = {
        width: '100%', padding: '10px 12px', borderRadius: '8px',
        border: '1px solid var(--input-border)', background: 'var(--input-bg)',
        color: 'var(--input-text)', fontSize: '0.9em', boxSizing: 'border-box', outline: 'none'
    };

    const statusBadge = (status) => {
        const colors = {
            active: { bg: '#dcfce7', color: '#166534' },
            inactive: { bg: '#fef3c7', color: '#92400e' },
            suspended: { bg: '#fee2e2', color: '#991b1b' }
        };
        const c = colors[status] || colors.inactive;
        return (
            <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '0.78em', fontWeight: '600', background: c.bg, color: c.color, textTransform: 'uppercase' }}>
                {status || 'active'}
            </span>
        );
    };

    return (
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '30px', fontFamily: "'Outfit', sans-serif", direction: isRtl ? 'rtl' : 'ltr' }}>
            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
                    padding: '14px 24px', borderRadius: '10px', fontWeight: '500', fontSize: '0.9em',
                    background: toast.type === 'error' ? '#fee2e2' : '#dcfce7',
                    color: toast.type === 'error' ? '#991b1b' : '#166534',
                    border: `1px solid ${toast.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                    display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                    {toast.type === 'error' ? <AlertCircle size={16} /> : <Check size={16} />}
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                    <h1 style={{ margin: 0, color: 'var(--text-color)', fontSize: '1.8em' }}>{t('users.title', 'User Management')}</h1>
                    <p style={{ color: 'var(--text-muted)', margin: '4px 0 0' }}>{t('users.subtitle', 'Manage team members and permissions')}</p>
                    {subscription && (
                        <div style={{ marginTop: '8px', fontSize: '0.85em', display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <span style={{ fontWeight: '600', color: 'var(--primary-color)', background: 'var(--sidebar-hover-bg)', padding: '3px 10px', borderRadius: '6px' }}>
                                {(subscription.plan || 'free').toUpperCase()}
                            </span>
                            <span style={{ color: 'var(--text-muted)' }}>
                                {subscription.users?.current || 0} / {subscription.users?.limit || 2} users
                            </span>
                            <div style={{ width: '80px', height: '5px', background: 'var(--input-border)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{
                                    width: `${Math.min(100, ((subscription.users?.current || 0) / (subscription.users?.limit || 2)) * 100)}%`,
                                    height: '100%', borderRadius: '3px',
                                    background: (subscription.users?.current || 0) >= (subscription.users?.limit || 2) ? '#ef4444' : 'var(--primary-color)'
                                }} />
                            </div>
                        </div>
                    )}
                </div>
                <button onClick={openCreateModal} style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: 'var(--primary-color)', color: 'var(--button-text)',
                    padding: '11px 22px', border: 'none', borderRadius: '10px',
                    cursor: 'pointer', fontWeight: '600', fontSize: '0.9em',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}>
                    <Plus size={18} /> {t('users.add_btn', 'Add User')}
                </button>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        placeholder="Search users..."
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        style={{ ...inputStyle, paddingLeft: '36px' }}
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                    style={{ ...inputStyle, width: 'auto', minWidth: '140px' }}
                >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                </select>
            </div>

            {/* Table */}
            {loading && <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>}
            {error && <div style={{ padding: '20px', color: '#ef4444', background: '#fee2e2', borderRadius: '10px', marginBottom: '15px' }}>{error}</div>}

            {!loading && !error && (
                <>
                    <div style={{ background: 'var(--input-bg)', borderRadius: '12px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', border: '1px solid var(--input-border)', boxShadow: '0 4px 6px rgba(0,0,0,0.03)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                            <caption style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}>User management table</caption>
                            <thead>
                                <tr style={{ background: 'var(--sidebar-bg)', borderBottom: '1px solid var(--input-border)' }}>
                                    {['User', 'Email', 'Phone', 'Role', 'Status', 'Last Login', 'Actions'].map(h => (
                                        <th key={h} scope="col" style={{ padding: '13px 15px', textAlign: isRtl ? 'right' : 'left', color: 'var(--text-muted)', fontSize: '0.8em', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {users.length === 0 && (
                                    <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No users found</td></tr>
                                )}
                                {users.map(u => (
                                    <tr key={u.id} style={{ borderBottom: '1px solid var(--input-border)', transition: 'background 0.15s' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--sidebar-hover-bg)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                        <td style={{ padding: '13px 15px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{
                                                    width: '34px', height: '34px', borderRadius: '50%',
                                                    background: 'var(--primary-color)', color: 'white',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '0.8em', fontWeight: '700', flexShrink: 0
                                                }}>
                                                    {(u.name || u.username || '?')[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: '600', color: 'var(--text-color)', fontSize: '0.9em' }}>{u.name || u.username}</div>
                                                    {u.name && <div style={{ fontSize: '0.78em', color: 'var(--text-muted)' }}>@{u.username}</div>}
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '13px 15px', color: 'var(--text-muted)', fontSize: '0.88em' }}>{u.email || '-'}</td>
                                        <td style={{ padding: '13px 15px', color: 'var(--text-muted)', fontSize: '0.88em' }}>{u.phone || '-'}</td>
                                        <td style={{ padding: '13px 15px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={{ fontSize: '0.82em', fontWeight: '600', color: u.role === 'admin' ? 'var(--primary-color)' : 'var(--text-color)' }}>
                                                    {(u.role || 'user').toUpperCase()}
                                                </span>
                                                {u.role_name && <span style={{ fontSize: '0.75em', color: 'var(--text-muted)' }}>{u.role_name}</span>}
                                            </div>
                                        </td>
                                        <td style={{ padding: '13px 15px' }}>{statusBadge(u.status)}</td>
                                        <td style={{ padding: '13px 15px', color: 'var(--text-muted)', fontSize: '0.82em' }}>
                                            {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : 'Never'}
                                        </td>
                                        <td style={{ padding: '13px 15px' }}>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <button onClick={() => openEditModal(u)} aria-label={`Edit user ${u.name || u.username}`} title="Edit" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '6px', color: 'var(--text-muted)' }}>
                                                    <Edit2 size={16} aria-hidden="true" />
                                                </button>
                                                <button onClick={() => handleToggleStatus(u)} aria-label={u.status === 'active' ? `Deactivate user ${u.name || u.username}` : `Activate user ${u.name || u.username}`} title={u.status === 'active' ? 'Deactivate' : 'Activate'} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '6px', color: u.status === 'active' ? '#f59e0b' : '#10b981' }}>
                                                    {u.status === 'active' ? <UserX size={16} aria-hidden="true" /> : <UserCheck size={16} aria-hidden="true" />}
                                                </button>
                                                <button onClick={() => handleDelete(u)} aria-label={`Delete user ${u.name || u.username}`} title="Delete" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '6px', color: '#ef4444' }}>
                                                    <Trash2 size={16} aria-hidden="true" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px', alignItems: 'center' }}>
                            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                                style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)', cursor: page <= 1 ? 'default' : 'pointer', opacity: page <= 1 ? 0.5 : 1 }}>
                                Prev
                            </button>
                            <span style={{ fontSize: '0.9em', color: 'var(--text-muted)' }}>Page {page} of {totalPages}</span>
                            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                                style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)', cursor: page >= totalPages ? 'default' : 'pointer', opacity: page >= totalPages ? 0.5 : 1 }}>
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Create / Edit Modal */}
            {isModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'var(--deep-bg)', padding: '30px', borderRadius: '16px', width: '440px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--sidebar-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ margin: 0, color: 'var(--text-color)', fontSize: '1.3em' }}>
                                {editingUser ? 'Edit User' : t('users.create_modal_title', 'Create User')}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <FieldGroup label={t('login.username', 'Username')} error={formErrors.username} required>
                                <input style={inputStyle} value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} placeholder="john_doe" />
                            </FieldGroup>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                <FieldGroup label="Name (English)">
                                    <input style={inputStyle} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                </FieldGroup>
                                <FieldGroup label="Name (Arabic)">
                                    <input style={{ ...inputStyle, direction: 'rtl' }} value={formData.name_ar} onChange={e => setFormData({ ...formData, name_ar: e.target.value })} />
                                </FieldGroup>
                            </div>

                            <FieldGroup label="Email" error={formErrors.email}>
                                <input type="email" style={inputStyle} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="user@company.com" />
                            </FieldGroup>

                            <FieldGroup label="Phone">
                                <input type="tel" style={inputStyle} value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="+1234567890" />
                            </FieldGroup>

                            <FieldGroup label={t('login.password', 'Password')} error={formErrors.password} required={!editingUser}>
                                <input type="password" style={inputStyle} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder={editingUser ? 'Leave blank to keep current' : 'Min 6 characters'} />
                            </FieldGroup>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                <FieldGroup label={t('users.permission_role', 'Permission Role')}>
                                    <select style={inputStyle} value={formData.role_id} onChange={e => setFormData({ ...formData, role_id: e.target.value })}>
                                        <option value="">{t('users.select_role', 'Select Role')}</option>
                                        {availableRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                </FieldGroup>
                                <FieldGroup label={t('users.global_role', 'System Role')}>
                                    <select style={inputStyle} value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                                        <option value="user">User</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </FieldGroup>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                            <button onClick={() => setIsModalOpen(false)} style={{ padding: '10px 20px', background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-muted)', fontWeight: '500' }}>
                                Cancel
                            </button>
                            <button onClick={handleSave} style={{ padding: '10px 24px', background: 'var(--primary-color)', color: 'var(--button-text)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                                {editingUser ? 'Update' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function FieldGroup({ label, error, required, children }) {
    return (
        <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85em', color: 'var(--label-color)', fontWeight: '600' }}>
                {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
            </label>
            {children}
            {error && <span style={{ fontSize: '0.78em', color: '#ef4444', marginTop: '3px', display: 'block' }}>{error}</span>}
        </div>
    );
}
