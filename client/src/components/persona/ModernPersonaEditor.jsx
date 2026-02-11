import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { X, Settings, HelpCircle, Save, PanelLeftClose, PanelLeft, PanelRightClose, PanelRight, Target, Quote, AlertCircle, Zap, Shield, History, MapPin, Map as MapIcon, FileText, MousePointer, Plus, User, Briefcase, GraduationCap, Layout, Layers, Image as ImageIcon, Smartphone, BarChart2, Globe, TrendingUp, Code, Award, File, Camera, Sliders, PieChart, Printer, Download, FileSpreadsheet, Sparkles, MessageCircle, Wand2 } from 'lucide-react';
import { useToast } from '../common/Toast';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { PersonaHeader } from './PersonaHeader';
import { PersonaCanvas } from './PersonaCanvas';
import { PersonaHelpModal } from './PersonaHelpModal';
import { ChannelSelectorModal } from './ChannelSelectorModal';
import { ChartEditorModal } from './ChartEditorModal';
import { DocumentSelectorModal } from './DocumentSelectorModal';
import { AIPersonaImprover } from './AIPersonaImprover';
import { AIPersonaChat } from './AIPersonaChat';

const SECTION_TEMPLATES = {
    // --- IDENTITY / HEADER ---
    header: {
        type: 'header',
        title: 'Identity',
        icon: User,
        iconStr: 'user',
        style: { backgroundColor: '#FFFFFF', padding: '0' },
        defaultData: {
            name: 'New Persona',
            role: 'User Role',
            marketSize: 50,
            type: 'Rational'
        }
    },
    // --- TEXT / QUOTES TAB ---
    goals: {
        type: 'list',
        title: 'Goals',
        icon: Target,
        iconStr: 'target',
        style: { borderLeft: '4px solid #10B981', backgroundColor: '#F9FAFB' },
        defaultData: ['Increase productivity', 'Reduce manual errors']
    },
    quote: {
        type: 'quote',
        title: 'Quote',
        icon: Quote,
        iconStr: 'quote',
        style: { backgroundColor: '#FFFFFF', fontStyle: 'italic' },
        defaultContent: '“Technology should enable us, not hinder us.”'
    },
    frustrations: {
        type: 'list',
        title: 'Frustrations',
        icon: AlertCircle,
        iconStr: 'alert-circle',
        style: { borderLeft: '4px solid #EF4444', backgroundColor: '#FEF2F2' },
        defaultData: ['System downtime', 'Complexity']
    },
    motivations: {
        type: 'list',
        title: 'Motivations',
        icon: Zap,
        iconStr: 'zap',
        style: { borderLeft: '4px solid #10B981', backgroundColor: '#F0FDF4' },
        defaultData: ['Career growth', 'Recognition']
    },
    challenges: {
        type: 'text',
        title: 'Challenges',
        icon: Shield,
        iconStr: 'shield',
        style: { borderTop: '3px solid #10B981', backgroundColor: '#F9FAFB' },
        defaultContent: 'Struggling to balance time between X and Y.'
    },
    previousExperience: {
        type: 'text',
        title: 'Previous Experience',
        icon: History,
        iconStr: 'history',
        style: { backgroundColor: '#FFFFFF' },
        defaultContent: 'Used similar tools like Salesforce and HubSpot.'
    },
    context: {
        type: 'text',
        title: 'Context',
        icon: MapPin,
        iconStr: 'map-pin',
        style: { backgroundColor: '#FFFFFF' },
        defaultContent: 'Works in a busy open-plan office.'
    },
    scenarios: {
        type: 'text',
        title: 'Scenarios',
        icon: MapIcon,
        iconStr: 'map',
        style: { backgroundColor: '#FFFFFF' },
        defaultContent: 'When I arrive at work at 9AM...'
    },
    text: {
        type: 'text',
        title: 'Notes',
        icon: FileText,
        iconStr: 'file-text',
        style: { backgroundColor: '#F9FAFB' },
        defaultContent: ''
    },
    demographic: {
        type: 'demographic',
        title: 'Demographic',
        icon: User,
        iconStr: 'user',
        style: { backgroundColor: '#FFFFFF' },
        defaultData: [
            { label: 'Gender', value: 'Fem', icon: 'user', isComposite: true, gender: 'Female', age: 25 },
            { label: 'Location', value: 'London, UK', icon: 'map-pin' },
            { label: 'Occupation', value: 'Product Manager', icon: 'briefcase' },
            { label: 'Education', value: 'Bachelor', icon: 'graduation-cap' }
        ]
    },
    needs: {
        type: 'list',
        title: 'Needs',
        icon: Target,
        iconStr: 'target',
        style: { backgroundColor: '#F9FAFB' },
        defaultData: ['Reliable data', 'Fast support']
    },
    expectations: {
        type: 'text',
        title: 'Expectations',
        icon: Zap,
        iconStr: 'zap',
        style: { backgroundColor: '#FFFFFF' },
        defaultContent: 'Expects the system to be intuitive.'
    },
    // --- GRAPHS / CHARTS TAB ---
    pieChart: {
        type: 'chart',
        title: 'Pie Chart',
        icon: PieChart,
        iconStr: 'pie-chart',
        style: { backgroundColor: '#FFFFFF' },
        defaultData: { chartType: 'pie', data: [{ name: 'A', value: 40, fill: '#60A5FA' }, { name: 'B', value: 60, fill: '#A3E635' }] }
    },
    barChart: {
        type: 'chart',
        title: 'Bar Chart',
        icon: BarChart2,
        iconStr: 'bar-chart-2',
        style: { backgroundColor: '#FFFFFF' },
        defaultData: {
            chartType: 'bar',
            categories: ['Q1', 'Q2', 'Q3', 'Q4'],
            series: [
                { name: 'Revenue', color: '#60A5FA', data: [40, 60, 75, 90] },
                { name: 'Cost', color: '#F87171', data: [20, 30, 40, 50] }
            ]
        }
    },
    technology: {
        type: 'technology',
        title: 'Technology',
        icon: Smartphone,
        iconStr: 'smartphone',
        style: { backgroundColor: '#FFFFFF' },
        defaultData: [
            { id: 'mobile', icon: 'mobile', active: true, os: 'ios' },
            { id: 'tablet', icon: 'tablet', active: false, os: null },
            { id: 'laptop', icon: 'laptop', active: true, os: 'windows' },
            { id: 'desktop', icon: 'desktop', active: false, os: null }
        ]
    },
    browsers: {
        type: 'browsers',
        title: 'Browsers',
        icon: Globe,
        iconStr: 'globe',
        style: { backgroundColor: '#FFFFFF' },
        defaultData: [
            { id: 'chrome', name: 'Chrome', value: 'Chrome', active: true },
            { id: 'firefox', name: 'Firefox', value: '', active: false },
            { id: 'edge', name: 'Edge', value: '', active: false },
            { id: 'opera', name: 'Opera', value: '', active: false },
            { id: 'safari', name: 'Safari', value: '', active: false }
        ]
    },
    skills: {
        type: 'skills',
        title: 'Skills',
        icon: Sliders,
        iconStr: 'sliders',
        style: { backgroundColor: '#FFFFFF' },
        defaultData: [
            { id: 's1', label: 'Music literacy', value: 75 },
            { id: 's2', label: 'Web proficiency', value: 60 },
            { id: 's3', label: 'Time management', value: 30 }
        ]
    },
    channels: {
        type: 'channels',
        title: 'Channels',
        icon: Smartphone,
        iconStr: 'smartphone',
        style: { backgroundColor: '#FFFFFF' },
        defaultData: [
            { id: 'smartphone', label: 'Smartphone' },
            { id: 'laptop', label: 'Laptop' },
            { id: 'youtube', label: 'YouTube' }
        ]
    },
    touchpoints: {
        type: 'touchpoints',
        title: 'Touchpoints',
        icon: MousePointer,
        iconStr: 'mouse-pointer',
        style: { backgroundColor: '#FFFFFF' },
        defaultData: [
            { id: 't1', label: 'Getting help', color: '#FDBA74', icon: 'zap' },
            { id: 't2', label: 'Asking question', color: '#FCD34D', icon: 'help-circle' },
            { id: 't3', label: 'Watching vlogs', color: '#2DD4BF', icon: 'video' },
            { id: 't4', label: 'Signing up', color: '#94A3B8', icon: 'log-in' },
            { id: 't5', label: 'Searching', color: '#F472B6', icon: 'search' }
        ]
    },
    // --- MEDIA / FILES TAB ---
    photo: {
        type: 'photo',
        title: 'Photo',
        icon: Camera,
        iconStr: 'camera',
        style: { backgroundColor: '#FFFFFF' },
        defaultContent: 'Photo Placeholder'
    },
    imageSection: {
        type: 'imageSection',
        title: 'Image section',
        icon: ImageIcon,
        iconStr: 'image',
        style: { backgroundColor: '#FFFFFF' },
        defaultData: { url: null }
    },
    documentSection: {
        type: 'documentSection',
        title: 'Document section',
        icon: File,
        iconStr: 'file',
        style: { backgroundColor: '#FFFFFF' },
        defaultData: [] // Array of { name, type, size }
    },
    metrics: {
        type: 'metrics',
        title: 'Metrics',
        icon: TrendingUp,
        iconStr: 'trending-up',
        style: { backgroundColor: '#FFFFFF', border: '1px solid #e2e8f0' },
        defaultData: {
            sourceType: 'vtrustx', // vtrustx, qualtrics, manual
            surveyId: '',
            metricType: 'nps', // nps, csat
            value: 0,
            target: 50,
            label: 'NPS Score'
        }
    },
    embedCode: {
        type: 'text',
        title: 'Embed code',
        icon: Code,
        iconStr: 'code',
        style: { backgroundColor: '#FFFFFF' },
        defaultContent: '<iframe src="https://youtube.com/..." />'
    },
    brandsInfluencers: {
        type: 'list',
        title: 'Brands and influencers',
        icon: Award,
        iconStr: 'award',
        style: { backgroundColor: '#FFFFFF' },
        defaultData: ['Evernote (Favorite)', 'Slack (Loyal)']
    }
};

export function ModernPersonaEditor({ persona, setPersona: setParentPersona, personaId, onClose }) {
    const toast = useToast();
    const [localPersona, setLocalPersona] = useState({
        name: 'New Persona',
        marketSize: 50,
        type: 'Rational',
        sections: []
    });

    const [showHelp, setShowHelp] = useState(false);
    const isDirtyRef = useRef(false);

    useEffect(() => {
        if (persona) setLocalPersona(persona);
    }, [persona]);

    const setPersona = (val) => {
        isDirtyRef.current = true;
        setLocalPersona(val);
        if (setParentPersona) setParentPersona(val);
    };

    const [loading, setLoading] = useState(false);
    const [selectedSectionId, setSelectedSectionId] = useState(null);
    const [showLeftPanel, setShowLeftPanel] = useState(true);
    const [showRightPanel, setShowRightPanel] = useState(true);
    const [activeTab, setActiveTab] = useState('text'); // text, graphs, media

    // Channel / Chart / Doc State
    const [showChannelModal, setShowChannelModal] = useState(false);
    const [activeChannelSectionId, setActiveChannelSectionId] = useState(null);

    const [showChartModal, setShowChartModal] = useState(false);
    const [activeChartSectionId, setActiveChartSectionId] = useState(null);

    const [showDocumentModal, setShowDocumentModal] = useState(false);
    const [activeDocumentSectionId, setActiveDocumentSectionId] = useState(null);

    const [surveys, setSurveys] = useState([]);
    const [showAIImprover, setShowAIImprover] = useState(false);
    const [showAIChat, setShowAIChat] = useState(false);

    useEffect(() => {
        if (personaId) loadPersona();
        // Fetch Surveys for Metrics Dropdown
        axios.get('/api/forms').then(res => setSurveys(res.data)).catch(console.error);
    }, [personaId]);

    const loadPersona = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/cx-personas/${personaId}`);
            // Map layout_config to sections, ensuring it is an array
            const data = res.data;
            let sections = [];
            if (Array.isArray(data.layout_config)) {
                sections = data.layout_config;
            } else if (data.layout_config && (data.layout_config.left || data.layout_config.right)) {
                // Migrate old format if needed, or just ignore
                sections = [];
            }
            setLocalPersona({ ...data, type: data.persona_type || data.type || 'Rational', sections });
        } catch (err) {
            console.error(err);
            toast.error("Failed to load persona data.");
        }
        setLoading(false);
    };

    const handleSave = async () => {
        try {
            const payload = {
                name: localPersona.name,
                title: localPersona.title, // Ensure title is saved
                layout_config: localPersona.sections, // Save sections array to layout_config
                status: localPersona.status || 'Draft',
                persona_type: localPersona.type
            };
            if (personaId) await axios.put(`/api/cx-personas/${personaId}`, payload);
            else await axios.post('/api/cx-personas', payload);
            isDirtyRef.current = false;
            toast.success("Saved successfully!");
        } catch (err) {
            console.error(err);
            toast.error("Error saving: " + (err.response?.data?.error || err.message));
        }
    };

    const addSection = (templateKey) => {
        const template = SECTION_TEMPLATES[templateKey];
        const id = Math.random().toString(36).substr(2, 9);
        const newSection = {
            id,
            type: template.type,
            title: template.title,
            content: template.defaultContent || '',
            data: template.defaultData ? JSON.parse(JSON.stringify(template.defaultData)) : [],
            style: template.style || {},
            icon: template.iconStr,
            layout: { i: id, x: 0, y: Infinity, w: 4, h: 4 }
        };
        isDirtyRef.current = true;
        setLocalPersona(prev => ({ ...prev, sections: [...prev.sections, newSection] }));
        setSelectedSectionId(id);
    };

    const updateSection = (id, updates) => {
        isDirtyRef.current = true;
        setLocalPersona(prev => ({
            ...prev,
            sections: prev.sections.map(s => s.id === id ? { ...s, ...updates } : s)
        }));
    };

    const updateLayouts = (layouts) => {
        setLocalPersona(prev => {
            const sectionMap = new Map(prev.sections.map(s => [s.id, s]));
            layouts.forEach(l => {
                if (sectionMap.has(l.i)) sectionMap.get(l.i).layout = { ...sectionMap.get(l.i).layout, ...l };
            });
            return { ...prev, sections: Array.from(sectionMap.values()) };
        });
    };

    const removeSection = (id) => {
        setLocalPersona(prev => ({ ...prev, sections: prev.sections.filter(s => s.id !== id) }));
        if (selectedSectionId === id) setSelectedSectionId(null);
    };

    const selectedSection = localPersona.sections.find(s => s.id === selectedSectionId);

    // --- CHANNEL LOGIC ---
    const handleManageChannels = (sectionId) => {
        setActiveChannelSectionId(sectionId);
        setShowChannelModal(true);
    };

    const handleChannelSelect = (channelItem) => {
        if (!activeChannelSectionId) return;
        const sectionIndex = localPersona.sections.findIndex(s => s.id === activeChannelSectionId);
        if (sectionIndex === -1) return;
        const section = localPersona.sections[sectionIndex];
        const currentData = section.data || [];
        const exists = currentData.find(c => c.id === channelItem.id);
        let newData;
        if (exists) { newData = currentData.filter(c => c.id !== channelItem.id); }
        else { newData = [...currentData, { id: channelItem.id, label: channelItem.label }]; }
        updateSection(activeChannelSectionId, { data: newData });
    };

    // --- CHART LOGIC ---
    const handleManageChart = (sectionId) => {
        setActiveChartSectionId(sectionId);
        setShowChartModal(true);
    };

    const handleChartSave = (chartData) => {
        if (!activeChartSectionId) return;
        updateSection(activeChartSectionId, { data: chartData });
    };

    // --- DOCUMENT LOGIC ---
    const handleManageDocuments = (sectionId) => {
        setActiveDocumentSectionId(sectionId);
        setShowDocumentModal(true);
    };

    const handleDocumentSelect = (doc) => {
        if (!activeDocumentSectionId) return;
        const sectionIndex = localPersona.sections.findIndex(s => s.id === activeDocumentSectionId);
        if (sectionIndex === -1) return;
        const section = localPersona.sections[sectionIndex];
        const currentData = Array.isArray(section.data) ? section.data : [];
        const newData = [...currentData, doc];
        updateSection(activeDocumentSectionId, { data: newData });
    };

    const ToolItem = ({ templateKey, badge }) => {
        const tmpl = SECTION_TEMPLATES[templateKey];
        const Icon = tmpl.icon;
        return (
            <div
                onClick={() => addSection(templateKey)}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', color: '#475569', cursor: 'pointer',
                    borderRadius: '6px', fontSize: '0.9em', transition: 'all 0.1s'
                }}
                onMouseOver={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }}
                onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#475569'; }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Icon size={16} />
                    <span>{tmpl.title}</span>
                </div>
                {badge && (<span style={{ fontSize: '0.65em', background: '#10B981', color: 'white', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>{badge}</span>)}
            </div>
        );
    };

    const TabButton = ({ id, icon: Icon, label }) => (
        <button
            onClick={() => setActiveTab(id)}
            style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', height: '50px',
                background: activeTab === id ? 'white' : 'transparent',
                border: 'none', borderBottom: activeTab === id ? '2px solid #10B981' : '1px solid #e2e8f0',
                color: activeTab === id ? '#10B981' : '#64748b', cursor: 'pointer', fontSize: '0.75em', fontWeight: 'bold', transition: 'all 0.2s'
            }}
        >
            <Icon size={18} />
            {label}
        </button>
    );

    const handleExportPNG = async () => {
        const element = document.getElementById('persona-canvas-container');
        if (!element) return;

        // Add class to hide tools
        element.classList.add('is-exporting');

        try {
            const canvas = await html2canvas(element, {
                scale: 2, // High res
                useCORS: true,
                backgroundColor: '#ffffff',
                ignoreElements: (node) => {
                    return node.classList && (node.classList.contains('grid-drag-handle') || node.tagName === 'BUTTON');
                }
            });

            const link = document.createElement('a');
            const name = localPersona.sections.find(s => s.type === 'header')?.data?.name || 'persona';
            link.download = `${name.replace(/\s+/g, '_')}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            console.error("PNG Export Failed", err);
            toast.error("Could not export image.");
        } finally {
            element.classList.remove('is-exporting');
        }
    };

    const handleExportExcel = () => {
        const rows = [];
        localPersona.sections.forEach(s => {
            const sectionName = s.title || s.type.toUpperCase();

            if (s.type === 'header') {
                rows.push({ Section: 'PROFILE', Field: 'Name', Value: s.data?.name });
                rows.push({ Section: 'PROFILE', Field: 'Role', Value: s.data?.role });
                rows.push({ Section: 'PROFILE', Field: 'Type', Value: s.data?.type });
            } else if (Array.isArray(s.data)) {
                s.data.forEach((item, i) => {
                    if (typeof item === 'string') {
                        rows.push({ Section: sectionName, Field: `Item ${i + 1}`, Value: item });
                    } else if (item.label && item.value) {
                        rows.push({ Section: sectionName, Field: item.label, Value: item.value });
                    }
                });
            } else if (s.content) {
                rows.push({ Section: sectionName, Field: 'Content', Value: s.content });
            }
        });

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Persona Data");
        XLSX.writeFile(wb, "persona_export.xlsx");
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8fafc', fontFamily: "'Inter', sans-serif" }}>
            <div className="no-print" style={{ height: '50px', background: 'var(--primary-color, #0f172a)', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', color: 'white' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ fontWeight: 'bold' }}>Persona Studio</div>
                    <button onClick={() => setShowLeftPanel(!showLeftPanel)} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: showLeftPanel ? 'rgba(255,255,255,0.2)' : 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', transition: 'all 0.2s' }}><PanelLeft size={14} /> Explorer</button>
                    <button onClick={() => setShowRightPanel(!showRightPanel)} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: showRightPanel ? 'rgba(255,255,255,0.2)' : 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', transition: 'all 0.2s' }}><PanelRight size={14} /> Properties</button>

                    {/* Print Styles */}
                    <style>
                        {`
                        /* Export Clean Styles */
                        .is-exporting .grid-drag-handle,
                        .is-exporting button,
                        .is-exporting input[type="range"] {
                            display: none !important;
                        }
                        .is-exporting textarea, 
                        .is-exporting input {
                            border: none !important;
                            resize: none !important;
                        }
                        
                        /* Export Clean Styles */
                        .is-exporting .grid-drag-handle,
                        .is-exporting button,
                        .is-exporting input[type="range"] {
                            display: none !important;
                        }
                        .is-exporting textarea,
                        .is-exporting input {
                            border: none !important;
                            resize: none !important;
                        }

                        /* Global Scrollbar Hide */
                        ::-webkit-scrollbar {
                            width: 0px;
                            background: transparent;
                        }
                        
                        @media print {
                            @page {
                                size: portrait;
                                margin: 10mm;
                            }
                            body, html {
                                width: 100%;
                                height: 100%;
                                margin: 0;
                                padding: 0;
                                background: white;
                            }
                            
                            /* Explicitly hide marked elements */
                            .no-print {
                                display: none !important;
                            }

                            /* Reset Layout constraints for the parents we can't tag */
                            /* We assume we'll tag the Header, Left/Right panels as no-print */
                            
                            /* The Scroll Container wrapper */
                            .print-layout-row,
                            .print-container-wrapper {
                                overflow: visible !important;
                                height: auto !important;
                                display: block !important;
                                width: 100% !important;
                                padding: 0 !important;
                                margin: 0 !important;
                                background: white !important;
                            }

                            /* Main Canvas Container */
                            #persona-canvas-container {
                                width: 100% !important;
                                min-width: 0 !important; /* Allow shrink */
                                max-width: 100% !important;
                                height: auto !important;
                                margin: 0 !important;
                                padding: 0 !important;
                                overflow: visible !important;
                                display: block !important;
                                transform: none !important;
                            }
                            
                            /* FORCE VERTICAL STACKING */
                            #persona-canvas-container .react-grid-layout {
                                height: auto !important;
                                display: block !important;
                            }

                            #persona-canvas-container .react-grid-item {
                                position: relative !important;
                                top: auto !important;
                                left: auto !important;
                                transform: none !important;
                                width: 100% !important;
                                height: auto !important;
                                margin-bottom: 20px !important;
                                page-break-inside: avoid !important;
                                break-inside: avoid !important;
                                border: 1px solid #e2e8f0 !important;
                                box-shadow: none !important;
                            }

                            /* Hide Tools */
                            .grid-drag-handle, 
                            button, 
                            .recharts-wrapper .recharts-tooltip-cursor,
                            input[type="range"] {
                                display: none !important;
                            }
                            
                            input, textarea, select {
                                border: none !important;
                                background: transparent !important;
                                appearance: none;
                                resize: none;
                            }
                        }
                        `}
                    </style>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setShowAIImprover(true)} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(139,92,246,0.2))', border: '1px solid rgba(167,139,250,0.4)', color: '#c4b5fd', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(124,58,237,0.5), rgba(139,92,246,0.4))'} onMouseOut={e => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(139,92,246,0.2))'}><Wand2 size={15} /> AI Improve</button>
                    <button onClick={() => setShowAIChat(true)} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(37,99,235,0.2))', border: '1px solid rgba(96,165,250,0.4)', color: '#93c5fd', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59,130,246,0.5), rgba(37,99,235,0.4))'} onMouseOut={e => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(37,99,235,0.2))'}><MessageCircle size={15} /> Chat</button>
                    <button onClick={() => setShowHelp(true)} style={{ background: 'transparent', border: '1px solid #334155', color: '#94a3b8', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', gap: '5px', alignItems: 'center' }}>Help <span style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#334155', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>?</span></button>
                    <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}><Printer size={16} /> PRINT</button>
                    <button onClick={handleExportExcel} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}><FileSpreadsheet size={16} /> Excel</button>
                    <button onClick={handleExportPNG} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}><Download size={16} /> PNG</button>
                    <button onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'white', border: '1px solid white', color: 'var(--primary-color, #0f172a)', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}><Save size={16} /> SAVE</button>
                    <button onClick={() => { if (!isDirtyRef.current || window.confirm('You have unsaved changes. Are you sure you want to close?')) onClose(); }} style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(0,0,0,0.1)', color: 'white', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>CLOSE</button>
                </div>
            </div>

            {showHelp && <PersonaHelpModal onClose={() => setShowHelp(false)} />}

            <ChannelSelectorModal
                isOpen={showChannelModal}
                onClose={() => setShowChannelModal(false)}
                onSelect={handleChannelSelect}
                selectedChannels={activeChannelSectionId ? (localPersona.sections.find(s => s.id === activeChannelSectionId)?.data || []) : []}
            />

            <ChartEditorModal
                isOpen={showChartModal}
                onClose={() => setShowChartModal(false)}
                onSave={handleChartSave}
                initialData={activeChartSectionId ? (localPersona.sections.find(s => s.id === activeChartSectionId)?.data) : null}
            />

            <DocumentSelectorModal
                isOpen={showDocumentModal}
                onClose={() => setShowDocumentModal(false)}
                onSelect={handleDocumentSelect}
            />

            <AIPersonaImprover
                isOpen={showAIImprover}
                onClose={() => setShowAIImprover(false)}
                sections={localPersona.sections}
                personaName={localPersona.sections.find(s => s.type === 'header')?.data?.name || localPersona.name}
                personaRole={localPersona.sections.find(s => s.type === 'header')?.data?.role || localPersona.title}
                onApplySectionUpdate={(sectionId, updates) => updateSection(sectionId, updates)}
            />

            <AIPersonaChat
                isOpen={showAIChat}
                onClose={() => setShowAIChat(false)}
                sections={localPersona.sections}
                personaName={localPersona.sections.find(s => s.type === 'header')?.data?.name || localPersona.name}
                personaRole={localPersona.sections.find(s => s.type === 'header')?.data?.role || localPersona.title}
                personaType={localPersona.type}
            />

            <div className="print-layout-row" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {showLeftPanel && (
                    <div className="no-print" style={{ width: '250px', background: 'white', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', flex: 1 }}>
                                <TabButton id="text" icon={FileText} label="TEXT" />
                                <TabButton id="graphs" icon={BarChart2} label="GRAPHS" />
                                <TabButton id="media" icon={ImageIcon} label="MEDIA" />
                            </div>
                        </div>
                        {activeTab === 'text' && (
                            <>
                                <div style={{ padding: '20px 15px', color: '#64748b', fontSize: '0.75em', fontWeight: 'bold' }}>CORE</div>
                                <ToolItem templateKey="header" badge="REQUIRED" />
                                <div style={{ padding: '20px 15px', color: '#64748b', fontSize: '0.75em', fontWeight: 'bold' }}>LISTS</div>
                                <ToolItem templateKey="goals" />
                                <ToolItem templateKey="frustrations" />
                                <ToolItem templateKey="motivations" />
                                <ToolItem templateKey="needs" />
                                <div style={{ padding: '20px 15px 5px 15px', color: '#64748b', fontSize: '0.75em', fontWeight: 'bold' }}>NARRATIVE</div>
                                <ToolItem templateKey="quote" />
                                <ToolItem templateKey="challenges" />
                                <ToolItem templateKey="scenarios" />
                                <ToolItem templateKey="text" />
                                <ToolItem templateKey="context" />
                                <ToolItem templateKey="previousExperience" />
                                <ToolItem templateKey="expectations" />
                                <div style={{ padding: '20px 15px 5px 15px', color: '#64748b', fontSize: '0.75em', fontWeight: 'bold' }}>PROFILE</div>
                                <ToolItem templateKey="demographic" />
                            </>
                        )}
                        {activeTab === 'graphs' && (
                            <>
                                <div style={{ padding: '20px 15px', color: '#64748b', fontSize: '0.75em', fontWeight: 'bold' }}>DATA VISUALIZATION</div>
                                <ToolItem templateKey="pieChart" />
                                <ToolItem templateKey="barChart" />
                                <ToolItem templateKey="skills" />
                                <ToolItem templateKey="technology" />
                                <ToolItem templateKey="browsers" />
                                <ToolItem templateKey="channels" />
                                <ToolItem templateKey="touchpoints" badge="BUSINESS" />
                            </>
                        )}
                        {activeTab === 'media' && (
                            <>
                                <div style={{ padding: '20px 15px', color: '#64748b', fontSize: '0.75em', fontWeight: 'bold' }}>MEDIA & FILES</div>
                                <ToolItem templateKey="photo" />
                                <ToolItem templateKey="imageSection" />
                                <ToolItem templateKey="documentSection" />
                                <ToolItem templateKey="metrics" badge="PRO" />
                                <ToolItem templateKey="embedCode" badge="PRO" />
                                <ToolItem templateKey="brandsInfluencers" />
                            </>
                        )}
                    </div>
                )}

                <div className="print-container-wrapper" style={{ flex: 1, overflow: 'auto', padding: '30px', background: '#f1f5f9' }}>
                    <div
                        id="persona-canvas-container"
                        style={{ width: '1200px', margin: '0 auto', padding: '40px', overflowY: 'auto', position: 'relative' }}
                        onClick={() => setSelectedSectionId(null)}
                    >
                        <PersonaCanvas
                            sections={localPersona.sections}
                            updateSection={updateSection}
                            removeSection={removeSection}
                            updateLayouts={updateLayouts}
                            selectedSectionId={selectedSectionId}
                            onSelectSection={setSelectedSectionId}
                            personalityColor={(localPersona.type === 'Idealist' ? '#A3E635' : localPersona.type === 'Rational' ? '#60A5FA' : localPersona.type === 'Artisan' ? '#FBBF24' : localPersona.type === 'Guardian' ? '#818CF8' : '#22d3ee')}
                            onManageChannels={handleManageChannels}
                            onManageChart={handleManageChart}
                            onManageDocuments={handleManageDocuments}
                            personaName={localPersona.sections.find(s => s.type === 'header')?.data?.name || localPersona.name}
                            personaRole={localPersona.sections.find(s => s.type === 'header')?.data?.role || localPersona.title}
                        />
                    </div>
                </div>

                {showRightPanel && (
                    <div className="no-print" style={{ width: '300px', background: 'white', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ fontSize: '0.85em', fontWeight: 'bold', color: '#64748b' }}>PROPERTIES</div>
                        </div>
                        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
                            {selectedSection ? (
                                <div>
                                    <div style={{ marginBottom: '15px' }}>
                                        <label style={{ display: 'block', fontSize: '0.8em', marginBottom: '5px' }}>Title</label>
                                        <input value={selectedSection.title} onChange={e => updateSection(selectedSection.id, { title: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px' }} />
                                    </div>
                                    <div style={{ fontSize: '0.8em', color: '#64748b' }}>Type: <span style={{ fontFamily: 'monospace' }}>{selectedSection.type}</span></div>
                                    {selectedSection.type === 'metrics' && (
                                        <div style={{ marginTop: '15px', borderTop: '1px solid #f1f5f9', paddingTop: '15px' }}>
                                            <label style={{ display: 'block', fontSize: '0.8em', marginBottom: '8px', fontWeight: 'bold' }}>Data Source</label>
                                            <select
                                                value={selectedSection.data?.sourceType || 'vtrustx'}
                                                onChange={e => updateSection(selectedSection.id, { data: { ...selectedSection.data, sourceType: e.target.value } })}
                                                style={{ width: '100%', padding: '8px', marginBottom: '10px', borderRadius: '4px', border: '1px solid #e2e8f0' }}
                                            >
                                                <option value="vtrustx">VTrustX Surveys</option>
                                                <option value="qualtrics">Qualtrics Integration</option>
                                                <option value="manual">Manual Entry</option>
                                            </select>

                                            {selectedSection.data?.sourceType === 'vtrustx' && (
                                                <>
                                                    <label style={{ display: 'block', fontSize: '0.8em', marginBottom: '5px' }}>Select Survey</label>
                                                    <select
                                                        value={selectedSection.data?.surveyId || ''}
                                                        onChange={e => updateSection(selectedSection.id, { data: { ...selectedSection.data, surveyId: e.target.value } })}
                                                        style={{ width: '100%', padding: '8px', marginBottom: '10px', borderRadius: '4px', border: '1px solid #e2e8f0' }}
                                                    >
                                                        <option value="">-- Choose Survey --</option>
                                                        {surveys.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                                                    </select>
                                                </>
                                            )}

                                            {selectedSection.data?.sourceType === 'qualtrics' && (
                                                <>
                                                    <label style={{ display: 'block', fontSize: '0.8em', marginBottom: '5px' }}>Qualtrics Survey ID</label>
                                                    <input
                                                        placeholder="SV_..."
                                                        value={selectedSection.data?.qualtricsId || ''}
                                                        onChange={e => updateSection(selectedSection.id, { data: { ...selectedSection.data, qualtricsId: e.target.value } })}
                                                        style={{ width: '100%', padding: '8px', marginBottom: '10px', borderRadius: '4px', border: '1px solid #e2e8f0' }}
                                                    />
                                                </>
                                            )}

                                            <label style={{ display: 'block', fontSize: '0.8em', marginBottom: '5px' }}>Metric Type</label>
                                            <select
                                                value={selectedSection.data?.metricType || 'nps'}
                                                onChange={e => updateSection(selectedSection.id, { data: { ...selectedSection.data, metricType: e.target.value, label: e.target.value.toUpperCase() } })}
                                                style={{ width: '100%', padding: '8px', marginBottom: '10px', borderRadius: '4px', border: '1px solid #e2e8f0' }}
                                            >
                                                <option value="nps">NPS (Net Promoter Score)</option>
                                                <option value="csat">CSAT (Customer Satisfaction)</option>
                                            </select>

                                            <label style={{ display: 'block', fontSize: '0.8em', marginBottom: '5px' }}>Target Value</label>
                                            <input
                                                type="number"
                                                value={selectedSection.data?.target || 50}
                                                onChange={e => updateSection(selectedSection.id, { data: { ...selectedSection.data, target: Number(e.target.value) } })}
                                                style={{ width: '100%', padding: '8px', marginBottom: '10px', borderRadius: '4px', border: '1px solid #e2e8f0' }}
                                            />
                                        </div>
                                    )}

                                    <button onClick={() => removeSection(selectedSection.id)} style={{ marginTop: '20px', width: '100%', padding: '10px', background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Remove Section</button>
                                </div>
                            ) : (
                                <div style={{ color: '#94a3b8', textAlign: 'center', marginTop: '50px' }}>
                                    <MousePointer size={32} style={{ marginBottom: '10px', opacity: 0.5 }} />
                                    <div>Select a section to edit properties</div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
