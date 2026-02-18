import React, { useState } from 'react';
import {
    LayoutDashboard, FileText, Send, MessageSquare, BarChart3,
    Shield, Cpu, Settings, Search, Bell, ChevronDown, Plus,
    Calendar, Image as ImageIcon
} from 'lucide-react';

// Import SMM Modules
import { HomeDashboard } from './smm/home/HomeDashboard';
import { PostList } from './smm/content/PostList';
import { CampaignList } from './smm/content/CampaignList';
import { LookupManager } from './smm/admin/LookupManager';
import { SmmProvider } from './smm/context/SmmContext';

/**
 * 3.0 SMM SHELL (Enterprise Layout)
 * Implements the left sidebar navigation and top bar context.
 * Opens in a FULL PAGE OVERLAY (outside parent layout)
 */
export default function SocialMediaMarketing() {
    return (
        <SmmProvider>
            {/* Full Page Overlay to breakout of parent sidebar */}
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 9999, background: 'white' }}>
                <SmmAppShell />
            </div>
        </SmmProvider>
    );
}

function SmmAppShell() {
    const [activeModule, setActiveModule] = useState('home');
    const [activeView, setActiveView] = useState('dashboard');
    const [selectedBrand, setSelectedBrand] = useState({ id: 'default', name: 'Default Brand' });

    // 2. Navigation Structure
    const modules = [
        { id: 'home', label: 'Home', icon: LayoutDashboard, views: ['dashboard', 'my_work'] },
        { id: 'content', label: 'Content', icon: FileText, views: ['calendar', 'posts', 'campaigns', 'library'] },
        { id: 'publishing', label: 'Publishing', icon: Send, views: ['queue', 'logs', 'proofs'] },
        { id: 'engagement', label: 'Engagement', icon: MessageSquare, views: ['inbox', 'sla', 'templates'] },
        { id: 'analytics', label: 'Analytics', icon: BarChart3, views: ['overview', 'channel', 'reports'] },
        { id: 'compliance', label: 'Compliance', icon: Shield, views: ['rules', 'banned_terms', 'crisis'] },
        { id: 'ai_studio', label: 'AI Studio', icon: Cpu, views: ['models', 'prompts', 'feedback'] },
        { id: 'admin', label: 'Admin', icon: Settings, views: ['org', 'users', 'channels', 'lookups'] }
    ];

    const handleModuleChange = (modId) => {
        setActiveModule(modId);
        const mod = modules.find(m => m.id === modId);
        if (mod && mod.views.length > 0) {
            setActiveView(mod.views[0]);
        }
    };

    return (
        <div style={{ display: 'flex', height: '100vh', background: '#f8fbf9', fontFamily: 'Outfit, sans-serif' }}>
            {/* 1. LEFT SIDEBAR (Pale Green Theme) */}
            <div style={{ width: '260px', background: '#ecfdf5', color: '#064e3b', display: 'flex', flexDirection: 'column', flexShrink: 0, borderRight: '1px solid #d1fae5' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid #059669' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ margin: 0, fontSize: '1.2em', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ color: '#059669' }}>RayiX</span> SMM
                        </h2>
                        {/* Close button to return to main app if needed, though strictly requested full page new menu */}
                        <a href="/" style={{ fontSize: '0.8em', textDecoration: 'none', color: '#047857' }}>EXIT</a>
                    </div>
                    <div style={{ fontSize: '0.75em', color: '#047857', marginTop: '5px', letterSpacing: '0.5px' }}>ENTERPRISE EDITION</div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '15px 10px' }}>
                    {modules.map(mod => (
                        <div key={mod.id} style={{ marginBottom: '4px' }}>
                            <button
                                onClick={() => handleModuleChange(mod.id)}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '12px 15px',
                                    background: activeModule === mod.id ? '#059669' : 'transparent',
                                    color: activeModule === mod.id ? 'white' : '#047857',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    fontWeight: activeModule === mod.id ? '600' : 'normal',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <mod.icon size={18} />
                                {mod.label}
                            </button>

                            {activeModule === mod.id && (
                                <div style={{
                                    marginLeft: '25px',
                                    marginTop: '8px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '2px',
                                    paddingLeft: '12px',
                                    borderLeft: '2px solid #d1fae5'
                                }}>
                                    {mod.views.map(view => (
                                        <SubNavButton
                                            key={view}
                                            label={view}
                                            isActive={activeView === view}
                                            onClick={() => setActiveView(view)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div style={{ padding: '20px', borderTop: '1px solid #059669' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'white' }}>AA</div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div style={{ fontSize: '0.9em', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#064e3b' }}>Admin User</div>
                            <div style={{ fontSize: '0.75em', color: '#047857' }}>rayixcx@gmail.com</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. MAIN LAYOUT */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100vh', background: 'white' }}>

                <div style={{ height: '64px', background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', padding: '0 24px', justifyContent: 'space-between', flexShrink: 0 }}>
                    {/* Left: Context Selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ fontSize: '0.8em', color: '#064e3b', fontWeight: 'bold', letterSpacing: '0.5px' }}>CONTEXT:</div>
                        <button style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '6px 12px', border: '1px solid #d1fae5', borderRadius: '6px',
                            background: '#ecfdf5', fontSize: '0.9em', fontWeight: '600', cursor: 'pointer',
                            color: '#064e3b'
                        }}>
                            {selectedBrand.name}
                            <ChevronDown size={14} color="#064e3b" />
                        </button>
                    </div>

                    {/* Center: Global Search */}
                    <div style={{ position: 'relative', width: '400px' }}>
                        <Search size={16} color="#064e3b" style={{ position: 'absolute', left: '12px', top: '10px' }} />
                        <input
                            type="text"
                            placeholder="Search campaigns, posts, assets..."
                            style={{
                                width: '100%', padding: '8px 12px 8px 36px',
                                border: '1px solid #d1fae5', borderRadius: '8px',
                                background: '#f8fbf9', fontSize: '0.9em', color: '#064e3b'
                            }}
                        />
                    </div>

                    {/* Right: Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', padding: '8px' }}>
                            <Bell size={20} color="#064e3b" />
                            <div style={{ position: 'absolute', top: 6, right: 6, width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%', border: '2px solid white' }} />
                        </button>
                        <button style={{
                            background: '#059669', color: 'white', border: 'none',
                            padding: '8px 16px', borderRadius: '6px', fontWeight: '600',
                            display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'
                        }}>
                            <Plus size={16} /> Quick Create
                        </button>
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '24px', position: 'relative' }}>
                    <PageRouter module={activeModule} view={activeView} />
                </div>
            </div>
        </div>
    );
}

// ==========================================
// ROUTER
// ==========================================
function PageRouter({ module, view }) {
    // HOME
    if (module === 'home') {
        if (view === 'dashboard') return <HomeDashboard />;
        if (view === 'my_work') return <PlaceholderView title="My Work" icon={LayoutDashboard} />;
    }

    // CONTENT
    if (module === 'content') {
        if (view === 'posts') return <PostList />;
        if (view === 'campaigns') return <CampaignList />;
        if (view === 'calendar') return <PlaceholderView title="Content Calendar" icon={Calendar} />;
        if (view === 'library') return <PlaceholderView title="Content Library" icon={ImageIcon} />;
    }

    // ADMIN
    if (module === 'admin') {
        if (view === 'lookups') return <LookupManager />;
    }

    // Default Fallback for other modules
    return <PlaceholderView title={`${module.toUpperCase()} / ${view.replace('_', ' ').toUpperCase()}`} />;
}

// Helper for WIP screens
function PlaceholderView({ title, icon: Icon }) {
    return (
        <div style={{
            height: '100%', minHeight: '400px',
            background: 'white', border: '2px dashed #e2e8f0', borderRadius: '12px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            color: '#94a3b8'
        }}>
            {Icon && <Icon size={48} style={{ marginBottom: '15px', opacity: 0.5 }} />}
            <div style={{ fontSize: '1.2em', fontWeight: 'bold' }}>{title}</div>
            <div style={{ marginTop: '10px' }}>This module view is under construction.</div>
        </div>
    );
}

// Helper Component for Sub Navigation with Hover Effects
function SubNavButton({ label, isActive, onClick }) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                background: isActive ? '#d1fae5' : (isHovered ? '#ecfdf5' : 'transparent'),
                border: 'none',
                textAlign: 'left',
                color: isActive ? '#065f46' : '#047857',
                fontSize: '0.85em',
                cursor: 'pointer',
                padding: '8px 12px',
                borderRadius: '6px',
                textTransform: 'capitalize',
                fontWeight: isActive ? '600' : 'normal',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}
        >
            {label.replace('_', ' ')}
            {isActive && <div style={{ width: '6px', height: '6px', background: '#059669', borderRadius: '50%' }} />}
        </button>
    );
}
