import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, Tag, CreditCard, Save, X } from 'lucide-react';

export function SubscriptionConfig() {
    const [activeTab, setActiveTab] = useState('plans'); // plans, discounts

    return (
        <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto', fontFamily: "'Outfit', sans-serif" }}>
            <div style={{ marginBottom: '30px' }}>
                <h1 style={{ marginBottom: '10px', fontSize: '2em', color: '#0f172a' }}>Subscription Configuration</h1>
                <p style={{ color: '#64748b' }}>Manage subscription plans and discount campaigns.</p>
            </div>

            {/* TAB NAV */}
            <div style={{ display: 'flex', gap: '30px', borderBottom: '1px solid #e2e8f0', marginBottom: '30px' }}>
                <button
                    onClick={() => setActiveTab('plans')}
                    style={{
                        padding: '12px 0', background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: '1em', fontWeight: '600', color: activeTab === 'plans' ? '#0f172a' : '#94a3b8',
                        borderBottom: activeTab === 'plans' ? '2px solid #0f172a' : '2px solid transparent'
                    }}
                >
                    Plans
                </button>
                <button
                    onClick={() => setActiveTab('discounts')}
                    style={{
                        padding: '12px 0', background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: '1em', fontWeight: '600', color: activeTab === 'discounts' ? '#0f172a' : '#94a3b8',
                        borderBottom: activeTab === 'discounts' ? '2px solid #0f172a' : '2px solid transparent'
                    }}
                >
                    Discounts
                </button>
            </div>

            {activeTab === 'plans' && <PlansManager />}
            {activeTab === 'discounts' && <DiscountsManager />}
        </div>
    );
}

function PlansManager() {
    const [plans, setPlans] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [currentPlan, setCurrentPlan] = useState(null);

    const fetchPlans = () => {
        axios.get('/api/admin/config/plans')
            .then(res => setPlans(res.data))
            .catch(console.error);
    };

    useEffect(() => { fetchPlans(); }, []);

    const handleSave = (plan) => {
        const payload = {
            name: plan.name,
            interval: plan.interval,
            base_price: parseFloat(plan.base_price),
            currency: plan.currency || 'USD'
        };

        if (plan.id) {
            axios.put(`/api/admin/config/plans/${plan.id}`, payload)
                .then(() => { setIsEditing(false); fetchPlans(); })
                .catch(err => alert(err.message));
        } else {
            axios.post('/api/admin/config/plans', payload)
                .then(() => { setIsEditing(false); fetchPlans(); })
                .catch(err => alert(err.message));
        }
    };

    const handleDelete = (id) => {
        if (!confirm("Delete this plan?")) return;
        axios.delete(`/api/admin/config/plans/${id}`)
            .then(fetchPlans)
            .catch(err => alert(err.message));
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                <button
                    onClick={() => { setCurrentPlan({}); setIsEditing(true); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                >
                    <Plus size={16} /> Add Plan
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {plans.map(plan => (
                    <div key={plan.id} style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.2em', color: '#1e293b' }}>{plan.name}</h3>
                                <span style={{ fontSize: '0.8em', background: '#f1f5f9', padding: '4px 8px', borderRadius: '12px', color: '#64748b', marginTop: '8px', display: 'inline-block' }}>{plan.interval}</span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#059669' }}>{plan.currency} {plan.base_price}</div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                            <button
                                onClick={() => { setCurrentPlan(plan); setIsEditing(true); }}
                                style={{ flex: 1, padding: '8px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                            >
                                <Edit size={14} /> Edit
                            </button>
                            <button
                                onClick={() => handleDelete(plan.id)}
                                style={{ padding: '8px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer', color: '#ef4444' }}
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {isEditing && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'white', padding: '30px', borderRadius: '12px', width: '400px' }}>
                        <h2 style={{ marginTop: 0 }}>{currentPlan.id ? 'Edit Plan' : 'New Plan'}</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.9em', marginBottom: '5px' }}>Plan Name</label>
                                <input value={currentPlan.name || ''} onChange={e => setCurrentPlan({ ...currentPlan, name: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} placeholder="e.g. Pro Monthly" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.9em', marginBottom: '5px' }}>Price</label>
                                    <input type="number" value={currentPlan.base_price || ''} onChange={e => setCurrentPlan({ ...currentPlan, base_price: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} placeholder="0.00" />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.9em', marginBottom: '5px' }}>Currency</label>
                                    <input value={currentPlan.currency || 'USD'} onChange={e => setCurrentPlan({ ...currentPlan, currency: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} placeholder="USD" />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.9em', marginBottom: '5px' }}>Billing Interval</label>
                                <select value={currentPlan.interval || 'MONTHLY'} onChange={e => setCurrentPlan({ ...currentPlan, interval: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                                    <option value="MONTHLY">Monthly</option>
                                    <option value="ANNUAL">Annual</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button onClick={() => handleSave(currentPlan)} style={{ flex: 1, padding: '12px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Save</button>
                                <button onClick={() => setIsEditing(false)} style={{ flex: 1, padding: '12px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function DiscountsManager() {
    const [discounts, setDiscounts] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [current, setCurrent] = useState(null);

    // Reuse endpoint logic from TDD? No TDD endpoints for *listing* (only create/update/plan-fetch).
    // I need to update admin_discounts.js to support LISTING first! 
    // Wait, let's assume I need to add GET /api/admin/discounts if it doesn't exist.
    // I will check admin_discounts.js again.

    // Oh, I wrote admin_discounts.js with POST and PATCH. I missed GET.
    // I will need to patch admin_discounts.js to include GET as well.
    // For now I will mock the list or fetch if I can.

    // Let's rely on the fact I will fix the backend in a moment.
    const fetchDiscounts = () => {
        axios.get('/api/admin/discounts')
            .then(res => setDiscounts(res.data))
            .catch(console.error);
    };

    useEffect(() => { fetchDiscounts(); }, []);

    const handleSave = (item) => {
        const payload = { ...item };
        if (item.id) {
            axios.patch(`/api/admin/discounts/${item.id}`, payload)
                .then(() => { setIsEditing(false); fetchDiscounts(); })
                .catch(err => alert(err.message));
        } else {
            axios.post('/api/admin/discounts', payload)
                .then(() => { setIsEditing(false); fetchDiscounts(); })
                .catch(err => alert(err.message));
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                <button
                    onClick={() => { setCurrent({ type: 'PERCENTAGE', is_active: true }); setIsEditing(true); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                >
                    <Plus size={16} /> Add Discount
                </button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <tr>
                        <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.9em', color: '#64748b' }}>Code</th>
                        <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.9em', color: '#64748b' }}>Type</th>
                        <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.9em', color: '#64748b' }}>Value</th>
                        <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.9em', color: '#64748b' }}>Duration</th>
                        <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.9em', color: '#64748b' }}>Status</th>
                        <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.9em', color: '#64748b' }}>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {discounts.map(d => (
                        <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '16px', fontWeight: '600' }}>{d.code}</td>
                            <td style={{ padding: '16px' }}>{d.type}</td>
                            <td style={{ padding: '16px', fontWeight: 'bold' }}>{d.type === 'PERCENTAGE' ? `${d.value}%` : `$${d.value}`}</td>
                            <td style={{ padding: '16px', fontSize: '0.9em', color: '#64748b' }}>
                                {d.start_date ? new Date(d.start_date).toLocaleDateString() : 'Now'} - {d.end_date ? new Date(d.end_date).toLocaleDateString() : 'Forever'}
                            </td>
                            <td style={{ padding: '16px' }}>
                                <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.8em', background: d.is_active ? '#dcfce7' : '#f1f5f9', color: d.is_active ? '#166534' : '#64748b', fontWeight: '600' }}>
                                    {d.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </td>
                            <td style={{ padding: '16px' }}>
                                <button onClick={() => { setCurrent(d); setIsEditing(true); }} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontWeight: '600' }}>Edit</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {isEditing && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'white', padding: '30px', borderRadius: '12px', width: '400px' }}>
                        <h2 style={{ marginTop: 0 }}>{current.id ? 'Edit Discount' : 'New Discount'}</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.9em', marginBottom: '5px' }}>Code</label>
                                <input value={current.code || ''} onChange={e => setCurrent({ ...current, code: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} placeholder="SUMMER2025" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.9em', marginBottom: '5px' }}>Type</label>
                                    <select value={current.type} onChange={e => setCurrent({ ...current, type: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                                        <option value="PERCENTAGE">Percentage (%)</option>
                                        <option value="FIXED_AMOUNT">Fixed Amount ($)</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.9em', marginBottom: '5px' }}>Value</label>
                                    <input type="number" value={current.value || ''} onChange={e => setCurrent({ ...current, value: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.9em', marginBottom: '5px' }}>Start Date</label>
                                    <input type="date" value={current.start_date ? current.start_date.split('T')[0] : ''} onChange={e => setCurrent({ ...current, start_date: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.9em', marginBottom: '5px' }}>End Date</label>
                                    <input type="date" value={current.end_date ? current.end_date.split('T')[0] : ''} onChange={e => setCurrent({ ...current, end_date: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={current.is_active} onChange={e => setCurrent({ ...current, is_active: e.target.checked })} />
                                    Active
                                </label>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button onClick={() => handleSave(current)} style={{ flex: 1, padding: '12px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Save</button>
                                <button onClick={() => setIsEditing(false)} style={{ flex: 1, padding: '12px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

