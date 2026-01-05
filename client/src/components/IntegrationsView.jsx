import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { IntegrationDetailView } from './IntegrationDetailView';

export function IntegrationsView() {
    const [integrations, setIntegrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedIntegration, setSelectedIntegration] = useState(null); // Replaces config modal

    useEffect(() => {
        loadIntegrations();
    }, []);

    const loadIntegrations = () => {
        setLoading(true);
        axios.get('/api/integrations')
            .then(res => {
                setIntegrations(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
                alert("Failed to load integrations: " + (err.response?.data?.error || err.message));
            });
    }

    const handleToggle = (item) => {
        const newState = !item.is_active;
        axios.put(`/api/integrations/${item.id}`, { is_active: newState })
            .then(() => {
                setIntegrations(integrations.map(i => i.id === item.id ? { ...i, is_active: newState } : i));
            });
    };

    const getIconColor = (name) => {
        const colors = {
            'HubSpot': '#fa7c1b',
            'Salesforce': '#009cdf',
            'Zendesk': '#04363d',
            'Microsoft Dynamics': '#002050',
            'Pipedrive': '#272727',
            'Power BI': '#f2c811',
            'Freshdesk': '#12344d',
            'Freshsales': '#2c5cc5',
            'Genesys Cloud': '#FF4F1F'
        };
        return colors[name] || '#333';
    };

    // SUB-VIEW: DETAIL
    if (selectedIntegration) {
        return <IntegrationDetailView
            integration={selectedIntegration}
            onBack={() => setSelectedIntegration(null)}
            onUpdate={() => { loadIntegrations(); setSelectedIntegration(null); }}
        />;
    }

    // MAIN VIEW: LIST
    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px', fontFamily: "'Outfit', sans-serif" }}>
            <h1 style={{ marginBottom: '10px' }}>Integrations</h1>
            <p style={{ color: '#64748b', marginBottom: '40px', fontSize: '1.1em' }}>Connect your workflow with your favorite tools.</p>

            {loading ? <div>Loading...</div> : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                    {integrations.map(item => (
                        <div key={item.id} style={{
                            background: 'white', borderRadius: '16px', padding: '24px',
                            border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
                            display: 'flex', flexDirection: 'column',
                            opacity: item.is_active ? 1 : 0.8,
                            transition: 'transfrom 0.2s',
                            cursor: 'pointer'
                        }}
                            onClick={() => setSelectedIntegration(item)}
                            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                                <div style={{
                                    width: '56px', height: '56px', borderRadius: '12px',
                                    background: getIconColor(item.provider),
                                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '1.5em', fontWeight: 'bold'
                                }}>
                                    {item.provider[0]}
                                </div>
                                <div className="toggle-switch" onClick={e => e.stopPropagation()}>
                                    <input
                                        type="checkbox"
                                        id={`toggle-${item.id}`}
                                        checked={item.is_active}
                                        onChange={() => handleToggle(item)}
                                    />
                                    <label htmlFor={`toggle-${item.id}`}></label>
                                </div>
                            </div>

                            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.3em' }}>{item.provider}</h3>
                            <p style={{ margin: '0 0 20px 0', color: '#64748b', fontSize: '0.9em', flex: 1 }}>
                                {item.is_active ? 'Sync is active.' : 'Connect to push data automatically.'}
                            </p>

                            <button
                                onClick={(e) => { e.stopPropagation(); setSelectedIntegration(item); }}
                                style={{
                                    width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1',
                                    background: 'white', cursor: 'pointer', fontWeight: '600', color: '#475569'
                                }}
                            >
                                {item.api_key || item.webhook_url ? 'Manage' : 'Connect'}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
