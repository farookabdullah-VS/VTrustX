import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { read, utils } from 'xlsx';
import { WebCallModal } from './WebCallModal';
import { useToast } from './common/Toast';
import { Skeleton } from './common/Skeleton';

export function SurveyAudience({ form, onBack }) {
    const toast = useToast();
    const [audience, setAudience] = useState([]);
    const [loading, setLoading] = useState(true);

    // Global Import State
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [globalContacts, setGlobalContacts] = useState([]);
    const [selectedContacts, setSelectedContacts] = useState(new Set());
    const [importLoading, setImportLoading] = useState(false);

    // File Import State
    const [fileImportModalOpen, setFileImportModalOpen] = useState(false);
    const [fileData, setFileData] = useState([]);
    const [importStats, setImportStats] = useState(null);
    const [fileProcessing, setFileProcessing] = useState(false);

    const [webCallActive, setWebCallActive] = useState(false);

    useEffect(() => {
        loadAudience();
    }, [form.id]);

    const loadAudience = () => {
        setLoading(true);
        axios.get(`/api/form-audience/${form.id}`)
            .then(res => {
                setAudience(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load audience", err);
                setLoading(false);
            });
    };

    // --- Global Contacts Import ---
    const handleOpenImport = () => {
        setImportModalOpen(true);
        setImportLoading(true);
        axios.get('/api/contacts')
            .then(res => {
                setGlobalContacts(res.data);
                setImportLoading(false);
            })
            .catch(err => {
                toast.error("Failed to load global contacts");
                setImportLoading(false);
            });
    };

    const toggleSelection = (id) => {
        const next = new Set(selectedContacts);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedContacts(next);
    };

    const confirmGlobalImport = () => {
        const ids = Array.from(selectedContacts);
        if (ids.length === 0) return;

        axios.post(`/api/form-audience/${form.id}/add`, { contactIds: ids })
            .then(() => {
                toast.success(`Imported ${ids.length} contacts!`);
                setImportModalOpen(false);
                setSelectedContacts(new Set());
                loadAudience();
            })
            .catch(err => toast.error("Import failed: " + err.message));
    };

    // --- File Import (CSV/XLS) ---
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target.result;
            const wb = read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = utils.sheet_to_json(ws);

            // Normalize Keys
            const normalized = data.map(row => {
                const newRow = {};
                Object.keys(row).forEach(key => {
                    newRow[key.toLowerCase().trim()] = row[key];
                });
                return {
                    name: newRow.name || newRow['full name'] || newRow.fullname || 'Unknown',
                    email: newRow.email || newRow['e-mail'] || '',
                    phone: newRow.phone || newRow.mobile || newRow.contact || '',
                    ...newRow // Keep other fields
                };
            }).filter(r => r.name !== 'Unknown' || r.email || r.phone); // Basic filter

            setFileData(normalized);
            setImportStats({ fileName: file.name, total: normalized.length });
        };
        reader.readAsBinaryString(file);
    };

    const saveFileImport = async () => {
        if (!fileData || fileData.length === 0) return;
        if (!confirm(`Import ${fileData.length} contacts?`)) return;

        setFileProcessing(true);
        let successCount = 0;
        let failCount = 0;
        const newContactIds = [];

        // 1. Create Contacts in Global Master
        for (const contact of fileData) {
            try {
                const payload = {
                    name: contact.name,
                    email: contact.email,
                    mobile: contact.phone,
                    designation: contact.designation || '',
                    department: contact.department || ''
                };

                const res = await axios.post('/api/contacts', payload);
                if (res.data && res.data.id) {
                    newContactIds.push(res.data.id);
                    successCount++;
                }
            } catch (err) {
                console.error("Failed to create contact:", contact, err);
                failCount++;
            }
        }

        // 2. Link to Survey
        if (newContactIds.length > 0) {
            try {
                await axios.post(`/api/form-audience/${form.id}/add`, {
                    contactIds: newContactIds
                });
                toast.success(`Successfully imported ${newContactIds.length} contacts! (Failed: ${failCount})`);
                setFileImportModalOpen(false);
                setFileData([]);
                setImportStats(null);
                loadAudience(); // Refresh list
            } catch (err) {
                toast.error("Failed to link contacts: " + err.message);
            }
        } else {
            toast.warning("No valid contacts imported.");
        }
        setFileProcessing(false);
    };


    const removeContact = (id) => {
        if (!confirm("Remove from list?")) return;
        axios.delete(`/api/form-audience/${form.id}/${id}`)
            .then(loadAudience)
            .catch(err => toast.error("Failed to remove"));
    };

    const dispatchAgent = (contact) => {
        if (!confirm(`Call ${contact.name} now for this survey?`)) return;

        axios.post('/api/calls/initiate', {
            contactId: contact.contact_id,
            surveyId: form.id
        })
            .then(() => toast.success("Call Initiated!"))
            .catch(err => toast.error("Failed: " + (err.response?.data?.error || err.message)));
    };

    return (
        <div style={{ padding: '30px', maxWidth: '1000px', margin: '0 auto', fontFamily: "'Outfit', sans-serif" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h2 style={{ margin: 0, color: '#1e293b' }}>Survey Audience</h2>
                    <p style={{ color: '#64748b' }}>Manage the distribution list for <strong>{form.title}</strong></p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => setFileImportModalOpen(true)}
                        style={{ padding: '10px 20px', background: '#e2e8f0', color: '#1e293b', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                        📂 Import CSV/XLS
                    </button>
                    <button
                        onClick={handleOpenImport}
                        style={{ padding: '10px 20px', background: 'var(--primary-color-dark, #0f172a)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                        📥 Import from Global Contacts
                    </button>
                    <button
                        onClick={() => setWebCallActive(true)}
                        style={{ padding: '10px 20px', background: 'var(--primary-gradient, linear-gradient(135deg, var(--primary-color, #2563eb) 0%, var(--primary-hover, #1d4ed8) 100%))', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                        🌐 Test Web Call
                    </button>
                </div>
            </div>

            <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                        <tr>
                            <th style={{ padding: '15px' }}>Name</th>
                            <th style={{ padding: '15px' }}>Contact</th>
                            <th style={{ padding: '15px' }}>Status</th>
                            <th style={{ padding: '15px', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <>
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i}>
                                        <td style={{ padding: '15px' }}><Skeleton width="120px" height="16px" /></td>
                                        <td style={{ padding: '15px' }}>
                                            <Skeleton width="180px" height="14px" style={{ marginBottom: '6px' }} />
                                            <Skeleton width="140px" height="12px" />
                                        </td>
                                        <td style={{ padding: '15px' }}><Skeleton width="80px" height="24px" borderRadius="20px" /></td>
                                        <td style={{ padding: '15px', textAlign: 'right' }}><Skeleton width="60px" height="20px" /></td>
                                    </tr>
                                ))}
                            </>
                        ) : audience.length === 0 ? (
                            <tr><td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No contacts in this list. Import some!</td></tr>
                        ) : (
                            audience.map(row => (
                                    <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '15px', fontWeight: '500' }}>{row.name}</td>
                                        <td style={{ padding: '15px', color: '#64748b' }}>
                                            <div>{row.email}</div>
                                            <div style={{ fontSize: '0.9em' }}>{row.mobile}</div>
                                        </td>
                                        <td style={{ padding: '15px' }}>
                                            <span style={{
                                                padding: '4px 10px', borderRadius: '20px', fontSize: '0.85em', fontWeight: '500',
                                                background: row.status === 'completed' ? '#dcfce7' : '#f1f5f9',
                                                color: row.status === 'completed' ? '#166534' : '#475569'
                                            }}>
                                                {row.status || 'Pending'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '15px', textAlign: 'right' }}>
                                            <button onClick={() => dispatchAgent(row)} title="Call Now" style={{ marginRight: '10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2em' }}>📞</button>
                                            <button onClick={() => removeContact(row.contact_id)} title="Remove" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2em', color: '#ef4444' }}>🗑️</button>
                                        </td>
                                    </tr>
                                ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* GLOBAL IMPORT MODAL */}
            {importModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{ background: 'white', borderRadius: '16px', width: '600px', maxWidth: '90%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                            <h3 style={{ margin: 0 }}>Import Contacts</h3>
                            <button onClick={() => setImportModalOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.5em' }}>×</button>
                        </div>

                        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
                            {importLoading ? <div>Loading global list...</div> : (
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ textAlign: 'left', color: '#64748b' }}>
                                            <th style={{ paddingBottom: '10px' }}><input type="checkbox" /></th>
                                            <th style={{ paddingBottom: '10px' }}>Name</th>
                                            <th style={{ paddingBottom: '10px' }}>Email</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {globalContacts.map(c => (
                                            <tr key={c.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                                                <td style={{ padding: '10px 0' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedContacts.has(c.id)}
                                                        onChange={() => toggleSelection(c.id)}
                                                    />
                                                </td>
                                                <td>{c.name}</td>
                                                <td style={{ color: '#64748b' }}>{c.email}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <div style={{ padding: '20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button onClick={() => setImportModalOpen(false)} style={{ padding: '10px 20px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                            <button onClick={confirmGlobalImport} style={{ padding: '10px 20px', background: 'var(--primary-color-dark, #0f172a)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                                Import Selected ({selectedContacts.size})
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* FILE IMPORT MODAL */}
            {fileImportModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{ background: 'white', borderRadius: '16px', width: '700px', maxWidth: '90%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                            <h3 style={{ margin: 0 }}>Import from CSV / Excel</h3>
                            <button onClick={() => { setFileImportModalOpen(false); setFileData([]); setImportStats(null); }} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.5em' }}>×</button>
                        </div>

                        <div style={{ padding: '30px', flex: 1, overflowY: 'auto' }}>
                            {!importStats ? (
                                <div style={{ textAlign: 'center', padding: '40px', border: '2px dashed #cbd5e1', borderRadius: '12px', background: '#f8fafc' }}>
                                    <input
                                        type="file"
                                        accept=".csv, .xlsx, .xls"
                                        onChange={handleFileUpload}
                                        style={{ display: 'none' }}
                                        id="survey-audience-file"
                                    />
                                    <label htmlFor="survey-audience-file">
                                        <div style={{ fontSize: '3em', marginBottom: '15px' }}>📂</div>
                                        <button style={{ pointerEvents: 'none', background: 'var(--primary-color, #3b82f6)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: '600' }}>Select File</button>
                                        <p style={{ marginTop: '15px', color: '#64748b' }}>Supports .csv, .xlsx, .xls</p>
                                    </label>
                                </div>
                            ) : (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                                        <span style={{ fontWeight: '600', color: '#166534' }}>Found {importStats.total} contacts in {importStats.fileName}</span>
                                        <button onClick={() => { setFileData([]); setImportStats(null); }} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Change File</button>
                                    </div>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9em' }}>
                                        <thead style={{ background: '#f1f5f9' }}>
                                            <tr style={{ textAlign: 'left' }}>
                                                <th style={{ padding: '10px' }}>Name</th>
                                                <th style={{ padding: '10px' }}>Email</th>
                                                <th style={{ padding: '10px' }}>Phone</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {fileData.slice(0, 10).map((r, i) => (
                                                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '8px' }}>{r.name}</td>
                                                    <td style={{ padding: '8px' }}>{r.email}</td>
                                                    <td style={{ padding: '8px' }}>{r.phone}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {fileData.length > 10 && <div style={{ textAlign: 'center', padding: '10px', color: '#64748b', fontStyle: 'italic' }}>...and {fileData.length - 10} more</div>}
                                </div>
                            )}
                        </div>

                        <div style={{ padding: '20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button onClick={() => { setFileImportModalOpen(false); setFileData([]); setImportStats(null); }} style={{ padding: '10px 20px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                            <button
                                onClick={saveFileImport}
                                disabled={!importStats || fileProcessing}
                                style={{ padding: '10px 20px', background: 'var(--primary-color-dark, #0f172a)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', opacity: (!importStats || fileProcessing) ? 0.7 : 1 }}>
                                {fileProcessing ? 'Processing...' : `Import ${importStats ? importStats.total : ''} Contacts`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {webCallActive && <WebCallModal survey={form} onClose={() => setWebCallActive(false)} />}
        </div>
    );
}
