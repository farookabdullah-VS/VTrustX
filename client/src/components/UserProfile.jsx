import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { User, Mail, Phone, Shield, CreditCard, Clock, Check, AlertCircle } from 'lucide-react';

export function UserProfile({ user, onUpdateUser }) {
    const [profile, setProfile] = useState({
        username: user?.user?.username || '',
        name: user?.user?.name || '',
        name_ar: user?.user?.name_ar || '',
        email: user?.user?.email || '',
        phone: user?.user?.phone || ''
    });
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [subscription, setSubscription] = useState(null);

    // Password
    const [isChangingPw, setIsChangingPw] = useState(false);
    const [pwData, setPwData] = useState({ current: '', new: '', confirm: '' });

    // Toast
    const [toast, setToast] = useState(null);
    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    useEffect(() => {
        setProfile({
            username: user?.user?.username || '',
            name: user?.user?.name || '',
            name_ar: user?.user?.name_ar || '',
            email: user?.user?.email || '',
            phone: user?.user?.phone || ''
        });
    }, [user]);

    useEffect(() => {
        axios.get('/api/settings/subscription')
            .then(res => setSubscription(res.data))
            .catch(() => {});
    }, []);

    const handleSave = async () => {
        if (!profile.username.trim()) return showToast('Username cannot be empty', 'error');
        if (profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) return showToast('Invalid email', 'error');

        setIsLoading(true);
        try {
            const res = await axios.put(`/api/users/${user.user.id}`, {
                username: profile.username,
                name: profile.name,
                name_ar: profile.name_ar,
                email: profile.email,
                phone: profile.phone
            });
            if (onUpdateUser) onUpdateUser({ ...user.user, ...res.data });
            setIsEditing(false);
            showToast('Profile updated successfully');
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to update', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePasswordUpdate = async () => {
        if (!pwData.current || !pwData.new || !pwData.confirm) return showToast('All fields are required', 'error');
        if (pwData.new !== pwData.confirm) return showToast('New passwords do not match', 'error');
        if (pwData.new.length < 6) return showToast('Password must be at least 6 characters', 'error');

        setIsLoading(true);
        try {
            await axios.post('/api/auth/change-password', {
                currentPassword: pwData.current,
                newPassword: pwData.new
            });
            showToast('Password updated successfully');
            setIsChangingPw(false);
            setPwData({ current: '', new: '', confirm: '' });
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to update password', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const inputStyle = {
        width: '100%', padding: '12px', borderRadius: '8px', boxSizing: 'border-box',
        border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--input-text)',
        fontSize: '0.9em', outline: 'none'
    };
    const disabledInput = { ...inputStyle, background: 'var(--sidebar-bg)', color: 'var(--text-muted)' };
    const sectionStyle = {
        background: 'var(--input-bg)', padding: '24px', borderRadius: '14px',
        border: '1px solid var(--input-border)', marginBottom: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
    };

    return (
        <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', fontFamily: "'Outfit', sans-serif" }}>
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

            <h1 style={{ color: 'var(--text-color)', marginBottom: '8px' }}>My Profile</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>Manage your personal information and security settings.</p>

            {/* Profile Header Card */}
            <div style={{ ...sectionStyle, display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{
                    width: '72px', height: '72px', borderRadius: '50%',
                    background: 'var(--primary-color)', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.8em', fontWeight: '700', flexShrink: 0
                }}>
                    {(profile.name || profile.username || 'U')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                    <h2 style={{ margin: 0, color: 'var(--text-color)' }}>{profile.name || profile.username || 'User'}</h2>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.82em', color: 'var(--text-muted)', background: 'var(--sidebar-bg)', padding: '3px 10px', borderRadius: '6px', fontWeight: '500' }}>
                            {user?.user?.role?.toUpperCase() || 'MEMBER'}
                        </span>
                        {subscription && (
                            <span style={{ fontSize: '0.82em', color: 'var(--primary-color)', background: 'var(--sidebar-hover-bg)', padding: '3px 10px', borderRadius: '6px', fontWeight: '600' }}>
                                {(subscription.plan || 'free').toUpperCase()} Plan
                            </span>
                        )}
                    </div>
                </div>
                {!isEditing ? (
                    <button onClick={() => setIsEditing(true)} style={{
                        padding: '10px 20px', border: '1px solid var(--input-border)',
                        background: 'var(--input-bg)', color: 'var(--text-color)',
                        borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.9em'
                    }}>
                        Edit Profile
                    </button>
                ) : (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => { setIsEditing(false); setProfile({ username: user?.user?.username || '', name: user?.user?.name || '', name_ar: user?.user?.name_ar || '', email: user?.user?.email || '', phone: user?.user?.phone || '' }); }}
                            style={{ padding: '10px 16px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-muted)', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}>
                            Cancel
                        </button>
                        <button onClick={handleSave} disabled={isLoading} style={{
                            padding: '10px 20px', background: 'var(--primary-color)', color: 'var(--button-text)',
                            border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600',
                            opacity: isLoading ? 0.7 : 1
                        }}>
                            Save Changes
                        </button>
                    </div>
                )}
            </div>

            {/* Personal Information */}
            <div style={sectionStyle}>
                <h3 style={{ margin: '0 0 20px', color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <User size={18} /> Personal Information
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85em', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>Username</label>
                        <input disabled={!isEditing} value={profile.username} onChange={e => setProfile({ ...profile, username: e.target.value })}
                            style={isEditing ? inputStyle : disabledInput} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85em', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>Tenant ID</label>
                        <input disabled value={user?.user?.tenant_id || ''} style={disabledInput} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85em', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>Name (English)</label>
                        <input disabled={!isEditing} value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })}
                            style={isEditing ? inputStyle : disabledInput} placeholder="Full name" />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85em', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>Name (Arabic)</label>
                        <input disabled={!isEditing} value={profile.name_ar} onChange={e => setProfile({ ...profile, name_ar: e.target.value })}
                            style={{ ...(isEditing ? inputStyle : disabledInput), direction: 'rtl' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85em', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Mail size={14} /> Email
                        </label>
                        <input type="email" disabled={!isEditing} value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })}
                            style={isEditing ? inputStyle : disabledInput} placeholder="user@company.com" />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85em', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Phone size={14} /> Phone
                        </label>
                        <input type="tel" disabled={!isEditing} value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })}
                            style={isEditing ? inputStyle : disabledInput} placeholder="+1234567890" />
                    </div>
                </div>
            </div>

            {/* Subscription Info */}
            {subscription && (
                <div style={sectionStyle}>
                    <h3 style={{ margin: '0 0 16px', color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CreditCard size={18} /> Subscription
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                        <div style={{ padding: '14px', background: 'var(--sidebar-bg)', borderRadius: '10px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.78em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Plan</div>
                            <div style={{ fontSize: '1.1em', fontWeight: '700', color: 'var(--primary-color)' }}>{(subscription.plan || 'Free').toUpperCase()}</div>
                        </div>
                        <div style={{ padding: '14px', background: 'var(--sidebar-bg)', borderRadius: '10px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.78em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Status</div>
                            <div style={{ fontSize: '1.1em', fontWeight: '700', color: subscription.status === 'active' ? '#10b981' : '#f59e0b' }}>{(subscription.status || 'Active').toUpperCase()}</div>
                        </div>
                        <div style={{ padding: '14px', background: 'var(--sidebar-bg)', borderRadius: '10px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.78em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Users</div>
                            <div style={{ fontSize: '1.1em', fontWeight: '700', color: 'var(--text-color)' }}>
                                {subscription.users?.current || 0} / {subscription.users?.limit || 2}
                            </div>
                        </div>
                    </div>
                    {subscription.usage && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                            {Object.entries(subscription.usage).map(([key, val]) => (
                                <div key={key} style={{ padding: '10px 14px', background: 'var(--sidebar-bg)', borderRadius: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                        <span style={{ fontSize: '0.82em', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{key}</span>
                                        <span style={{ fontSize: '0.82em', fontWeight: '600', color: 'var(--text-color)' }}>{val.current} / {val.limit}</span>
                                    </div>
                                    <div style={{ width: '100%', height: '4px', background: 'var(--input-border)', borderRadius: '2px', overflow: 'hidden' }}>
                                        <div style={{ width: `${Math.min(100, (val.current / val.limit) * 100)}%`, height: '100%', background: val.current >= val.limit ? '#ef4444' : 'var(--primary-color)', borderRadius: '2px' }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Security */}
            <div style={sectionStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Shield size={18} /> Security
                    </h3>
                    {!isChangingPw && (
                        <button onClick={() => setIsChangingPw(true)} style={{
                            padding: '8px 16px', border: '1px solid var(--input-border)', background: 'var(--input-bg)',
                            color: 'var(--text-color)', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', fontSize: '0.9em'
                        }}>
                            Change Password
                        </button>
                    )}
                </div>

                {!isChangingPw && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '0.9em' }}>
                        <Clock size={16} />
                        Last login: {user?.user?.last_login_at ? new Date(user.user.last_login_at).toLocaleString() : 'Not available'}
                    </div>
                )}

                {isChangingPw && (
                    <div style={{ background: 'var(--sidebar-bg)', padding: '20px', borderRadius: '10px', border: '1px solid var(--input-border)' }}>
                        <div style={{ display: 'grid', gap: '14px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85em', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>Current Password</label>
                                <input type="password" value={pwData.current} onChange={e => setPwData({ ...pwData, current: e.target.value })} style={inputStyle} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85em', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>New Password</label>
                                <input type="password" value={pwData.new} onChange={e => setPwData({ ...pwData, new: e.target.value })} style={inputStyle} placeholder="Min 6 characters" />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85em', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>Confirm New Password</label>
                                <input type="password" value={pwData.confirm} onChange={e => setPwData({ ...pwData, confirm: e.target.value })} style={inputStyle} />
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                                <button onClick={handlePasswordUpdate} disabled={isLoading} style={{
                                    padding: '10px 20px', background: 'var(--primary-color)', color: 'var(--button-text)',
                                    border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600',
                                    opacity: isLoading ? 0.7 : 1
                                }}>
                                    Update Password
                                </button>
                                <button onClick={() => { setIsChangingPw(false); setPwData({ current: '', new: '', confirm: '' }); }} style={{
                                    padding: '10px 20px', background: 'var(--input-bg)', color: 'var(--text-muted)',
                                    border: '1px solid var(--input-border)', borderRadius: '8px', cursor: 'pointer', fontWeight: '500'
                                }}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
