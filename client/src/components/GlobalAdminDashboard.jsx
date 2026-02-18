import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useToast } from './common/Toast';
import { DashboardSkeleton } from './common/Skeleton';

export function GlobalAdminDashboard() {
    const toast = useToast();
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
        if (!newTenant.name) { toast.warning("Organization name required"); return; }
        axios.post('/api/admin/tenants', newTenant)
            .then(() => {
                setShowAddModal(false);
                setNewTenant({ name: '', planId: '' });
                fetchTenants();
                fetchStats();
            })
            .catch(err => toast.error("Failed to add organization: " + (err.response?.data?.error || err.message)));
    };

    const handleDeleteTenant = (id) => {
        if (!confirm("Are you sure you want to delete this organization? All data will be lost.")) return;
        axios.delete(`/api/admin/tenants/${id}`)
            .then(() => {
                fetchTenants();
                fetchStats();
            })
            .catch(err => toast.error("Failed to delete organization: " + err.message));
    };

    const handleSavePlan = (planData) => {
        if (planData.id) {
            // Update
            axios.put(`/api/admin/plans/${planData.id}`, planData)
                .then(() => {
                    fetchPlans();
                    setIsPlanModalOpen(false);
                })
                .catch(err => toast.error("Failed to update plan: " + err.message));
        } else {
            // Create
            axios.post('/api/admin/plans', planData)
                .then(() => {
                    fetchPlans();
                    setIsPlanModalOpen(false);
                })
                .catch(err => toast.error("Failed to create plan: " + err.message));
        }
    };

    if (loading) {
        return (
            <div role="status" aria-live="polite" style={{ padding: '40px' }}>
                <span className="sr-only">Loading administration dashboard</span>
                <DashboardSkeleton />
            </div>
        );
    }

    if (error) return <div style={{ padding: '40px', color: '#ef4444' }}>{error}</div>;

    return (
        <div style={{ padding: '40px', fontFamily: "'Outfit', sans-serif", maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '2em', color: 'var(--text-color)' }}>Global Administration</h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '5px' }}>Manage all organizations and pricing models.</p>
                </div>
            </div>

            {/* TAB NAVIGATION */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', borderBottom: '1px solid var(--input-border)' }}>
                <button
                    onClick={() => setActiveTab('tenants')}
                    style={{
                        padding: '10px 20px', background: 'transparent', border: 'none', cursor: 'pointer',
                        fontSize: '1em', fontWeight: '600', color: activeTab === 'tenants' ? 'var(--text-color)' : 'var(--text-muted)',
                        borderBottom: activeTab === 'tenants' ? '2px solid var(--primary-color)' : 'none', marginBottom: '-1px'
                    }}
                >
                    Organizations
                </button>
                <button
                    onClick={() => setActiveTab('plans')}
                    style={{
                        padding: '10px 20px', background: 'transparent', border: 'none', cursor: 'pointer',
                        fontSize: '1em', fontWeight: '600', color: activeTab === 'plans' ? 'var(--text-color)' : 'var(--text-muted)',
                        borderBottom: activeTab === 'plans' ? '2px solid var(--primary-color)' : 'none', marginBottom: '-1px'
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
                                    border: '1px solid var(--input-border)', outline: 'none', width: '250px',
                                    background: 'var(--input-bg)', color: 'var(--text-color)'
                                }}
                            />
                            <span style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }}>🔍</span>
                        </div>
                        <div style={{ flex: 1 }}></div>
                        <button
                            onClick={() => setShowAddModal(true)}
                            style={{ padding: '10px 20px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                        >
                            + Add Tenant
                        </button>
                    </div>

                    <div style={{ background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--input-border)', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ background: 'var(--sidebar-bg)', borderBottom: '1px solid var(--input-border)' }}>
                                <tr>
                                    <th scope="col" style={{ padding: '16px', textAlign: 'left', fontSize: '0.85em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Organization</th>
                                    <th scope="col" style={{ padding: '16px', textAlign: 'left', fontSize: '0.85em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Plan</th>
                                    <th scope="col" style={{ padding: '16px', textAlign: 'left', fontSize: '0.85em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Status</th>
                                    <th scope="col" style={{ padding: '16px', textAlign: 'left', fontSize: '0.85em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Users</th>
                                    <th scope="col" style={{ padding: '16px', textAlign: 'left', fontSize: '0.85em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tenants.map(t => {
                                    // Match plan_id to plan name
                                    const plan = availablePlans.find(p => p.id === t.plan_id);
                                    const planName = plan ? plan.name : (t.plan || 'Unknown'); // Fallback to old field

                                    return (
                                        <tr key={t.id} style={{ borderBottom: '1px solid var(--input-border)' }}>
                                            <td style={{ padding: '16px', fontWeight: '600', color: 'var(--text-color)' }}>{t.name}</td>
                                            <td style={{ padding: '16px' }}>
                                                <span style={{
                                                    padding: '4px 10px', borderRadius: '20px', fontSize: '0.85em',
                                                    background: 'var(--sidebar-bg)', color: 'var(--primary-color)', fontWeight: '700',
                                                    border: '1px solid var(--input-border)'
                                                }}>
                                                    {planName}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px', color: 'var(--text-color)' }}>{t.status || t.subscription_status}</td>
                                            <td style={{ padding: '16px', color: 'var(--text-muted)' }}>{t.user_count} User(s)</td>
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
                            <div key={plan.id} style={{ background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--input-border)', padding: '24px', position: 'relative' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <h3 style={{ marginTop: 0, marginBottom: '5px', color: 'var(--text-color)' }}>{plan.name}</h3>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>{plan.description}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#059669' }}>{plan.price_monthly} SAR</div>
                                        <div style={{ fontSize: '0.8em', color: 'var(--text-muted)' }}>/ month</div>
                                    </div>
                                </div>

                                <hr style={{ border: 'none', borderTop: '1px solid var(--input-border)', margin: '20px 0' }} />

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '0.9em', color: 'var(--text-color)' }}>
                                    <div><strong>Max Users:</strong> {plan.max_users}</div>
                                    <div><strong>Max Responses:</strong> {plan.max_responses}</div>
                                </div>

                                <div style={{ marginTop: '20px' }}>
                                    <strong style={{ fontSize: '0.9em', color: 'var(--text-color)' }}>Features:</strong>
                                    <ul style={{ paddingLeft: '20px', margin: '5px 0', fontSize: '0.9em', color: 'var(--text-muted)' }}>
                                        {plan.features?.map((f, i) => <li key={i}>{f}</li>)}
                                    </ul>
                                </div>

                                <button
                                    onClick={() => { setEditingPlan(plan); setIsPlanModalOpen(true); }}
                                    style={{ width: '100%', marginTop: '20px', padding: '10px', background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-color)' }}
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
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001, backdropFilter: 'blur(5px)' }}>
                    <div style={{ background: 'var(--card-bg)', padding: '30px', borderRadius: '12px', width: '400px', border: '1px solid var(--glass-border)' }}>
                        <h2 style={{ marginTop: 0, color: 'var(--text-color)' }}>Add New Organization</h2>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-color)' }}>Name</label>
                            <input
                                type="text"
                                value={newTenant.name}
                                onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                                style={{ width: '100%', padding: '10px', border: '1px solid var(--input-border)', borderRadius: '6px', background: 'var(--input-bg)', color: 'var(--text-color)' }}
                            />
                        </div>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-color)' }}>Plan</label>
                            <select
                                value={newTenant.planId}
                                onChange={(e) => setNewTenant({ ...newTenant, planId: e.target.value })}
                                style={{ width: '100%', padding: '10px', border: '1px solid var(--input-border)', borderRadius: '6px', background: 'var(--input-bg)', color: 'var(--text-color)' }}
                            >
                                <option value="">Select a Plan...</option>
                                {availablePlans.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} ({p.price_monthly} SAR/mo)</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={handleAddTenant} style={{ flex: 1, padding: '12px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Create</button>
                            <button onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid var(--input-border)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-color)' }}>Cancel</button>
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
        max_users: 5, max_responses: 1000, max_forms: 10, features: [], is_active: true
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1002, backdropFilter: 'blur(5px)' }}>
            <div style={{ background: 'var(--card-bg)', padding: '30px', borderRadius: '12px', width: '500px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--glass-border)', color: 'var(--text-color)' }}>
                <h2 style={{ marginTop: 0, color: 'var(--text-color)' }}>{plan ? 'Edit Plan' : 'Create New Plan'}</h2>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9em', marginBottom: '5px', color: 'var(--text-muted)' }}>Plan Name</label>
                        <input name="name" value={formData.name} onChange={handleChange} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9em', marginBottom: '5px', color: 'var(--text-muted)' }}>Monthly Price ($)</label>
                        <input type="number" name="price_monthly" value={formData.price_monthly} onChange={handleChange} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)' }} />
                    </div>
                </div>

                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', fontSize: '0.9em', marginBottom: '5px', color: 'var(--text-muted)' }}>Description</label>
                    <textarea name="description" value={formData.description} onChange={handleChange} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9em', marginBottom: '5px', color: 'var(--text-muted)' }}>Max Users</label>
                        <input type="number" name="max_users" value={formData.max_users} onChange={handleChange} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9em', marginBottom: '5px', color: 'var(--text-muted)' }}>Max Responses</label>
                        <input type="number" name="max_responses" value={formData.max_responses} onChange={handleChange} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9em', marginBottom: '5px', color: 'var(--text-muted)' }}>Max Forms</label>
                        <input type="number" name="max_forms" value={formData.max_forms} onChange={handleChange} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)' }} />
                    </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '0.9em', marginBottom: '5px', color: 'var(--text-muted)' }}>Features</label>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                        <input
                            value={featureInput}
                            onChange={(e) => setFeatureInput(e.target.value)}
                            placeholder="Add feature (e.g. 'Unlimited Surveys')"
                            style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)' }}
                        />
                        <button onClick={handleAddFeature} style={{ padding: '8px 15px', background: 'var(--sidebar-bg)', border: '1px solid var(--input-border)', color: 'var(--text-color)', borderRadius: '6px', cursor: 'pointer' }}>Add</button>
                    </div>
                    <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '0.9em', color: 'var(--text-muted)' }}>
                        {formData.features?.map((f, i) => (
                            <li key={i} style={{ marginBottom: '5px' }}>
                                {f}
                                <span onClick={() => handleRemoveFeature(i)} style={{ marginLeft: '10px', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' }}>x</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => onSave(formData)} style={{ flex: 1, padding: '12px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Save Plan</button>
                    <button onClick={onClose} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid var(--input-border)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-color)' }}>Cancel</button>
                </div>
            </div>
        </div>
    );
}

// ... existing code ...
