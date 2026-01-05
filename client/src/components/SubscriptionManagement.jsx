import React, { useEffect, useState } from 'react';
import axios from 'axios';

export function SubscriptionManagement() {
    const [info, setInfo] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get('/api/settings/subscription')
            .then(res => {
                setInfo(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    if (loading) return <div style={{ padding: '40px' }}>Loading subscription info...</div>;
    if (!info) return <div style={{ padding: '40px' }}>Failed to load info.</div>;

    const { plan, users } = info;
    const usagePercent = (users.current / users.limit) * 100;

    const handleUpgrade = (newPlan) => {
        if (!confirm(`Upgrade to ${newPlan} plan? This will update your billing immediately.`)) return;

        // Mock API call to update plan
        axios.post('/api/settings/subscription/upgrade', { plan: newPlan })
            .then(res => {
                alert("Plan updated successfully!");
                setInfo(prev => ({ ...prev, plan: newPlan, users: { ...prev.users, limit: newPlan === 'pro' ? 5 : 100 } })); // Optimistic update
                window.location.reload();
            })
            .catch(err => alert("Upgrade failed: " + err.message));
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px', fontFamily: "'Outfit', sans-serif", color: '#000000' }}>
            <h1 style={{ marginBottom: '10px' }}>Subscription & Billing</h1>
            <p style={{ color: '#000000', marginBottom: '40px' }}>Manage your organization's plan and usage.</p>

            {/* PLAN CARD */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '30px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div style={{ fontSize: '0.9em', color: '#000000', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>Current Plan</div>
                    <div style={{ fontSize: '2.5em', fontWeight: 'bold', color: '#000000', textTransform: 'capitalize' }}>{plan}</div>
                    <div style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '5px' }}>
                        <span>●</span> Active Subscription
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    {plan !== 'enterprise' && (
                        <button
                            onClick={() => handleUpgrade('enterprise')}
                            style={{ padding: '12px 24px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                            Switch to Enterprise
                        </button>
                    )}
                    {plan === 'free' && (
                        <button
                            onClick={() => handleUpgrade('pro')}
                            style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)' }}
                        >
                            Upgrade to Pro
                        </button>
                    )}
                </div>
            </div>

            {/* USAGE CARD */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '30px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                <h3 style={{ margin: '0 0 20px 0', fontSize: '1.2em' }}>Resource Usage</h3>

                <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <div style={{ fontWeight: '600', color: '#334155' }}>Users</div>
                        <div style={{ color: '#64748b' }}>{users.current} / {users.limit} license(s) used</div>
                    </div>
                    <div style={{ width: '100%', height: '12px', background: '#f1f5f9', borderRadius: '6px', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(usagePercent, 100)}%`, height: '100%', background: usagePercent > 90 ? '#ef4444' : '#3b82f6', borderRadius: '6px', transition: 'width 0.5s ease' }}></div>
                    </div>
                    {users.current >= users.limit && (
                        <div style={{ marginTop: '10px', fontSize: '0.9em', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>⚠️</span> You have reached your user limit. Upgrade to add more users.
                        </div>
                    )}
                </div>
            </div>

            <div style={{ marginTop: '40px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                <PlanFeatureCard title="Free" price="$0" features={['2 Users', 'Basic Reports', 'Community Support']} current={plan === 'free'} />
                <PlanFeatureCard title="Pro" price="$29/mo" features={['5 Users', 'Advanced AI Analysis', 'Priority Support', 'Export to SPSS']} current={plan === 'pro'} />
                <PlanFeatureCard title="Enterprise" price="Custom" features={['100 Users', 'Dedicated Success Manager', 'SSO & Audit Logs', 'Custom SLAs']} current={plan === 'enterprise'} />
            </div>

            {/* LICENSE ACTIVATION */}
            <div style={{ marginTop: '40px', background: '#f8fafc', padding: '30px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 15px 0', fontSize: '1.2em' }}>Activate License Key</h3>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                        type="text"
                        id="licenseKeyInput"
                        placeholder="Paste your license key here..."
                        style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                    <button
                        onClick={() => {
                            const key = document.getElementById('licenseKeyInput').value;
                            if (!key) return alert("Please enter a key");
                            axios.post('/api/settings/subscription/license', { licenseKey: key })
                                .then(res => {
                                    alert(res.data.message);
                                    window.location.reload();
                                })
                                .catch(err => alert("Activation failed: " + (err.response?.data?.error || err.message)));
                        }}
                        style={{ padding: '12px 24px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        Activate
                    </button>
                </div>
            </div>
        </div>
    );
}

function PlanFeatureCard({ title, price, features, current }) {
    return (
        <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            border: current ? '2px solid #4f46e5' : '1px solid #e2e8f0',
            opacity: current ? 1 : 0.7
        }}>
            <h3 style={{ margin: '0 0 5px 0' }}>{title}</h3>
            <div style={{ fontSize: '1.5em', fontWeight: 'bold', marginBottom: '15px' }}>{price}</div>
            <ul style={{ paddingLeft: '20px', color: '#64748b', fontSize: '0.9em' }}>
                {features.map((f, i) => <li key={i} style={{ marginBottom: '5px' }}>{f}</li>)}
            </ul>
        </div>
    )
}
