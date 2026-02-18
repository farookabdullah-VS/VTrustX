import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { PieChart, Loader } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function SurveyReportSelector({ onSelect }) {
    const { t, i18n } = useTranslation();
    const [forms, setForms] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get('/api/forms')
            .then(res => {
                setForms(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>{t('reports.selector.loading')}</div>;

    return (
        <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '1.8rem', color: '#0f172a', marginBottom: '10px' }}>{t('reports.selector.title')}</h2>
                <p style={{ color: '#64748b' }}>{t('reports.selector.subtitle')}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {forms.map(form => (
                    <div
                        key={form.id}
                        onClick={() => onSelect(form.id)}
                        style={{
                            background: 'white', padding: '24px', borderRadius: '16px',
                            border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s ease',
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                            display: 'flex', flexDirection: 'column', gap: '15px'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translateY(-4px)';
                            e.currentTarget.style.boxShadow = '0 12px 20px -5px rgba(0, 0, 0, 0.1)';
                            e.currentTarget.style.borderColor = '#10b981';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)';
                            e.currentTarget.style.borderColor = '#e2e8f0';
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{
                                color: '#166534', background: '#dcfce7', width: '48px', height: '48px',
                                borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <PieChart size={24} />
                            </div>
                            <span style={{ fontSize: '0.75em', background: '#f1f5f9', color: '#64748b', padding: '4px 8px', borderRadius: '6px' }}>
                                ID: {form.id}
                            </span>
                        </div>

                        <div>
                            <h3 style={{ margin: '0 0 5px 0', color: '#1e293b', fontSize: '1.1em', fontWeight: '600' }}>{form.title}</h3>
                            <div style={{ fontSize: '0.9em', color: '#64748b', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '2.7em' }}>
                                {form.description || t('reports.selector.no_description')}
                            </div>
                        </div>

                        <div style={{ marginTop: 'auto', paddingTop: '15px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85em', color: '#94a3b8' }}>
                            <span>{t('reports.selector.updated')} {new Date(form.updatedAt || form.updated_at).toLocaleDateString(i18n.language)}</span>
                            <span style={{ color: '#166534', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {t('reports.selector.view_report')} →
                            </span>
                        </div>
                    </div>
                ))}
            </div>
            {forms.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '3em', marginBottom: '20px' }}>📭</div>
                    <div style={{ fontSize: '1.2em', color: '#334155', fontWeight: '600' }}>{t('reports.selector.no_surveys')}</div>
                    <div style={{ color: '#64748b', marginTop: '10px' }}>{t('reports.selector.create_first')}</div>
                </div>
            )}
        </div>
    );
}
