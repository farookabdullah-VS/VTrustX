import React, { useState } from 'react';
import { FileText, PieChart, Image, X } from 'lucide-react';

export function AddSectionModal({ onClose, onAdd }) {
    const [activeTab, setActiveTab] = useState('text');

    const sections = {
        text: [
            { type: 'text', title: 'Goals', desc: 'What the persona wants to achieve.', defaultContent: '• ' },
            { type: 'text', title: 'Frustrations', desc: 'Pain points and irritations.', defaultContent: '• ' },
            { type: 'text', title: 'Motivations', desc: 'Drivers for adoption/usage.', defaultContent: '• ' },
            { type: 'text', title: 'Needs', desc: 'Concrete requirements.', defaultContent: '• ' },
            { type: 'text', title: 'Bio', desc: 'Narrative background story.', defaultContent: '' },
            { type: 'text', title: 'Generic Text', desc: 'Custom text block.', defaultContent: '' },
        ],
        graphs: [
            { type: 'skills', title: 'Skills', desc: 'Proficiency sliders.', defaultData: [{ label: 'Skill 1', value: 50 }, { label: 'Skill 2', value: 50 }] },
            { type: 'chart', title: 'Charts', desc: 'Visual data distribution.', defaultData: [] },
        ],
        media: [
            { type: 'technology', title: 'Technology', desc: 'Devices used.' },
            { type: 'media', title: 'Images', desc: 'Moodboard or screenshots.' },
        ]
    };

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
                        <div
                            onClick={() => setActiveTab('text')}
                            style={{ padding: '12px 20px', cursor: 'pointer', background: activeTab === 'text' ? 'white' : 'transparent', borderLeft: activeTab === 'text' ? '4px solid #0e7490' : '4px solid transparent', fontWeight: activeTab === 'text' ? 'bold' : 'normal', color: activeTab === 'text' ? '#0e7490' : '#64748b' }}>
                            Text / Quotes
                        </div>
                        <div
                            onClick={() => setActiveTab('graphs')}
                            style={{ padding: '12px 20px', cursor: 'pointer', background: activeTab === 'graphs' ? 'white' : 'transparent', borderLeft: activeTab === 'graphs' ? '4px solid #0e7490' : '4px solid transparent', fontWeight: activeTab === 'graphs' ? 'bold' : 'normal', color: activeTab === 'graphs' ? '#0e7490' : '#64748b' }}>
                            Graphs / Charts
                        </div>
                        <div
                            onClick={() => setActiveTab('media')}
                            style={{ padding: '12px 20px', cursor: 'pointer', background: activeTab === 'media' ? 'white' : 'transparent', borderLeft: activeTab === 'media' ? '4px solid #0e7490' : '4px solid transparent', fontWeight: activeTab === 'media' ? 'bold' : 'normal', color: activeTab === 'media' ? '#0e7490' : '#64748b' }}>
                            Media / Files
                        </div>
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
                                        {activeTab === 'text' && <FileText />}
                                        {activeTab === 'graphs' && <PieChart />}
                                        {activeTab === 'media' && <Image />}
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
