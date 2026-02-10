import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Filter, Plus, MoreHorizontal, Target, Calendar
} from 'lucide-react';

/**
 * 3.3.5 Campaigns List
 * View all campaigns with status and stats.
 */
export function CampaignList() {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCampaigns();
    }, []);

    const fetchCampaigns = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/v1/smm/campaigns');
            setCampaigns(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Failed to fetch campaigns:", err);
            setCampaigns([]);
        }
        setLoading(false);
    };

    return (
        <div className="smm-campaign-list">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.5em', fontWeight: 'bold', margin: '0 0 10px 0', color: '#1e293b' }}>Campaigns</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button style={{ padding: '8px 12px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Filter size={16} /> Filters
                    </button>
                    <button style={{ padding: '8px 16px', background: '#059669', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Plus size={16} /> New Campaign
                    </button>
                </div>
            </div>

            {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading campaigns...</div>
            ) : (
                <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <tr>
                                <th style={{ padding: '16px', fontSize: '0.8em', color: '#64748b', fontWeight: '600' }}>NAME</th>
                                <th style={{ padding: '16px', fontSize: '0.8em', color: '#64748b', fontWeight: '600' }}>CODE</th>
                                <th style={{ padding: '16px', fontSize: '0.8em', color: '#64748b', fontWeight: '600' }}>OBJECTIVE</th>
                                <th style={{ padding: '16px', fontSize: '0.8em', color: '#64748b', fontWeight: '600' }}>DATES</th>
                                <th style={{ padding: '16px', fontSize: '0.8em', color: '#64748b', fontWeight: '600' }}>STATUS</th>
                                <th style={{ padding: '16px', fontSize: '0.8em', color: '#64748b', fontWeight: '600', textAlign: 'right' }}>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {campaigns.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                                        No campaigns found.
                                    </td>
                                </tr>
                            ) : campaigns.map(c => (
                                <tr key={c.campaign_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '16px', fontWeight: '600', color: '#1e293b' }}>
                                        {c.campaign_name}
                                    </td>
                                    <td style={{ padding: '16px', fontFamily: 'monospace', color: '#64748b', fontSize: '0.9em' }}>
                                        {c.campaign_code}
                                    </td>
                                    <td style={{ padding: '16px', color: '#64748b', textTransform: 'capitalize' }}>
                                        {c.objective_lookup_id || 'Awareness'} {/* Mock */}
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9em', color: '#64748b' }}>
                                            <Calendar size={14} />
                                            {c.start_date ? new Date(c.start_date).toLocaleDateString() : '-'}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <span style={{
                                            padding: '4px 10px', borderRadius: '12px', fontSize: '0.75em', fontWeight: '600',
                                            background: '#dcfce7', color: '#166534' // Mock active
                                        }}>
                                            ACTIVE
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'right' }}>
                                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                                            <MoreHorizontal size={18} color="#94a3b8" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
