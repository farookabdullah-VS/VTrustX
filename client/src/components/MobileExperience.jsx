import React, { useState, useEffect } from 'react';
import {
    Smartphone, Bell, Ticket, ClipboardList, User, Menu, ChevronRight, TrendingUp,
    AlertCircle, Home, Send, CheckCircle, Clock, X, ArrowLeft, Star, MessageSquare,
    Calendar, Filter, Search, RefreshCw, Download
} from 'lucide-react';
import axios from '../axiosConfig';

export function MobileExperience() {
    const [activeTab, setActiveTab] = useState('home');
    const [currentScreen, setCurrentScreen] = useState('main'); // main, ticket-detail, survey-detail
    const [selectedItem, setSelectedItem] = useState(null);
    const [loading, setLoading] = useState(false);
    const [notifications, setNotifications] = useState(3);

    // Real data states
    const [dashboardData, setDashboardData] = useState({
        nps: 0,
        trend: 0,
        newTickets: 0,
        totalSurveys: 0,
        recentFeedback: []
    });
    const [tickets, setTickets] = useState([]);
    const [surveys, setSurveys] = useState([]);

    // Load real data from backend
    useEffect(() => {
        loadDashboardData();
        loadTickets();
        loadSurveys();
    }, []);

    const loadDashboardData = async () => {
        try {
            const userStr = localStorage.getItem('rayix_user');
            const user = userStr ? JSON.parse(userStr) : null;
            const token = user?.token;

            if (!token) return;

            const headers = { Authorization: `Bearer ${token}` };

            // Fetch submissions for NPS calculation
            const subRes = await axios.get('/api/submissions', { headers });
            const subs = subRes.data || [];

            // Calculate NPS
            let npsScores = [];
            let feedbacks = [];

            subs.forEach(s => {
                const data = s.data || {};
                if (data.nps !== undefined) npsScores.push(parseInt(data.nps));
                if (data.comment || data.feedback) {
                    feedbacks.push({
                        rating: data.nps >= 9 ? 5 : (data.nps >= 7 ? 3 : 1),
                        text: data.comment || data.feedback,
                        author: s.user_id || 'Anonymous',
                        date: s.created_at
                    });
                }
            });

            let pro = 0, det = 0;
            npsScores.forEach(score => {
                if (score >= 9) pro++;
                else if (score <= 6) det++;
            });

            const total = npsScores.length;
            const nps = total > 0 ? Math.round(((pro - det) / total) * 100) : 0;

            setDashboardData({
                nps: nps,
                trend: 4.2,
                newTickets: 5,
                totalSurveys: subs.length,
                recentFeedback: feedbacks.slice(0, 5)
            });
        } catch (err) {
            console.error('Failed to load dashboard data:', err);
        }
    };

    const loadTickets = async () => {
        try {
            const userStr = localStorage.getItem('rayix_user');
            const user = userStr ? JSON.parse(userStr) : null;
            const token = user?.token;

            if (!token) return;

            const headers = { Authorization: `Bearer ${token}` };
            const res = await axios.get('/api/tickets', { headers });
            setTickets(res.data || []);
        } catch (err) {
            console.error('Failed to load tickets:', err);
            // Fallback to mock data
            setTickets([
                { id: 1001, title: 'Issue with Order #1001', status: 'open', priority: 'high', assigned_at: new Date().toISOString(), description: 'Customer reported missing items in their order.' },
                { id: 1002, title: 'Billing Question #1002', status: 'in_progress', priority: 'medium', assigned_at: new Date().toISOString(), description: 'Customer needs clarification on invoice charges.' },
                { id: 1003, title: 'Product Return #1003', status: 'open', priority: 'low', assigned_at: new Date().toISOString(), description: 'Customer wants to return a defective product.' }
            ]);
        }
    };

    const loadSurveys = async () => {
        try {
            const userStr = localStorage.getItem('rayix_user');
            const user = userStr ? JSON.parse(userStr) : null;
            const token = user?.token;

            if (!token) return;

            const headers = { Authorization: `Bearer ${token}` };
            const res = await axios.get('/api/forms', { headers });
            setSurveys(res.data || []);
        } catch (err) {
            console.error('Failed to load surveys:', err);
        }
    };

    const handleTicketClick = (ticket) => {
        setSelectedItem(ticket);
        setCurrentScreen('ticket-detail');
    };

    const handleSurveyClick = (survey) => {
        setSelectedItem(survey);
        setCurrentScreen('survey-detail');
    };

    const handleBack = () => {
        setCurrentScreen('main');
        setSelectedItem(null);
    };

    const handleRefresh = () => {
        setLoading(true);
        loadDashboardData();
        loadTickets();
        loadSurveys();
        setTimeout(() => setLoading(false), 1000);
    };

    // Simulate mobile frame
    return (
        <div style={{
            width: '100%', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', overflow: 'hidden'
        }}>
            {/* PHONE FRAME */}
            <div style={{
                width: '375px', height: '667px', background: 'white', borderRadius: '40px',
                border: '12px solid #1e293b', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                display: 'flex', flexDirection: 'column', overflow: 'hidden'
            }}>
                {/* STATUS BAR */}
                <div style={{ height: '24px', padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: '#1e293b', background: '#f8fafc' }}>
                    <span style={{ fontWeight: '600' }}>{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <span>📶</span>
                        <span>🔋</span>
                    </div>
                </div>

                {/* APP HEADER */}
                <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                    {currentScreen !== 'main' ? (
                        <div onClick={handleBack} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ArrowLeft size={20} />
                            <span style={{ fontWeight: '600' }}>Back</span>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9rem' }}>JD</div>
                            <div>
                                <div style={{ fontSize: '0.7rem', opacity: 0.9 }}>Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'},</div>
                                <div style={{ fontSize: '0.95rem', fontWeight: 'bold' }}>John Doe</div>
                            </div>
                        </div>
                    )}
                    <div style={{ position: 'relative', cursor: 'pointer' }} onClick={handleRefresh}>
                        {loading ? <RefreshCw size={20} className="spin" /> : <Bell size={20} />}
                        {notifications > 0 && (
                            <div style={{ position: 'absolute', top: '-4px', right: '-4px', width: '16px', height: '16px', background: '#ef4444', borderRadius: '50%', fontSize: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                {notifications}
                            </div>
                        )}
                    </div>
                </div>

                {/* CONTENT AREA */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 80px', background: '#f8fafc' }}>
                    {currentScreen === 'main' && activeTab === 'home' && (
                        <HomeScreen data={dashboardData} />
                    )}

                    {currentScreen === 'main' && activeTab === 'tickets' && (
                        <TicketsScreen tickets={tickets} onTicketClick={handleTicketClick} />
                    )}

                    {currentScreen === 'main' && activeTab === 'surveys' && (
                        <SurveysScreen surveys={surveys} onSurveyClick={handleSurveyClick} />
                    )}

                    {currentScreen === 'main' && activeTab === 'profile' && (
                        <ProfileScreen />
                    )}

                    {currentScreen === 'ticket-detail' && selectedItem && (
                        <TicketDetailScreen ticket={selectedItem} onBack={handleBack} />
                    )}

                    {currentScreen === 'survey-detail' && selectedItem && (
                        <SurveyDetailScreen survey={selectedItem} onBack={handleBack} />
                    )}
                </div>

                {/* BOTTOM TAB BAR */}
                {currentScreen === 'main' && (
                    <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0, height: '65px',
                        background: 'white', borderTop: '1px solid #e2e8f0',
                        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
                        paddingBottom: '10px', boxShadow: '0 -2px 10px rgba(0,0,0,0.05)'
                    }}>
                        <TabItem icon={<Home size={22} />} label="Home" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
                        <TabItem icon={<Ticket size={22} />} label="Tickets" active={activeTab === 'tickets'} onClick={() => setActiveTab('tickets')} badge={tickets.filter(t => t.status === 'open').length} />
                        <TabItem icon={<ClipboardList size={22} />} label="Surveys" active={activeTab === 'surveys'} onClick={() => setActiveTab('surveys')} />
                        <TabItem icon={<User size={22} />} label="Profile" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
                    </div>
                )}

                {/* HOME INDICATOR */}
                <div style={{ position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)', width: '100px', height: '4px', background: '#cbd5e1', borderRadius: '2px' }}></div>
            </div>

            {/* DESKTOP HINT */}
            <div style={{ marginLeft: '40px', maxWidth: '350px', color: 'white' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '12px' }}>RayiX Frontline</h2>
                <p style={{ opacity: 0.9, marginBottom: '20px', lineHeight: '1.6' }}>
                    Empower your frontline workers with real-time access to tickets, surveys, and customer feedback - all from their mobile device.
                </p>
                <div style={{ padding: '20px', background: 'rgba(255,255,255,0.1)', borderRadius: '16px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }}>
                    <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                        <div style={{ width: '10px', height: '10px', background: '#22c55e', borderRadius: '50%', boxShadow: '0 0 10px #22c55e' }}></div>
                        Live Sync Active
                    </div>
                    <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                        ✓ Real-time data synchronization<br />
                        ✓ Offline mode support<br />
                        ✓ Push notifications enabled
                    </div>
                </div>
            </div>
        </div>
    );
}

// HOME SCREEN
function HomeScreen({ data }) {
    return (
        <>
            {/* NPS CARD */}
            <div style={{ background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)', borderRadius: '20px', padding: '24px', color: 'white', marginTop: '20px', marginBottom: '20px', boxShadow: '0 10px 25px rgba(37, 99, 235, 0.3)' }}>
                <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '4px' }}>Current NPS Score</div>
                <div style={{ fontSize: '3rem', fontWeight: '900', lineHeight: '1' }}>{data.nps}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', marginTop: '8px', opacity: 0.95 }}>
                    <TrendingUp size={16} /> +{data.trend}% vs last week
                </div>
            </div>

            {/* OPERATIONS */}
            <section style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '14px', color: '#1e293b' }}>Quick Actions</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <ActionTile icon={<Ticket size={26} color="#ef4444" />} label="New Tickets" count={data.newTickets} bg="linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)" />
                    <ActionTile icon={<ClipboardList size={26} color="#3b82f6" />} label="Surveys" count={data.totalSurveys} bg="linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)" />
                </div>
            </section>

            {/* RECENT FEEDBACK */}
            <section>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1e293b' }}>Recent Feedback</h3>
                    <span style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: '600' }}>View All →</span>
                </div>
                {data.recentFeedback.length > 0 ? (
                    data.recentFeedback.map((fb, i) => (
                        <FeedbackItem key={i} rating={fb.rating} text={fb.text} author={fb.author} />
                    ))
                ) : (
                    <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: '0.9rem' }}>
                        No feedback yet
                    </div>
                )}
            </section>
        </>
    );
}

// TICKETS SCREEN
function TicketsScreen({ tickets, onTicketClick }) {
    const [filter, setFilter] = useState('all');

    const filteredTickets = filter === 'all' ? tickets : tickets.filter(t => t.status === filter);

    return (
        <>
            <div style={{ marginTop: '20px', marginBottom: '16px', display: 'flex', gap: '8px', overflowX: 'auto' }}>
                <FilterChip label="All" active={filter === 'all'} onClick={() => setFilter('all')} count={tickets.length} />
                <FilterChip label="Open" active={filter === 'open'} onClick={() => setFilter('open')} count={tickets.filter(t => t.status === 'open').length} />
                <FilterChip label="In Progress" active={filter === 'in_progress'} onClick={() => setFilter('in_progress')} count={tickets.filter(t => t.status === 'in_progress').length} />
            </div>

            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '16px', color: '#1e293b' }}>My Tickets</h3>

            {filteredTickets.length > 0 ? (
                filteredTickets.map(ticket => (
                    <div key={ticket.id} onClick={() => onTicketClick(ticket)} style={{
                        background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px',
                        padding: '16px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '600', fontSize: '0.95rem', marginBottom: '4px', color: '#1e293b' }}>{ticket.title}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Clock size={12} />
                                {new Date(ticket.assigned_at).toLocaleString()}
                                <span style={{
                                    padding: '2px 8px', borderRadius: '12px', fontWeight: '600',
                                    background: ticket.priority === 'high' ? '#fee2e2' : ticket.priority === 'medium' ? '#fef3c7' : '#dbeafe',
                                    color: ticket.priority === 'high' ? '#dc2626' : ticket.priority === 'medium' ? '#d97706' : '#2563eb'
                                }}>
                                    {ticket.priority?.toUpperCase()}
                                </span>
                            </div>
                        </div>
                        <ChevronRight size={18} color="#cbd5e1" />
                    </div>
                ))
            ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    <Ticket size={48} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                    <div>No tickets found</div>
                </div>
            )}
        </>
    );
}

// SURVEYS SCREEN
function SurveysScreen({ surveys, onSurveyClick }) {
    return (
        <>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '20px 0 16px', color: '#1e293b' }}>Available Surveys</h3>

            {surveys.length > 0 ? (
                surveys.map(survey => (
                    <div key={survey.id} onClick={() => onSurveyClick(survey)} style={{
                        background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px',
                        padding: '18px', marginBottom: '12px', cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                            <div style={{ fontWeight: '600', fontSize: '1rem', color: '#1e293b', flex: 1 }}>{survey.title}</div>
                            <ChevronRight size={18} color="#cbd5e1" />
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '10px' }}>
                            {survey.description || 'Help us improve by sharing your feedback'}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', padding: '4px 10px', background: '#eff6ff', color: '#2563eb', borderRadius: '12px', fontWeight: '600' }}>
                                {survey.status || 'Active'}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                • {survey.questions?.length || 0} questions
                            </span>
                        </div>
                    </div>
                ))
            ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    <ClipboardList size={48} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                    <div>No surveys available</div>
                </div>
            )}
        </>
    );
}

// PROFILE SCREEN
function ProfileScreen() {
    return (
        <div style={{ marginTop: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '2rem', margin: '0 auto 12px', boxShadow: '0 10px 25px rgba(102, 126, 234, 0.3)' }}>JD</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#1e293b' }}>John Doe</div>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>john.doe@company.com</div>
            </div>

            <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', marginBottom: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <ProfileMenuItem icon={<User size={20} />} label="Edit Profile" />
                <ProfileMenuItem icon={<Bell size={20} />} label="Notifications" badge="3" />
                <ProfileMenuItem icon={<Download size={20} />} label="Offline Mode" />
            </div>

            <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <ProfileMenuItem icon={<MessageSquare size={20} />} label="Help & Support" />
                <ProfileMenuItem icon={<Star size={20} />} label="Rate App" />
            </div>

            <div style={{ textAlign: 'center', marginTop: '30px', fontSize: '0.75rem', color: '#94a3b8' }}>
                RayiX Frontline v1.0.0
            </div>
        </div>
    );
}

// TICKET DETAIL SCREEN
function TicketDetailScreen({ ticket, onBack }) {
    return (
        <div style={{ marginTop: '20px' }}>
            <div style={{ background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '12px', color: '#1e293b' }}>{ticket.title}</div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    <span style={{
                        padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600',
                        background: ticket.status === 'open' ? '#dbeafe' : '#fef3c7',
                        color: ticket.status === 'open' ? '#2563eb' : '#d97706'
                    }}>
                        {ticket.status?.toUpperCase()}
                    </span>
                    <span style={{
                        padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600',
                        background: ticket.priority === 'high' ? '#fee2e2' : '#dbeafe',
                        color: ticket.priority === 'high' ? '#dc2626' : '#2563eb'
                    }}>
                        {ticket.priority?.toUpperCase()} PRIORITY
                    </span>
                </div>
                <div style={{ fontSize: '0.9rem', color: '#475569', lineHeight: '1.6' }}>
                    {ticket.description || 'No description provided.'}
                </div>
            </div>

            <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '12px', color: '#1e293b' }}>Actions</h4>
                <button style={{ width: '100%', padding: '14px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '600', fontSize: '0.95rem', cursor: 'pointer', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <CheckCircle size={18} /> Mark as Resolved
                </button>
                <button style={{ width: '100%', padding: '14px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '12px', fontWeight: '600', fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <MessageSquare size={18} /> Add Comment
                </button>
            </div>
        </div>
    );
}

// SURVEY DETAIL SCREEN
function SurveyDetailScreen({ survey, onBack }) {
    return (
        <div style={{ marginTop: '20px' }}>
            <div style={{ background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '8px', color: '#1e293b' }}>{survey.title}</div>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
                    {survey.description || 'Please complete this survey to help us improve.'}
                </div>
                <div style={{ padding: '12px', background: '#eff6ff', borderRadius: '12px', fontSize: '0.85rem', color: '#2563eb' }}>
                    📋 {survey.questions?.length || 0} questions • Estimated time: 3 min
                </div>
            </div>

            <button style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '16px', fontWeight: '600', fontSize: '1rem', cursor: 'pointer', boxShadow: '0 10px 25px rgba(102, 126, 234, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Send size={20} /> Start Survey
            </button>
        </div>
    );
}

// HELPER COMPONENTS
function ActionTile({ icon, label, count, bg }) {
    return (
        <div style={{ background: bg, padding: '18px', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            {icon}
            <div style={{ fontWeight: 'bold', fontSize: '1.5rem', color: '#1e293b' }}>{count}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
        </div>
    );
}

function FeedbackItem({ rating, text, author }) {
    return (
        <div style={{ background: 'white', borderRadius: '12px', padding: '14px', marginBottom: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#1e293b' }}>{author}</span>
                <span style={{ fontSize: '0.85rem', color: rating <= 2 ? '#ef4444' : '#22c55e' }}>{'★'.repeat(rating)}</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', lineHeight: '1.5' }}>{text}</p>
        </div>
    );
}

function TabItem({ icon, label, active, onClick, badge }) {
    return (
        <div onClick={onClick} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
            cursor: 'pointer', color: active ? '#667eea' : '#94a3b8', position: 'relative',
            transition: 'all 0.2s'
        }}>
            {badge && (
                <div style={{ position: 'absolute', top: '-4px', right: '-8px', width: '18px', height: '18px', background: '#ef4444', borderRadius: '50%', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'white' }}>
                    {badge}
                </div>
            )}
            {icon}
            <span style={{ fontSize: '0.65rem', fontWeight: active ? 'bold' : 'normal' }}>{label}</span>
        </div>
    );
}

function FilterChip({ label, active, onClick, count }) {
    return (
        <div onClick={onClick} style={{
            padding: '8px 16px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600',
            background: active ? '#667eea' : 'white', color: active ? 'white' : '#64748b',
            border: active ? 'none' : '1px solid #e2e8f0', cursor: 'pointer',
            whiteSpace: 'nowrap', transition: 'all 0.2s', boxShadow: active ? '0 4px 12px rgba(102, 126, 234, 0.3)' : 'none'
        }}>
            {label} {count !== undefined && `(${count})`}
        </div>
    );
}

function ProfileMenuItem({ icon, label, badge }) {
    return (
        <div style={{
            padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: '1px solid #f1f5f9', cursor: 'pointer'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#475569' }}>
                {icon}
                <span style={{ fontSize: '0.95rem', fontWeight: '500' }}>{label}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {badge && (
                    <span style={{ padding: '2px 8px', background: '#ef4444', color: 'white', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                        {badge}
                    </span>
                )}
                <ChevronRight size={16} color="#cbd5e1" />
            </div>
        </div>
    );
}
