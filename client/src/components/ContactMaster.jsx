import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { useTranslation } from 'react-i18next';

export function ContactMaster() {
    const { t } = useTranslation();
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '', email: '', mobile: '', address: '', designation: '', department: ''
    });
    const [editingId, setEditingId] = useState(null);

    // Call Agent State
    const [callModalOpen, setCallModalOpen] = useState(false);
    const [selectedContactForCall, setSelectedContactForCall] = useState(null);
    const [availableSurveys, setAvailableSurveys] = useState([]);
    const [selectedSurveyId, setSelectedSurveyId] = useState('');
    const [callLoading, setCallLoading] = useState(false);

    // Import State
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importData, setImportData] = useState([]);
    const [importStats, setImportStats] = useState(null);

    useEffect(() => {
        loadContacts();
    }, []);

    const loadContacts = () => {
        setLoading(true);
        axios.get('/api/contacts')
            .then(res => {
                setContacts(res.data);
                setLoading(false);
            })
            .catch(err => {
                setError("Failed to load contacts: " + (err.response?.data?.error || err.message));
                setLoading(false);
            });
    };

    const handleSave = () => {
        if (!formData.name) return alert("Name is required");

        const promise = editingId
            ? axios.put(`/api/contacts/${editingId}`, formData)
            : axios.post(`/api/contacts`, formData);

        promise
            .then(() => {
                alert(editingId ? "Contact Updated" : "Contact Created");
                setIsModalOpen(false);
                setFormData({ name: '', email: '', mobile: '', address: '', designation: '', department: '' });
                setEditingId(null);
                loadContacts();
            })
            .catch(err => alert("Operation failed: " + (err.response?.data?.error || err.message)));
    };

    const handleDelete = (id) => {
        if (confirm("Delete contact?")) {
            axios.delete(`/api/contacts/${id}`)
                .then(loadContacts)
                .catch(err => alert("Failed to delete"));
        }
    };

    const handleEdit = (c) => {
        setFormData({
            name: c.name, email: c.email || '', mobile: c.mobile || '',
            address: c.address || '', designation: c.designation || '', department: c.department || ''
        });
        setEditingId(c.id);
        setIsModalOpen(true);
    };

    const handleOpenCallModal = (contact) => {
        setSelectedContactForCall(contact);
        setCallModalOpen(true);
        // Fetch surveys
        axios.get('/api/forms')
            .then(res => setAvailableSurveys(res.data))
            .catch(err => console.error("Failed to load surveys", err));
    };

    const handleInitiateCall = () => {
        if (!selectedSurveyId) return alert("Please select a survey");
        setCallLoading(true);

        axios.post('/api/calls/initiate', {
            contactId: selectedContactForCall.id,
            surveyId: selectedSurveyId
        })
            .then(res => {
                alert("Agent Dispatched! The call should start shortly.");
                setCallModalOpen(false);
                setCallLoading(false);
            })
            .catch(err => {
                alert("Failed to initiate call: " + (err.response?.data?.error || err.message));
                setCallLoading(false);
            });
    };

    // Import Handlers
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws);

            const processed = data.map((row) => ({
                name: row.Name || row.name || row['Full Name'],
                email: row.Email || row.email || row['E-mail'] || '',
                mobile: row.Mobile || row.mobile || row['Phone'] || '',
                address: row.Address || row.address || '',
                designation: row.Designation || row.designation || '',
                department: row.Department || row.department || ''
            })).filter(r => r.name); // Filter empty names

            setImportData(processed);
            setImportStats({ total: processed.length, fileName: file.name });
        };
        reader.readAsBinaryString(file);
    };

    const confirmImport = async () => {
        if (!importData || importData.length === 0) return;
        setLoading(true);
        let successCount = 0;
        let failCount = 0;

        // Note: For large datasets, a bulk create API is better. 
        // We will stick to sequential loop for MVP safely.
        for (const contact of importData) {
            try {
                await axios.post('/api/contacts', contact);
                successCount++;
            } catch (err) {
                console.error("Import error", err);
                failCount++;
            }
        }

        alert(`Import Complete!\nSuccess: ${successCount}\nFailed: ${failCount}`);
        setLoading(false);
        setIsImportModalOpen(false);
        setImportData([]);
        setImportStats(null);
        loadContacts();
    };


    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px', fontFamily: "'Outfit', sans-serif" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h1 style={{ margin: 0, color: '#1e293b' }}>Contact Master</h1>
                    <p style={{ color: '#64748b' }}>Manage your global contact list</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        style={{ padding: '12px 24px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', color: '#334155', fontWeight: '500' }}
                    >
                        📂 Import Contacts
                    </button>
                    <button
                        onClick={() => { setEditingId(null); setFormData({ name: '', email: '', mobile: '', address: '', designation: '', department: '' }); setIsModalOpen(true); }}
                        style={{ background: '#064e3b', color: 'white', padding: '12px 24px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        + Add Contact
                    </button>
                </div>
            </div>

            {loading && <div>Loading...</div>}
            {error && <div style={{ color: 'red' }}>{error}</div>}

            {!loading && !error && (
                <div style={{ overflowX: 'auto', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                            <tr>
                                <th style={{ padding: '15px', textAlign: 'left' }}>Name</th>
                                <th style={{ padding: '15px', textAlign: 'left' }}>Email</th>
                                <th style={{ padding: '15px', textAlign: 'left' }}>Mobile</th>
                                <th style={{ padding: '15px', textAlign: 'left' }}>Role/Dept</th>
                                <th style={{ padding: '15px', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {contacts.map(c => (
                                <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '15px', fontWeight: '500' }}>{c.name}</td>
                                    <td style={{ padding: '15px', color: '#64748b' }}>{c.email}</td>
                                    <td style={{ padding: '15px', color: '#64748b' }}>{c.mobile}</td>
                                    <td style={{ padding: '15px', fontSize: '0.9em' }}>
                                        <div style={{ fontWeight: '500' }}>{c.designation}</div>
                                        <div style={{ color: '#94a3b8' }}>{c.department}</div>
                                    </td>
                                    <td style={{ padding: '15px', textAlign: 'right' }}>
                                        <button onClick={() => handleEdit(c)} style={{ padding: '8px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', marginRight: '10px' }}>✏️</button>
                                        <button onClick={() => handleDelete(c.id)} style={{ padding: '8px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', marginRight: '10px' }}>🗑️</button>
                                        <button onClick={() => handleOpenCallModal(c)} title="Call with AI Agent" style={{ padding: '8px', color: '#10b981', background: 'none', border: 'none', cursor: 'pointer' }}>📞</button>
                                    </td>
                                </tr>
                            ))}
                            {contacts.length === 0 && (
                                <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No contacts found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* EDIT/CREATE MODAL */}
            {isModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{ background: '#D9F8E5', padding: '30px', borderRadius: '16px', width: '500px', maxWidth: '90%' }}>
                        <h2 style={{ marginTop: 0, color: '#1e293b' }}>{editingId ? 'Edit Contact' : 'Add Contact'}</h2>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em', color: '#64748b' }}>Name *</label>
                                <input style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em', color: '#64748b' }}>Mobile</label>
                                <input style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={formData.mobile} onChange={e => setFormData({ ...formData, mobile: e.target.value })} />
                            </div>
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em', color: '#64748b' }}>Email</label>
                            <input type="email" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em', color: '#64748b' }}>Designation</label>
                                <input style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={formData.designation} onChange={e => setFormData({ ...formData, designation: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em', color: '#64748b' }}>Department</label>
                                <input style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} />
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em', color: '#64748b' }}>Address</label>
                            <textarea style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', minHeight: '60px' }} value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: '1px solid #cbd5e1', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', color: '#064e3b' }}>Cancel</button>
                            <button onClick={handleSave} style={{ background: '#064e3b', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>{editingId ? 'Update' : 'Create'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* IMPORT MODAL */}
            {isImportModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{ background: '#D9F8E5', padding: '40px', borderRadius: '16px', width: '800px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                            <h2 style={{ margin: 0, color: '#1e293b' }}>Import Contacts</h2>
                            <button onClick={() => setIsImportModalOpen(false)} style={{ border: 'none', background: 'none', fontSize: '1.5em', cursor: 'pointer', color: '#94a3b8' }}>&times;</button>
                        </div>

                        {!importStats ? (
                            <div>
                                <div style={{ marginBottom: '30px', background: '#f8fafc', padding: '20px', borderRadius: '8px' }}>
                                    <h4 style={{ margin: '0 0 10px 0' }}>Step 1: Download Template</h4>
                                    <p style={{ color: '#64748b', marginBottom: '15px' }}>Use this template to ensure your data is formatted correctly.</p>
                                    <button
                                        onClick={() => {
                                            const ws = XLSX.utils.json_to_sheet([{
                                                Name: "John Doe", Email: "john@example.com", Mobile: "1234567890", Address: "123 St", Designation: "Manager", Department: "Sales"
                                            }]);
                                            const wb = XLSX.utils.book_new();
                                            XLSX.utils.book_append_sheet(wb, ws, "Contacts");
                                            XLSX.writeFile(wb, "Contact_Master_Template.xlsx");
                                        }}
                                        style={{ padding: '8px 16px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                                    >
                                        ⬇️ Download Excel Template
                                    </button>
                                </div>

                                <div style={{ border: '2px dashed #cbd5e1', borderRadius: '8px', padding: '40px', textAlign: 'center' }}>
                                    <input type="file" id="cm-import-input-modal" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={handleFileUpload} />
                                    <label htmlFor="cm-import-input-modal">
                                        <div style={{ fontSize: '3em', marginBottom: '10px' }}>📂</div>
                                        <button style={{ pointerEvents: 'none', background: '#3b82f6', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: '500', cursor: 'pointer' }}>
                                            Select Excel/CSV File
                                        </button>
                                        <div style={{ marginTop: '10px', fontSize: '0.9em', color: '#94a3b8' }}>Drag and drop or click to upload</div>
                                    </label>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <div style={{ color: '#166534', background: '#dcfce7', padding: '5px 10px', borderRadius: '6px', fontWeight: '500' }}>
                                        ✅ {importStats.total} contacts found in {importStats.fileName}
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button onClick={() => { setImportData([]); setImportStats(null); }} style={{ padding: '10px 20px', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                                        <button onClick={confirmImport} style={{ padding: '10px 20px', background: '#1e293b', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Import Contacts</button>
                                    </div>
                                </div>

                                <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9em' }}>
                                        <thead style={{ background: '#f1f5f9', position: 'sticky', top: 0 }}>
                                            <tr>
                                                <th style={{ padding: '10px', textAlign: 'left' }}>Name</th>
                                                <th style={{ padding: '10px', textAlign: 'left' }}>Email</th>
                                                <th style={{ padding: '10px', textAlign: 'left' }}>Mobile</th>
                                                <th style={{ padding: '10px', textAlign: 'left' }}>Designation</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {importData.map((d, i) => (
                                                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '10px' }}>{d.name}</td>
                                                    <td style={{ padding: '10px' }}>{d.email}</td>
                                                    <td style={{ padding: '10px' }}>{d.mobile}</td>
                                                    <td style={{ padding: '10px' }}>{d.designation}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {callModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{ background: 'white', padding: '30px', borderRadius: '16px', width: '400px', maxWidth: '90%' }}>
                        <h2 style={{ marginTop: 0, color: '#1e293b' }}>📞 Call Agent</h2>
                        <p style={{ color: '#64748b' }}>Dispatch an AI Agent to call <strong>{selectedContactForCall?.name}</strong>.</p>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9em', color: '#64748b' }}>Select Survey Script</label>
                            <select
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                value={selectedSurveyId}
                                onChange={e => setSelectedSurveyId(e.target.value)}
                            >
                                <option value="">-- Select Survey --</option>
                                {availableSurveys.map(s => (
                                    <option key={s.id} value={s.id}>{s.title}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button onClick={() => setCallModalOpen(false)} style={{ background: 'none', border: '1px solid #cbd5e1', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', color: '#64748b' }}>Cancel</button>
                            <button
                                onClick={handleInitiateCall}
                                disabled={callLoading}
                                style={{ background: '#10b981', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', listStyle: 'none' }}
                            >
                                {callLoading ? 'Dispatching...' : 'Start Call'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
