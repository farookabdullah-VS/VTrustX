import React, { useState } from 'react';
import { FileText, PieChart, Image, X, Star, CheckCircle, layout, Grid } from 'lucide-react';

export function AddSectionModal({ onClose, onAdd }) {
    const [activeTab, setActiveTab] = useState('must-haves');

    const sections = {
        'must-haves': [
            { type: 'text', title: 'Bio', desc: 'Narrative background story.', defaultContent: '' },
            { type: 'text', title: 'Goals', desc: 'What the persona wants to achieve.', defaultContent: '• ' },
            { type: 'text', title: 'Frustrations', desc: 'Pain points and irritations.', defaultContent: '• ' },
            { type: 'text', title: 'Needs', desc: 'Concrete requirements.', defaultContent: '• ' },
        ],
        'nice-to-haves': [
            { type: 'text', title: 'Content Strategy', desc: 'Key topics and tone.', defaultContent: '### Topics\n• \n\n### Tone\n• \n\n### Channels\n• ' },
            { type: 'text', title: 'Why this Persona?', desc: 'Strategic importance.', defaultContent: '' },
            { type: 'text', title: 'Search Queries', desc: 'What they search for.', defaultContent: '1. \n2. \n3. ' },
            { type: 'skills', title: 'Skills', desc: 'Proficiency sliders.', defaultData: [{ label: 'Tech Savvy', value: 50 }, { label: 'Loyalty', value: 70 }] },
        ],
        'optional': [
            { type: 'media', title: 'Storyboard', desc: 'Visual narrative of user journey.', defaultContent: '' }, // Placeholder for media
            { type: 'text', title: 'Generic Text', desc: 'Custom text block.', defaultContent: '' },
        ],
        'elements': [
            { type: 'skills', title: 'Personality Type', desc: 'Personality traits (Big 5/MBTI).', defaultData: [{ label: 'Extroversion', value: 60 }, { label: 'Openness', value: 75 }, { label: 'Agreeableness', value: 50 }] },
            { type: 'chart', title: 'Charts', desc: 'Visual data distribution.', defaultData: [] },
            { type: 'technology', title: 'Technology', desc: 'Devices used.' },
            { type: 'media', title: 'Images', desc: 'Moodboard or screenshots.' },
        ]
    };

    const tabs = [
        { id: 'must-haves', label: 'Must-Haves' },
        { id: 'nice-to-haves', label: 'Nice-to-Haves' },
        { id: 'optional', label: 'Optional' },
        { id: 'elements', label: 'Elements' },
    ];

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ width: '800px', height: '600px', background: 'white', borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '1.2em' }}>ADD SECTION</div>
                    <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X /></button>
                </div>

                <div style={{ flex: 1, display: 'flex' }}>
                    {/* Left Sidebar Tabs */}
                    <div style={{ width: '200px', background: '#f8fafc', borderRight: '1px solid #e2e8f0', padding: '20px 0' }}>
                        {tabs.map(tab => (
                            <div
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    padding: '12px 20px',
                                    cursor: 'pointer',
                                    background: activeTab === tab.id ? 'white' : 'transparent',
                                    borderLeft: activeTab === tab.id ? '4px solid #0e7490' : '4px solid transparent',
                                    fontWeight: activeTab === tab.id ? 'bold' : 'normal',
                                    color: activeTab === tab.id ? '#0e7490' : '#64748b'
                                }}>
                                {tab.label}
                            </div>
                        ))}
                    </div>

                    {/* Right Content Grid */}
                    <div style={{ flex: 1, padding: '30px', background: '#f1f5f9', overflowY: 'auto' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
                            {sections[activeTab].map((item, i) => (
                                <div
                                    key={i}
                                    onClick={() => onAdd(item)}
                                    style={{ background: 'white', padding: '20px', borderRadius: '12px', cursor: 'pointer', border: '1px solid #e2e8f0', transition: 'all 0.2s' }}
                                    onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)'; }}
                                    onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                                >
                                    <div style={{ marginBottom: '10px', color: '#0e7490' }}>
                                        {item.type === 'text' && <FileText />}
                                        {(item.type === 'chart' || item.type === 'skills') && <PieChart />}
                                        {(item.type === 'media' || item.type === 'technology') && <Image />}
                                    </div>
                                    <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{item.title}</div>
                                    <div style={{ fontSize: '0.85em', color: '#64748b' }}>{item.desc}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
