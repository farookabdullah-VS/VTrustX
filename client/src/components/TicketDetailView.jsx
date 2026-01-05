import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

export function TicketDetailView({ ticketId, onBack }) {
    const { t, i18n } = useTranslation();
    const isRtl = i18n.language === 'ar';
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('details'); // Default to Details as per request context
    const [sidebarTab, setSidebarTab] = useState('properties');

    // Chat Application State
    const [newMessage, setNewMessage] = useState('');
    const [msgType, setMsgType] = useState('public');
    const [auditLogs, setAuditLogs] = useState([]);
    const messagesEndRef = useRef(null);

    // Edit State
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({});
    const [users, setUsers] = useState([]);

    useEffect(() => {
        loadTicket();
        loadUsers();
    }, [ticketId]);

    useEffect(() => {
        if (sidebarTab === 'history' && ticketId) {
            fetchAuditLogs();
        }
    }, [sidebarTab, ticketId]);

    const loadUsers = () => {
        axios.get('/api/users')
            .then(res => setUsers(res.data))
            .catch(err => console.error("Failed to load users", err));
    };

    const loadTicket = () => {
        setLoading(true);
        axios.get(`/api/crm/tickets/${ticketId}`)
            .then(res => {
                setTicket(res.data);
                // Initialize edit data with all potential fields
                setEditData({
                    subject: res.data.subject,
                    description: res.data.description,
                    issue: res.data.issue || '',
                    analysis: res.data.analysis || '',
                    solution: res.data.solution || '',
                    request_type: res.data.request_type || '',
                    impact: res.data.impact || '',
                    status: res.data.status,
                    mode: res.data.mode || '',
                    level: res.data.level || '',
                    urgency: res.data.urgency || '',
                    priority: res.data.priority,
                    group_name: res.data.group_name || '',
                    category: res.data.category || '',
                    assets: res.data.assets || '',
                    assigned_user_id: res.data.assigned_user_id
                });
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    };

    const fetchAuditLogs = () => {
        axios.get(`/api/crm/tickets/${ticketId}/audit`)
            .then(res => setAuditLogs(res.data))
            .catch(err => console.error("Failed to load audit logs", err));
    };

    const handleUpdate = async () => {
        try {
            await axios.put(`/api/crm/tickets/${ticketId}`, editData);
            setTicket(prev => ({ ...prev, ...editData }));
            setIsEditing(false);
            // If user changed, update local display name lookup if needed
            if (editData.assigned_user_id) {
                const u = users.find(x => x.id == editData.assigned_user_id);
                if (u) loadTicket(); // Reload to get joined names if backend handles it, or just update local
            }
        } catch (err) {
            alert("Failed to update ticket");
        }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim()) return;
        try {
            await axios.post(`/api/crm/tickets/${ticketId}/messages`, {
                body: newMessage,
                type: msgType,
                user_id: 1 // Mock user
            });
            setNewMessage('');
            loadTicket();
        } catch (err) {
            alert("Failed to send message");
        }
    };

    if (loading) return <div className="p-10 flex justify-center text-slate-500">Loading Ticket...</div>;
    if (!ticket) return <div className="p-10 text-red-500">Ticket Not Found</div>;

    // Helper for status colors
    const getStatusColor = (s) => {
        switch (s) {
            case 'open': return '#ef4444'; // Red for Open (as in screenshot)
            case 'new': return '#3b82f6';
            case 'resolved': return '#22c55e';
            default: return '#64748b';
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#ffffff', fontFamily: "'Inter', sans-serif", color: '#000000' }}>

            {/* TOP ACTIONS BAR */}
            <div style={{ padding: '10px 20px', background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={onBack} style={btnStyle('light')}>← Back</button>
                    <button onClick={() => setIsEditing(!isEditing)} style={btnStyle('light')}>{isEditing ? 'Cancel Edit' : 'Edit'}</button>
                    {isEditing && <button onClick={handleUpdate} style={btnStyle('primary')}>Save Changes</button>}
                    {!isEditing && (
                        <>
                            <button style={btnStyle('light')}>Close</button>
                            <button style={btnStyle('light')}>Pick up</button>
                            <button style={btnStyle('light')}>Assign</button>
                            <button style={btnStyle('light')}>Print</button>
                        </>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button style={btnStyle('light')}>Actions v</button>
                </div>
            </div>

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                {/* MAIN CONTENT AREA */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '20px' }}>

                    {/* TICKET HEADER CARD */}
                    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', marginBottom: '20px', display: 'flex', gap: '20px' }}>
                        {/* ICON */}
                        <div style={{ width: '40px', height: '40px', background: '#f59e0b', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.2em' }}>
                            🎫
                        </div>
                        {/* INFO */}
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h1 style={{ margin: 0, fontSize: '1.4em', fontWeight: '600', color: '#0f172a' }}>
                                    #{ticket.ticket_code && ticket.ticket_code.split('-')[1] || ticket.id} {ticket.subject}
                                </h1>
                                <button style={btnStyle('light')}>↩ Reply All v</button>
                            </div>
                            <div style={{ marginTop: '10px', display: 'flex', gap: '15px', fontSize: '0.9em', color: '#64748b', alignItems: 'center' }}>
                                <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px', fontSize: '0.85em' }}>Incident Request</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    Priority: <span style={{ color: '#ef4444', fontWeight: 'bold' }}>■ {ticket.priority ? ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1) : '-'}</span>
                                </div>
                                <div>Requested By <span style={{ color: '#2563eb', cursor: 'pointer' }}>{ticket.contact_name || 'Unknown'}</span> on {new Date(ticket.created_at).toLocaleString()}</div>
                            </div>
                        </div>
                    </div>

                    {/* TABS */}
                    <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '20px', background: 'none' }}>
                        {['Conversations', 'Details', 'Approvals', 'Tasks', 'History'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab.toLowerCase())}
                                style={{
                                    padding: '10px 20px',
                                    borderBottom: activeTab === tab.toLowerCase() ? '2px solid #2563eb' : '2px solid transparent',
                                    color: activeTab === tab.toLowerCase() ? '#2563eb' : '#64748b',
                                    fontWeight: activeTab === tab.toLowerCase() ? '600' : '500',
                                    background: 'none',
                                    borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* TAB CONTENT */}
                    <div style={{ flex: 1 }}>

                        {/* DETAILS TAB */}
                        {activeTab === 'details' && (
                            <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '30px' }}>
                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <button style={{ color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9em' }}>👁 Hide Empty Fields</button>
                                </div>

                                {/* Section: Description */}
                                <div style={{ marginBottom: '30px' }}>
                                    <h3 style={sectionHeaderStyle}>Description</h3>
                                    <div style={{ color: '#334155', lineHeight: '1.6' }}>
                                        {isEditing ? (
                                            <textarea
                                                value={editData.description}
                                                onChange={e => setEditData({ ...editData, description: e.target.value })}
                                                style={inputStyle} rows={3}
                                            />
                                        ) : (
                                            ticket.description || '-'
                                        )}
                                    </div>
                                </div>

                                {/* Section: Resolution */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '30px' }}>
                                    <div>
                                        <h3 style={sectionHeaderStyle}>Issue</h3>
                                        {isEditing ? <textarea value={editData.issue} onChange={e => setEditData({ ...editData, issue: e.target.value })} style={inputStyle} /> : <div style={{ color: '#334155' }}>{ticket.issue || '-'}</div>}
                                    </div>
                                    <div>
                                        <h3 style={sectionHeaderStyle}>Analysis</h3>
                                        {isEditing ? <textarea value={editData.analysis} onChange={e => setEditData({ ...editData, analysis: e.target.value })} style={inputStyle} /> : <div style={{ color: '#334155' }}>{ticket.analysis || 'Added as an attachment'}</div>}
                                    </div>
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <h3 style={sectionHeaderStyle}>Solution</h3>
                                        {isEditing ? <textarea value={editData.solution} onChange={e => setEditData({ ...editData, solution: e.target.value })} style={inputStyle} /> : <div style={{ color: '#334155' }}>{ticket.solution || 'Replace the attached XML file'}</div>}
                                    </div>
                                </div>

                                <hr style={{ border: 'none', borderBottom: '1px solid #f1f5f9', margin: '20px 0' }} />

                                {/* Section: Fields Matrix */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 40px', fontSize: '0.95em' }}>
                                    <FieldRow label="Request Type" value={ticket.request_type} isEditing={isEditing} field="request_type" type="select" options={['Incident', 'Service Request', 'Problem', 'Change', 'Access']} onChange={setEditData} data={editData} />
                                    <FieldRow label="Impact" value={ticket.impact} isEditing={isEditing} field="impact" type="select" options={['Low', 'Medium', 'High', 'Critical', 'Site Wide']} onChange={setEditData} data={editData} />

                                    <FieldRow label="Status" value={ticket.status} isEditing={isEditing} field="status" type="select" options={['new', 'open', 'pending', 'resolved', 'closed']} onChange={setEditData} data={editData} />
                                    <FieldRow label="Impact Details" value={ticket.impact_details} isEditing={isEditing} field="impact_details" onChange={setEditData} data={editData} />

                                    <FieldRow label="Mode" value={ticket.mode} isEditing={isEditing} field="mode" type="select" options={['Web', 'E-Mail', 'Telephone', 'Walk-in', 'Chat']} onChange={setEditData} data={editData} />
                                    <FieldRow label="Urgency" value={ticket.urgency} isEditing={isEditing} field="urgency" type="select" options={['Low', 'Medium', 'High', 'Urgent']} onChange={setEditData} data={editData} />

                                    <FieldRow label="Level" value={ticket.level} isEditing={isEditing} field="level" type="select" options={['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4']} onChange={setEditData} data={editData} />
                                    <FieldRow label="Priority" value={ticket.priority} isEditing={isEditing} field="priority" type="select" options={['Low', 'Medium', 'High', 'Urgent']} onChange={setEditData} data={editData} />
                                </div>

                                <hr style={{ border: 'none', borderBottom: '1px solid #f1f5f9', margin: '30px 0' }} />

                                {/* Section: Requester Details */}
                                <h3 style={{ ...sectionHeaderStyle, marginBottom: '20px' }}>Requester Details</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 40px', fontSize: '0.95em' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={labelStyle}>Requester Name</span>
                                        <span style={valueStyle}>{ticket.contact_name}</span>
                                    </div>
                                    <FieldRow label="Assets" value={ticket.assets} isEditing={isEditing} field="assets" onChange={setEditData} data={editData} />
                                    <FieldRow label="Group" value={ticket.group_name} isEditing={isEditing} field="group_name" onChange={setEditData} data={editData} />
                                    <FieldRow label="Category" value={ticket.category} isEditing={isEditing} field="category" onChange={setEditData} data={editData} />
                                </div>

                            </div>
                        )}

                        {/* CONVERSATIONS TAB (Legacy Chat) */}
                        {activeTab === 'conversations' && (
                            <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '20px', display: 'flex', flexDirection: 'column', height: '600px' }}>
                                <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px' }}>
                                    {ticket.messages && ticket.messages.map(msg => (
                                        <div key={msg.id} style={{
                                            marginBottom: '15px',
                                            padding: '15px',
                                            background: msg.type === 'internal' ? '#fffbeb' : '#ffffff',
                                            border: msg.type === 'internal' ? '1px solid #fcd34d' : '1px solid #e2e8f0',
                                            borderRadius: '8px'
                                        }}>
                                            <div style={{ fontSize: '0.85em', color: '#64748b', marginBottom: '5px' }}>
                                                <strong>{msg.sender_name || 'System'}</strong> • {new Date(msg.created_at).toLocaleString()}
                                            </div>
                                            <div>{msg.body}</div>
                                        </div>
                                    ))}
                                </div>
                                <textarea
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    placeholder="Type a reply..."
                                    style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '4px', marginBottom: '10px' }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                    <select value={msgType} onChange={e => setMsgType(e.target.value)} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                                        <option value="public">Public Reply</option>
                                        <option value="internal">Internal Note</option>
                                    </select>
                                    <button onClick={handleSendMessage} style={btnStyle('primary')}>Send</button>
                                </div>
                            </div>
                        )}

                        {/* OTHER TABS PLACEHOLDER */}
                        {(activeTab !== 'details' && activeTab !== 'conversations') && (
                            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                Content for {activeTab} is not yet implemented.
                            </div>
                        )}

                    </div>
                </div>

                {/* SIDEBAR PROPERTIES */}
                <div style={{ width: '320px', background: 'white', borderLeft: '1px solid #e2e8f0', overflowY: 'auto', padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1em', fontWeight: 'bold' }}>Properties</h3>
                        <span style={{ fontSize: '0.9em', color: '#3b82f6', cursor: 'pointer' }}>v</span>
                    </div>

                    <div style={{ display: 'grid', gap: '20px' }}>
                        <SidebarField label="Request ID" value={`#${ticket.id}`} />
                        <SidebarField label="Status" value={ticket.status} isStatus />
                        <SidebarField label="Life cycle" value="Not Assigned" />
                        <SidebarField label="Workflow" value="Not Assigned" />
                        <SidebarField label="Priority" value={ticket.priority} isPriority />

                        <div>
                            <div style={labelStyle}>Technician</div>
                            {isEditing ? (
                                <select
                                    value={editData.assigned_user_id || ''}
                                    onChange={e => setEditData({ ...editData, assigned_user_id: e.target.value })}
                                    style={{ ...inputStyle, marginTop: '5px' }}
                                >
                                    <option value="">Unassigned</option>
                                    {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                                </select>
                            ) : (
                                <div style={{ marginTop: '5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: ticket.assigned_user_id ? '#22c55e' : '#cbd5e1' }}></div>
                                    <span>{ticket.assignee_name || (users.find(u => u.id == ticket.assigned_user_id)?.username) || 'Unassigned'}</span>
                                </div>
                            )}
                        </div>

                        <SidebarField label="Group & Site" value={`${ticket.group_name || 'Development'}, ${ticket.site || 'Base Site'}`} />

                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.9em' }}>
                            <span>Tasks</span>
                            <span>0/0</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.9em' }}>
                            <span>Checklists</span>
                            <span>0/0</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.9em' }}>
                            <span>Reminders</span>
                            <span>0</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.9em' }}>
                            <span>Approval Status</span>
                            <span>⚪ Not Configured</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.9em' }}>
                            <span>Attachments</span>
                            <span>0 📎</span>
                        </div>
                        <SidebarField label="Due By" value={ticket.due_by ? new Date(ticket.due_by).toLocaleString() : 'Delay by 8Hrs'} />
                    </div>

                    <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />

                    <div style={{ marginBottom: '20px' }}>
                        <h3 style={{ margin: '0 0 10px 0', fontSize: '1em', fontWeight: 'bold' }}>Associations v</h3>
                        <div style={{ fontSize: '0.9em', color: '#64748b' }}>Linked Requests</div>
                        <div style={{ fontSize: '0.9em', color: '#3b82f6', cursor: 'pointer', marginTop: '5px' }}>Linked to #32</div>
                    </div>

                </div>

            </div>

            {/* FAB or Helper Icon */}
            <div style={{ position: 'fixed', bottom: '30px', right: '30px', width: '50px', height: '50px', background: '#3b82f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 4px 10px rgba(0,0,0,0.2)', cursor: 'pointer' }}>
                💬
            </div>

        </div>
    );
}

// Sub-components & Styles

function FieldRow({ label, value, isEditing, field, onChange, data, type = 'text', options = [] }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={labelStyle}>{label}</span>
            <div style={{ width: '60%', textAlign: 'left' }}>
                {isEditing ? (
                    type === 'select' ? (
                        <select
                            value={data[field] || ''}
                            onChange={e => onChange({ ...data, [field]: e.target.value })}
                            style={{ ...inputStyle, width: '100%' }}
                        >
                            {options.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    ) : (
                        <input
                            type="text"
                            value={data[field] || ''}
                            onChange={e => onChange({ ...data, [field]: e.target.value })}
                            style={{ ...inputStyle, width: '100%' }}
                        />
                    )
                ) : (
                    <span style={valueStyle}>{value || '-'}</span>
                )}
            </div>
        </div>
    );
}

function SidebarField({ label, value, isStatus, isPriority }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={labelStyle}>{label}</span>
            <span style={{
                ...valueStyle,
                fontWeight: (isStatus || isPriority) ? 'bold' : 'normal',
                color: isStatus && value === 'open' ? '#ef4444' : (isPriority && value === 'high' ? '#ef4444' : '#334155')
            }}>
                {isStatus && <span style={{ marginRight: '5px' }}>🚩</span>}
                {isPriority && <span style={{ marginRight: '5px', color: '#ef4444' }}>■</span>}
                {value || '-'}
            </span>
        </div>
    );
}

const btnStyle = (variant) => ({
    padding: '8px 16px',
    borderRadius: '4px',
    border: variant === 'light' ? '1px solid #cbd5e1' : 'none',
    background: variant === 'light' ? 'white' : '#2563eb',
    color: variant === 'light' ? '#475569' : 'white',
    cursor: 'pointer',
    fontSize: '0.9em',
    fontWeight: '500'
});

const sectionHeaderStyle = {
    fontSize: '0.9em',
    fontWeight: 'bold',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: '10px'
};

const labelStyle = {
    color: '#64748b',
    fontSize: '0.9em'
};

const valueStyle = {
    color: '#334155',
    fontWeight: '500',
    fontSize: '0.95em'
};

const inputStyle = {
    padding: '8px',
    border: '1px solid #cbd5e1',
    borderRadius: '4px',
    fontSize: '0.9em',
    width: '100%',
    fontFamily: 'inherit'
};
