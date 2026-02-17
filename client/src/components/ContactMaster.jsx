import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { useTranslation } from 'react-i18next';
import { useToast } from './common/Toast';
import { Pagination } from './common/Pagination';
import { useNavigate } from 'react-router-dom';

export function ContactMaster() {
    const { t } = useTranslation();
    const toast = useToast();
    const navigate = useNavigate();
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Search & filter state
    const [search, setSearch] = useState('');

    // Bulk selection state
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [bulkLoading, setBulkLoading] = useState(false);

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

    // Pagination State
    const [contactPage, setContactPage] = useState(1);
    const [contactPageSize, setContactPageSize] = useState(25);

    // Import State
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importData, setImportData] = useState([]);
    const [importStats, setImportStats] = useState(null);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        axios.get('/api/contacts', { signal: controller.signal })
            .then(res => {
                setContacts(res.data);
                setLoading(false);
            })
            .catch(err => {
                if (err.name !== 'CanceledError') {
                    setError("Failed to load contacts: " + (err.response?.data?.error || err.message));
                    setLoading(false);
                }
            });
        return () => controller.abort();
    }, []);

    const loadContacts = useCallback(() => {
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
    }, []);

    const handleSave = useCallback(() => {
        if (!formData.name) { toast.warning("Name is required"); return; }

        const promise = editingId
            ? axios.put(`/api/contacts/${editingId}`, formData)
            : axios.post(`/api/contacts`, formData);

        promise
            .then(() => {
                toast.success(editingId ? "Contact Updated" : "Contact Created");
                setIsModalOpen(false);
                setFormData({ name: '', email: '', mobile: '', address: '', designation: '', department: '' });
                setEditingId(null);
                loadContacts();
            })
            .catch(err => toast.error("Operation failed: " + (err.response?.data?.error || err.message)));
    }, [formData, editingId, loadContacts, toast]);

    const handleDelete = useCallback((id) => {
        if (confirm("Delete contact?")) {
            axios.delete(`/api/contacts/${id}`)
                .then(loadContacts)
                .catch(err => toast.error("Failed to delete"));
        }
    }, [loadContacts, toast]);

    const handleEdit = (c) => {
        setFormData({
            name: c.name, email: c.email || '', mobile: c.mobile || '',
            address: c.address || '', designation: c.designation || '', department: c.department || ''
        });
        setEditingId(c.id);
        setIsModalOpen(true);
    };

    // Filtered contacts (client-side search)
    const filteredContacts = useMemo(() => {
        if (!search.trim()) return contacts;
        const q = search.toLowerCase();
        return contacts.filter(c =>
            c.name?.toLowerCase().includes(q) ||
            c.email?.toLowerCase().includes(q) ||
            c.mobile?.includes(q) ||
            c.designation?.toLowerCase().includes(q) ||
            c.department?.toLowerCase().includes(q)
        );
    }, [contacts, search]);

    // Bulk selection helpers
    const toggleSelect = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        const pageIds = filteredContacts.slice((contactPage - 1) * contactPageSize, contactPage * contactPageSize).map(c => c.id);
        const allSelected = pageIds.every(id => selectedIds.has(id));
        setSelectedIds(prev => {
            const next = new Set(prev);
            pageIds.forEach(id => allSelected ? next.delete(id) : next.add(id));
            return next;
        });
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`Delete ${selectedIds.size} selected contact(s)? This cannot be undone.`)) return;
        setBulkLoading(true);
        let failed = 0;
        for (const id of selectedIds) {
            try { await axios.delete(`/api/contacts/${id}`); }
            catch { failed++; }
        }
        toast[failed > 0 ? 'warning' : 'success'](
            failed > 0 ? `Deleted ${selectedIds.size - failed}, failed ${failed}` : `${selectedIds.size} contacts deleted`
        );
        setSelectedIds(new Set());
        setBulkLoading(false);
        loadContacts();
    };

    const handleBulkSuppress = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`Add ${selectedIds.size} contact(s) to the suppression list?`)) return;
        setBulkLoading(true);
        let failed = 0;
        for (const id of selectedIds) {
            try { await axios.post(`/api/advanced-contacts/${id}/suppress`, { reason: 'manual' }); }
            catch { failed++; }
        }
        toast[failed > 0 ? 'warning' : 'success'](
            failed > 0 ? `Suppressed ${selectedIds.size - failed}, failed ${failed}` : `${selectedIds.size} contacts suppressed`
        );
        setSelectedIds(new Set());
        setBulkLoading(false);
        loadContacts();
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
        if (!selectedSurveyId) { toast.warning("Please select a survey"); return; }
        setCallLoading(true);

        axios.post('/api/calls/initiate', {
            contactId: selectedContactForCall.id,
            surveyId: selectedSurveyId
        })
            .then(res => {
                toast.success("Agent Dispatched! The call should start shortly.");
                setCallModalOpen(false);
                setCallLoading(false);
            })
            .catch(err => {
                toast.error("Failed to initiate call: " + (err.response?.data?.error || err.message));
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

        toast.success(`Import Complete! Success: ${successCount}, Failed: ${failCount}`);
        setLoading(false);
        setIsImportModalOpen(false);
        setImportData([]);
        setImportStats(null);
        loadContacts();
    };


    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px', fontFamily: "'Outfit', sans-serif" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 style={{ margin: 0, color: '#1e293b' }}>Contact Master</h1>
                    <p style={{ color: '#64748b', margin: '4px 0 0' }}>
                        Manage your global contact list
                        {contacts.length > 0 && <span style={{ marginLeft: '8px', color: '#94a3b8', fontSize: '0.9em' }}>({contacts.length} contacts)</span>}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        style={{ padding: '10px 18px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', color: '#334155', fontWeight: '500', fontSize: '0.9em' }}
                    >
                        📂 Import Contacts
                    </button>
                    <button
                        onClick={() => { setEditingId(null); setFormData({ name: '', email: '', mobile: '', address: '', designation: '', department: '' }); setIsModalOpen(true); }}
                        style={{ background: '#064e3b', color: 'white', padding: '10px 18px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9em' }}
                    >
                        + Add Contact
                    </button>
                </div>
            </div>

            {/* Advanced Tools Nav */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <button
                    onClick={() => navigate('/contact-duplicates')}
                    style={{ padding: '8px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', cursor: 'pointer', color: '#92400e', fontSize: '0.85em', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                    🔁 Find Duplicates
                </button>
                <button
                    onClick={() => navigate('/suppression-list')}
                    style={{ padding: '8px 14px', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px', cursor: 'pointer', color: '#9f1239', fontSize: '0.85em', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                    🚫 Suppression List
                </button>
                <button
                    onClick={() => navigate('/contact-segments')}
                    style={{ padding: '8px 14px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', cursor: 'pointer', color: '#0369a1', fontSize: '0.85em', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                    🗂️ Segments
                </button>
                <button
                    onClick={() => navigate('/contact-tags')}
                    style={{ padding: '8px 14px', background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '8px', cursor: 'pointer', color: '#5b21b6', fontSize: '0.85em', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                    🏷️ Tags
                </button>
                <button
                    onClick={() => navigate('/custom-fields')}
                    style={{ padding: '8px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', cursor: 'pointer', color: '#166534', fontSize: '0.85em', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                    ⚙️ Custom Fields
                </button>
            </div>

            {/* Search Bar */}
            <div style={{ marginBottom: '16px', position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}>🔍</span>
                <input
                    type="search"
                    placeholder="Search by name, email, phone, role, or department..."
                    value={search}
                    onChange={e => { setSearch(e.target.value); setContactPage(1); }}
                    style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9em', boxSizing: 'border-box' }}
                />
                {search && (
                    <button
                        onClick={() => setSearch('')}
                        style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.1em', lineHeight: 1 }}
                    >×</button>
                )}
            </div>

            {/* Bulk Action Bar */}
            {selectedIds.size > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', padding: '10px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
                    <span style={{ fontWeight: '600', color: '#166534', fontSize: '0.9em' }}>{selectedIds.size} selected</span>
                    <button
                        onClick={handleBulkSuppress}
                        disabled={bulkLoading}
                        style={{ padding: '6px 14px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer', color: '#991b1b', fontSize: '0.85em', fontWeight: '500' }}
                    >
                        🚫 Suppress Selected
                    </button>
                    <button
                        onClick={handleBulkDelete}
                        disabled={bulkLoading}
                        style={{ padding: '6px 14px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer', color: '#991b1b', fontSize: '0.85em', fontWeight: '500' }}
                    >
                        🗑️ Delete Selected
                    </button>
                    <button
                        onClick={() => setSelectedIds(new Set())}
                        style={{ marginLeft: 'auto', padding: '6px 12px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '0.85em' }}
                    >
                        Clear
                    </button>
                </div>
            )}

            {loading && <div>Loading...</div>}
            {error && <div style={{ color: 'red' }}>{error}</div>}

            {!loading && !error && (
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                    {search && (
                        <div style={{ padding: '10px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.85em', color: '#64748b' }}>
                            Showing {filteredContacts.length} of {contacts.length} contacts
                        </div>
                    )}
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                        <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                            <tr>
                                <th scope="col" style={{ padding: '12px 15px', width: '40px' }}>
                                    <input
                                        type="checkbox"
                                        onChange={toggleSelectAll}
                                        checked={
                                            filteredContacts.slice((contactPage - 1) * contactPageSize, contactPage * contactPageSize).length > 0 &&
                                            filteredContacts.slice((contactPage - 1) * contactPageSize, contactPage * contactPageSize).every(c => selectedIds.has(c.id))
                                        }
                                        title="Select all on this page"
                                        style={{ cursor: 'pointer' }}
                                    />
                                </th>
                                <th scope="col" style={{ padding: '12px 15px', textAlign: 'left' }}>Name</th>
                                <th scope="col" style={{ padding: '12px 15px', textAlign: 'left' }}>Email</th>
                                <th scope="col" style={{ padding: '12px 15px', textAlign: 'left' }}>Mobile</th>
                                <th scope="col" style={{ padding: '12px 15px', textAlign: 'left' }}>Role/Dept</th>
                                <th scope="col" style={{ padding: '12px 15px', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredContacts.slice((contactPage - 1) * contactPageSize, contactPage * contactPageSize).map(c => (
                                <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9', background: selectedIds.has(c.id) ? '#f0fdf4' : undefined }}>
                                    <td style={{ padding: '12px 15px' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(c.id)}
                                            onChange={() => toggleSelect(c.id)}
                                            style={{ cursor: 'pointer' }}
                                        />
                                    </td>
                                    <td style={{ padding: '12px 15px', fontWeight: '500' }}>
                                        {c.name}
                                        {c.is_suppressed && (
                                            <span style={{ marginLeft: '6px', fontSize: '0.75em', padding: '2px 6px', background: '#fee2e2', color: '#991b1b', borderRadius: '4px' }}>Suppressed</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '12px 15px', color: '#64748b' }}>{c.email}</td>
                                    <td style={{ padding: '12px 15px', color: '#64748b' }}>{c.mobile}</td>
                                    <td style={{ padding: '12px 15px', fontSize: '0.9em' }}>
                                        <div style={{ fontWeight: '500' }}>{c.designation}</div>
                                        <div style={{ color: '#94a3b8' }}>{c.department}</div>
                                    </td>
                                    <td style={{ padding: '12px 15px', textAlign: 'right' }}>
                                        <button onClick={() => handleEdit(c)} aria-label={`Edit contact ${c.name}`} style={{ padding: '8px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', marginRight: '10px' }}>✏️</button>
                                        <button onClick={() => handleDelete(c.id)} aria-label={`Delete contact ${c.name}`} style={{ padding: '8px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', marginRight: '10px' }}>🗑️</button>
                                        <button onClick={() => handleOpenCallModal(c)} aria-label={`Call contact ${c.name} with AI agent`} title="Call with AI Agent" style={{ padding: '8px', color: '#10b981', background: 'none', border: 'none', cursor: 'pointer' }}>📞</button>
                                    </td>
                                </tr>
                            ))}
                            {filteredContacts.length === 0 && (
                                <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                                    {search ? `No contacts match "${search}".` : 'No contacts found.'}
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                    {filteredContacts.length > contactPageSize && (
                        <Pagination
                            currentPage={contactPage}
                            totalItems={filteredContacts.length}
                            pageSize={contactPageSize}
                            onPageChange={setContactPage}
                            onPageSizeChange={(size) => { setContactPageSize(size); setContactPage(1); }}
                            pageSizeOptions={[25, 50, 100]}
                            style={{ padding: '16px' }}
                        />
                    )}
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
