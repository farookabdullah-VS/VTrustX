import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PersonaProfileCard } from './PersonaEngine/PersonaProfileCard';

export function Customer360() {
    const [customers, setCustomers] = useState([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState(null);
    const [customerData, setCustomerData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('overview');
    const [searchMode, setSearchMode] = useState('fuzzy');
    const [isRecalculating, setIsRecalculating] = useState(false);

    // Master Data
    const [countries, setCountries] = useState([]);
    const [cities, setCities] = useState([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [relSearch, setRelSearch] = useState('');
    const [relResults, setRelResults] = useState([]);

    useEffect(() => {
        loadInitialCustomers();
        // Load Masters
        axios.get('/api/master/countries').then(res => setCountries(res.data)).catch(console.error);
        axios.get('/api/master/cities').then(res => setCities(res.data)).catch(console.error);
    }, []);

    const loadInitialCustomers = () => {
        axios.get('/api/customer360')
            .then(res => setCustomers(res.data))
            .catch(console.error);
    };

    const handleSearch = (val) => {
        setSearch(val);
        if (val.length > 2) {
            axios.get(`/api/customer360/search?q=${val}&match_type=${searchMode}`)
                .then(res => setCustomers(res.data.map(r => ({ ...r, id: r.customer_id }))))
                .catch(console.error);
        } else if (val.length === 0) {
            loadInitialCustomers();
        }
    };

    const loadProfile = (id) => {
        setLoading(true);
        setSelectedCustomerId(id);
        setActiveTab('overview');
        axios.get(`/api/customer360/${id}`)
            .then(res => {
                setCustomerData(res.data);
                setLoading(false);
            })
            .catch(err => {
                alert('Error loading profile: ' + err.message);
                setLoading(false);
            });
    };

    const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'CX';

    const handleRelSearch = (val) => {
        setRelSearch(val);
        if (val.length > 2) {
            axios.get(`/api/customer360/search?q=${val}&match_type=fuzzy`)
                .then(res => setRelResults(res.data))
                .catch(console.error);
        }
    };

    const handleAddRel = (targetId, type) => {
        axios.post('/api/customer360/relationships', {
            from_id: selectedCustomerId,
            to_id: targetId,
            type: type
        }).then(() => {
            alert('Linked!');
            loadProfile(selectedCustomerId);
            setRelSearch('');
            setRelResults([]);
        }).catch(err => alert("Link failed: " + err.message));
    };

    const handleDelRel = (id) => {
        if (confirm("Remove this relationship?")) {
            axios.delete(`/api/customer360/relationships/${id}`)
                .then(() => loadProfile(selectedCustomerId))
                .catch(err => alert("Failed needed: " + err.message));
        }
    };



    const [isEventModalOpen, setIsEventModalOpen] = useState(false);

    const handleCreateProfile = (data) => {
        const payload = {
            ...data,
            source: 'MANUAL_ENTRY'
        };

        if (editingCustomer) {
            payload.customer_id = editingCustomer.customer_id;
        }

        axios.post('/api/customer360/profile', payload)
            .then(res => {
                alert('Profile Created/Updated Successfully!');
                setIsCreateModalOpen(false);
                loadProfile(res.data.customer_id);
            })
            .catch(err => alert('Error creating profile: ' + err.message));
    };

    const handleRecalculatePersona = () => {
        setIsRecalculating(true);
        axios.post(`/api/persona/profiles/${selectedCustomerId}/assign-personas`)
            .then(res => {
                alert(`Persona updated to: ${res.data.assigned_persona.name}`);
                loadProfile(selectedCustomerId);
                setIsRecalculating(false);
            })
            .catch(err => {
                alert('Error calculating persona: ' + err.message);
                setIsRecalculating(false);
            });
    };

    const handleCreateEvent = (data) => {
        axios.post('/api/customer360/event', {
            ...data,
            customer_id: selectedCustomerId,
            timestamp: new Date().toISOString()
        })
            .then(res => {
                alert('Event Logged Successfully!');
                setIsEventModalOpen(false);
                loadProfile(selectedCustomerId);
            })
            .catch(err => alert('Error logging event: ' + err.message));
    };

    if (!selectedCustomerId || !customerData) {
        return (
            <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto', fontFamily: "'Outfit', sans-serif" }}>
                <div style={{ textAlign: 'center', marginBottom: '50px' }}>
                    <h1 style={{ fontSize: '3em', fontWeight: '700', color: '#1e293b', marginBottom: '10px' }}>Unified Profile Search</h1>
                    <p style={{ fontSize: '1.2em', color: '#64748b' }}>Find any customer across the enterprise with Golden ID resolution.</p>
                </div>

                <div style={{ background: 'white', padding: '30px', borderRadius: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}>
                    <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', fontSize: '1.2em' }}>🔍</span>
                            <input
                                type="text"
                                placeholder="Search by Name, Email, Mobile, or ID..."
                                value={search}
                                onChange={(e) => handleSearch(e.target.value)}
                                style={{
                                    width: '100%', padding: '18px 18px 18px 50px',
                                    borderRadius: '16px', border: '2px solid #e2e8f0',
                                    fontSize: '1.1em', outline: 'none', transition: 'border-color 0.2s',
                                    boxSizing: 'border-box'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                            />
                        </div>
                        <select
                            value={searchMode}
                            onChange={(e) => setSearchMode(e.target.value)}
                            style={{ padding: '0 20px', borderRadius: '16px', border: '2px solid #e2e8f0', background: '#f8fafc', fontWeight: '600', color: '#475569' }}
                        >
                            <option value="fuzzy">Fuzzy Match</option>
                            <option value="exact">Exact ID</option>
                        </select>
                        <button
                            onClick={() => {
                                setEditingCustomer(null);
                                setIsCreateModalOpen(true);
                            }}
                            style={{ padding: '0 30px', borderRadius: '16px', background: '#0f172a', color: 'white', fontWeight: '600', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                            + New Profile
                        </button>
                    </div>

                    <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                        {customers.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No customers found matching your criteria.</div>}
                        {customers.map(c => (
                            <div
                                key={c.id}
                                onClick={() => loadProfile(c.id)}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '20px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                                    transition: 'background 0.2s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                    <div style={{
                                        width: '48px', height: '48px', borderRadius: '12px',
                                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontWeight: 'bold', fontSize: '1.1em'
                                    }}>
                                        {getInitials(c.full_name)}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: '600', fontSize: '1.1em', color: '#0f172a' }}>{c.full_name}</div>
                                        <div style={{ fontSize: '0.9em', color: '#64748b' }}>
                                            {c.nationality || 'Unknown'} • {c.kyc_status ? <span style={{ color: '#16a34a' }}>Verified</span> : <span style={{ color: '#ca8a04' }}>Pending</span>}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ color: '#cbd5e1' }}>➔</div>
                            </div>
                        ))}
                    </div>
                </div>

                {isCreateModalOpen && (
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                        <div style={{ background: 'white', padding: '40px', borderRadius: '24px', width: '500px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                            <h2 style={{ marginTop: 0, marginBottom: '20px' }}>{editingCustomer ? 'Edit Unified Profile' : 'Create Unified Profile'}</h2>
                            <p style={{ color: '#64748b', marginBottom: '30px' }}>Manually create or update a Golden Record. In production, this data is typically ingested from source systems.</p>

                            <form onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.target);
                                const data = Object.fromEntries(formData.entries());
                                // If editing, we might want to include the ID, though the backend resolves by identity
                                // Let's rely on standard resolution (email/mobile) or implicit ID match if we supported it
                                handleCreateProfile(data);
                            }}>
                                <div style={{ display: 'grid', gap: '20px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px' }}>Full Name</label>
                                        <input required name="full_name" type="text" defaultValue={editingCustomer?.profile?.full_name} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px' }}>Date of Birth</label>
                                            <input required name="date_of_birth" type="date" defaultValue={editingCustomer?.profile?.date_of_birth?.split('T')[0]} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px' }}>Gender</label>
                                            <select name="gender" defaultValue={editingCustomer?.profile?.gender || ""} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}>
                                                <option value="">Select...</option>
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px' }}>Nationality</label>
                                            <select
                                                name="nationality"
                                                defaultValue={editingCustomer?.profile?.nationality || ""}
                                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                                            >
                                                <option value="">Select Nationality...</option>
                                                {countries.map(c => (
                                                    <option key={c.id} value={c.nationality}>{c.nationality} ({c.name})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px' }}>City</label>
                                            <select name="city" defaultValue={editingCustomer?.profile?.city || ""} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}>
                                                <option value="">Select City...</option>
                                                {cities.map(city => (
                                                    <option key={city.id} value={city.name}>{city.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px' }}>Occupation</label>
                                        <input name="occupation" defaultValue={editingCustomer?.profile?.occupation} type="text" placeholder="e.g. Engineer" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px' }}>Email (Identity)</label>
                                        <input name="email" defaultValue={editingCustomer?.contact?.email} type="email" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px' }}>Mobile (Identity)</label>
                                        <input name="mobile" defaultValue={editingCustomer?.contact?.mobile} type="tel" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                                    </div>

                                    {/* GCC SPECIFIC FIELDS */}
                                    <div style={{ padding: '15px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '10px' }}>
                                        <h4 style={{ margin: '0 0 15px 0', fontSize: '1em', color: '#1e293b' }}>GCC Persona Attributes</h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.85em', fontWeight: '600', marginBottom: '5px' }}>Is Citizen?</label>
                                                <select name="is_citizen" defaultValue={editingCustomer?.profile?.is_citizen ? "true" : "false"} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                                                    <option value="true">Yes (National)</option>
                                                    <option value="false">No (Expat)</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.85em', fontWeight: '600', marginBottom: '5px' }}>City Tier</label>
                                                <select name="city_tier" defaultValue={editingCustomer?.profile?.city_tier || "Tier1"} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                                                    <option value="Tier1">Tier 1 (Capital/Main)</option>
                                                    <option value="Tier2">Tier 2 (Secondary)</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.85em', fontWeight: '600', marginBottom: '5px' }}>Monthly Income (Local)</label>
                                                <input name="monthly_income_local" type="number" defaultValue={editingCustomer?.profile?.monthly_income_local} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.85em', fontWeight: '600', marginBottom: '5px' }}>Family Status</label>
                                                <select name="family_status" defaultValue={editingCustomer?.profile?.family_status || "Single"} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                                                    <option value="Single">Single</option>
                                                    <option value="Married">Married</option>
                                                    <option value="Head of Household">Head of Household</option>
                                                </select>
                                            </div>
                                            <div style={{ gridColumn: 'span 2' }}>
                                                <label style={{ display: 'block', fontSize: '0.85em', fontWeight: '600', marginBottom: '5px' }}>Employment Sector</label>
                                                <select name="employment_sector" defaultValue={editingCustomer?.profile?.employment_sector || "Private Corporate"} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                                                    <option value="Government">Government / Public</option>
                                                    <option value="Private Corporate">Private Corporate</option>
                                                    <option value="SME/Entrepreneur">SME / Entrepreneur</option>
                                                    <option value="Labor">Labor / Manual Service</option>
                                                    <option value="Retired">Retired</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
                                    <button type="button" onClick={() => { setIsCreateModalOpen(false); setEditingCustomer(null); }} style={{ flex: 1, padding: '15px', background: 'white', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '12px', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
                                    <button type="submit" style={{ flex: 1, padding: '15px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '600' }}>{editingCustomer ? 'Update Profile' : 'Create Profile'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    const handleDeleteProfile = () => {
        if (confirm("Are you sure you want to permanently delete this customer profile? All data (events, products, history) will be wiped.")) {
            axios.delete(`/api/customer360/${selectedCustomerId}`)
                .then(() => {
                    alert("Profile deleted.");
                    setSelectedCustomerId(null);
                    setCustomerData(null);
                    loadInitialCustomers();
                })
                .catch(err => alert("Deletion failed: " + err.message));
        }
    };

    const handleToggleConsent = (data, type) => {
        const newStatus = data.status === 'granted' ? 'revoked' : 'granted';
        axios.put(`/api/customer360/${selectedCustomerId}/consent`, {
            consent_type: type,
            status: newStatus
        }).then(() => {
            loadProfile(selectedCustomerId); // Reload to reflect changes
        }).catch(err => alert("Consent update failed"));
    };

    const { profile, identities, contacts, products, consents, history, relationships = [] } = customerData;

    return (
        <div style={{ padding: '0', background: '#f1f5f9', minHeight: '100vh', fontFamily: "'Outfit', sans-serif" }}>
            {/* TOP ACTIONS */}
            <div style={{ padding: '20px 40px', background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={() => setSelectedCustomerId(null)} style={{ border: 'none', background: 'none', fontWeight: '600', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>←</span> Back to Search
                </button>
                <div style={{ display: 'flex', gap: '15px' }}>
                    <button onClick={handleDeleteProfile} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #fee2e2', background: '#fef2f2', fontWeight: '600', color: '#dc2626', cursor: 'pointer' }}>Delete</button>
                    <button style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', fontWeight: '600', color: '#475569', cursor: 'pointer' }}>Export PDF</button>
                    <button
                        onClick={() => {
                            setEditingCustomer(customerData);
                            setIsCreateModalOpen(true);
                        }}
                        style={{ padding: '10px 20px', borderRadius: '8px', background: '#0f172a', color: 'white', fontWeight: '600', border: 'none', cursor: 'pointer' }}
                    >
                        Edit Profile
                    </button>
                </div>
            </div>

            <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '40px' }}>

                {/* HERO CARD */}
                <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', borderRadius: '24px', padding: '40px', color: 'white', marginBottom: '30px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
                            <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'white', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5em', fontWeight: 'bold' }}>
                                {getInitials(profile.full_name)}
                            </div>
                            <div>
                                <h1 style={{ margin: 0, fontSize: '2.5em', fontWeight: '700' }}>{profile.full_name}</h1>
                                <div style={{ display: 'flex', gap: '20px', marginTop: '10px', color: '#94a3b8', fontSize: '1.1em' }}>
                                    <span>🆔 {profile.id}</span>
                                    <span>🎂 {new Date(profile.date_of_birth).toLocaleDateString()}</span>
                                    <span>📍 {profile.city ? `${profile.city}, ` : ''}{profile.nationality}</span>
                                    {profile.gender && <span>👤 {profile.gender}</span>}
                                    {profile.occupation && <span>💼 {profile.occupation}</span>}
                                </div>
                            </div>
                        </div>
                        <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.1)', padding: '20px', borderRadius: '16px', backdropFilter: 'blur(10px)' }}>
                            <div style={{ fontSize: '0.9em', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.8 }}>Lifetime Value</div>
                            <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#4ade80' }}>$ {Number(profile.lifetime_value).toLocaleString()}</div>
                        </div>
                    </div>

                    <div style={{ marginTop: '40px', display: 'flex', gap: '40px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '30px' }}>
                        <div>
                            <div style={{ fontSize: '0.9em', opacity: 0.7, marginBottom: '5px' }}>Next Best Action</div>
                            <div style={{ fontWeight: '600', fontSize: '1.1em', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ background: '#f59e0b', color: 'black', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8em' }}>OFFER</span>
                                Platinum Card Upgrade
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.9em', opacity: 0.7, marginBottom: '5px' }}>Churn Risk</div>
                            <div style={{ fontWeight: '600', fontSize: '1.1em', color: profile.risk_score > 70 ? '#f87171' : '#4ade80' }}>
                                {profile.risk_score > 70 ? 'High Risk' : 'Low Risk'} ({profile.risk_score}%)
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.9em', opacity: 0.7, marginBottom: '5px' }}>KYC Status</div>
                            <div style={{ fontWeight: '600', fontSize: '1.1em', textTransform: 'uppercase' }}>
                                {profile.kyc_status === 'verified' ? '✅ Verified' : '⚠️ Pending'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* TABS */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
                    {['Overview', 'Timeline', 'Products', 'Identity & Privacy', 'Relationships', 'Persona'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab.toLowerCase().split(' ')[0])}
                            style={{
                                padding: '12px 24px',
                                borderRadius: '12px',
                                border: 'none',
                                background: activeTab === tab.toLowerCase().split(' ')[0] ? '#0f172a' : 'white',
                                color: activeTab === tab.toLowerCase().split(' ')[0] ? 'white' : '#64748b',
                                fontWeight: '600',
                                cursor: 'pointer',
                                boxShadow: activeTab === tab.toLowerCase().split(' ')[0] ? '0 10px 15px -3px rgba(15, 23, 42, 0.3)' : '0 1px 2px rgba(0,0,0,0.05)',
                                transition: 'all 0.2s'
                            }}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* CONTENT AREA */}
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '30px' }}>

                    {activeTab === 'overview' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
                            {/* RECENT ACTIVITY */}
                            <div style={{ background: 'white', padding: '30px', borderRadius: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                                <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#0f172a' }}>Recent Activity</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    {history.slice(0, 5).map((e, idx) => (
                                        <div key={idx} style={{ display: 'flex', gap: '20px', paddingBottom: '15px', borderBottom: idx !== 4 ? '1px solid #f1f5f9' : 'none' }}>
                                            <div style={{
                                                width: '40px', height: '40px', borderRadius: '10px',
                                                background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '1.2em'
                                            }}>
                                                {e.event_type === 'LOGIN' ? '🔐' : e.event_type === 'PURCHASE' ? '🛒' : '💬'}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: '600', color: '#1e293b' }}>{e.event_type}</div>
                                                <div style={{ fontSize: '0.9em', color: '#64748b' }}>{new Date(e.occurred_at).toLocaleString()} via {e.channel}</div>
                                                {e.payload?.amount && <div style={{ fontSize: '0.9em', color: '#16a34a', fontWeight: '500' }}>+ {e.payload.currency} {e.payload.amount}</div>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* CONTACTS SUMMARY */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ background: 'white', padding: '30px', borderRadius: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                                    <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#0f172a' }}>Contact Info</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                        {contacts.map(c => (
                                            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                <div style={{ color: '#64748b' }}>{c.type === 'email' ? '✉️' : '📞'}</div>
                                                <div>
                                                    <div style={{ fontWeight: '500', color: '#1e293b' }}>{c.value}</div>
                                                    {c.is_preferred && <div style={{ fontSize: '0.8em', color: '#2563eb' }}>Preferred Channel</div>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div style={{ background: 'white', padding: '30px', borderRadius: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                                    <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#0f172a' }}>Segments</h3>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                        <span style={{ padding: '6px 14px', borderRadius: '20px', background: '#eff6ff', color: '#2563eb', fontSize: '0.9em', fontWeight: '500' }}>High Value</span>
                                        <span style={{ padding: '6px 14px', borderRadius: '20px', background: '#f0fdf4', color: '#16a34a', fontSize: '0.9em', fontWeight: '500' }}>Early Adopter</span>
                                        <span style={{ padding: '6px 14px', borderRadius: '20px', background: '#fefce8', color: '#ca8a04', fontSize: '0.9em', fontWeight: '500' }}>Riyadh Region</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'timeline' && (
                        <div style={{ background: 'white', padding: '40px', borderRadius: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                                <button
                                    onClick={() => setIsEventModalOpen(true)}
                                    style={{ padding: '8px 16px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                                >
                                    + Log Interaction
                                </button>
                            </div>
                            <div style={{ position: 'relative', borderLeft: '2px solid #e2e8f0', marginLeft: '20px', paddingLeft: '40px' }}>
                                {history.length === 0 && <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>No timeline events recorded yet.</div>}
                                {history.map(e => (
                                    <div key={e.id} style={{ marginBottom: '40px', position: 'relative' }}>
                                        <div style={{
                                            position: 'absolute', left: '-51px', top: '0',
                                            width: '20px', height: '20px', borderRadius: '50%',
                                            background: '#3b82f6', border: '4px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                        }}></div>
                                        <div style={{ fontSize: '0.9em', color: '#94a3b8', marginBottom: '5px' }}>{new Date(e.occurred_at).toLocaleString()}</div>
                                        <div style={{ fontSize: '1.2em', fontWeight: '600', color: '#1e293b', marginBottom: '5px' }}>{e.event_type}</div>
                                        <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', color: '#475569' }}>
                                            Source: {e.channel || 'Manual'}
                                            {e.payload && <pre style={{ margin: '10px 0 0 0', fontSize: '0.85em', color: '#64748b' }}>{JSON.stringify(e.payload, null, 2)}</pre>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'products' && (
                        <div style={{ background: 'white', padding: '30px', borderRadius: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                                        <th style={{ padding: '15px', borderRadius: '12px 0 0 12px' }}>Product Name</th>
                                        <th style={{ padding: '15px' }}>Account / ID</th>
                                        <th style={{ padding: '15px' }}>Type</th>
                                        <th style={{ padding: '15px' }}>Status</th>
                                        <th style={{ padding: '15px', borderRadius: '0 12px 12px 0', textAlign: 'right' }}>Balance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.length === 0 && <tr><td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No products found.</td></tr>}
                                    {products.map(p => (
                                        <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '20px 15px', fontWeight: '600' }}>{p.product_name}</td>
                                            <td style={{ padding: '20px 15px', fontFamily: 'monospace', color: '#64748b' }}>{p.account_number}</td>
                                            <td style={{ padding: '20px 15px' }}>
                                                <span style={{ padding: '4px 10px', borderRadius: '6px', background: '#f1f5f9', color: '#475569', fontSize: '0.9em' }}>{p.product_type}</span>
                                            </td>
                                            <td style={{ padding: '20px 15px' }}>
                                                <span style={{ padding: '4px 10px', borderRadius: '6px', background: p.status === 'active' ? '#dcfce7' : '#fef2f2', color: p.status === 'active' ? '#166534' : '#b91c1c', fontSize: '0.9em', fontWeight: 'bold', textTransform: 'uppercase' }}>{p.status}</span>
                                            </td>
                                            <td style={{ padding: '20px 15px', textAlign: 'right', fontWeight: '600' }}>{p.currency} {Number(p.balance).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'identity' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                            <div style={{ background: 'white', padding: '30px', borderRadius: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                                <h3 style={{ marginTop: 0 }}>Linked Identities</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    {identities.map(i => (
                                        <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', background: '#f8fafc', borderRadius: '12px' }}>
                                            <div>
                                                <div style={{ fontSize: '0.9em', color: '#64748b', textTransform: 'uppercase', marginBottom: '5px' }}>{i.identity_type}</div>
                                                <div style={{ fontWeight: '600', fontSize: '1.1em', fontFamily: 'monospace' }}>{i.identity_value}</div>
                                            </div>
                                            {i.is_primary && <div style={{ color: '#2563eb' }}>★ Primary</div>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div style={{ background: 'white', padding: '30px', borderRadius: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                                <h3 style={{ marginTop: 0 }}>Consent & Privacy</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    {consents.length === 0 && <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>No specific consents recorded.</div>}
                                    {consents.map(c => (
                                        <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                                            <div>
                                                <div style={{ fontWeight: '600' }}>{c.consent_type}</div>
                                                <div style={{ fontSize: '0.8em', color: '#94a3b8' }}>Updated: {new Date(c.consent_date).toLocaleDateString()}</div>
                                            </div>
                                            <div
                                                onClick={() => handleToggleConsent(c, c.consent_type)}
                                                style={{
                                                    padding: '6px 12px', borderRadius: '20px',
                                                    background: c.status === 'granted' ? '#dcfce7' : '#fef2f2',
                                                    color: c.status === 'granted' ? '#166534' : '#b91c1c', fontWeight: 'bold', fontSize: '0.9em',
                                                    cursor: 'pointer', userSelect: 'none'
                                                }}
                                                title="Click to Toggle"
                                            >
                                                {c.status.toUpperCase()} 🔄
                                            </div>
                                        </div>
                                    ))}
                                    {/* Add New Consent Placeholder (Quick button to grant common ones) */}
                                    <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                                        <button onClick={() => handleToggleConsent({ status: 'revoked' }, 'Marketing Email')} style={{ fontSize: '0.8em', padding: '5px 10px', cursor: 'pointer' }}>+ Marketing</button>
                                        <button onClick={() => handleToggleConsent({ status: 'revoked' }, 'Data Sharing')} style={{ fontSize: '0.8em', padding: '5px 10px', cursor: 'pointer' }}>+ Data Sharing</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'relationships' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                            <div style={{ background: 'white', padding: '30px', borderRadius: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                                <h3 style={{ marginTop: 0 }}>Family & Corporate Links</h3>
                                {relationships.length === 0 && <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>No relationships mapped.</div>}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    {relationships.map(r => (
                                        <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                                            <div onClick={() => loadProfile(r.customer_id_to)} style={{ cursor: 'pointer' }}>
                                                <div style={{ fontWeight: '600' }}>{r.full_name}</div>
                                                <div style={{ fontSize: '0.9em', color: '#64748b' }}>{r.relationship_type.toUpperCase()} • {r.nationality}</div>
                                            </div>
                                            <button onClick={() => handleDelRel(r.id)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>×</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div style={{ background: 'white', padding: '30px', borderRadius: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                                <h3 style={{ marginTop: 0 }}>Link New Profile</h3>
                                <input
                                    type="text"
                                    placeholder="Search Name to Link..."
                                    value={relSearch}
                                    onChange={(e) => handleRelSearch(e.target.value)}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '15px' }}
                                />
                                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                    {relResults.map(res => (
                                        <div key={res.customer_id} style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontWeight: 'bold' }}>{res.full_name}</div>
                                                <div style={{ fontSize: '0.8em', color: '#94a3b8' }}>{res.customer_id.substring(0, 8)}...</div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '5px' }}>
                                                <button onClick={() => handleAddRel(res.customer_id, 'spouse')} style={{ fontSize: '0.8em', padding: '4px 8px', cursor: 'pointer' }}>Spouse</button>
                                                <button onClick={() => handleAddRel(res.customer_id, 'child')} style={{ fontSize: '0.8em', padding: '4px 8px', cursor: 'pointer' }}>Child</button>
                                                <button onClick={() => handleAddRel(res.customer_id, 'employer')} style={{ fontSize: '0.8em', padding: '4px 8px', cursor: 'pointer' }}>Employer</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'persona' && (
                        <PersonaProfileCard profileId={selectedCustomerId} customerData={customerData} />
                    )}

                </div>
                {isCreateModalOpen && (
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000 }}>
                        <div style={{ background: 'white', padding: '40px', borderRadius: '24px', width: '500px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                            <h2 style={{ marginTop: 0, marginBottom: '20px' }}>{editingCustomer ? 'Edit Unified Profile' : 'Create Unified Profile'}</h2>
                            <p style={{ color: '#64748b', marginBottom: '30px' }}>Manually create or update a Golden Record. In production, this data is typically ingested from source systems.</p>

                            <form onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.target);
                                const data = Object.fromEntries(formData.entries());
                                handleCreateProfile(data);
                            }}>
                                <div style={{ display: 'grid', gap: '20px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px' }}>Full Name</label>
                                        <input required name="full_name" type="text" defaultValue={editingCustomer?.profile?.full_name} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px' }}>Date of Birth</label>
                                            <input required name="date_of_birth" type="date" defaultValue={editingCustomer?.profile?.date_of_birth?.split('T')[0]} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px' }}>Gender</label>
                                            <select name="gender" defaultValue={editingCustomer?.profile?.gender || ""} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}>
                                                <option value="">Select...</option>
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px' }}>Nationality</label>
                                            <select
                                                name="nationality"
                                                defaultValue={editingCustomer?.profile?.nationality || ""}
                                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                                            >
                                                <option value="">Select Nationality...</option>
                                                {countries.map(c => (
                                                    <option key={c.id} value={c.nationality}>{c.nationality} ({c.name})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px' }}>City</label>
                                            <select name="city" defaultValue={editingCustomer?.profile?.city || ""} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}>
                                                <option value="">Select City...</option>
                                                {cities.map(city => (
                                                    <option key={city.id} value={city.name}>{city.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px' }}>Occupation</label>
                                        <input name="occupation" defaultValue={editingCustomer?.profile?.occupation} type="text" placeholder="e.g. Engineer" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px' }}>Email (Identity)</label>
                                        <input name="email" defaultValue={editingCustomer?.contact?.email} type="email" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px' }}>Mobile (Identity)</label>
                                        <input name="mobile" defaultValue={editingCustomer?.contact?.mobile} type="tel" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
                                    <button type="button" onClick={() => { setIsCreateModalOpen(false); setEditingCustomer(null); }} style={{ flex: 1, padding: '15px', background: 'white', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '12px', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
                                    <button type="submit" style={{ flex: 1, padding: '15px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '600' }}>{editingCustomer ? 'Update Profile' : 'Create Profile'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
                {isEventModalOpen && (
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000 }}>
                        <div style={{ background: 'white', padding: '40px', borderRadius: '24px', width: '500px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                            <h2 style={{ marginTop: 0, marginBottom: '20px' }}>Log Interaction</h2>
                            <p style={{ color: '#64748b', marginBottom: '30px' }}>Manually capture a customer touchpoint or external event.</p>

                            <form onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.target);
                                const data = Object.fromEntries(formData.entries());
                                // Parse JSON payload if provided
                                try {
                                    if (data.payload_json) {
                                        data.payload = JSON.parse(data.payload_json);
                                        delete data.payload_json;
                                    }
                                } catch (err) {
                                    alert('Invalid JSON Payload');
                                    return;
                                }
                                handleCreateEvent(data);
                            }}>
                                <div style={{ display: 'grid', gap: '20px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px' }}>Event Type</label>
                                        <select required name="event_type" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}>
                                            <option value="">Select...</option>
                                            <option value="CALL_LOG">Call Log</option>
                                            <option value="MEETING_NOTES">Meeting Notes</option>
                                            <option value="MANUAL_TICKET">Manual Ticket</option>
                                            <option value="NOTE">Note / Comment</option>
                                            <option value="OFFLINE_PURCHASE">Offline Purchase</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px' }}>Channel</label>
                                        <select name="channel" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}>
                                            <option value="IN_PERSON">In Person</option>
                                            <option value="PHONE">Phone</option>
                                            <option value="EMAIL">Email</option>
                                            <option value="OTHER">Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px' }}>Details (JSON)</label>
                                        <textarea name="payload_json" placeholder='{"notes": "Customer asked about pricing..."}' rows="4" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontFamily: 'monospace' }}></textarea>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
                                    <button type="button" onClick={() => setIsEventModalOpen(false)} style={{ flex: 1, padding: '15px', background: 'white', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '12px', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
                                    <button type="submit" style={{ flex: 1, padding: '15px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '600' }}>Save Interaction</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
