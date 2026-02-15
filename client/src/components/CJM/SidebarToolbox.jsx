import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import {
    Type, Activity, Image, FileText, MousePointer, MoreHorizontal,
    BarChart3, Lightbulb, AlertTriangle, CheckSquare, User, TrendingUp,
    Target, Brain, ShieldAlert, Zap, Play, PieChart, Eye, Cog, HeadphonesIcon,
    Code, Minus, Radio, ChevronDown, ChevronRight, X
} from 'lucide-react';

const ToolItem = ({ type, label, icon: Icon, color }) => {
    const { attributes, listeners, setNodeRef } = useDraggable({
        id: `toolbox_${type}`,
        data: { type: 'TOOLBOX_ITEM', payload: type }
    });

    return (
        <div ref={setNodeRef} {...listeners} {...attributes} className="cjm-toolbox-item" style={{ borderLeftColor: color || '#cbd5e1', borderLeftWidth: '3px' }}>
            <Icon size={20} />
            <span>{label}</span>
        </div>
    );
};

const ToolGroup = ({ title, children, defaultOpen = true }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="cjm-tool-group">
            <button className="cjm-tool-group-toggle" onClick={() => setOpen(!open)}>
                {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span>{title}</span>
            </button>
            {open && <div className="cjm-tools-grid">{children}</div>}
        </div>
    );
};

export function SidebarToolbox({ onClose }) {
    return (
        <div className="cjm-sidebar">
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px'
            }}>
                <h3 style={{ margin: 0 }}>Toolbox</h3>
                {onClose && (
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '4px',
                            color: '#64748b',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#f1f5f9';
                            e.currentTarget.style.color = '#0f172a';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = '#64748b';
                        }}
                        title="Hide Toolbox"
                    >
                        <X size={18} />
                    </button>
                )}
            </div>

            <ToolGroup title="Customer Experience">
                <ToolItem type="text" label="Rich Text" icon={Type} color="#64748b" />
                <ToolItem type="goals" label="Goals" icon={Target} color="#0d9488" />
                <ToolItem type="think_feel" label="Think & Feel" icon={Brain} color="#a855f7" />
                <ToolItem type="sentiment_graph" label="Sentiment" icon={Activity} color="#2C9BAD" />
                <ToolItem type="emotion_curve" label="Emotion Curve" icon={TrendingUp} color="#0ea5e9" />
                <ToolItem type="persona" label="Persona Lane" icon={User} color="#ec4899" />
            </ToolGroup>

            <ToolGroup title="Interactions">
                <ToolItem type="touchpoints" label="Touchpoints" icon={MousePointer} color="#f59e0b" />
                <ToolItem type="channels" label="Channels" icon={Radio} color="#7c3aed" />
                <ToolItem type="process_flow" label="Process Flow" icon={MoreHorizontal} color="#3b82f6" />
                <ToolItem type="actions" label="Actions" icon={CheckSquare} color="#14b8a6" />
            </ToolGroup>

            <ToolGroup title="Insights">
                <ToolItem type="pain_point" label="Pain Points" icon={AlertTriangle} color="#ef4444" />
                <ToolItem type="barriers" label="Barriers" icon={ShieldAlert} color="#dc2626" />
                <ToolItem type="motivators" label="Motivators" icon={Zap} color="#22c55e" />
                <ToolItem type="opportunity" label="Opportunities" icon={Lightbulb} color="#eab308" />
            </ToolGroup>

            <ToolGroup title="Data & Media">
                <ToolItem type="kpi" label="KPI / Metrics" icon={BarChart3} color="#10b981" />
                <ToolItem type="chart" label="Chart" icon={PieChart} color="#6366f1" />
                <ToolItem type="storyboard" label="Storyboard" icon={Image} color="#8b5cf6" />
                <ToolItem type="video_embed" label="Video" icon={Play} color="#e11d48" />
                <ToolItem type="file_embed" label="File Embed" icon={FileText} color="#6366f1" />
                <ToolItem type="embed_code" label="Embed Code" icon={Code} color="#475569" />
            </ToolGroup>

            <ToolGroup title="Service Blueprint" defaultOpen={false}>
                <ToolItem type="frontstage" label="Frontstage" icon={Eye} color="#0891b2" />
                <ToolItem type="backstage" label="Backstage" icon={Cog} color="#64748b" />
                <ToolItem type="support_process" label="Support Process" icon={HeadphonesIcon} color="#7c3aed" />
                <ToolItem type="divider" label="Divider" icon={Minus} color="#cbd5e1" />
            </ToolGroup>
        </div>
    );
}
