import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Type, Activity, MessageSquare, Image, FileText, MousePointer, MoreHorizontal, BarChart3, Lightbulb, AlertTriangle, CheckSquare, User, TrendingUp } from 'lucide-react';

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

export function SidebarToolbox() {
    return (
        <div className="cjm-sidebar">
            <h3>Toolbox</h3>
            <div className="cjm-tools-grid">
                <ToolItem type="text" label="Rich Text" icon={Type} color="#64748b" />
                <ToolItem type="sentiment_graph" label="Sentiment" icon={Activity} color="#2C9BAD" />
                <ToolItem type="touchpoints" label="Touchpoints" icon={MousePointer} color="#f59e0b" />
                <ToolItem type="storyboard" label="Storyboard" icon={Image} color="#8b5cf6" />
                <ToolItem type="process_flow" label="Process Flow" icon={MoreHorizontal} color="#3b82f6" />
                <ToolItem type="file_embed" label="File Embed" icon={FileText} color="#6366f1" />
                <ToolItem type="kpi" label="KPI / Metrics" icon={BarChart3} color="#10b981" />
                <ToolItem type="opportunity" label="Opportunities" icon={Lightbulb} color="#eab308" />
                <ToolItem type="pain_point" label="Pain Points" icon={AlertTriangle} color="#ef4444" />
                <ToolItem type="actions" label="Actions" icon={CheckSquare} color="#14b8a6" />
                <ToolItem type="persona" label="Persona Lane" icon={User} color="#ec4899" />
                <ToolItem type="emotion_curve" label="Emotion Curve" icon={TrendingUp} color="#0ea5e9" />
            </div>
        </div>
    );
}
