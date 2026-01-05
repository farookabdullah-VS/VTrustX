import React, { useState } from 'react';
import axios from 'axios';

import { useTranslation } from 'react-i18next';

export function SupportPage() {
    const { t, i18n } = useTranslation();
    const isRtl = i18n.language === 'ar';
    const [formData, setFormData] = useState({ name: '', email: '', subject: '', description: '' });
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await axios.post('/api/crm/public/tickets', formData);
            setSubmitted(true);
        } catch (err) {
            setError(err.response?.data?.error || 'Submission failed');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) return (
        <div style={{ padding: '50px', textAlign: 'center', background: '#f8f9fa', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <h2 style={{ color: '#28a745' }}>{t('support.success_title')}</h2>
                <p>{t('support.success_msg')}</p>
                <button
                    onClick={() => { setSubmitted(false); setFormData({ name: '', email: '', subject: '', description: '' }); }}
                    style={{ marginTop: '20px', padding: '10px 20px', background: '#007bff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                >
                    {t('support.submit_another')}
                </button>
            </div>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', background: '#f5f7fa', padding: '40px 20px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', direction: isRtl ? 'rtl' : 'ltr', fontFamily: "'Outfit', sans-serif" }}>
            <div style={{ width: '100%', maxWidth: '600px', background: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '10px', color: '#333' }}>{t('support.title')}</h2>
                <p style={{ textAlign: 'center', color: '#666', marginBottom: '30px' }}>{t('support.subtitle')}</p>

                {error && <div style={{ background: '#ffebee', color: '#c62828', padding: '10px', borderRadius: '6px', marginBottom: '20px', textAlign: 'center' }}>{error}</div>}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#444' }}>{t('support.field.name')}</label>
                        <input
                            placeholder={t('support.placeholder.name')}
                            value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                            required
                            style={{ width: '100%', padding: '12px', border: '1px solid #e1e4e8', borderRadius: '6px', fontSize: '16px', boxSizing: 'border-box' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#444' }}>{t('support.field.email')}</label>
                        <input
                            placeholder={t('support.placeholder.email')} type="email"
                            value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                            required
                            style={{ width: '100%', padding: '12px', border: '1px solid #e1e4e8', borderRadius: '6px', fontSize: '16px', boxSizing: 'border-box' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#444' }}>{t('support.field.subject')}</label>
                        <input
                            placeholder={t('support.placeholder.subject')}
                            value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })}
                            required
                            style={{ width: '100%', padding: '12px', border: '1px solid #e1e4e8', borderRadius: '6px', fontSize: '16px', boxSizing: 'border-box' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#444' }}>{t('support.field.message')}</label>
                        <textarea
                            placeholder={t('support.placeholder.message')}
                            value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                            rows={6} required
                            style={{ width: '100%', padding: '12px', border: '1px solid #e1e4e8', borderRadius: '6px', fontSize: '16px', boxSizing: 'border-box', fontFamily: 'inherit' }}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        style={{ padding: '14px', background: loading ? '#ccc' : '#007bff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '16px', marginTop: '10px' }}
                    >
                        {loading ? t('support.submitting') : t('support.submit')}
                    </button>
                </form>
            </div>
        </div>
    );
}
