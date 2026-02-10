
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { IntegrationDetailView } from './IntegrationDetailView';
import { INTEGRATION_CATALOG } from './IntegrationCatalogData';
import { Mail, MessageSquare, MessageCircle, Search, ChevronRight } from 'lucide-react';

export function IntegrationsView() {
    const [activeCategory, setActiveCategory] = useState('email'); // 'email', 'sms', 'whatsapp'
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIntegration, setSelectedIntegration] = useState(null);
    const [connectedIntegrations, setConnectedIntegrations] = useState([]);

    useEffect(() => {
        // Load existing connections to check status
        axios.get('/api/integrations')
            .then(res => setConnectedIntegrations(res.data))
            .catch(err => console.error("Failed to load connections", err));
    }, []);

    const getCategoryIcon = (cat) => {
        switch (cat) {
            case 'email': return <Mail size={18} />;
            case 'sms': return <MessageSquare size={18} />;
            case 'whatsapp': return <MessageCircle size={18} />;
            default: return <Mail size={18} />;
        }
    };

    const getIconColor = (name) => {
        // Simple hashing for consistent colors if not specific
        const colors = ['#fa7c1b', '#009cdf', '#04363d', '#002050', '#272727', '#f2c811', '#12344d', '#2c5cc5', '#FF4F1F'];
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    };

    // Filter Logic
    const availableList = INTEGRATION_CATALOG[activeCategory] || [];
    const filteredList = availableList.filter(name =>
        name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Detail View Handler
    const handleConnect = (name) => {
        // Check if already connected (mock check based on name match)
        const existing = connectedIntegrations.find(i => i.provider === name);
        setSelectedIntegration(existing || { provider: name, is_active: false, config: {} });
    };

    if (selectedIntegration) {
        return <IntegrationDetailView
            integration={selectedIntegration}
            onBack={() => setSelectedIntegration(null)}
            onUpdate={() => { setSelectedIntegration(null); /* Refresh logic if needed */ }}
        />;
    }

    return (
        <div style={{ display: 'flex', height: '100%', minHeight: '80vh', fontFamily: "'Outfit', sans-serif" }}>

            {/* SIDEBAR */}
            <div style={{ width: '250px', borderRight: '1px solid #e2e8f0', padding: '20px 0' }}>
                <div style={{ padding: '0 20px 20px 20px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', fontSize: '0.85em' }}>
                    Channels
                </div>
                {['email', 'sms', 'whatsapp'].map(cat => (
                    <div
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        style={{
                            padding: '12px 20px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '12px',
                            background: activeCategory === cat ? '#f1f5f9' : 'transparent',
                            color: activeCategory === cat ? 'var(--primary-color)' : '#475569',
                            borderLeft: activeCategory === cat ? '3px solid var(--primary-color)' : '3px solid transparent',
                            fontWeight: activeCategory === cat ? '600' : 'normal'
                        }}
                    >
                        {getCategoryIcon(cat)}
                        <span style={{ textTransform: 'capitalize' }}>{cat === 'sms' ? 'SMS' : cat === 'whatsapp' ? 'WhatsApp' : 'Email'}</span>
                    </div>
                ))}
            </div>

            {/* MAIN CONTENT */}
            <div style={{ flex: 1, padding: '30px', background: '#ffffff', overflowY: 'auto' }}>

                {/* HEADLINE + SEARCH */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <div>
                        <h2 style={{ margin: 0, textTransform: 'capitalize', fontSize: '1.8em' }}>{activeCategory === 'sms' ? 'SMS' : activeCategory === 'whatsapp' ? 'WhatsApp' : 'Email'}</h2>
                        <p style={{ color: '#94a3b8', margin: '5px 0 0 0' }}>
                            {filteredList.length} Available Apps
                        </p>
                    </div>

                    <div style={{ position: 'relative', width: '300px' }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%', padding: '10px 10px 10px 38px', borderRadius: '8px',
                                border: '1px solid #e2e8f0', background: '#f8fafc', outline: 'none'
                            }}
                        />
                    </div>
                </div>

                {/* LIST */}
                <h3 style={{ fontSize: '1.2em', marginBottom: '20px', color: '#334155' }}>Available Apps</h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {filteredList.map((name, index) => (
                        <div key={index} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '16px 24px', borderRadius: '12px',
                            border: '1px solid #f1f5f9',
                            background: 'white',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                            transition: 'all 0.2s'
                        }}
                            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)'}
                            onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.03)'}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                {/* LOGO PLACEHOLDER */}
                                <div style={{
                                    width: '48px', height: '48px', borderRadius: '10px',
                                    background: getIconColor(name),
                                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 'bold', fontSize: '1.2em'
                                }}>
                                    {name[0]}
                                </div>

                                <div>
                                    <div style={{ fontWeight: '600', fontSize: '1.1em', color: '#1e293b' }}>{name}</div>
                                    <div style={{ fontSize: '0.9em', color: '#64748b' }}>Gateway Integration</div>
                                </div>
                            </div>

                            <button
                                onClick={() => handleConnect(name)}
                                style={{
                                    padding: '8px 24px',
                                    background: '#f1f5f9',
                                    color: '#334155',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; }}
                            >
                                Connect
                            </button>
                        </div>
                    ))}

                    {filteredList.length === 0 && (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                            No integrations found matching "{searchQuery}"
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

