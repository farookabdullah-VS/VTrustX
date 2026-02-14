import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { useToast } from './common/Toast';
import { WhatsAppShareButton, SharePanel } from './common/WhatsAppShare';

export function SurveyDistribution({ formId, onBack, onNavigate }) {
    const toast = useToast();
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
                toast.success(`Successfully added ${newContactIds.length} contacts to the audience list! ` + (failCount > 0 ? `(${failCount} failed)` : ''));
            } catch (err) {
                toast.error("Failed to link contacts to survey: " + err.message);
            }
        } else {
            toast.warning("No valid contacts were processed to add.");
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
                    <div style={sidebarItemStyle(activeSidebar === 'whatsapp')} onClick={() => setActiveSidebar('whatsapp')}>
                        <span style={{ color: '#25D366', fontWeight: 'bold' }}>◉</span> WhatsApp
                    </div>
                    <div style={sidebarItemStyle(activeSidebar === 'telegram')} onClick={() => setActiveSidebar('telegram')}>
                        <span style={{ color: '#0088cc', fontWeight: 'bold' }}>✈</span> Telegram
                    </div>
                    <div style={sidebarItemStyle(activeSidebar === 'slack')} onClick={() => setActiveSidebar('slack')}>
                        <span style={{ color: '#611f69', fontWeight: 'bold' }}>#</span> Slack
                    </div>
                    <div style={sidebarItemStyle(activeSidebar === 'social')} onClick={() => setActiveSidebar('social')}>
                        <span>📱</span> Social Media
                    </div>
                </div>

                {/* MAIN AREA */}
                <div style={{ flex: 1, padding: '40px' }}>
                    {/* WhatsApp-dedicated tab */}
                    {activeSidebar === 'whatsapp' && formMetadata && (
                        <div>
                            <h2 style={{ color: '#1e293b', marginBottom: '8px' }}>WhatsApp Distribution</h2>
                            <p style={{ color: '#64748b', marginBottom: '24px' }}>Share your survey directly via WhatsApp — the most popular messaging app in Saudi Arabia.</p>

                            <SharePanel
                                url={`${window.location.origin}/s/${formMetadata.slug || formMetadata.id}`}
                                title={formMetadata.title || 'Survey'}
                                style={{ marginBottom: '24px' }}
                            />

                            <div style={{ background: 'white', padding: '30px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <h3 style={{ margin: '0 0 16px', fontSize: '1.05em', color: '#334155' }}>Quick Actions</h3>
                                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                    <WhatsAppShareButton
                                        url={`${window.location.origin}/s/${formMetadata.slug || formMetadata.id}`}
                                        title={formMetadata.title}
                                        variant="button"
                                    />
                                    <WhatsAppShareButton
                                        url={`${window.location.origin}/s/${formMetadata.slug || formMetadata.id}`}
                                        title={`📋 ${formMetadata.title}\n\nPlease take a moment to share your feedback!`}
                                        variant="button"
                                        style={{ background: '#128C7E' }}
                                    />
                                </div>
                                <p style={{ color: '#94a3b8', fontSize: '0.85em', marginTop: '16px' }}>
                                    Tip: In Saudi Arabia, WhatsApp has 98%+ penetration. Sharing via WhatsApp typically yields 3-5x higher response rates than email.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Telegram-dedicated tab */}
                    {activeSidebar === 'telegram' && formMetadata && (
                        <div>
                            <h2 style={{ color: '#1e293b', marginBottom: '8px' }}>Telegram Distribution</h2>
                            <p style={{ color: '#64748b', marginBottom: '24px' }}>Send survey invitations directly to your Telegram contacts via bot messaging.</p>

                            <div style={{ background: '#f1f9ff', padding: '20px', borderRadius: '12px', border: '1px solid #bfe3ff', marginBottom: '24px' }}>
                                <h3 style={{ margin: '0 0 12px', fontSize: '1em', color: '#0088cc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>ℹ️</span> Setup Required
                                </h3>
                                <p style={{ color: '#475569', margin: '0 0 12px', fontSize: '0.9em' }}>
                                    To send surveys via Telegram, you need to configure a Telegram Bot. Once configured, you can send survey invitations to contacts with Telegram Chat IDs.
                                </p>
                                <button
                                    onClick={() => window.location.href = '/telegram-config'}
                                    style={{
                                        background: '#0088cc',
                                        color: 'white',
                                        border: 'none',
                                        padding: '10px 20px',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                        fontSize: '0.9em'
                                    }}
                                >
                                    Configure Telegram Bot →
                                </button>
                            </div>

                            <div style={{ background: 'white', padding: '30px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <h3 style={{ margin: '0 0 16px', fontSize: '1.05em', color: '#334155' }}>How to Share Your Survey on Telegram</h3>

                                <div style={{ marginBottom: '30px' }}>
                                    <div style={{ fontSize: '0.9em', fontWeight: 'bold', color: '#475569', marginBottom: '10px' }}>Survey Link</div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <input
                                            readOnly
                                            value={`${window.location.origin}/s/${formMetadata.slug || formMetadata.id}`}
                                            style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155' }}
                                        />
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(`${window.location.origin}/s/${formMetadata.slug || formMetadata.id}`);
                                                toast.success("Link copied!");
                                            }}
                                            style={{ background: '#0088cc', color: 'white', border: 'none', padding: '0 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                                        >
                                            Copy
                                        </button>
                                    </div>
                                </div>

                                <div style={{ marginTop: '30px' }}>
                                    <h4 style={{ color: '#334155', fontSize: '0.95em', marginBottom: '12px' }}>Sharing Options:</h4>
                                    <ul style={{ color: '#64748b', fontSize: '0.9em', lineHeight: '1.8', paddingLeft: '20px' }}>
                                        <li><strong>Manual Sharing:</strong> Copy the link above and share it in your Telegram groups, channels, or direct messages</li>
                                        <li><strong>Bot Distribution:</strong> Import contacts with Telegram Chat IDs and send personalized invitations via your configured bot</li>
                                        <li><strong>Telegram Channels:</strong> Post the survey link in your Telegram channel for public access</li>
                                    </ul>
                                </div>

                                <div style={{ marginTop: '30px', padding: '20px', background: '#f8fafc', borderRadius: '8px' }}>
                                    <p style={{ color: '#475569', fontSize: '0.85em', margin: '0' }}>
                                        <strong>Tip:</strong> To get a contact's Chat ID, have them send a message to your bot. You can then retrieve their Chat ID from the bot updates and add it to your contact list.
                                    </p>
                                </div>

                                <div style={{ marginTop: '24px' }}>
                                    <a
                                        href={`https://t.me/share/url?url=${encodeURIComponent(`${window.location.origin}/s/${formMetadata.slug || formMetadata.id}`)}&text=${encodeURIComponent(formMetadata.title)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            padding: '12px 24px',
                                            background: '#0088cc',
                                            color: 'white',
                                            textDecoration: 'none',
                                            borderRadius: '8px',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        <span>✈</span>
                                        Share on Telegram
                                    </a>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Slack-dedicated tab */}
                    {activeSidebar === 'slack' && formMetadata && (
                        <div>
                            <h2 style={{ color: '#1e293b', marginBottom: '8px' }}>Slack Distribution</h2>
                            <p style={{ color: '#64748b', marginBottom: '24px' }}>Send survey invitations directly to your Slack workspace via bot messaging.</p>

                            <div style={{ background: '#fff8f3', padding: '20px', borderRadius: '12px', border: '1px solid #ffd9b3', marginBottom: '24px' }}>
                                <h3 style={{ margin: '0 0 12px', fontSize: '1em', color: '#611f69', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>ℹ️</span> Setup Required
                                </h3>
                                <p style={{ color: '#475569', margin: '0 0 12px', fontSize: '0.9em' }}>
                                    To send surveys via Slack, you need to configure a Slack Bot. Once configured, you can send survey invitations to channels and direct messages.
                                </p>
                                <button
                                    onClick={() => window.location.href = '/slack-config'}
                                    style={{
                                        background: '#611f69',
                                        color: 'white',
                                        border: 'none',
                                        padding: '10px 20px',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                        fontSize: '0.9em'
                                    }}
                                >
                                    Configure Slack Bot →
                                </button>
                            </div>

                            <div style={{ background: 'white', padding: '30px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <h3 style={{ margin: '0 0 16px', fontSize: '1.05em', color: '#334155' }}>How to Share Your Survey on Slack</h3>

                                <div style={{ marginBottom: '30px' }}>
                                    <div style={{ fontSize: '0.9em', fontWeight: 'bold', color: '#475569', marginBottom: '10px' }}>Survey Link</div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <input
                                            readOnly
                                            value={`${window.location.origin}/s/${formMetadata.slug || formMetadata.id}`}
                                            style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155' }}
                                        />
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(`${window.location.origin}/s/${formMetadata.slug || formMetadata.id}`);
                                                toast.success("Link copied!");
                                            }}
                                            style={{ background: '#611f69', color: 'white', border: 'none', padding: '0 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                                        >
                                            Copy
                                        </button>
                                    </div>
                                </div>

                                <div style={{ marginTop: '30px' }}>
                                    <h4 style={{ color: '#334155', fontSize: '0.95em', marginBottom: '12px' }}>Sharing Options:</h4>
                                    <ul style={{ color: '#64748b', fontSize: '0.9em', lineHeight: '1.8', paddingLeft: '20px' }}>
                                        <li><strong>Manual Sharing:</strong> Copy the link above and share it in your Slack channels or direct messages</li>
                                        <li><strong>Bot Distribution:</strong> Import contacts with Slack User IDs or Channel IDs and send personalized invitations via your configured bot</li>
                                        <li><strong>Slack Channels:</strong> Post the survey link in your workspace channels for team-wide access</li>
                                        <li><strong>Block Kit Messages:</strong> Surveys are sent with rich formatting and interactive buttons for better engagement</li>
                                    </ul>
                                </div>

                                <div style={{ marginTop: '30px', padding: '20px', background: '#f8fafc', borderRadius: '8px' }}>
                                    <p style={{ color: '#475569', fontSize: '0.85em', margin: '0' }}>
                                        <strong>Tip:</strong> User IDs start with 'U' (e.g., U01234567) and Channel IDs start with 'C' (e.g., C01234567). You can find these by right-clicking on users/channels in Slack.
                                    </p>
                                </div>

                                <div style={{ marginTop: '24px' }}>
                                    <button
                                        onClick={() => {
                                            const slackMessage = `Check out this survey: ${formMetadata.title}\n${window.location.origin}/s/${formMetadata.slug || formMetadata.id}`;
                                            navigator.clipboard.writeText(slackMessage);
                                            toast.success("Message copied! Paste it in Slack.");
                                        }}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            padding: '12px 24px',
                                            background: '#611f69',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <span>#</span>
                                        Copy Message for Slack
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

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
                                                toast.success("Link copied!");
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
                    {activeSidebar === 'link' && formMetadata && (
                        <div>
                            <h2 style={{ color: '#1e293b', marginBottom: '20px' }}>Web Link</h2>
                            <SharePanel
                                url={`${window.location.origin}/s/${formMetadata.slug || formMetadata.id}`}
                                title={formMetadata.title || 'Survey'}
                            />
                        </div>
                    )}
                    {activeSidebar === 'link' && !formMetadata && <div style={{ fontSize: '1.2em', color: '#64748b' }}>Loading...</div>}
                    {activeSidebar === 'email' && <div style={{ fontSize: '1.2em', color: '#64748b' }}>Email Campaign Manager (Coming Soon)</div>}
                </div>
            </div>

            {/* Floating WhatsApp FAB — always visible */}
            {formMetadata && (
                <WhatsAppShareButton
                    url={`${window.location.origin}/s/${formMetadata.slug || formMetadata.id}`}
                    title={formMetadata.title}
                    variant="fab"
                />
            )}
        </div>
    );
}
