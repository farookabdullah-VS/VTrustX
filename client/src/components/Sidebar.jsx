import React, { useState, useEffect, useMemo } from 'react';
import './Sidebar.css';
import { useTranslation } from 'react-i18next';
import { Notifications } from './Notifications';
import {
    LayoutDashboard, UserCircle, Contact, Fingerprint, Map, UserCog,
    BarChart3, Bot, ClipboardList, Library, Ticket, Settings, Plug,
    Shield, Users, CreditCard, Palette, Wrench, Globe, HelpCircle,
    GripVertical, Star, PieChart, PhoneCall, Video
} from 'lucide-react';

const getInitialGroups = (user) => [
    {
        id: 'home',
        title: null,
        items: [
            { id: 'dashboard', label: 'sidebar.item.dashboard', icon: <LayoutDashboard size={16} /> }
        ]
    },
    {
        id: 'surveys',
        title: "Surveys & Feedback",
        items: [
            { id: 'form-viewer', label: 'sidebar.item.surveys', icon: <ClipboardList size={16} /> },
            { id: 'templates', label: 'sidebar.item.templates', icon: <Library size={16} /> }
        ]
    },
    {
        id: 'ai-agents',
        title: "AI Agents",
        items: [
            { id: 'ai-surveyor', label: 'sidebar.item.voice_agent', icon: <PhoneCall size={16} /> },
            { id: 'ai-video-agent', label: 'sidebar.item.video_agent', icon: <Video size={16} /> }
        ]
    },
    {
        id: 'engagement',
        title: "Engagement",
        items: [
            { id: 'tickets', label: 'sidebar.item.tickets', icon: <Ticket size={16} /> },
            { id: 'ticket-settings', label: 'sidebar.item.ticket_config', icon: <Settings size={16} /> }
        ]
    },
    {
        id: 'journey',
        title: "Customer Journey",
        items: [
            { id: 'journeys', label: 'sidebar.item.journey_builder', icon: <Map size={16} /> }
        ]
    },
    {
        id: 'personas',
        title: "Personas & Segments",
        items: [
            { id: 'personas', label: 'sidebar.item.personas', icon: <UserCog size={16} /> },
            { id: 'persona-templates', label: 'Templates', icon: <Library size={16} /> }
        ]
    },
    {
        id: 'analytics',
        title: "Analytics & Insights",
        items: [
            { id: 'cx-ratings', label: 'sidebar.item.cx_dashboards', icon: <BarChart3 size={16} /> },
            { id: 'survey-reports', label: 'sidebar.item.survey_reports', icon: <PieChart size={16} /> }
        ]
    },
    {
        id: 'c360',
        title: "Customer 360",
        items: [
            { id: 'customer360', label: 'sidebar.item.unified_profile', icon: <UserCircle size={16} /> },
            { id: 'contact-master', label: 'sidebar.item.contacts', icon: <Contact size={16} /> }
        ]
    },
    {
        id: 'identity',
        title: "Identity & Consent",
        items: [
            { id: 'identity', label: 'sidebar.item.identity', icon: <Fingerprint size={16} /> }
        ]
    },
    {
        id: 'ai-decisioning',
        title: "AI & Decisioning",
        items: [
            { id: 'workflows', label: 'Rules Engine', icon: <Bot size={16} /> },
            { id: 'ai-settings', label: 'sidebar.item.ai_models', icon: <Settings size={16} /> }
        ]
    },
    {
        id: 'integrations',
        title: "Integrations & APIs",
        items: [
            { id: 'integrations', label: 'sidebar.item.integrations', icon: <Plug size={16} /> }
        ]
    },
    {
        id: 'governance',
        title: "Governance & Security",
        items: [
            { id: 'role-master', label: 'sidebar.item.access_control', icon: <Shield size={16} /> }
        ]
    },
    {
        id: 'admin',
        title: "Admin & Config",
        items: [
            { id: 'user-management', label: 'sidebar.item.user_management', icon: <Users size={16} /> },
            { id: 'subscription', label: 'sidebar.item.subscription', icon: <CreditCard size={16} /> },
            { id: 'theme-settings', label: 'sidebar.item.theme', icon: <Palette size={16} /> },
            { id: 'system-settings', label: 'sidebar.item.settings', icon: <Wrench size={16} /> },
            ...(user?.user?.role === 'global_admin' || user?.user?.username === 'admin' ? [{ id: 'global-admin', label: 'sidebar.item.global_admin', icon: <Globe size={16} /> }] : [])
        ]
    },
    {
        id: 'help',
        title: "Help",
        items: [
            { id: 'support', label: 'sidebar.item.support', icon: <HelpCircle size={16} /> }
        ]
    }
];

export function Sidebar({ user, view, onViewChange, onLogout, isCollapsed, toggleSidebar }) {
    const { t, i18n } = useTranslation();

    // 1. Favorites State (Persisted)
    const [favorites, setFavorites] = useState(() => {
        try { return JSON.parse(localStorage.getItem('vx_sidebar_favorites') || '[]'); }
        catch { return []; }
    });

    // 2. Group Order State (Persisted ID list)
    const [groupOrder, setGroupOrder] = useState(() => {
        try { return JSON.parse(localStorage.getItem('vx_sidebar_order') || '[]'); }
        catch { return []; }
    });

    // 3. Current active groups based on user prop (Memoized)
    const baseGroups = useMemo(() => getInitialGroups(user), [user]);

    // 4. Ordered Groups State (The actual list to render)
    const [groups, setGroups] = useState([]);

    // Initialize/Update groups when baseGroups or order changes
    useEffect(() => {
        if (groupOrder.length > 0) {
            const sorted = [...baseGroups].sort((a, b) => {
                const idxA = groupOrder.indexOf(a.id);
                const idxB = groupOrder.indexOf(b.id);
                // If not found in order (new group), check bounds
                if (idxA === -1 && idxB === -1) return 0;
                if (idxA === -1) return 1; // Put new items at bottom
                if (idxB === -1) return -1;
                return idxA - idxB;
            });
            setGroups(sorted);
        } else {
            setGroups(baseGroups);
        }
    }, [baseGroups, groupOrder]);

    // Calculate active group based on current view
    const activeGroupId = groups.find(g => g.items.some(i => i.id === view))?.id;

    // State for collapsible groups
    const [expandedGroups, setExpandedGroups] = useState({});

    // Sidebar Resizing State
    const [sidebarWidth, setSidebarWidth] = useState(260);
    const [isResizing, setIsResizing] = useState(false);

    // Update CSS Variable
    useEffect(() => {
        if (!isCollapsed) {
            document.documentElement.style.setProperty('--sidebar-width', `${sidebarWidth}px`);
        } else {
            document.documentElement.style.setProperty('--sidebar-width', `${sidebarWidth}px`);
        }
    }, [sidebarWidth, isCollapsed]);

    // Auto-expand group containing current view
    useEffect(() => {
        if (activeGroupId) {
            setExpandedGroups(prev => ({ ...prev, [activeGroupId]: true }));
        }
    }, [activeGroupId]);

    const startResizing = (mouseDownEvent) => {
        setIsResizing(true);
        const startX = mouseDownEvent.clientX;
        const startWidth = sidebarWidth;
        const onMouseMove = (e) => {
            const newWidth = startWidth + (e.clientX - startX);
            if (newWidth > 200 && newWidth < 600) setSidebarWidth(newWidth);
        };
        const onMouseUp = () => {
            setIsResizing(false);
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        };
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
    };

    const toggleGroup = (groupId) => {
        setExpandedGroups(prev => ({ [groupId]: !prev[groupId] }));
    };

    const toggleFavorite = (e, itemId) => {
        e.stopPropagation();
        const isFav = favorites.includes(itemId);
        let newFavs;
        if (isFav) newFavs = favorites.filter(id => id !== itemId);
        else newFavs = [...favorites, itemId];

        setFavorites(newFavs);
        localStorage.setItem('vx_sidebar_favorites', JSON.stringify(newFavs));
    };

    // Drag and Drop
    const onDragStart = (e, index) => {
        e.dataTransfer.setData("dragIndex", index);
        e.dataTransfer.effectAllowed = "move";
    };

    const onDragOver = (e) => { e.preventDefault(); };

    const onDrop = (e, dropIndex) => {
        const dragIndex = Number(e.dataTransfer.getData("dragIndex"));
        if (dragIndex === dropIndex) return;

        const newGroups = [...groups];
        const [removed] = newGroups.splice(dragIndex, 1);
        newGroups.splice(dropIndex, 0, removed);
        setGroups(newGroups);

        // Save new order to Storage
        const newOrder = newGroups.map(g => g.id);
        setGroupOrder(newOrder); // Update state to prevent useEffect reset
        localStorage.setItem('vx_sidebar_order', JSON.stringify(newOrder));
    };

    return (
        <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`} style={!isCollapsed ? { width: `${sidebarWidth}px` } : {}}>
            {!isCollapsed && (
                <div className={`sidebar-resizer ${isResizing ? 'sidebar-resizer-active' : ''}`} onMouseDown={startResizing}>
                    <div className="resizer-grip" />
                </div>
            )}

            <div className="sidebar-header">
                {!isCollapsed ? (
                    <img src="/vtrustx_logo.jpg" alt="VTrustX" style={{ height: '100px', maxWidth: '100%', objectFit: 'contain' }} />
                ) : (
                    <h3 style={{ margin: 0, fontSize: '1.2em' }}>VX</h3>
                )}
                <button className="toggle-btn" onClick={toggleSidebar}>
                    {isCollapsed ? '☰' : '⬅'}
                </button>
            </div>

            <nav className="sidebar-nav">
                {/* FAVORITES SECTION */}
                {!isCollapsed && favorites.length > 0 && (
                    <div className="sidebar-group">
                        <div className="group-header" style={{
                            padding: '8px 16px', margin: '0 12px 8px', display: 'flex', alignItems: 'center', gap: '10px',
                            color: '#b45309', borderBottom: '1px solid rgba(245, 158, 11, 0.2)', fontWeight: '700', fontSize: '13px'
                        }}>
                            <Star size={14} fill="#b45309" color="#b45309" /> <span>FAVORITES</span>
                        </div>
                        <ul>
                            {baseGroups.flatMap(g => g.items).filter(i => favorites.includes(i.id)).map(item => (
                                <li key={item.id} className={view === item.id ? 'active' : ''} onClick={() => onViewChange(item.id)}>
                                    <span className="icon">{item.icon}</span>
                                    <span className="label" style={{ flex: 1 }}>{t(item.label)}</span>
                                    <div onClick={(e) => toggleFavorite(e, item.id)} style={{ cursor: 'pointer', opacity: 1 }}>
                                        <Star size={14} fill="#f59e0b" color="#f59e0b" />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* REGULAR GROUPS */}
                {groups.map((group, index) => (
                    <div
                        key={group.id}
                        className="sidebar-group"
                        draggable={!isCollapsed}
                        onDragStart={(e) => onDragStart(e, index)}
                        onDragOver={onDragOver}
                        onDrop={(e) => onDrop(e, index)}
                    >
                        {group.title && !isCollapsed && (
                            <div className="group-header"
                                style={{
                                    padding: '8px 16px', margin: '0', display: 'flex', alignItems: 'center',
                                    justifyContent: 'flex-start', gap: '10px', cursor: 'pointer', userSelect: 'none',
                                    border: '1px solid rgba(6, 78, 59, 0.3)',
                                    backgroundColor: (expandedGroups[group.id]) ? '#064e3b' : 'transparent',
                                    color: (expandedGroups[group.id]) ? '#D9F8E5' : '#064e3b',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                    <div className="group-drag-handle" title="Drag to reorder">
                                        <GripVertical size={14} />
                                    </div>
                                    <h4 onClick={() => toggleGroup(group.id)} style={{ margin: 0, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600', display: 'flex', alignItems: 'center' }}>
                                        {t(group.title)}
                                    </h4>
                                </div>
                                <span onClick={() => toggleGroup(group.id)} style={{ fontSize: '0.7em', transform: (expandedGroups[group.id]) ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
                            </div>
                        )}

                        {(isCollapsed || (!group.title) || expandedGroups[group.id]) && (
                            <ul>
                                {group.items.map(item => {
                                    const isFav = favorites.includes(item.id);
                                    return (
                                        <li key={item.id} title={isCollapsed ? t(item.label) : ''} className={view === item.id ? 'active' : ''} onClick={() => onViewChange(item.id)}
                                            style={{ position: 'relative', paddingRight: '30px' }} /* Make space for star */
                                        >
                                            <span className="icon">{item.icon}</span>
                                            {!isCollapsed && <span className="label">{t(item.label)}</span>}

                                            {/* Favorite Toggle Star */}
                                            {!isCollapsed && (
                                                <div
                                                    className="fav-star"
                                                    onClick={(e) => toggleFavorite(e, item.id)}
                                                    style={{
                                                        position: 'absolute', right: '8px',
                                                        opacity: isFav ? 1 : 0.2,
                                                        transition: 'opacity 0.2s', cursor: 'pointer'
                                                    }}
                                                    onMouseOver={e => e.currentTarget.style.opacity = 1}
                                                    onMouseOut={e => e.currentTarget.style.opacity = isFav ? 1 : 0.2}
                                                >
                                                    <Star size={14} fill={isFav ? "#f59e0b" : "none"} color={isFav ? "#f59e0b" : "currentColor"} />
                                                </div>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                ))}
            </nav>
        </div>
    );
}
