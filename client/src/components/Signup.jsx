import React, { useState, useEffect } from 'react';
import axios from 'axios';

export function Signup({ onSignupSuccess, onBack, initialPlanId }) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [plans, setPlans] = useState([]);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        phone: '',
        companyName: '',
        planId: initialPlanId || null
    });

    useEffect(() => {
        // Load plans if selecting plan
        axios.get('/api/plans').then(res => setPlans(res.data)).catch(console.error);
    }, []);

    useEffect(() => {
        if (initialPlanId) setFormData(prev => ({ ...prev, planId: initialPlanId }));
    }, [initialPlanId]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleNext = () => {
        if (step < 4) setStep(step + 1);
    };

    const handlePrev = () => {
        if (step > 1) setStep(step - 1);
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError('');
        try {
            // Register Tenant
            await axios.post('/api/tenants/register', formData);
            setLoading(false);
            onSignupSuccess(formData.email, formData.password); // Auto fill login or redirect
        } catch (err) {
            setLoading(false);
            setError(err.response?.data?.error || "Registration failed");
        }
    };

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            minHeight: '100vh', background: '#ecfdf5', fontFamily: "'Outfit', sans-serif"
        }}>
            <div style={{
                background: 'white', padding: '40px', borderRadius: '16px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                width: '100%', maxWidth: '500px'
            }}>
                <h2 style={{ color: '#064e3b', textAlign: 'center', marginBottom: '20px' }}>
                    {step === 1 ? "Create your Account" :
                        step === 2 ? "Company Details" :
                            step === 3 ? "Select Plan" : "Payment Details"}
                </h2>

                {error && <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '10px', borderRadius: '8px', marginBottom: '20px' }}>{error}</div>}

                {/* Stepper */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px', gap: '10px' }}>
                    {[1, 2, 3, 4].map(s => (
                        <div key={s} style={{
                            width: '10px', height: '10px', borderRadius: '50%',
                            background: s <= step ? '#064e3b' : '#e2e8f0'
                        }} />
                    ))}
                </div>

                {step === 1 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9em', color: '#64748b', marginBottom: '5px' }}>Full Name</label>
                            <input name="name" value={formData.name} onChange={handleChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }} placeholder="John Doe" />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9em', color: '#64748b', marginBottom: '5px' }}>Email</label>
                            <input name="email" value={formData.email} onChange={handleChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }} placeholder="john@company.com" />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9em', color: '#64748b', marginBottom: '5px' }}>Phone</label>
                            <input name="phone" value={formData.phone} onChange={handleChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }} placeholder="+1 234 567 890" />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9em', color: '#64748b', marginBottom: '5px' }}>Password</label>
                            <input type="password" name="password" value={formData.password} onChange={handleChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }} placeholder="********" />
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9em', color: '#64748b', marginBottom: '5px' }}>Company Name</label>
                            <input name="companyName" value={formData.companyName} onChange={handleChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }} placeholder="Acme Inc." />
                        </div>
                        {/* More fields can be added: Industry, Size, etc */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9em', color: '#64748b', marginBottom: '5px' }}>Industry</label>
                            <select style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <option>Technology</option>
                                <option>Finance</option>
                                <option>Healthcare</option>
                                <option>Retail</option>
                                <option>Other</option>
                            </select>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {plans.map(p => (
                            <div
                                key={p.id}
                                onClick={() => setFormData({ ...formData, planId: p.id })}
                                style={{
                                    padding: '15px', border: `2px solid ${formData.planId === p.id ? '#064e3b' : '#e2e8f0'}`,
                                    borderRadius: '10px', cursor: 'pointer', background: formData.planId === p.id ? '#f0fdf4' : 'white',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}
                            >
                                <div>
                                    <h4 style={{ margin: 0, color: '#334155' }}>{p.name}</h4>
                                    <p style={{ margin: 0, fontSize: '0.8em', color: '#64748b' }}>{p.description}</p>
                                </div>
                                <div style={{ fontWeight: 'bold', color: '#064e3b' }}>${p.price_monthly}/mo</div>
                            </div>
                        ))}
                    </div>
                )}

                {step === 4 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <p style={{ fontSize: '0.9em', color: '#64748b', textAlign: 'center' }}>
                            Simulated Payment Gateway. No card required for demo.
                        </p>
                        <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                                <span>Total to pay:</span>
                                <span style={{ fontWeight: 'bold' }}>
                                    ${plans.find(p => p.id === formData.planId)?.price_monthly || 0} / month
                                </span>
                            </div>
                            <div style={{ width: '100%', height: '40px', background: '#e2e8f0', borderRadius: '4px', marginTop: '10px' }}></div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <div style={{ width: '50%', height: '40px', background: '#e2e8f0', borderRadius: '4px' }}></div>
                                <div style={{ width: '50%', height: '40px', background: '#e2e8f0', borderRadius: '4px' }}></div>
                            </div>
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px' }}>
                    {step > 1 ? (
                        <button onClick={handlePrev} style={{ padding: '12px 24px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', color: '#64748b' }}>
                            Back
                        </button>
                    ) : (
                        <button onClick={onBack} style={{ padding: '12px 24px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', color: '#64748b' }}>
                            Cancel
                        </button>
                    )}

                    {step < 4 ? (
                        <button onClick={handleNext} style={{ padding: '12px 24px', background: '#064e3b', border: 'none', borderRadius: '8px', cursor: 'pointer', color: 'white' }}>
                            Next
                        </button>
                    ) : (
                        <button onClick={handleSubmit} disabled={loading} style={{ padding: '12px 24px', background: '#064e3b', border: 'none', borderRadius: '8px', cursor: 'pointer', color: 'white', opacity: loading ? 0.7 : 1 }}>
                            {loading ? 'Processing...' : 'Subscribe & Start'}
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
}
