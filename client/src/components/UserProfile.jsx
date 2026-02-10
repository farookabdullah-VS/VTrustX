import React, { useState, useEffect } from 'react';
import axios from 'axios';

export function UserProfile({ user, onUpdateUser }) {
    const [username, setUsername] = useState(user?.user?.username || '');
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setUsername(user?.user?.username || '');
    }, [user]);

    const handleSave = async () => {
        if (!username.trim()) return alert("Username cannot be empty");

        setIsLoading(true);
        try {
            // Update user profile
            const res = await axios.put(`/api/users/${user.user.id}`, {
                username: username
            });

            // Update local state via callback
            if (onUpdateUser) {
                // Merge the update into the existing user object structure
                onUpdateUser({ ...user.user, username: res.data.username });
            }

            setIsEditing(false);
            alert("Profile updated successfully!");
        } catch (err) {
            console.error(err);
            alert("Error updating profile: " + (err.response?.data?.error || err.message));
        } finally {
            setIsLoading(false);
        }
    };

    const [isChangingPw, setIsChangingPw] = useState(false);
    const [pwData, setPwData] = useState({ current: '', new: '', confirm: '' });

    const handlePasswordUpdate = async () => {
        if (!pwData.current || !pwData.new || !pwData.confirm) {
            return alert("All fields are required");
        }
        if (pwData.new !== pwData.confirm) {
            return alert("New passwords do not match");
        }
        if (pwData.new.length < 6) {
            return alert("Password must be at least 6 characters");
        }

        setIsLoading(true);
        try {
            await axios.post('/api/auth/change-password', {
                username: user?.user?.username,
                currentPassword: pwData.current,
                newPassword: pwData.new
            });
            alert("Password updated successfully!");
            setIsChangingPw(false);
            setPwData({ current: '', new: '', confirm: '' });
        } catch (err) {
            alert("Failed to update password: " + (err.response?.data?.error || err.message));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', fontFamily: '"Outfit", sans-serif' }}>
            <h1 style={{ color: '#0f172a', marginBottom: '10px' }}>My Profile</h1>
            <p style={{ color: '#64748b', marginBottom: '40px' }}>Manage your personal information and security settings.</p>

            <div style={{ background: 'white', padding: '30px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                {/* User Info Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px', paddingBottom: '30px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{
                        width: '80px', height: '80px', borderRadius: '50%', background: 'var(--primary-color, #0f172a)', color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2em', fontWeight: 'bold'
                    }}>
                        {username?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                        <h2 style={{ margin: 0, color: '#1e293b' }}>{username || 'User'}</h2>
                        <span style={{ color: '#64748b', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85em', marginTop: '6px', display: 'inline-block' }}>
                            {user?.user?.role || 'Member'}
                        </span>
                    </div>
                </div>

                {/* Basic Info Form */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <label style={{ display: 'block', fontSize: '0.9em', fontWeight: '600', color: '#64748b' }}>Username</label>
                            {!isEditing ? (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    style={{ background: 'none', border: 'none', color: 'var(--primary-color, #0f172a)', cursor: 'pointer', fontSize: '0.85em', fontWeight: '600', padding: 0 }}
                                >
                                    Edit
                                </button>
                            ) : (
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        onClick={() => { setIsEditing(false); setUsername(user?.user?.username || ''); }}
                                        style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.85em', fontWeight: '600', padding: 0 }}
                                        disabled={isLoading}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        style={{ background: 'none', border: 'none', color: 'var(--primary-color, #0f172a)', cursor: 'pointer', fontSize: '0.85em', fontWeight: '600', padding: 0 }}
                                        disabled={isLoading}
                                    >
                                        Save
                                    </button>
                                </div>
                            )}
                        </div>
                        <input
                            type="text"
                            disabled={!isEditing}
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            style={{
                                width: '100%', padding: '12px', borderRadius: '8px',
                                border: isEditing ? '1px solid var(--primary-color, #0f172a)' : '1px solid #e2e8f0',
                                background: isEditing ? 'white' : '#f8fafc',
                                color: isEditing ? '#0f172a' : '#94a3b8',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9em', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>Tenant ID</label>
                        <input
                            type="text"
                            disabled
                            value={user?.user?.tenant_id || ''}
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#94a3b8', boxSizing: 'border-box' }}
                        />
                    </div>
                </div>

                {/* Password Change Section */}
                <div style={{ marginTop: '30px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h3 style={{ fontSize: '1.1em', color: '#1e293b', margin: 0 }}>Security</h3>
                        {!isChangingPw && (
                            <button
                                onClick={() => setIsChangingPw(true)}
                                style={{
                                    padding: '8px 16px', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', borderRadius: '8px', cursor: 'pointer', fontWeight: '500'
                                }}
                            >
                                Change Password
                            </button>
                        )}
                    </div>

                    {isChangingPw && (
                        <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'grid', gap: '15px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85em', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Current Password</label>
                                    <input
                                        type="password"
                                        value={pwData.current}
                                        onChange={e => setPwData({ ...pwData, current: e.target.value })}
                                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85em', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>New Password</label>
                                    <input
                                        type="password"
                                        value={pwData.new}
                                        onChange={e => setPwData({ ...pwData, new: e.target.value })}
                                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85em', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Confirm New Password</label>
                                    <input
                                        type="password"
                                        value={pwData.confirm}
                                        onChange={e => setPwData({ ...pwData, confirm: e.target.value })}
                                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                    <button
                                        onClick={handlePasswordUpdate}
                                        style={{ padding: '10px 20px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
                                        disabled={isLoading}
                                    >
                                        Update Password
                                    </button>
                                    <button
                                        onClick={() => { setIsChangingPw(false); setPwData({ current: '', new: '', confirm: '' }); }}
                                        style={{ padding: '10px 20px', background: 'white', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
