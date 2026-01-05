import React, { useEffect, useState } from 'react';
import axios from 'axios';

export function GlobalAdminDashboard() {
    const [activeTab, setActiveTab] = useState('tenants');

    // Tenants State
    const [tenants, setTenants] = useState([]);
    const [stats, setStats] = useState({ total_tenants: 0, total_users: 0, total_forms: 0, total_submissions: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [newTenant, setNewTenant] = useState({ name: '', planId: '' }); // planId integer
    const [availablePlans, setAvailablePlans] = useState([]); // For dropdown

    // Plans State
    const [plans, setPlans] = useState([]);
    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null); // If null, creating new

    const fetchTenants = (search = '') => {
        axios.get(`/api/admin/tenants?search=${search}`)
            .then(res => {
                setTenants(res.data);
            })
            .catch(err => {
                console.error(err);
                setError("Failed to load tenants.");
            });
    };

    const fetchStats = () => {
        axios.get('/api/admin/stats')
            .then(res => setStats(res.data))
            .catch(console.error);
    };

    const fetchPlans = () => {
        axios.get('/api/admin/plans')
            .then(res => {
                setPlans(res.data);
                setAvailablePlans(res.data);
            })
            .catch(console.error);
    };

    useEffect(() => {
        setLoading(true);
        Promise.all([
            axios.get('/api/admin/tenants'),
            axios.get('/api/admin/stats'),
            axios.get('/api/admin/plans')
        ]).then(([resTenants, resStats, resPlans]) => {
            setTenants(resTenants.data);
            setStats(resStats.data);
            setPlans(resPlans.data);
            setAvailablePlans(resPlans.data);
            setLoading(false);
        }).catch(err => {
            setError(err.message);
            setLoading(false);
        });
    }, []);

    const handleAddTenant = () => {
        if (!newTenant.name) return alert("Organization name required");
        axios.post('/api/admin/tenants', newTenant)
            .then(() => {
                setShowAddModal(false);
                setNewTenant({ name: '', planId: '' });
                fetchTenants();
                fetchStats();
            })
            .catch(err => alert("Failed to add organization: " + (err.response?.data?.error || err.message)));
    };

    const handleDeleteTenant = (id) => {
        if (!confirm("Are you sure you want to delete this organization? All data will be lost.")) return;
        axios.delete(`/api/admin/tenants/${id}`)
            .then(() => {
                fetchTenants();
                fetchStats();
            })
            .catch(err => alert("Failed to delete organization: " + err.message));
    };

    const handleSavePlan = (planData) => {
        if (planData.id) {
            // Update
            axios.put(`/api/admin/plans/${planData.id}`, planData)
                .then(() => {
                    fetchPlans();
                    setIsPlanModalOpen(false);
                })
                .catch(err => alert("Failed to update plan: " + err.message));
        } else {
            // Create
            axios.post('/api/admin/plans', planData)
                .then(() => {
                    fetchPlans();
                    setIsPlanModalOpen(false);
                })
                .catch(err => alert("Failed to create plan: " + err.message));
        }
    };

    if (loading) return <div style={{ padding: '40px' }}>Loading Administration...</div>;
    if (error) return <div style={{ padding: '40px', color: '#ef4444' }}>{error}</div>;

    return (
        <div style={{ padding: '40px', fontFamily: "'Outfit', sans-serif", maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '2em', color: '#0f172a' }}>Global Administration</h1>
                    <p style={{ color: '#64748b', marginTop: '5px' }}>Manage all organizations and pricing models.</p>
                </div>
            </div>

            {/* TAB NAVIGATION */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', borderBottom: '1px solid #e2e8f0' }}>
                <button
                    onClick={() => setActiveTab('tenants')}
                    style={{
                        padding: '10px 20px', background: 'transparent', border: 'none', cursor: 'pointer',
                        fontSize: '1em', fontWeight: '600', color: activeTab === 'tenants' ? '#0f172a' : '#64748b',
                        borderBottom: activeTab === 'tenants' ? '2px solid #0f172a' : 'none', marginBottom: '-1px'
                    }}
                >
                    Organizations
                </button>
                <button
                    onClick={() => setActiveTab('plans')}
                    style={{
                        padding: '10px 20px', background: 'transparent', border: 'none', cursor: 'pointer',
                        fontSize: '1em', fontWeight: '600', color: activeTab === 'plans' ? '#0f172a' : '#64748b',
                        borderBottom: activeTab === 'plans' ? '2px solid #0f172a' : 'none', marginBottom: '-1px'
                    }}
                >
                    Pricing Models & Plans
                </button>
            </div>

            {activeTab === 'tenants' && (
                <>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '20px' }}>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                placeholder="Search organizations..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    fetchTenants(e.target.value);
                                }}
                                style={{
                                    padding: '10px 15px', paddingLeft: '35px', borderRadius: '8px',
                                    border: '1px solid #e2e8f0', outline: 'none', width: '250px'
                                }}
                            />
                            <span style={{ position: 'absolute', left: '12px', top: '10px', color: '#94a3b8' }}>🔍</span>
                        </div>
                        <div style={{ flex: 1 }}></div>
                        <button
                            onClick={() => setShowAddModal(true)}
                            style={{ padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                        >
                            + Add Tenant
                        </button>
                    </div>

                    <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <tr>
                                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.85em', textTransform: 'uppercase', color: '#64748b' }}>Organization</th>
                                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.85em', textTransform: 'uppercase', color: '#64748b' }}>Plan</th>
                                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.85em', textTransform: 'uppercase', color: '#64748b' }}>Status</th>
                                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.85em', textTransform: 'uppercase', color: '#64748b' }}>Users</th>
                                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.85em', textTransform: 'uppercase', color: '#64748b' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tenants.map(t => {
                                    // Match plan_id to plan name
                                    const plan = availablePlans.find(p => p.id === t.plan_id);
                                    const planName = plan ? plan.name : (t.plan || 'Unknown'); // Fallback to old field

                                    return (
                                        <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '16px', fontWeight: '600', color: '#334155' }}>{t.name}</td>
                                            <td style={{ padding: '16px' }}>
                                                <span style={{
                                                    padding: '4px 10px', borderRadius: '20px', fontSize: '0.85em',
                                                    background: '#f0f9ff', color: '#0369a1', fontWeight: '700'
                                                }}>
                                                    {planName}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px' }}>{t.status || t.subscription_status}</td>
                                            <td style={{ padding: '16px', color: '#64748b' }}>{t.user_count} User(s)</td>
                                            <td style={{ padding: '16px' }}>
                                                <button
                                                    onClick={() => handleDeleteTenant(t.id)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2em', color: '#ef4444' }}
                                                    title="Delete"
                                                >
                                                    🗑️
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {activeTab === 'plans' && (
                <>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                        <button
                            onClick={() => { setEditingPlan(null); setIsPlanModalOpen(true); }}
                            style={{ padding: '10px 20px', background: '#059669', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                        >
                            + Create New Plan
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
                        {plans.map(plan => (
                            <div key={plan.id} style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px', position: 'relative' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <h3 style={{ marginTop: 0, marginBottom: '5px' }}>{plan.name}</h3>
                                        <div style={{ color: '#64748b', fontSize: '0.9em' }}>{plan.description}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#059669' }}>{plan.price_monthly} SAR</div>
                                        <div style={{ fontSize: '0.8em', color: '#64748b' }}>/ month</div>
                                    </div>
                                </div>

                                <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '20px 0' }} />

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '0.9em', color: '#334155' }}>
                                    <div><strong>Max Users:</strong> {plan.max_users}</div>
                                    <div><strong>Max Responses:</strong> {plan.max_responses}</div>
                                </div>

                                <div style={{ marginTop: '20px' }}>
                                    <strong style={{ fontSize: '0.9em' }}>Features:</strong>
                                    <ul style={{ paddingLeft: '20px', margin: '5px 0', fontSize: '0.9em', color: '#475569' }}>
                                        {plan.features?.map((f, i) => <li key={i}>{f}</li>)}
                                    </ul>
                                </div>

                                <button
                                    onClick={() => { setEditingPlan(plan); setIsPlanModalOpen(true); }}
                                    style={{ width: '100%', marginTop: '20px', padding: '10px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}
                                >
                                    Edit Plan
                                </button>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* ADD TENANT MODAL */}
            {showAddModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001 }}>
                    <div style={{ background: 'white', padding: '30px', borderRadius: '12px', width: '400px' }}>
                        <h2 style={{ marginTop: 0 }}>Add New Organization</h2>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Name</label>
                            <input
                                type="text"
                                value={newTenant.name}
                                onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                                style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                            />
                        </div>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Plan</label>
                            <select
                                value={newTenant.planId}
                                onChange={(e) => setNewTenant({ ...newTenant, planId: e.target.value })}
                                style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                            >
                                <option value="">Select a Plan...</option>
                                {availablePlans.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} ({p.price_monthly} SAR/mo)</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={handleAddTenant} style={{ flex: 1, padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Create</button>
                            <button onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* PLAN MODAL */}
            {isPlanModalOpen && (
                <PlanModal
                    plan={editingPlan}
                    onSave={handleSavePlan}
                    onClose={() => setIsPlanModalOpen(false)}
                />
            )}
        </div>
    );
}

function PlanModal({ plan, onSave, onClose }) {
    const [formData, setFormData] = useState(plan || {
        name: '', description: '', price_monthly: 0, price_yearly: 0,
        max_users: 5, max_responses: 1000, features: [], is_active: true
    });
    const [featureInput, setFeatureInput] = useState('');

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleAddFeature = () => {
        if (featureInput) {
            setFormData({ ...formData, features: [...(formData.features || []), featureInput] });
            setFeatureInput('');
        }
    };

    const handleRemoveFeature = (idx) => {
        const newFeat = [...formData.features];
        newFeat.splice(idx, 1);
        setFormData({ ...formData, features: newFeat });
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1002 }}>
            <div style={{ background: 'white', padding: '30px', borderRadius: '12px', width: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
                <h2 style={{ marginTop: 0 }}>{plan ? 'Edit Plan' : 'Create New Plan'}</h2>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9em', marginBottom: '5px' }}>Plan Name</label>
                        <input name="name" value={formData.name} onChange={handleChange} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9em', marginBottom: '5px' }}>Monthly Price ($)</label>
                        <input type="number" name="price_monthly" value={formData.price_monthly} onChange={handleChange} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                    </div>
                </div>

                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', fontSize: '0.9em', marginBottom: '5px' }}>Description</label>
                    <textarea name="description" value={formData.description} onChange={handleChange} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9em', marginBottom: '5px' }}>Max Users</label>
                        <input type="number" name="max_users" value={formData.max_users} onChange={handleChange} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9em', marginBottom: '5px' }}>Max Responses</label>
                        <input type="number" name="max_responses" value={formData.max_responses} onChange={handleChange} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                    </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '0.9em', marginBottom: '5px' }}>Features</label>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                        <input
                            value={featureInput}
                            onChange={(e) => setFeatureInput(e.target.value)}
                            placeholder="Add feature (e.g. 'Unlimited Surveys')"
                            style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        />
                        <button onClick={handleAddFeature} style={{ padding: '8px 15px', background: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Add</button>
                    </div>
                    <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '0.9em', color: '#475569' }}>
                        {formData.features?.map((f, i) => (
                            <li key={i} style={{ marginBottom: '5px' }}>
                                {f}
                                <span onClick={() => handleRemoveFeature(i)} style={{ marginLeft: '10px', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' }}>x</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => onSave(formData)} style={{ flex: 1, padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Save Plan</button>
                    <button onClick={onClose} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                </div>
            </div>
        </div>
    );
}

// ... existing code ...
