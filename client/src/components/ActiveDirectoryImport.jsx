import React, { useState, useEffect } from 'react';
import { Search, X, Check, Shield, User, Globe, AlertCircle, Loader2 } from 'lucide-react';

export function ActiveDirectoryImport({ isOpen, onClose, onImport }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [adUsers, setAdUsers] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [domain, setDomain] = useState('vtrustx.local');

    // Mock AD search
    const handleSearch = () => {
        if (!searchQuery.trim()) return;
        setIsSearching(true);

        // Simulate API delay
        setTimeout(() => {
            const mockUsers = [
                { id: 'ad_1', samAccountName: 'jdoe', displayName: 'John Doe', email: 'john.doe@vtrustx.com', department: 'Analytics' },
                { id: 'ad_2', samAccountName: 'asmith', displayName: 'Alice Smith', email: 'alice.smith@vtrustx.com', department: 'HR' },
                { id: 'ad_3', samAccountName: 'mbrown', displayName: 'Michael Brown', email: 'michael.brown@vtrustx.com', department: 'Finance' },
                { id: 'ad_4', samAccountName: 'rwilson', displayName: 'Robert Wilson', email: 'robert.wilson@vtrustx.com', department: 'IT' },
                { id: 'ad_5', samAccountName: 'emiller', displayName: 'Emily Miller', email: 'emily.miller@vtrustx.com', department: 'Executive' }
            ].filter(u =>
                u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                u.samAccountName.toLowerCase().includes(searchQuery.toLowerCase())
            );

            setAdUsers(mockUsers);
            setIsSearching(false);
        }, 800);
    };

    const toggleUserSelection = (userId) => {
        setSelectedUsers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleFinalImport = () => {
        const usersToImport = adUsers.filter(u => selectedUsers.includes(u.id));
        onImport(usersToImport);
        onClose();
    };

    if (!isOpen) return null;

    const inputStyle = {
        width: '100%', padding: '10px 12px', borderRadius: '8px',
        border: '1px solid var(--input-border)', background: 'var(--input-bg)',
        color: 'var(--input-text)', fontSize: '0.9em', boxSizing: 'border-box', outline: 'none'
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
            <div style={{ background: 'var(--bg-white)', width: '700px', maxHeight: '85vh', borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid var(--border-color)' }}>

                {/* Header - AX 2012 Style */}
                <div style={{ padding: '20px 24px', background: 'var(--primary-color)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700' }}>Import users from Active Directory</h2>
                        <p style={{ margin: '4px 0 0', opacity: 0.8, fontSize: '0.85rem' }}>Select users from the domain to add to RayiX</p>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', cursor: 'pointer', padding: '6px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
                    {/* Domain & Search */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: '12px', marginBottom: '24px', alignItems: 'flex-end' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>Domain</label>
                            <div style={{ position: 'relative' }}>
                                <Globe size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input style={{ ...inputStyle, paddingLeft: '32px' }} value={domain} readOnly />
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>Search (Name or Alias)</label>
                            <div style={{ position: 'relative' }}>
                                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    style={{ ...inputStyle, paddingLeft: '32px' }}
                                    placeholder="Start typing to find users..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleSearch}
                            disabled={isSearching || !searchQuery}
                            style={{ padding: '10px 20px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', height: '40px', display: 'flex', alignItems: 'center', gap: '8px', opacity: (isSearching || !searchQuery) ? 0.6 : 1 }}
                        >
                            {isSearching ? <Loader2 size={16} className="spinning" /> : <Search size={16} />}
                            Search
                        </button>
                    </div>

                    {/* Results Table */}
                    <div style={{ border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                            <thead style={{ background: 'var(--bg-light)', borderBottom: '1px solid var(--border-color)' }}>
                                <tr>
                                    <th style={{ padding: '12px', textAlign: 'center', width: '40px' }}>
                                        <input type="checkbox" onChange={(e) => {
                                            if (e.target.checked) setSelectedUsers(adUsers.map(u => u.id));
                                            else setSelectedUsers([]);
                                        }} checked={selectedUsers.length === adUsers.length && adUsers.length > 0} />
                                    </th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>User Name</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Full Name</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Email Address</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Department</th>
                                </tr>
                            </thead>
                            <tbody>
                                {adUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                            {isSearching ? 'Querying Active Directory...' : 'No results found. Search for users to import.'}
                                        </td>
                                    </tr>
                                ) : (
                                    adUsers.map(user => (
                                        <tr key={user.id} style={{ borderBottom: '1px solid var(--border-color)', background: selectedUsers.includes(user.id) ? 'var(--primary-light)' : 'transparent' }}>
                                            <td style={{ padding: '12px', textAlign: 'center' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedUsers.includes(user.id)}
                                                    onChange={() => toggleUserSelection(user.id)}
                                                />
                                            </td>
                                            <td style={{ padding: '12px', fontWeight: '600' }}>{user.samAccountName}</td>
                                            <td style={{ padding: '12px' }}>{user.displayName}</td>
                                            <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{user.email}</td>
                                            <td style={{ padding: '12px' }}>
                                                <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: 'rgba(0,0,0,0.05)', borderRadius: '4px' }}>{user.department}</span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {selectedUsers.length > 0 && (
                        <div style={{ marginTop: '16px', padding: '12px', background: '#ecfdf5', borderRadius: '8px', color: '#065f46', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Check size={16} />
                            Ready to import <strong>{selectedUsers.length}</strong> user(s) into RayiX.
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div style={{ padding: '20px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-light)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        <Shield size={14} />
                        Connected to LDAPS: {domain}
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={onClose} style={{ padding: '10px 20px', background: 'white', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', color: 'var(--text-secondary)' }}>
                            Cancel
                        </button>
                        <button
                            onClick={handleFinalImport}
                            disabled={selectedUsers.length === 0}
                            style={{ padding: '10px 24px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', opacity: selectedUsers.length === 0 ? 0.6 : 1 }}
                        >
                            Complete Import
                        </button>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .spinning { animation: spin 1s linear infinite; }
            `}} />
        </div>
    );
}
