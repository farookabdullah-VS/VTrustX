import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

export function UserManagement() {
    const { t, i18n } = useTranslation();
    const isRtl = i18n.language === 'ar';
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [nameAr, setNameAr] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [role, setRole] = useState('user');
    const [roleId, setRoleId] = useState('');

    const [subscription, setSubscription] = useState(null);
    const [availableRoles, setAvailableRoles] = useState([]);

    useEffect(() => {
        loadUsers();
        loadSubscription();
        loadRoles();
    }, []);

    const loadRoles = () => {
        axios.get('/api/roles')
            .then(res => setAvailableRoles(res.data))
            .catch(err => console.error("Roles load error", err));
    };

    const loadSubscription = () => {
        axios.get('/api/settings/subscription')
            .then(res => setSubscription(res.data))
            .catch(err => console.error(err));
    };

    const loadUsers = () => {
        setLoading(true);
        axios.get('/api/users')
            .then(res => {
                setUsers(res.data);
                setLoading(false);
            })
            .catch(err => {
                const msg = err.response?.data?.error || err.message;
                setError(t('users.loading_error', "Error loading users: " + msg));
                setLoading(false);
            });
    };

    const handleCreate = () => {
        if (subscription && subscription.users.current >= subscription.users.limit) {
            alert("Limit reached! Upgrade plan.");
            return;
        }
        axios.post('/api/users', { username, password, name, name_ar: nameAr, email, phone, role, role_id: roleId })
            .then(() => {
                alert(t('users.create_success', "User created successfully!"));
                setIsModalOpen(false);
                setUsername(''); setPassword(''); setName(''); setNameAr(''); setEmail(''); setPhone(''); setRoleId('');
                loadUsers();
                loadSubscription();
            })
            .catch(err => alert("Failed: " + (err.response?.data?.error || err.message)));
    };

    const handleDelete = (id) => {
        if (confirm(t('users.confirm_delete', "Are you sure?"))) {
            axios.delete(`/api/users/${id}`)
                .then(loadUsers)
                .catch(err => alert("Failed to delete user"));
        }
    };

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '30px', fontFamily: "'Outfit', sans-serif", direction: isRtl ? 'rtl' : 'ltr' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h1 style={{ margin: 0 }}>{t('users.title')}</h1>
                    <p style={{ color: '#64748b' }}>{t('users.subtitle')}</p>
                    {subscription && (
                        <div style={{ marginTop: '10px', fontSize: '0.9em' }}>
                            <span style={{ fontWeight: 'bold', color: '#333' }}>{t('users.plan')}: {subscription.plan.toUpperCase()}</span>
                            <span style={{ margin: '0 10px', color: '#ccc' }}>|</span>
                            <span>{t('users.users_limit')}: {subscription.users.current} / {subscription.users.limit}</span>
                        </div>
                    )}
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    style={{ background: '#064e3b', color: '#D9F8E5', padding: '12px 24px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    {t('users.add_btn')}
                </button>
            </div>

            {loading && <div>{t('surveys.loading')}</div>}
            {error && <div style={{ color: 'red' }}>{error}</div>}

            {!loading && !error && (
                <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                    <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <tr>
                            <th style={{ padding: '15px', textAlign: isRtl ? 'right' : 'left' }}>{t('users.table.username')}</th>
                            <th style={{ padding: '15px', textAlign: isRtl ? 'right' : 'left' }}>Name (En)</th>
                            <th style={{ padding: '15px', textAlign: isRtl ? 'right' : 'left' }}>Name (Ar)</th>
                            <th style={{ padding: '15px', textAlign: isRtl ? 'right' : 'left' }}>Email</th>
                            <th style={{ padding: '15px', textAlign: isRtl ? 'right' : 'left' }}>Phone</th>
                            <th style={{ padding: '15px', textAlign: isRtl ? 'right' : 'left' }}>{t('users.assigned_role')}</th>
                            <th style={{ padding: '15px', textAlign: isRtl ? 'right' : 'left' }}>{t('users.table.role')} ({t('users.system_role')})</th>
                            <th style={{ padding: '15px', textAlign: isRtl ? 'right' : 'left' }}>{t('users.table.created')}</th>
                            <th style={{ padding: '15px', textAlign: isRtl ? 'left' : 'right' }}>{t('users.table.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '15px', fontWeight: '500' }}>{u.username}</td>
                                <td style={{ padding: '15px', color: '#64748b', fontSize: '0.9em' }}>{u.name || '-'}</td>
                                <td style={{ padding: '15px', color: '#64748b', fontSize: '0.9em' }}>{u.name_ar || '-'}</td>
                                <td style={{ padding: '15px', color: '#64748b', fontSize: '0.9em' }}>{u.email || '-'}</td>
                                <td style={{ padding: '15px', color: '#64748b', fontSize: '0.9em' }}>{u.phone || '-'}</td>
                                <td style={{ padding: '15px' }}>
                                    {u.role_name ? (
                                        <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.9em', background: '#dcfce7', color: '#166534', fontWeight: 'bold' }}>
                                            {u.role_name}
                                        </span>
                                    ) : (
                                        <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>None</span>
                                    )}
                                </td>
                                <td style={{ padding: '15px' }}>
                                    <span style={{
                                        padding: '4px 8px', borderRadius: '6px', fontSize: '0.9em',
                                        background: u.role === 'admin' ? '#dbeafe' : '#f1f5f9',
                                        color: u.role === 'admin' ? '#1e40af' : '#475569'
                                    }}>
                                        {u.role.toUpperCase()}
                                    </span>
                                </td>
                                <td style={{ padding: '15px', color: '#64748b' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                                <td style={{ padding: '15px', textAlign: isRtl ? 'left' : 'right' }}>
                                    <button onClick={() => handleDelete(u.id)} style={{ padding: '8px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }} title="Delete">🗑️</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {isModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{ background: '#D9F8E5', padding: '30px', borderRadius: '16px', width: '400px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h2 style={{ marginTop: 0 }}>{t('users.create_modal_title')}</h2>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>{t('login.username')}</label>
                            <input style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} value={username} onChange={e => setUsername(e.target.value)} />
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Name (English)</label>
                            <input style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} value={name} onChange={e => setName(e.target.value)} />
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Name (Arabic)</label>
                            <input style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', direction: 'rtl' }} value={nameAr} onChange={e => setNameAr(e.target.value)} />
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Email</label>
                            <input type="email" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} value={email} onChange={e => setEmail(e.target.value)} />
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Phone</label>
                            <input type="tel" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1234567890" />
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>{t('login.password')}</label>
                            <input type="password" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} value={password} onChange={e => setPassword(e.target.value)} />
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>{t('users.permission_role')}</label>
                            <select
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                                value={roleId}
                                onChange={e => setRoleId(e.target.value)}
                            >
                                <option value="">{t('users.select_role')}</option>
                                {availableRoles.map(r => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                            </select>
                            <p style={{ fontSize: '0.8em', color: '#64748b', marginTop: '5px' }}>{t('users.permission_hint')}</p>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>{t('users.global_role')}</label>
                            <select style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} value={role} onChange={e => setRole(e.target.value)}>
                                <option value="user">{t('users.role_user')}</option>
                                <option value="admin">{t('users.role_admin')}</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#064e3b', fontWeight: 'bold' }}>{t('users.cancel')}</button>
                            <button onClick={handleCreate} style={{ background: '#064e3b', color: '#D9F8E5', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>{t('users.create_btn')}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
