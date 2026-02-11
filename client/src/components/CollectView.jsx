import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { useTranslation } from 'react-i18next';
import { useToast } from './common/Toast';

export function CollectView({ form, onBack }) {
    const { t, i18n } = useTranslation();
    const toast = useToast();
    const isRtl = i18n.language === 'ar';
    const [activeTab, setActiveTab] = useState('link');
    const [showLogo, setShowLogo] = useState(true);
    const [copied, setCopied] = useState(false);

    // Email State
    const [masterContacts, setMasterContacts] = useState([]);
    const [loadingContacts, setLoadingContacts] = useState(false);
    const [recipients, setRecipients] = useState('');

    // Derived from form prop but needs to be state for editing
    const [emailSubject, setEmailSubject] = useState(form ? `Complete survey: ${form.title}` : '');
    const [emailBody, setEmailBody] = useState('');

    // Update body when form changes if empty
    React.useEffect(() => {
        if (form && !emailBody) {
            const code = form.slug || form.id;
            const url = `${window.location.origin}/s/${code}`;
            setEmailBody(`Hello,\n\nI would appreciate it if you could take a few minutes to complete this survey:\n\n${url}\n\nThank you for your feedback!`);
            setEmailSubject(`Complete survey: ${form.title}`);
        }
    }, [form]);

    if (!form) return null;

    // Simulated Share URL
    // Use slug if available, otherwise ID. 
    // Format: /s/SLUG or /s/ID
    const code = form.slug || form.id;
    const shareUrl = `${window.location.origin}/s/${code}`;
    const embedCode = `<iframe src="${shareUrl}?mode=embed" width="100%" height="600" frameborder="0"></iframe>`;

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handlePrint = () => {
        // In a real app, this would open a print-optimized version of the survey
        toast.info("Preparing PDF for Print... (This would trigger browser print on the survey page)");
    };

    // Styles
    const containerStyle = {
        padding: '30px',
        maxWidth: '1000px',
        margin: '0 auto',
        fontFamily: "'Outfit', sans-serif",
        color: '#1e293b',
        direction: isRtl ? 'rtl' : 'ltr'
    };

    const tabListStyle = {
        display: 'flex',
        gap: '20px',
        borderBottom: '1px solid #e2e8f0',
        marginBottom: '30px'
    };

    const tabStyle = (id) => ({
        padding: '12px 24px',
        cursor: 'pointer',
        fontWeight: '600',
        color: activeTab === activeTab ? (activeTab === id ? 'var(--primary-color, #b91c1c)' : 'var(--text-muted, #64748b)') : 'var(--text-muted, #64748b)',
        borderBottom: activeTab === id ? '2px solid var(--primary-color, #b91c1c)' : '2px solid transparent',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    });

    const cardStyle = {
        background: 'white',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '40px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
        minHeight: '400px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center'
    };

    return (
        <div style={containerStyle}>
            <button onClick={onBack} style={{ marginBottom: '20px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '1em' }}>
                {isRtl ? '➡' : '⬅'} {t('settings.back')}
            </button>

            <div style={{ marginBottom: '30px' }}>
                <h1 style={{ fontSize: '2em', marginBottom: '8px' }}>{t('collect.title')}</h1>
                <p style={{ color: '#64748b' }}>{t('collect.subtitle')} <strong>{form.title}</strong></p>
            </div>

            <div style={tabListStyle}>
                <div style={tabStyle('link')} onClick={() => setActiveTab('link')}>🔗 {t('collect.tab.link')}</div>
                <div style={tabStyle('qr')} onClick={() => setActiveTab('qr')}>📱 {t('collect.tab.qr')}</div>
                <div style={tabStyle('email')} onClick={() => setActiveTab('email')}>✉️ {t('collect.tab.email')}</div>
                <div style={tabStyle('embed')} onClick={() => setActiveTab('embed')}>💻 {t('collect.tab.embed')}</div>
                <div style={tabStyle('print')} onClick={() => setActiveTab('print')}>🖨️ {t('collect.tab.print')}</div>
            </div>

            <div style={cardStyle}>

                {activeTab === 'link' && (
                    <div style={{ maxWidth: '500px', width: '100%' }}>
                        <div style={{ fontSize: '4em', marginBottom: '20px' }}>🔗</div>
                        <h3 style={{ marginBottom: '10px' }}>{t('collect.link.title')}</h3>
                        <p style={{ color: '#64748b', marginBottom: '30px' }}>{t('collect.link.subtitle')}</p>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input
                                type="text"
                                readOnly
                                value={shareUrl}
                                style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569' }}
                            />
                            <button
                                onClick={() => handleCopy(shareUrl)}
                                style={{ background: copied ? 'var(--success-color, #22c55e)' : 'var(--primary-color, #b91c1c)', color: 'white', border: 'none', padding: '0 24px', borderRadius: '8px', fontWeight: '600', transition: 'background 0.2s' }}
                            >
                                {copied ? t('collect.link.copied') : t('collect.link.copy')}
                            </button>
                        </div>

                        {/* Batch Generation Section */}
                        <div style={{ marginTop: '40px', paddingTop: '30px', borderTop: '1px solid #e2e8f0', textAlign: 'left' }}>
                            <h4 style={{ fontSize: '1.2em', marginBottom: '15px' }}>Batch Link Generation</h4>
                            <p style={{ color: '#64748b', fontSize: '0.9em', marginBottom: '20px' }}>Generate multiple unique links for tracking individual respondents. Export as CSV.</p>

                            <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9em' }}>Number of Links</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="1000"
                                        defaultValue="50"
                                        id="batchSize"
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                    />
                                </div>
                                <button
                                    onClick={() => {
                                        const count = document.getElementById('batchSize').value;
                                        if (count < 1) return;

                                        let csvContent = "data:text/csv;charset=utf-8,Link,UniqueCode\n";
                                        const baseUrl = window.location.origin;
                                        const formCode = form.slug || form.id;

                                        for (let i = 0; i < count; i++) {
                                            const uniqueId = Math.random().toString(36).substring(2, 8).toUpperCase(); // Shortened UID to 6 chars
                                            // Format: DOMAIN/s/SLUG/UID
                                            const url = `${baseUrl}/s/${formCode}/${uniqueId}`;
                                            csvContent += `${url},${uniqueId}\n`;
                                        }

                                        const encodedUri = encodeURI(csvContent);
                                        const link = document.createElement("a");
                                        link.setAttribute("href", encodedUri);
                                        link.setAttribute("download", `${form.title.replace(/ /g, '_')}_LINKS.csv`);
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                    }}
                                    style={{ padding: '11px 24px', background: 'var(--primary-color, #b91c1c)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                                >
                                    📥 Generate & Export CSV
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'qr' && (
                    <div>
                        <div style={{ background: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
                            <QRCodeSVG
                                value={shareUrl}
                                size={200}
                                level={"H"}
                                imageSettings={showLogo ? {
                                    src: "/vite.svg", // TODO: Use real logo
                                    x: undefined,
                                    y: undefined,
                                    height: 40,
                                    width: 40,
                                    excavate: true,
                                } : undefined}
                            />
                        </div>
                        <h3 style={{ marginBottom: '10px' }}>{t('collect.qr.scan')}</h3>
                        <p style={{ color: '#64748b' }}>{t('collect.qr.desc')}</p>

                        <div style={{ margin: '15px 0' }}>
                            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                <input type="checkbox" checked={showLogo} onChange={e => setShowLogo(e.target.checked)} />
                                <span>Include Logo</span>
                            </label>
                        </div>


                        <button style={{ marginTop: '10px', padding: '10px 20px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer' }}>{t('collect.qr.download')}</button>
                    </div>
                )}

                {activeTab === 'email' && (
                    <div style={{ maxWidth: '600px', width: '100%', textAlign: isRtl ? 'right' : 'left' }}>
                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            <div style={{ fontSize: '4em', marginBottom: '10px' }}>✉️</div>
                            <h3 style={{ marginBottom: '10px' }}>{t('collect.email.title')}</h3>
                            <p style={{ color: '#64748b' }}>{t('collect.email.desc')}</p>
                        </div>

                        {/* Recipient Selection */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>{t('collect.email.recipients')}</label>

                            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                                <select
                                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            const email = e.target.value;
                                            setRecipients(prev => prev ? prev + ', ' + email : email);
                                            e.target.value = ''; // Reset selection
                                        }
                                    }}
                                >
                                    <option value="">Select from Contacts Master...</option>
                                    {masterContacts.map(c => c.email && (
                                        <option key={c.id} value={c.email}>
                                            {c.name} ({c.email})
                                        </option>
                                    ))}
                                </select>
                                <button
                                    onClick={() => {
                                        setLoadingContacts(true);
                                        axios.get('/api/contacts').then(res => {
                                            setMasterContacts(res.data);
                                            setLoadingContacts(false);
                                            toast.success(`Loaded ${res.data.length} contacts.`);
                                        }).catch(err => {
                                            toast.error("Failed to load contacts");
                                            setLoadingContacts(false);
                                        });
                                    }}
                                    style={{ padding: '0 12px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer' }}
                                    title="Refresh Contacts"
                                >
                                    {loadingContacts ? '⏳' : '🔄'}
                                </button>

                                <button
                                    onClick={() => {
                                        document.getElementById('import-file').click();
                                    }}
                                    style={{ padding: '0 16px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer' }}
                                    title="Import CSV/Excel"
                                >
                                    📂 Import
                                </button>
                                <input
                                    type="file"
                                    id="import-file"
                                    style={{ display: 'none' }}
                                    accept=".csv,.xlsx,.xls"
                                    onChange={(e) => {
                                        const file = e.target.files[0];
                                        if (file) {
                                            const reader = new FileReader();
                                            reader.onload = (evt) => {
                                                const bstr = evt.target.result;
                                                const wb = XLSX.read(bstr, { type: 'binary' });
                                                const wsname = wb.SheetNames[0];
                                                const ws = wb.Sheets[wsname];
                                                const data = XLSX.utils.sheet_to_json(ws);

                                                const emails = data.map(r => r.Email || r.email).filter(e => e);
                                                setRecipients(prev => prev ? prev + ', ' + emails.join(', ') : emails.join(', '));
                                                toast.success(`Imported ${emails.length} emails.`);
                                            };
                                            reader.readAsBinaryString(file);
                                        }
                                    }}
                                />

                                <button
                                    onClick={() => {
                                        const ws = XLSX.utils.json_to_sheet([{ Name: "John Doe", Email: "john@example.com" }]);
                                        const wb = XLSX.utils.book_new();
                                        XLSX.utils.book_append_sheet(wb, ws, "Contacts");
                                        XLSX.writeFile(wb, "Contact_Template.xlsx");
                                    }}
                                    style={{ padding: '0 16px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer' }}
                                    title="Download Template"
                                >
                                    ⬇️ Template
                                </button>
                            </div>

                            <textarea
                                value={recipients}
                                onChange={(e) => setRecipients(e.target.value)}
                                placeholder="recipient@example.com, another@example.com"
                                style={{ width: '100%', height: '80px', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontFamily: 'inherit' }}
                            />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>{t('collect.email.subject')}</label>
                            <input
                                type="text"
                                value={emailSubject}
                                onChange={(e) => setEmailSubject(e.target.value)}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                            />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>{t('collect.email.body')}</label>
                            <textarea
                                value={emailBody}
                                onChange={(e) => setEmailBody(e.target.value)}
                                style={{ width: '100%', height: '150px', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontFamily: 'inherit', resize: 'vertical' }}
                            />
                            <div style={{ fontSize: '0.8em', color: '#64748b', marginTop: '5px' }}>
                                💡 Tip: The system will automatically generate a <strong>unique</strong> short link for each recipient.
                                <br />Ensure your message is generic enough to apply to all recipients.
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                if (!recipients) { toast.warning("Please add recipients"); return; }

                                const recipientList = recipients.split(',').map(e => e.trim()).filter(e => e);
                                if (recipientList.length === 0) { toast.warning("No valid email addresses found."); return; }

                                const baseUrl = window.location.origin;
                                const formCode = form.slug || form.id;
                                const sentLog = [];
                                const backendPayload = [];

                                recipientList.forEach(email => {
                                    // Generate Unique ID per user for tracking
                                    const uniqueId = Math.random().toString(36).substring(2, 8).toUpperCase();
                                    const uniqueUrl = `${baseUrl}/s/${formCode}/${uniqueId}`;

                                    // Replace the generic link in the body with the unique one
                                    let personalizedBody = emailBody;
                                    const genericUrl = `${baseUrl}/s/${formCode}`;

                                    if (personalizedBody.includes(genericUrl)) {
                                        personalizedBody = personalizedBody.replace(genericUrl, uniqueUrl);
                                    } else {
                                        // Fallback if user deleted the link placeholder
                                        personalizedBody += `\n\nLink: ${uniqueUrl}`;
                                    }

                                    sentLog.push({ email, uniqueId, link: uniqueUrl });
                                    backendPayload.push({ to: email, body: personalizedBody });
                                    console.log(`Prepared for ${email}:`, uniqueUrl);
                                });

                                // Send to Backend
                                const confirmMsg = `Ready to send to ${sentLog.length} recipients?\n\n(If SMTP is not configured, this will be logged to server console)`;
                                if (!confirm(confirmMsg)) return;

                                axios.post('/api/email/send', {
                                    recipients: backendPayload,
                                    subject: emailSubject
                                }).then(res => {
                                    // Mock Send Confirmation / Final Report
                                    const logMessage = sentLog.map(l => `${l.email} -> ${l.link}`).join('\n');
                                    toast.success(`Success! Server Response: ${res.data.message}`);
                                }).catch(err => {
                                    console.error(err);
                                    toast.error("Failed to send emails: " + (err.response?.data?.error || err.message));
                                });
                            }}
                            style={{ width: '100%', padding: '12px', background: 'var(--primary-color, #b91c1c)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                        >
                            {t('collect.email.send')}
                        </button>
                    </div>
                )}

                {activeTab === 'embed' && (
                    <div style={{ maxWidth: '600px', width: '100%' }}>
                        <div style={{ fontSize: '4em', marginBottom: '20px' }}>💻</div>
                        <h3 style={{ marginBottom: '10px' }}>{t('collect.embed.title')}</h3>
                        <p style={{ color: '#64748b', marginBottom: '30px' }}>{t('collect.embed.desc')}</p>

                        <div style={{ position: 'relative' }}>
                            <textarea
                                readOnly
                                value={embedCode}
                                style={{ width: '100%', height: '100px', padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', fontFamily: 'monospace', resize: 'none' }}
                            />
                            <button
                                onClick={() => handleCopy(embedCode)}
                                style={{ position: 'absolute', bottom: '10px', right: '10px', background: copied ? 'var(--success-color, #22c55e)' : 'var(--primary-color, #b91c1c)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.9em', cursor: 'pointer' }}
                            >
                                {copied ? t('collect.link.copied') : t('collect.link.copy')}
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'print' && (
                    <div style={{ maxWidth: '400px' }}>
                        <div style={{ fontSize: '4em', marginBottom: '20px' }}>🖨️</div>
                        <h3 style={{ marginBottom: '10px' }}>{t('collect.print.title')}</h3>
                        <p style={{ color: '#64748b', marginBottom: '30px' }}>{t('collect.print.desc')}</p>
                        <button onClick={handlePrint} style={{ padding: '12px 30px', background: '#334155', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', margin: '0 auto' }}>
                            <span>🖨️</span> {t('collect.print.btn')}
                        </button>
                    </div>
                )}

            </div>
        </div >
    );
}
