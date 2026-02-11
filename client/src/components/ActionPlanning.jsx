import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Target, CheckSquare, AlertCircle, ArrowRight, User, Calendar } from 'lucide-react';
import { InlineHijriDate } from './common/HijriDate';
import { ValidatedInput, rules, useFormValidation } from './common/FormValidation';

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

    const goalForm = useFormValidation({
        initialValues: { title: '', metric: 'NPS', target: '', owner: '', due_date: '' },
        validationRules: {
            title: [rules.required('Goal title is required')],
            target: [rules.required('Target value is required')],
            owner: [rules.required('Owner is required')],
            due_date: [rules.required('Due date is required')],
        },
        onSubmit: async (values) => {
            await axios.post('/api/actions/plans', values);
            setIsCreateModalOpen(false);
            goalForm.reset();
            loadPlans();
        },
    });

    if (loading) return <div style={{ padding: '40px', color: '#64748b' }}>Loading Strategic Actions...</div>;

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: "'Outfit', sans-serif" }}>
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
                                <Calendar size={16} /> <InlineHijriDate date={plan.due_date} />
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
                        <form onSubmit={goalForm.handleSubmit}>
                            <ValidatedInput
                                name="title"
                                label="Goal Title"
                                placeholder="e.g. Improve NPS for Enterprise"
                                value={goalForm.values.title}
                                error={goalForm.touched.title && goalForm.errors.title}
                                onChange={goalForm.handleChange}
                                onBlur={goalForm.handleBlur}
                                required
                            />
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <div style={{ flex: 1, marginBottom: '20px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9em', fontWeight: '600', color: 'var(--label-color, #5f6368)' }}>Metric</label>
                                    <select name="metric" value={goalForm.values.metric} onChange={goalForm.handleChange} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid var(--input-border, #cbd5e1)', background: 'var(--input-bg, #f0f2f5)', color: 'var(--input-text, #1a1c1e)', fontSize: '15px', boxSizing: 'border-box' }}>
                                        <option value="NPS">NPS</option>
                                        <option value="CSAT">CSAT</option>
                                        <option value="Churn Rate">Churn Rate</option>
                                        <option value="CES">CES</option>
                                    </select>
                                </div>
                                <ValidatedInput
                                    name="target"
                                    label="Target Value"
                                    type="number"
                                    value={goalForm.values.target}
                                    error={goalForm.touched.target && goalForm.errors.target}
                                    onChange={goalForm.handleChange}
                                    onBlur={goalForm.handleBlur}
                                    required
                                    style={{ flex: 1 }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <ValidatedInput
                                    name="owner"
                                    label="Owner"
                                    placeholder="Name"
                                    value={goalForm.values.owner}
                                    error={goalForm.touched.owner && goalForm.errors.owner}
                                    onChange={goalForm.handleChange}
                                    onBlur={goalForm.handleBlur}
                                    required
                                    style={{ flex: 1 }}
                                />
                                <ValidatedInput
                                    name="due_date"
                                    label="Due Date"
                                    type="date"
                                    value={goalForm.values.due_date}
                                    error={goalForm.touched.due_date && goalForm.errors.due_date}
                                    onChange={goalForm.handleChange}
                                    onBlur={goalForm.handleBlur}
                                    required
                                    style={{ flex: 1 }}
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button type="button" onClick={() => { setIsCreateModalOpen(false); goalForm.reset(); }} style={{ padding: '12px 24px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}>Cancel</button>
                                <button type="submit" disabled={goalForm.isSubmitting} style={{ padding: '12px 24px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', opacity: goalForm.isSubmitting ? 0.7 : 1 }}>
                                    {goalForm.isSubmitting ? 'Creating...' : 'Create Goal'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export { ActionPlanning };
