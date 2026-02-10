import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings, Plus, Save, Edit2, Trash2 } from 'lucide-react';

/**
 * 9.5 Lookups Manager (Admin)
 * Allows admins to manage dynamic system values (Status, Types, etc.)
 * Essential for "Table-driven UI".
 */
export function LookupManager() {
    const [masters, setMasters] = useState([]);
    const [selectedMaster, setSelectedMaster] = useState(null);
    const [values, setValues] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchMasters();
    }, []);

    useEffect(() => {
        if (selectedMaster) {
            fetchValues(selectedMaster.lookup_code);
        }
    }, [selectedMaster]);

    const fetchMasters = async () => {
        try {
            const res = await axios.get('/api/v1/smm/admin/lookups');
            setMasters(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error(err);
            setMasters([]);
        }
    };

    const fetchValues = async (code) => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/v1/smm/lookups/${code}`);
            setValues(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error(err);
            setValues([]);
        }
        setLoading(false);
    };

    const handleCreateValue = async () => {
        const code = prompt("Enter Value Code (e.g., ACTIVE):");
        if (!code) return;
        const label = prompt("Enter Label (e.g., Active):");

        try {
            await axios.post(`/api/v1/smm/admin/lookups/${selectedMaster.lookup_code}/values`, {
                value_code: code,
                value_label: label,
                master_id: selectedMaster.lookup_master_id
            });
            fetchValues(selectedMaster.lookup_code);
        } catch (err) {
            alert("Failed to create value");
        }
    };

    return (
        <div style={{ display: 'flex', height: '100%', gap: '20px' }}>
            {/* Left: Master List */}
            <div style={{ width: '300px', background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <h3 style={{ marginTop: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Settings size={20} /> Lookup Types
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {masters.map(m => (
                        <button
                            key={m.lookup_master_id}
                            onClick={() => setSelectedMaster(m)}
                            style={{
                                padding: '12px',
                                textAlign: 'left',
                                background: selectedMaster?.lookup_master_id === m.lookup_master_id ? '#f1f5f9' : 'white',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: selectedMaster?.lookup_master_id === m.lookup_master_id ? '600' : 'normal'
                            }}
                        >
                            {m.lookup_name}
                            <div style={{ fontSize: '0.75em', color: '#94a3b8' }}>{m.lookup_code}</div>
                        </button>
                    ))}
                    <button
                        onClick={async () => {
                            const name = prompt("New Lookup Name:");
                            const code = prompt("New Lookup Code (UPPER):");
                            if (name && code) {
                                await axios.post('/api/v1/smm/admin/lookups', { lookup_name: name, lookup_code: code });
                                fetchMasters();
                            }
                        }}
                        style={{ marginTop: '10px', padding: '10px', border: '1px dashed #cbd5e1', background: 'none', cursor: 'pointer', color: '#64748b' }}
                    >
                        + Create New Type
                    </button>
                </div>
            </div>

            {/* Right: Values List */}
            <div style={{ flex: 1, background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                {selectedMaster ? (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0 }}>Values for: {selectedMaster.lookup_name}</h3>
                            <button
                                onClick={handleCreateValue}
                                style={{ background: '#059669', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <Plus size={16} /> Add Value
                            </button>
                        </div>

                        {loading ? <div>Loading values...</div> : (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                    <tr>
                                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.85em', color: '#64748b' }}>CODE</th>
                                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.85em', color: '#64748b' }}>LABEL</th>
                                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.85em', color: '#64748b' }}>COLOR</th>
                                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.85em', color: '#64748b' }}>ORDER</th>
                                        <th style={{ padding: '12px', textAlign: 'right', fontSize: '0.85em', color: '#64748b' }}>ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {values.map(v => (
                                        <tr key={v.lookup_value_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '12px', fontFamily: 'monospace' }}>{v.value_code}</td>
                                            <td style={{ padding: '12px' }}>{v.value_label}</td>
                                            <td style={{ padding: '12px' }}>
                                                {v.value_color && <div style={{ width: '20px', height: '20px', borderRadius: '4px', background: v.value_color }}></div>}
                                            </td>
                                            <td style={{ padding: '12px' }}>{v.sort_order}</td>
                                            <td style={{ padding: '12px', textAlign: 'right' }}>
                                                <button style={{ background: 'none', border: 'none', cursor: 'pointer' }}><Edit2 size={16} color="#64748b" /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                        Select a lookup type to manage values
                    </div>
                )}
            </div>
        </div>
    );
}
