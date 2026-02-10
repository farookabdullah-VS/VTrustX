import React, { useState } from 'react';
import { X } from 'lucide-react';

const GUIDANCE_CATEGORIES = [
    {
        id: 'must-have',
        title: 'MUST-HAVES',
        color: '#E57373',
        description: "I must get these right — they're foundational to persona credibility.",
        items: [
            { id: 'name', title: 'Name' },
            { id: 'photo', title: 'Photo' },
            { id: 'demographics', title: 'Demographics' },
            { id: 'background', title: 'Background' },
            { id: 'goals', title: 'Goals' },
            { id: 'motivations', title: 'Motivations' },
            { id: 'frustrations', title: 'Frustrations' }
        ]
    },
    {
        id: 'nice-to-have',
        title: 'NICE-TO-HAVES',
        color: '#4DB6AC',
        description: "These make the persona richer and more actionable — worth adding if time allows.",
        items: [
            { id: 'scenarios', title: 'Scenarios' },
            { id: 'touchpoints', title: 'Touchpoints' },
            { id: 'expectations', title: 'Expectations' },
            { id: 'needs', title: 'Needs' }
        ]
    },
    {
        id: 'optional',
        title: 'OPTIONAL',
        color: '#64B5F6',
        description: "Use these for advanced personas or when you have extra research data.",
        items: [
            { id: 'textSection', title: 'Text section' },
            { id: 'brands', title: 'Brands & Influencers' },
            { id: 'metrics', title: 'Metrics' },
            { id: 'embeds', title: 'Embeds' }
        ]
    }
];

const GUIDANCE_CONTENT = {
    name: {
        title: 'Name',
        color: '#E57373',
        description: 'Did you choose an authentic name that evokes empathy and makes stakeholders believe that this persona is real?',
        bullets: [
            'Does the name match the geography and nationality of your persona?',
            'Did you take name trends into consideration?',
            'Is it easy to pronounce and remember the name you chose?',
            "Don't pick names of public people.",
            'Avoid names with negative associations.',
            "Don't pick too generic names e.g. John/Jane Doe."
        ],
        example: 'Use a memorable title for your persona along with the name or even instead of it, e.g. Steve the Techie',
        wordCloud: ['ALEXANDER', 'OLIVIA', 'AVA', 'DAVID', 'BENJAMIN', 'EMMA', 'SOPHIE', 'CHARLOTTE']
    },
    // Generic fallback for others
    default: {
        title: 'Guidance',
        color: '#64748b',
        description: 'Select a section on the left to view specific guidance rules and tips.',
        bullets: [],
        example: ''
    }
};

export function PersonaHelpModal({ onClose }) {
    const [selectedItemId, setSelectedItemId] = useState('name');

    // Helper to find parent category color
    const getCategoryColor = (itemId) => {
        for (const cat of GUIDANCE_CATEGORIES) {
            if (cat.items.find(i => i.id === itemId)) return cat.color;
        }
        return '#64748b';
    };

    const activeContent = GUIDANCE_CONTENT[selectedItemId] || {
        ...GUIDANCE_CONTENT.default,
        title: GUIDANCE_CATEGORIES.flatMap(c => c.items).find(i => i.id === selectedItemId)?.title || 'Guidance',
        color: getCategoryColor(selectedItemId),
        description: `Guidance for ${selectedItemId}. (Content pending)`
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 2000,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div style={{
                background: 'white', width: '1000px', maxWidth: '95%', height: '80vh',
                borderRadius: '12px', display: 'flex', flexDirection: 'column',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                overflow: 'hidden', fontFamily: "'Inter', sans-serif"
            }}>
                {/* HEADER */}
                <div style={{ padding: '24px 32px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#ffffff' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '24px', fontWeight: '700', color: '#1F2937', marginBottom: '16px', textAlign: 'center' }}>NEED HELP?</div>
                        <div style={{ fontSize: '16px', color: '#4B5563', lineHeight: '1.5', maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
                            Building an effective and actionable customer journey map is not easy. We prepared some thought-provoking questions to help you avoid common mistakes and pitfalls and create a great map for your business.
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}>
                        <X size={24} color="#6B7280" />
                    </button>
                </div>

                {/* BODY */}
                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    {/* LEFT SIDEBAR */}
                    <div style={{ width: '280px', overflowY: 'auto', flexShrink: 0 }}>
                        {GUIDANCE_CATEGORIES.map(cat => (
                            <div key={cat.id}>
                                <div style={{
                                    background: cat.color, color: 'white', padding: '16px 24px',
                                    fontSize: '16px', fontWeight: '600', letterSpacing: '0.05em'
                                }}>
                                    {cat.title}
                                </div>
                                <div style={{ background: cat.color }}> {/* Continue color background down list */}
                                    {cat.items.map(item => {
                                        const isActive = selectedItemId === item.id;
                                        return (
                                            <div
                                                key={item.id}
                                                onClick={() => setSelectedItemId(item.id)}
                                                style={{
                                                    padding: '12px 24px',
                                                    fontSize: '14px',
                                                    cursor: 'pointer',
                                                    background: isActive ? '#FFFFFF' : 'transparent',
                                                    color: isActive ? '#1F2937' : '#FFFFFF',
                                                    fontWeight: isActive ? '700' : '500',
                                                    borderLeft: isActive ? '4px solid #10B981' : '4px solid transparent',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                {item.title}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* RIGHT CONTENT */}
                    <div style={{ flex: 1, padding: '32px 48px', overflowY: 'auto', background: '#FFFFFF' }}>
                        <div style={{ fontSize: '20px', fontWeight: '700', color: activeContent.color, marginBottom: '16px' }}>
                            {activeContent.title}
                        </div>
                        <div style={{ fontSize: '16px', color: activeContent.color, lineHeight: '1.6', marginBottom: '24px', fontWeight: '500' }}>
                            {activeContent.description}
                        </div>

                        {/* Word Cloud (Visual Aid for Name) */}
                        {activeContent.wordCloud && (
                            <div style={{
                                display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center',
                                padding: '24px', background: '#F9FAFB', borderRadius: '12px', marginBottom: '32px'
                            }}>
                                {activeContent.wordCloud.map((word, i) => (
                                    <span key={i} style={{
                                        fontSize: 14 + (i % 3) * 6 + 'px',
                                        color: i % 2 === 0 ? '#9CA3AF' : '#D1D5DB',
                                        fontWeight: '700'
                                    }}>
                                        {word}
                                    </span>
                                ))}
                            </div>
                        )}

                        <ul style={{ paddingLeft: '20px', color: '#4B5563', marginBottom: '32px' }}>
                            {activeContent.bullets.map((bullet, i) => (
                                <li key={i} style={{ marginBottom: '12px', lineHeight: '1.5' }}>
                                    {bullet}
                                </li>
                            ))}
                        </ul>

                        {activeContent.example && (
                            <div style={{
                                padding: '16px', borderLeft: '4px solid #E5E7EB',
                                fontStyle: 'italic', color: '#6B7280', background: '#F9FAFB'
                            }}>
                                {activeContent.example}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
