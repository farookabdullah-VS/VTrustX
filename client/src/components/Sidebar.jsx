import { useState, useEffect, useMemo } from 'react';
import './Sidebar.css';
import { useTranslation } from 'react-i18next';
import { Notifications } from './Notifications';
import {
    LayoutDashboard, UserCircle, Contact, Fingerprint, Map, UserCog,
    BarChart3, Bot, ClipboardList, Library, Ticket, Settings, Plug,
    Shield, Users, CreditCard, Palette, Wrench, Globe, HelpCircle,
    GripVertical, Star, PieChart, PhoneCall, Video, Share2, Target, Database, Megaphone, Smartphone, BookOpen, Menu, FlaskConical, Zap, Key, Webhook
} from 'lucide-react';

const getInitialGroups = (user) => [
    {
        id: 'home',
        title: null,
        items: [
            { id: 'dashboard', label: 'sidebar.item.dashboard', icon: <LayoutDashboard size={16} /> },
            { id: 'xm-center', label: 'XM Center', icon: <Globe size={16} /> },
            { id: 'textiq', label: 'CogniVue', icon: <Bot size={16} /> }
        ]
    },
    {
        id: 'surveys',
        title: "sidebar.group.surveys",
        items: [
            { id: 'form-viewer', label: 'sidebar.item.surveys', icon: <ClipboardList size={16} /> },
            { id: 'survey-results', label: 'Survey Results', icon: <PieChart size={16} /> },
            { id: 'distributions', label: 'SmartReach', icon: <Megaphone size={16} /> },
            { id: 'ab-tests', label: 'A/B Testing', icon: <FlaskConical size={16} /> },
            { id: 'mobile-app', label: 'Frontline App', icon: <Smartphone size={16} /> },
            { id: 'templates', label: 'sidebar.item.templates', icon: <Library size={16} /> }
        ]
    },
    {
        id: 'ai-agents',
        title: "sidebar.group.ai_agents",
        items: [
            { id: 'ai-surveyor', label: 'Rayi Voice Agent', icon: <PhoneCall size={16} /> },
            { id: 'ai-video-agent', label: 'Rayi Video Agent', icon: <Video size={16} /> }
        ]
    },
    {
        id: 'engagement',
        title: "sidebar.group.engagement",
        items: [
            { id: 'tickets', label: 'sidebar.item.tickets', icon: <Ticket size={16} /> },
            { id: 'xm-directory', label: 'XM Directory', icon: <Contact size={16} /> },
            { id: 'actions', label: 'Action Planning', icon: <Target size={16} /> },
            { id: 'ticket-settings', label: 'sidebar.item.ticket_config', icon: <Settings size={16} /> }
        ]
    },
    {
        id: 'marketing',
        title: "sidebar.group.marketing",
        items: [
            { id: 'social-media', label: 'sidebar.item.smm', icon: <Share2 size={16} /> },
            { id: 'reputation', label: 'Reputation', icon: <Star size={16} /> }
        ]
    },
    {
        id: 'journey',
        title: "sidebar.group.journey",
        items: [
            { id: 'cjm', label: 'sidebar.item.cjm', icon: <Map size={16} /> },
            { id: 'cjm-analytics', label: 'Journey Analytics', icon: <BarChart3 size={16} /> },
            { id: 'journeys', label: 'sidebar.item.journeys', icon: <Share2 size={16} /> }
        ]
    },
    {
        id: 'personas',
        title: "sidebar.group.personas",
        items: [
            { id: 'personas', label: 'sidebar.item.personas', icon: <UserCog size={16} /> },
            { id: 'persona-templates', label: 'sidebar.item.persona_templates', icon: <Library size={16} /> },
            { id: 'persona-engine', label: 'sidebar.item.persona_engine', icon: <Wrench size={16} /> }
        ]
    },
    {
        id: 'analytics',
        title: "sidebar.group.analytics",
        items: [
            { id: 'cx-ratings', label: 'sidebar.item.cx_dashboards', icon: <BarChart3 size={16} /> },
            { id: 'survey-reports', label: 'sidebar.item.survey_reports', icon: <PieChart size={16} /> },
            { id: 'analytics-builder', label: 'Analytics Builder', icon: <BarChart3 size={16} /> },
            { id: 'analytics-studio', label: 'Analytics Studio', icon: <Database size={16} /> },
            { id: 'analytics-dashboard', label: 'Dynamic Dashboard', icon: <BarChart3 size={16} /> },
            { id: 'survey-activity-dashboard', label: 'Survey Activity', icon: <BarChart3 size={16} /> }
        ]
    },
    {
        id: 'c360',
        title: "sidebar.group.c360",
        items: [
            { id: 'customer360', label: 'sidebar.item.unified_profile', icon: <UserCircle size={16} /> },
            { id: 'contact-master', label: 'sidebar.item.contacts', icon: <Contact size={16} /> }
        ]
    },
    {
        id: 'identity',
        title: "sidebar.group.identity",
        items: [
            { id: 'identity', label: 'sidebar.item.identity', icon: <Fingerprint size={16} /> }
        ]
    },
    {
        id: 'ai-decisioning',
        title: "sidebar.group.ai",
        items: [
            { id: 'workflows', label: 'sidebar.item.rules', icon: <Bot size={16} /> },
            { id: 'workflows-automation', label: 'Workflow Automations', icon: <Zap size={16} /> },
            { id: 'ai-settings', label: 'sidebar.item.ai_models', icon: <Settings size={16} /> }
        ]
    },
    {
        id: 'integrations',
        title: "sidebar.group.integrations",
        items: [
            { id: 'integrations', label: 'sidebar.item.integrations', icon: <Plug size={16} /> },
            { id: 'api-keys', label: 'API Keys', icon: <Key size={16} /> },
            { id: 'webhooks', label: 'Webhooks', icon: <Webhook size={16} /> }
        ]
    },
    {
        id: 'governance',
        title: "sidebar.group.governance",
        items: [
            { id: 'role-master', label: 'sidebar.item.access_control', icon: <Shield size={16} /> },
            { id: 'audit-logs', label: 'Audit Logs', icon: <ClipboardList size={16} /> },
            { id: 'retention-policy', label: 'Retention Policy', icon: <Database size={16} /> },
            { id: 'ip-whitelist', label: 'IP Whitelisting', icon: <Globe size={16} /> }
        ]
    },
    {
        id: 'admin',
        title: "sidebar.group.admin",
        items: [
            { id: 'user-management', label: 'sidebar.item.user_management', icon: <Users size={16} /> },
            { id: 'subscription', label: 'sidebar.item.subscription', icon: <CreditCard size={16} /> },
            { id: 'subscription-config', label: 'sidebar.item.subscription_config', icon: <CreditCard size={16} /> }, // For admins but currently open to verify
            { id: 'theme-settings', label: 'sidebar.item.theme', icon: <Palette size={16} /> },
            { id: 'system-settings', label: 'sidebar.item.settings', icon: <Wrench size={16} /> },
            ...(user?.user?.role === 'global_admin' || user?.user?.username === 'admin' ? [{ id: 'global-admin', label: 'sidebar.item.global_admin', icon: <Globe size={16} /> }] : [])
        ]
    },
    {
        id: 'help',
        title: "sidebar.group.help",
        items: [
            { id: 'interactive-manual', label: 'sidebar.item.user_manual', icon: <BookOpen size={16} /> },
            { id: 'support', label: 'sidebar.item.support', icon: <HelpCircle size={16} /> }
        ]
    }
];

export function Sidebar({ user, view, onViewChange, onLogout, isCollapsed, toggleSidebar, onHide }) {
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
        <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`} role="navigation" aria-label="Sidebar navigation" style={!isCollapsed ? { width: `${sidebarWidth}px` } : {}}>
            {!isCollapsed && (
                <div className={`sidebar-resizer ${isResizing ? 'sidebar-resizer-active' : ''}`} onMouseDown={startResizing}>
                    <div className="resizer-grip" />
                </div>
            )}

            {/* Sidebar Controls (Close/Collapse) */}
            <div className="sidebar-controls" style={{
                display: 'flex',
                justifyContent: isCollapsed ? 'center' : 'flex-end',
                padding: '8px 12px',
                borderBottom: '1px solid var(--sidebar-border)',
                marginBottom: '8px'
            }}>
                {!isCollapsed && (
                    <button
                        onClick={onHide}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--sidebar-text)', opacity: 0.6, marginRight: 'auto' }}
                        title="Close Sidebar"
                    >
                        <span style={{ fontSize: '18px', fontWeight: 'bold' }}>&times;</span>
                    </button>
                )}

                <button
                    onClick={toggleSidebar}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--sidebar-text)', opacity: 0.7 }}
                    title={isCollapsed ? "Expand" : "Collapse"}
                >
                    {isCollapsed ? <Menu size={16} /> : <span style={{ fontSize: '18px' }}>&larr;</span>}
                </button>
            </div>

            <nav className="sidebar-nav">
                {/* FAVORITES SECTION */}
                {!isCollapsed && favorites.length > 0 && (
                    <div className="sidebar-group">
                        <div className="group-header" style={{
                            padding: '8px 16px', margin: '0 12px 8px', display: 'flex', alignItems: 'center', gap: '10px',
                            color: 'var(--sidebar-text)', borderBottom: '1px solid var(--sidebar-border)', fontWeight: '700', fontSize: '13px'
                        }}>
                            <Star size={14} fill="var(--sidebar-text)" color="var(--sidebar-text)" /> <span>FAVORITES</span>
                        </div>
                        <ul>
                            {baseGroups.flatMap(g => g.items).filter(i => favorites.includes(i.id)).map(item => (
                                <li key={item.id} className={view === item.id ? 'active' : ''} aria-current={view === item.id ? 'page' : undefined} onClick={() => onViewChange(item.id)}>
                                    <span className="icon">{item.icon}</span>
                                    <span className="label" style={{ flex: 1 }}>{t(item.label)}</span>
                                    <div onClick={(e) => toggleFavorite(e, item.id)} style={{ cursor: 'pointer', opacity: 1 }}>
                                        <Star size={14} fill="var(--primary-color)" color="var(--primary-color)" />
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
                                    border: '1px solid var(--sidebar-border)',
                                    backgroundColor: (expandedGroups[group.id]) ? 'var(--sidebar-active-bg)' : 'transparent',
                                    color: (expandedGroups[group.id]) ? 'var(--sidebar-active-text)' : 'var(--sidebar-text)',
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
                                <span onClick={() => toggleGroup(group.id)} role="button" tabIndex={0} aria-label={expandedGroups[group.id] ? `Collapse ${t(group.title)}` : `Expand ${t(group.title)}`} aria-expanded={!!expandedGroups[group.id]} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleGroup(group.id); } }} style={{ fontSize: '0.7em', transform: (expandedGroups[group.id]) ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', cursor: 'pointer' }}>▼</span>
                            </div>
                        )}

                        {(isCollapsed || (!group.title) || expandedGroups[group.id]) && (
                            <ul>
                                {group.items.map(item => {
                                    const isFav = favorites.includes(item.id);
                                    return (
                                        <li key={item.id} title={isCollapsed ? t(item.label) : ''} className={view === item.id ? 'active' : ''} aria-current={view === item.id ? 'page' : undefined} onClick={() => onViewChange(item.id)}
                                            style={{ position: 'relative', paddingRight: '30px' }} /* Make space for star */
                                        >
                                            <span className="icon">{item.icon}</span>
                                            {!isCollapsed && <span className="label">{t(item.label)}</span>}

                                            {/* Favorite Toggle Star */}
                                            {!isCollapsed && (
                                                <div
                                                    className="fav-star"
                                                    role="button"
                                                    tabIndex={0}
                                                    aria-label={isFav ? `Remove ${t(item.label)} from favorites` : `Add ${t(item.label)} to favorites`}
                                                    aria-pressed={isFav}
                                                    onClick={(e) => toggleFavorite(e, item.id)}
                                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleFavorite(e, item.id); } }}
                                                    style={{
                                                        position: 'absolute', right: '8px',
                                                        opacity: isFav ? 1 : 0.2,
                                                        transition: 'opacity 0.2s', cursor: 'pointer'
                                                    }}
                                                    onMouseOver={e => e.currentTarget.style.opacity = 1}
                                                    onMouseOut={e => e.currentTarget.style.opacity = isFav ? 1 : 0.2}
                                                    onFocus={e => e.currentTarget.style.opacity = 1}
                                                    onBlur={e => e.currentTarget.style.opacity = isFav ? 1 : 0.2}
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
