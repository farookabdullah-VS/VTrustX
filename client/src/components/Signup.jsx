import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

export function Signup({ onSignupSuccess, onBack, initialPlanId }) {
    const { t } = useTranslation();
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
        axios.get('/api/plans').then(res => {
            const planData = res.data.plans || res.data;
            setPlans(Array.isArray(planData) ? planData : []);
        }).catch(err => {
            console.error("Failed to load plans in signup:", err);
            setPlans([]);
        });
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
            setError(err.response?.data?.error || t('login.error.invalid_data') || "Registration failed");
        }
    };

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            minHeight: '100vh', background: 'linear-gradient(135deg, var(--deep-bg) 0%, var(--sidebar-bg) 100%)', fontFamily: "'Outfit', sans-serif"
        }}>
            <div style={{
                background: 'var(--input-bg)', padding: '40px', borderRadius: '16px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                width: '100%', maxWidth: '500px',
                border: '1px solid var(--sidebar-border)'
            }}>
                <h2 style={{ color: 'var(--primary-color)', textAlign: 'center', marginBottom: '20px' }}>
                    {step === 1 ? t('auth.create_account') :
                        step === 2 ? t('auth.company_details') :
                            step === 3 ? t('auth.select_plan') : t('auth.payment')}
                </h2>

                {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--status-error)', padding: '10px', borderRadius: '8px', marginBottom: '20px', border: '1px solid var(--status-error)' }}>{error}</div>}

                {/* Stepper */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px', gap: '10px' }}>
                    {[1, 2, 3, 4].map(s => (
                        <div key={s} style={{
                            width: '10px', height: '10px', borderRadius: '50%',
                            background: s <= step ? 'var(--primary-color)' : 'var(--input-border)'
                        }} />
                    ))}
                </div>

                {step === 1 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9em', color: 'var(--label-color)', marginBottom: '5px' }}>{t('auth.full_name')}</label>
                            <input name="name" value={formData.name} onChange={handleChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--input-text)' }} placeholder={t('auth.name_placeholder') || "John Doe"} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9em', color: 'var(--label-color)', marginBottom: '5px' }}>{t('auth.email')}</label>
                            <input name="email" value={formData.email} onChange={handleChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--input-text)' }} placeholder={t('auth.email_placeholder') || "john@company.com"} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9em', color: 'var(--label-color)', marginBottom: '5px' }}>{t('auth.phone')}</label>
                            <input name="phone" value={formData.phone} onChange={handleChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--input-text)' }} placeholder={t('auth.phone_placeholder') || "+1 234 567 890"} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9em', color: 'var(--label-color)', marginBottom: '5px' }}>{t('auth.password')}</label>
                            <input type="password" name="password" value={formData.password} onChange={handleChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--input-text)' }} placeholder="********" />
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9em', color: 'var(--label-color)', marginBottom: '5px' }}>{t('auth.company_name')}</label>
                            <input name="companyName" value={formData.companyName} onChange={handleChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--input-text)' }} placeholder={t('auth.company_placeholder') || "Acme Inc."} />
                        </div>
                        {/* More fields can be added: Industry, Size, etc */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9em', color: 'var(--label-color)', marginBottom: '5px' }}>{t('auth.industry')}</label>
                            <select style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--input-text)' }}>
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
                                    padding: '15px', border: `2px solid ${formData.planId === p.id ? 'var(--primary-color)' : 'var(--input-border)'}`,
                                    borderRadius: '10px', cursor: 'pointer', background: formData.planId === p.id ? 'var(--sidebar-hover-bg)' : 'var(--input-bg)',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}
                            >
                                <div>
                                    <h4 style={{ margin: 0, color: 'var(--text-color)' }}>{p.name}</h4>
                                    <p style={{ margin: 0, fontSize: '0.8em', color: 'var(--text-muted)' }}>{p.description}</p>
                                </div>
                                <div style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>${p.price_monthly}/mo</div>
                            </div>
                        ))}
                    </div>
                )}

                {step === 4 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <p style={{ fontSize: '0.9em', color: 'var(--text-muted)', textAlign: 'center' }}>
                            Simulated Payment Gateway. No card required for demo.
                        </p>
                        <div style={{ padding: '20px', background: 'var(--input-bg)', borderRadius: '8px', border: '1px solid var(--input-border)' }}>
                            <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', color: 'var(--text-color)' }}>
                                <span>Total to pay:</span>
                                <span style={{ fontWeight: 'bold' }}>
                                    ${plans.find(p => p.id === formData.planId)?.price_monthly || 0} / month
                                </span>
                            </div>
                            <div style={{ width: '100%', height: '40px', background: 'var(--input-border)', borderRadius: '4px', marginTop: '10px', opacity: 0.5 }}></div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <div style={{ width: '50%', height: '40px', background: 'var(--input-border)', borderRadius: '4px', opacity: 0.5 }}></div>
                                <div style={{ width: '50%', height: '40px', background: 'var(--input-border)', borderRadius: '4px', opacity: 0.5 }}></div>
                            </div>
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px' }}>
                    {step > 1 ? (
                        <button onClick={handlePrev} style={{ padding: '12px 24px', background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-muted)' }}>
                            {t('auth.back')}
                        </button>
                    ) : (
                        <button onClick={onBack} style={{ padding: '12px 24px', background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-muted)' }}>
                            {t('auth.cancel')}
                        </button>
                    )}

                    {step < 4 ? (
                        <button onClick={handleNext} style={{ padding: '12px 24px', background: 'var(--primary-color)', border: 'none', borderRadius: '8px', cursor: 'pointer', color: 'var(--button-text)' }}>
                            {t('auth.next')}
                        </button>
                    ) : (
                        <button onClick={handleSubmit} disabled={loading} style={{ padding: '12px 24px', background: 'var(--primary-color)', border: 'none', borderRadius: '8px', cursor: 'pointer', color: 'var(--button-text)', opacity: loading ? 0.7 : 1 }}>
                            {loading ? t('auth.processing') : t('auth.subscribe_start')}
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
}
