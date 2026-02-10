import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';

export function SurveyDistribution({ formId, onBack, onNavigate }) {
    const [formMetadata, setFormMetadata] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeSidebar, setActiveSidebar] = useState('audience'); // audience, link, email
    const [audienceData, setAudienceData] = useState([]);
    const [importStats, setImportStats] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                if (formId) {
                    const res = await axios.get(`/api/forms/${formId}`);
                    setFormMetadata(res.data);
                }
                setLoading(false);
            } catch (err) {
                console.error("Data load error:", err);
                setLoading(false);
            }
        };
        fetchData();
    }, [formId]);

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

            // Standardize data (look for email, name, etc.)
            const processed = data.map((row, idx) => ({
                id: idx + 1,
                name: row.Name || row.name || row['Full Name'] || 'Unknown',
                email: row.Email || row.email || row['E-mail'] || '',
                phone: row.Phone || row.phone || row['Mobile'] || '',
                ...row
            }));

            setAudienceData(processed);
            setImportStats({ total: processed.length, fileName: file.name });
        };
        reader.readAsBinaryString(file);
    };

    const navLinkStyle = (active) => ({
        padding: '0 15px',
        color: active ? '#2563eb' : '#64748b',
        fontWeight: active ? '600' : '500',
        cursor: 'pointer',
        textDecoration: 'none',
        borderBottom: active ? '2px solid #2563eb' : 'none',
        height: '100%',
        display: 'flex',
        alignItems: 'center'
    });

    const sidebarItemStyle = (active) => ({
        padding: '12px 20px',
        cursor: 'pointer',
        color: active ? '#2563eb' : '#64748b',
        fontWeight: active ? '600' : 'normal',
        background: active ? '#eff6ff' : 'transparent',
        borderRight: active ? '3px solid #2563eb' : 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
    });

    const handleSaveAudience = async () => {
        if (!audienceData || audienceData.length === 0) return;

        if (!confirm(`Are you sure you want to add ${audienceData.length} contacts to this survey's distribution list?`)) return;

        setLoading(true);
        let successCount = 0;
        let failCount = 0;
        const newContactIds = [];

        // 1. Create/Find Contacts in Global Master
        // We do this sequentially to capture IDs. 
        // Improvement: Backend could handle "Bulk Upsert"
        for (const contact of audienceData) {
            try {
                // Determine display name
                const contactName = contact.name || contact.Name || contact['Full Name'] || 'Unknown';
                // Minimal payload
                const payload = {
                    name: contactName,
                    email: contact.email || contact.Email || '',
                    mobile: contact.phone || contact.Phone || contact.mobile || '',
                    designation: contact.designation || contact.Designation || '',
                    department: contact.department || contact.Department || ''
                };

                // POST to create
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

        // 2. Add to Survey Audience
        if (newContactIds.length > 0) {
            try {
                await axios.post(`/api/form-audience/${formId}/add`, {
                    contactIds: newContactIds
                });
                alert(`Successfully added ${newContactIds.length} contacts to the audience list! ` + (failCount > 0 ? `(${failCount} failed)` : ''));
            } catch (err) {
                alert("Failed to link contacts to survey: " + err.message);
            }
        } else {
            alert("No valid contacts were processed to add.");
        }

        setLoading(false);
        setAudienceData([]);
        setImportStats(null);
    };

    return (
        <div style={{ background: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'Outfit', sans-serif" }}>
            {/* TOP NAVIGATION */}
            <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', height: '60px', display: 'flex', alignItems: 'center', padding: '0 30px', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button onClick={onBack} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2em', color: '#64748b' }}>←</button>
                    <div style={{ fontWeight: 'bold', fontSize: '1.1em', color: '#0f172a' }}>{formMetadata?.title || 'SmartReach'}</div>
                    <div style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8em', marginLeft: '10px' }}>ID: {formId}</div>
                </div>
                <div style={{ display: 'flex', height: '100%', gap: '20px' }}>
                    <div style={navLinkStyle(false)} onClick={() => onNavigate && onNavigate('builder')}>Questionnaire</div>
                    <div style={navLinkStyle(false)} onClick={() => onNavigate && onNavigate('settings')}>Settings</div>
                    <div style={navLinkStyle(true)}>Get Responses</div>
                    <div style={navLinkStyle(false)} onClick={() => onNavigate && onNavigate('results')}>Results</div>
                </div>
                <div style={{ width: '32px' }}></div> {/* Spacer */}
            </div>

            <div style={{ display: 'flex', flex: 1 }}>
                {/* SIDEBAR */}
                <div style={{ width: '250px', background: 'white', borderRight: '1px solid #e2e8f0', padding: '20px 0' }}>
                    <div style={{ padding: '0 20px 20px', fontSize: '1.2em', fontWeight: 'bold', color: '#334155' }}>SmartReach</div>
                    <div style={sidebarItemStyle(activeSidebar === 'link')} onClick={() => setActiveSidebar('link')}>
                        <span>🔗</span> Web Link
                    </div>
                    <div style={sidebarItemStyle(activeSidebar === 'audience')} onClick={() => setActiveSidebar('audience')}>
                        <span>👥</span> Audience / Import
                    </div>
                    <div style={sidebarItemStyle(activeSidebar === 'email')} onClick={() => setActiveSidebar('email')}>
                        <span>📧</span> Email Campaign
                    </div>
                    <div style={sidebarItemStyle(activeSidebar === 'social')} onClick={() => setActiveSidebar('social')}>
                        <span>📱</span> Social Media
                    </div>
                </div>

                {/* MAIN AREA */}
                <div style={{ flex: 1, padding: '40px' }}>
                    {activeSidebar === 'social' && formMetadata && (
                        <div>
                            <h2 style={{ color: '#1e293b', marginBottom: '20px' }}>Share on Social Media</h2>
                            <div style={{ background: 'white', padding: '30px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <p style={{ color: '#64748b', marginBottom: '30px' }}>Post your survey directly to your social networks or copy the link.</p>

                                <div style={{ marginBottom: '30px' }}>
                                    <div style={{ fontSize: '0.9em', fontWeight: 'bold', color: '#475569', marginBottom: '10px' }}>Public Link</div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <input
                                            readOnly
                                            value={`${window.location.origin}/s/${formMetadata.slug || formMetadata.id}`}
                                            style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155' }}
                                        />
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(`${window.location.origin}/s/${formMetadata.slug || formMetadata.id}`);
                                                alert("Link copied!");
                                            }}
                                            style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                                        >
                                            Copy
                                        </button>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
                                    <a
                                        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${window.location.origin}/s/${formMetadata.slug || formMetadata.id}`)}`}
                                        target="_blank" rel="noopener noreferrer"
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '15px', background: '#0077b5', color: 'white', textDecoration: 'none', borderRadius: '8px', fontWeight: 'bold' }}
                                    >
                                        Linked In
                                    </a>
                                    <a
                                        href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(`${window.location.origin}/s/${formMetadata.slug || formMetadata.id}`)}&text=${encodeURIComponent(formMetadata.title || 'Check out this survey')}`}
                                        target="_blank" rel="noopener noreferrer"
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '15px', background: '#000000', color: 'white', textDecoration: 'none', borderRadius: '8px', fontWeight: 'bold' }}
                                    >
                                        X (Twitter)
                                    </a>
                                    <a
                                        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}/s/${formMetadata.slug || formMetadata.id}`)}`}
                                        target="_blank" rel="noopener noreferrer"
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '15px', background: '#1877f2', color: 'white', textDecoration: 'none', borderRadius: '8px', fontWeight: 'bold' }}
                                    >
                                        Facebook
                                    </a>
                                    <a
                                        href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`${formMetadata.title} - ${window.location.origin}/s/${formMetadata.slug || formMetadata.id}`)}`}
                                        target="_blank" rel="noopener noreferrer"
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '15px', background: '#25D366', color: 'white', textDecoration: 'none', borderRadius: '8px', fontWeight: 'bold' }}
                                    >
                                        WhatsApp
                                    </a>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeSidebar === 'audience' && (
                        <div>
                            <h2 style={{ color: '#1e293b', marginBottom: '20px' }}>Survey Audience</h2>

                            {/* Import Box */}
                            <div style={{ background: 'white', padding: '30px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '30px' }}>
                                <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1em' }}>Import from File</h3>
                                <p style={{ color: '#64748b', marginBottom: '20px' }}>
                                    Upload an Excel or CSV file containing your audience data. We'll automatically map columns for Name, Email, and Phone.
                                </p>
                                <div style={{ border: '2px dashed #cbd5e1', borderRadius: '8px', padding: '40px', textAlign: 'center', background: '#f8fafc' }}>
                                    <input
                                        type="file"
                                        accept=".csv, .xlsx, .xls"
                                        onChange={handleFileUpload}
                                        style={{ display: 'none' }}
                                        id="audience-upload"
                                    />
                                    <label htmlFor="audience-upload">
                                        <div style={{ fontSize: '3em', marginBottom: '10px' }}>📂</div>
                                        <button style={{ pointerEvents: 'none', background: '#3b82f6', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: '500', cursor: 'pointer' }}>
                                            Select File
                                        </button>
                                        <div style={{ marginTop: '10px', fontSize: '0.9em', color: '#94a3b8' }}>Supports .xlsx, .xls, .csv</div>
                                    </label>
                                </div>
                            </div>

                            {/* Data Preview */}
                            {importStats && (
                                <div style={{ background: 'white', padding: '30px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                        <div>
                                            <h3 style={{ margin: 0 }}>Import Preview</h3>
                                            <span style={{ fontSize: '0.9em', color: '#166534', background: '#dcfce7', padding: '2px 8px', borderRadius: '4px' }}>
                                                {importStats.total} contacts found in {importStats.fileName}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button
                                                onClick={() => { setAudienceData([]); setImportStats(null); }}
                                                style={{ padding: '10px 20px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: 'transparent', cursor: 'pointer' }}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleSaveAudience}
                                                style={{ background: '#0f172a', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: '500', cursor: 'pointer' }}
                                            >
                                                {loading ? 'Saving...' : 'Save to Distribution List'}
                                            </button>
                                        </div>
                                    </div>

                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95em' }}>
                                            <thead style={{ background: '#f1f5f9', color: '#475569', textAlign: 'left' }}>
                                                <tr>
                                                    <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>#</th>
                                                    <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>Name</th>
                                                    <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>Email</th>
                                                    <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>Phone</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {audienceData.slice(0, 50).map((row, i) => (
                                                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                        <td style={{ padding: '12px', color: '#94a3b8' }}>{row.id}</td>
                                                        <td style={{ padding: '12px', fontWeight: '500' }}>{row.name}</td>
                                                        <td style={{ padding: '12px', color: '#3b82f6' }}>{row.email}</td>
                                                        <td style={{ padding: '12px' }}>{row.phone}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {audienceData.length > 50 && (
                                            <div style={{ padding: '15px', textAlign: 'center', color: '#64748b', fontStyle: 'italic', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                                                ...and {audienceData.length - 50} more
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    {activeSidebar === 'link' && <div style={{ fontSize: '1.2em', color: '#64748b' }}>Web Link Distribution (Coming Soon)</div>}
                    {activeSidebar === 'email' && <div style={{ fontSize: '1.2em', color: '#64748b' }}>Email Campaign Manager (Coming Soon)</div>}
                </div>
            </div>
        </div>
    );
}
