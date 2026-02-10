import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Target, CheckSquare, AlertCircle, ArrowRight, User, Calendar } from 'lucide-react';

const ActionPlanning = () => {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    useEffect(() => {
        loadPlans();
    }, []);

    const loadPlans = async () => {
        try {
            const res = await axios.get('/api/actions/plans');
            setPlans(res.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const payload = {
            title: formData.get('title'),
            metric: formData.get('metric'),
            target: formData.get('target'),
            owner: formData.get('owner'),
            due_date: formData.get('due_date')
        };
        await axios.post('/api/actions/plans', payload);
        setIsCreateModalOpen(false);
        loadPlans();
    };

    if (loading) return <div style={{ padding: '40px', color: '#64748b' }}>Loading Strategic Actions...</div>;

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: "'Inter', sans-serif" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Action Planning</h1>
                    <p style={{ color: '#64748b', marginTop: '8px' }}>Turn insights into outcomes. Track initiatives linked to key metrics.</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    style={{
                        background: '#10b981', color: 'white', border: 'none', padding: '12px 24px',
                        borderRadius: '8px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px',
                        cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)'
                    }}
                >
                    <Plus size={20} /> New Goal
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
                {plans.map(plan => (
                    <div key={plan.id} style={{
                        background: 'white', borderRadius: '16px', padding: '24px',
                        border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                        position: 'relative', overflow: 'hidden'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <span style={{
                                background: plan.status === 'In Progress' ? '#dbeafe' : '#fee2e2',
                                color: plan.status === 'In Progress' ? '#1e40af' : '#991b1b',
                                padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold'
                            }}>
                                {plan.status.toUpperCase()}
                            </span>
                            <Target size={20} color="#94a3b8" />
                        </div>

                        <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>{plan.title}</h3>

                        <div style={{ display: 'flex', gap: '24px', margin: '20px 0', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', padding: '16px 0' }}>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current {plan.metric}</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a' }}>{plan.current}</div>
                            </div>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <ArrowRight color="#cbd5e1" />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Target</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#10b981' }}>{plan.target}</div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: '#64748b' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <User size={16} /> {plan.owner}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Calendar size={16} /> {new Date(plan.due_date).toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {isCreateModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{ background: 'white', padding: '32px', borderRadius: '16px', width: '500px', maxWidth: '90%' }}>
                        <h2 style={{ marginBottom: '24px' }}>Set New Strategic Goal</h2>
                        <form onSubmit={handleCreate}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Goal Title</label>
                                <input name="title" required placeholder="e.g. Improve NPS for Enterprise" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Metric</label>
                                    <select name="metric" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                                        <option>NPS</option>
                                        <option>CSAT</option>
                                        <option>Churn Rate</option>
                                        <option>CES</option>
                                    </select>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Target Value</label>
                                    <input name="target" type="number" step="0.1" required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Owner</label>
                                    <input name="owner" required placeholder="Name" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Due Date</label>
                                    <input name="due_date" type="date" required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button type="button" onClick={() => setIsCreateModalOpen(false)} style={{ padding: '12px 24px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}>Cancel</button>
                                <button type="submit" style={{ padding: '12px 24px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Create Goal</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export { ActionPlanning };
