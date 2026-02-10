import React from 'react';
import {
    LayoutDashboard, Clock, AlertCircle, CheckCircle,
    TrendingUp, MessageSquare, Calendar
} from 'lucide-react';

/**
 * 3.2.1 Home Dashboard
 * Purpose: High-level overview of SMM activities
 */
export function HomeDashboard() {
    // Configurable widgets (mock data for now, ideally fetched from API)
    const widgets = [
        {
            id: 'approvals',
            label: 'Pending Approvals',
            value: '12',
            trend: '+3',
            icon: CheckCircle,
            color: '#f59e0b',
            sub: 'Requires your attention'
        },
        {
            id: 'scheduled',
            label: 'Scheduled (7d)',
            value: '45',
            trend: '+12',
            icon: Calendar,
            color: '#3b82f6',
            sub: 'Upcoming posts'
        },
        {
            id: 'failures',
            label: 'Publishing Failures',
            value: '2',
            trend: '-1',
            icon: AlertCircle,
            color: '#ef4444',
            sub: 'Last 24 hours'
        },
        {
            id: 'engagement',
            label: 'Inbox Backlog',
            value: '24',
            trend: '+5',
            icon: MessageSquare,
            color: '#10b981',
            sub: 'Unassigned messages'
        }
    ];

    return (
        <div className="smm-home-dashboard">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>
                    Dashboard
                </h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <select style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                        <option>Last 7 Days</option>
                        <option>Last 30 Days</option>
                        <option>This Quarter</option>
                    </select>
                </div>
            </div>

            {/* Widgets Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
                {widgets.map((w) => (
                    <div key={w.id} style={{
                        background: 'white',
                        padding: '24px',
                        borderRadius: '12px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        borderLeft: `4px solid ${w.color}`,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ fontSize: '0.9em', color: '#64748b', fontWeight: '500', marginBottom: '8px' }}>
                                    {w.label}
                                </div>
                                <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#1e293b' }}>
                                    {w.value}
                                </div>
                            </div>
                            <div style={{
                                background: `${w.color}15`,
                                padding: '10px',
                                borderRadius: '8px',
                                color: w.color
                            }}>
                                <w.icon size={20} />
                            </div>
                        </div>
                        <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', fontSize: '0.8em' }}>
                            <span style={{ color: '#64748b' }}>{w.sub}</span>
                            <span style={{ color: w.trend.startsWith('+') ? '#10b981' : '#ef4444', fontWeight: '600' }}>
                                {w.trend}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content Area */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                {/* Posts by Status / Activity */}
                <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', minHeight: '400px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1em', fontWeight: '600' }}>Recent Activity</h3>
                        <button style={{ color: '#3b82f6', background: 'none', border: 'none', fontWeight: '500', cursor: 'pointer' }}>View All</button>
                    </div>

                    {/* Placeholder for Activity Feed */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {[1, 2, 3].map(i => (
                            <div key={i} style={{ display: 'flex', gap: '15px', paddingBottom: '15px', borderBottom: '1px solid #f1f5f9' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', flexShrink: 0 }}>
                                    <Clock size={18} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: '500', color: '#1e293b' }}>Campaign "Summer Sale" created</div>
                                    <div style={{ fontSize: '0.85em', color: '#64748b', marginTop: '4px' }}>by Sarah Johnson • 2 hours ago</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Engagement Backlog / Tasks */}
                <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', minHeight: '400px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1em', fontWeight: '600', marginBottom: '20px' }}>My Tasks</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', borderLeft: '3px solid #f59e0b' }}>
                            <div style={{ fontSize: '0.9em', fontWeight: '600' }}>Approve: LinkedIn Post #402</div>
                            <div style={{ fontSize: '0.8em', color: '#64748b', marginTop: '4px' }}>Due: Today, 5:00 PM</div>
                        </div>
                        <div style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', borderLeft: '3px solid #3b82f6' }}>
                            <div style={{ fontSize: '0.9em', fontWeight: '600' }}>Draft: Product Launch Teaser</div>
                            <div style={{ fontSize: '0.8em', color: '#64748b', marginTop: '4px' }}>Due: Tomorrow</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
