import React, { useState } from 'react';
import { Folder, FileText, Plus, Search, MoreVertical, Layout, Grid, PieChart, BarChart } from 'lucide-react';
import { toast } from '../common/Toast';

const MOCK_FOLDERS = [
    { id: 'predefined', name: 'Predefined Dashboards', type: 'system', locked: true },
    { id: 'shared', name: 'Shared Reports', type: 'shared', locked: false },
    { id: 'my_reports', name: 'My Reports', type: 'personal', locked: false }
];

const MOCK_DASHBOARDS = [
    { id: 'd1', folderId: 'predefined', name: 'Survey Activity Dashboard', type: 'survey-activity', lastModified: '2024-10-10' },
    { id: 'd2', folderId: 'predefined', name: 'Agent Activity Dashboard', type: 'agent-activity', lastModified: '2024-10-10' },
    { id: 'd3', folderId: 'predefined', name: 'Business Activity Dashboard', type: 'business-activity', lastModified: '2024-10-10' },
    { id: 'd4', folderId: 'my_reports', name: 'Custom KPI Tracker', type: 'custom', lastModified: '2026-01-25' },
];

export const AnalyticsBuilder = ({ onNavigate }) => {
    const [selectedFolder, setSelectedFolder] = useState('predefined');
    const [searchQuery, setSearchQuery] = useState('');
    const [dashboards, setDashboards] = useState(MOCK_DASHBOARDS);
    const [folders, setFolders] = useState(MOCK_FOLDERS);

    const filteredDashboards = dashboards.filter(d =>
        d.folderId === selectedFolder &&
        d.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleDashboardClick = (dashboard) => {
        // Map internal types to App.jsx view IDs
        if (dashboard.type === 'survey-activity') onNavigate('survey-activity-dashboard');
        else if (dashboard.type === 'custom') onNavigate('analytics-dashboard'); // The dynamic one we built
        else toast.info(`Opening ${dashboard.name}... (Access to this specific predefined dashboard is limited in this demo)`);
    };

    const currentFolder = folders.find(f => f.id === selectedFolder);

    return (
        <div className="analytics-builder" style={{ display: 'flex', height: 'calc(100vh - 80px)', background: '#f8fafc', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>

            {/* Sidebar: Folders */}
            <div style={{ width: '280px', background: 'white', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9' }}>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Analytics Builder</h2>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '5px' }}>Organize your insights</p>
                </div>

                <div style={{ flex: 1, padding: '10px', overflowY: 'auto' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#94a3b8', padding: '10px', textTransform: 'uppercase' }}>Folders</div>
                    {folders.map(folder => (
                        <div
                            key={folder.id}
                            onClick={() => setSelectedFolder(folder.id)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '8px', cursor: 'pointer',
                                background: selectedFolder === folder.id ? '#eff6ff' : 'transparent',
                                color: selectedFolder === folder.id ? '#2563eb' : '#475569'
                            }}
                        >
                            <Folder size={18} fill={selectedFolder === folder.id ? "#bfdbfe" : "none"} />
                            <span style={{ fontSize: '0.95rem', fontWeight: '500' }}>{folder.name}</span>
                        </div>
                    ))}
                </div>

                <div style={{ padding: '15px', borderTop: '1px solid #f1f5f9' }}>
                    <button
                        onClick={() => onNavigate('analytics-dashboard')}
                        style={{
                            width: '100%', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500'
                        }}
                    >
                        <Plus size={18} /> New Report
                    </button>
                </div>
            </div>

            {/* Main Content: Dashboard List */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

                {/* Toolbar */}
                <div style={{ padding: '20px', background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Folder size={20} color="#64748b" />
                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>{currentFolder?.name}</h3>
                    </div>

                    <div style={{ position: 'relative' }}>
                        <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                            type="text"
                            placeholder="Search dashboards..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                padding: '10px 10px 10px 36px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', width: '250px', fontSize: '0.9rem'
                            }}
                        />
                    </div>
                </div>

                {/* Dashboard Grid */}
                <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
                    {filteredDashboards.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '50px' }}>
                            <FileText size={48} style={{ opacity: 0.2 }} />
                            <p>No dashboards found in this folder.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
                            {filteredDashboards.map(d => (
                                <div
                                    key={d.id}
                                    onClick={() => handleDashboardClick(d)}
                                    style={{
                                        background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', cursor: 'pointer',
                                        transition: 'transform 0.2s, box-shadow 0.2s',
                                        position: 'relative'
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 20px -5px rgba(0,0,0,0.1)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                                >
                                    {/* Thumbnail Placeholder */}
                                    <div style={{ height: '140px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {d.type.includes('activity') ? <BarChart size={40} color="#cbd5e1" /> : <Layout size={40} color="#cbd5e1" />}
                                    </div>

                                    {/* Info */}
                                    <div style={{ padding: '15px' }}>
                                        <h4 style={{ margin: '0 0 5px', fontSize: '1rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</h4>
                                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Modified: {d.lastModified}</p>
                                    </div>

                                    <button style={{ position: 'absolute', top: '10px', right: '10px', padding: '5px', background: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer', opacity: 0.6 }}>
                                        <MoreVertical size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
