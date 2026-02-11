import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
    addEdge,
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    MarkerType,
    Handle,
    Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import axios from 'axios';
import { JourneyMapView } from './JourneyMapView';
import { Layout, Map, Activity, Trash2 } from 'lucide-react'; // Icons
import { useToast } from './common/Toast';

// --- CUSTOM NODES (Existing Flowchart) ---
const TriggerNode = ({ data }) => {
    return (
        <div style={{ background: 'var(--deep-bg)', border: '1px solid var(--status-success)', borderRadius: '8px', padding: '10px', minWidth: '150px' }}>
            <Handle type="source" position={Position.Bottom} style={{ background: 'var(--status-success)' }} />
            <div style={{ fontWeight: 'bold', borderBottom: '1px solid var(--glass-border)', paddingBottom: '5px', marginBottom: '5px', fontSize: '0.9em', color: 'var(--text-muted)' }}>⚡ TRIGGER</div>
            <div style={{ fontSize: '0.85em' }}>{data.label}</div>
        </div>
    );
};

const ActionNode = ({ data }) => {
    return (
        <div style={{ background: 'var(--surface-bg)', border: '1px solid var(--secondary-color)', borderRadius: '8px', padding: '10px', minWidth: '150px' }}>
            <Handle type="target" position={Position.Top} style={{ background: 'var(--secondary-color)' }} />
            <div style={{ fontWeight: 'bold', borderBottom: '1px solid var(--glass-border)', paddingBottom: '5px', marginBottom: '5px', fontSize: '0.9em', color: 'var(--secondary-color)' }}>🚀 ACTION</div>
            <div style={{ fontSize: '0.85em' }}>{data.label}</div>
            <Handle type="source" position={Position.Bottom} style={{ background: 'var(--secondary-color)' }} />
        </div>
    );
};

const ConditionNode = ({ data }) => {
    return (
        <div style={{ background: 'var(--surface-bg)', border: '1px solid var(--primary-color)', borderRadius: '40px', padding: '15px', minWidth: '120px', textAlign: 'center' }}>
            <Handle type="target" position={Position.Top} style={{ background: 'var(--primary-color)' }} />
            <div style={{ fontWeight: 'bold', fontSize: '0.9em', color: 'var(--primary-color)', marginBottom: '4px' }}>❓ IF / ELSE</div>
            <div style={{ fontSize: '0.8em' }}>{data.label}</div>

            {/* Two outputs for Yes/No logic */}
            <div style={{ position: 'absolute', bottom: '-8px', left: '20%', fontSize: '0.6em', background: 'white', padding: '2px', color: 'var(--status-success)', fontWeight: 'bold' }}>YES</div>
            <Handle type="source" position={Position.Bottom} id="yes" style={{ left: '25%', background: 'var(--status-success)' }} />

            <div style={{ position: 'absolute', bottom: '-8px', right: '20%', fontSize: '0.6em', background: 'white', padding: '2px', color: 'var(--status-error)', fontWeight: 'bold' }}>NO</div>
            <Handle type="source" position={Position.Bottom} id="no" style={{ left: '75%', background: 'var(--status-error)' }} />
        </div>
    );
};

const nodeTypes = {
    trigger: TriggerNode,
    action: ActionNode,
    condition: ConditionNode,
};

// --- MAIN COMPONENT ---

export function JourneyBuilder() {
    const toast = useToast();
    const [view, setView] = useState('list'); // list, builder
    const [builderMode, setBuilderMode] = useState('map'); // 'map' (UXPressia) or 'flow' (ReactFlow)

    const [journeys, setJourneys] = useState([]);
    const [currentJourney, setCurrentJourney] = useState(null);

    // ReactFlow State
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    // Map State
    const [mapData, setMapData] = useState(null);

    // Create Modal State
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState('');

    useEffect(() => {
        if (view === 'list') loadJourneys();
    }, [view]);

    const loadJourneys = () => {
        axios.get('/api/journeys')
            .then(res => setJourneys(res.data))
            .catch(console.error);
    };

    const handleCreate = () => {
        axios.post('/api/journeys', { name: newName })
            .then(res => {
                setShowCreate(false);
                setNewName('');
                openJourney(res.data);
            });
    };

    const handleDelete = (e, id) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this journey?')) {
            axios.delete(`/api/journeys/${id}`)
                .then(() => loadJourneys())
                .catch(err => toast.error('Failed to delete journey: ' + err.message));
        }
    };

    const openJourney = (journey) => {
        setCurrentJourney(journey);
        // Load latest version details
        axios.get(`/api/journeys/${journey.id}`)
            .then(res => {
                let def = res.data.latestVersion.definition || {};

                // Compatibility check: Old format vs New format
                if (def.nodes && !def.flow) {
                    // Convert old to new structure
                    def = {
                        mode: 'flow',
                        flow: { nodes: def.nodes, edges: def.edges },
                        map: null
                    };
                }

                setNodes(def.flow?.nodes || []);
                setEdges(def.flow?.edges || []);
                setMapData(def.map || null); // JourneyMapView handles null defaults

                // Default to 'map' if no mode set, or use saved mode
                setBuilderMode(def.mode || 'map');

                setView('builder');
            });
    };

    const onConnect = useCallback((params) => setEdges((eds) => addEdge({ ...params, markerEnd: { type: MarkerType.ArrowClosed } }, eds)), [setEdges]);

    const handleSave = () => {
        if (!currentJourney) return;
        const definition = {
            mode: builderMode,
            flow: { nodes, edges },
            map: mapData
        };
        axios.put(`/api/journeys/${currentJourney.id}/definition`, { definition })
            .then(() => toast.success('Journey saved successfully!'))
            .catch(err => toast.error('Save failed: ' + err.message));
    };

    // Drag & Drop Handlers (Simplified: Click to add for now)
    const addNode = (type, label) => {
        const id = `${type}-${Date.now()}`;
        const newNode = {
            id,
            type,
            position: { x: 250, y: nodes.length * 100 + 50 },
            data: { label },
        };
        setNodes((nds) => nds.concat(newNode));
    };

    if (view === 'list') {
        return (
            <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'inherit', color: 'var(--text-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <div>
                        <h1 style={{ margin: 0 }}>Journey Orchestration</h1>
                        <p style={{ color: 'var(--text-muted)' }}>Design automated customer experiences.</p>
                    </div>
                    <button
                        onClick={() => setShowCreate(true)}
                        style={{ padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold' }}
                    >
                        + New Journey
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    {journeys.map(j => (
                        <div key={j.id}
                            onClick={() => openJourney(j)}
                            style={{ background: 'var(--card-bg)', border: '1px solid var(--input-border)', borderRadius: '12px', padding: '20px', cursor: 'pointer', transition: 'transform 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <span style={{ background: j.status === 'active' ? 'var(--sidebar-active-bg)' : 'var(--input-border)', color: j.status === 'active' ? 'var(--sidebar-active-text)' : 'var(--text-muted)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8em', fontWeight: 'bold', textTransform: 'uppercase' }}>{j.status}</span>
                                <span style={{ fontSize: '0.8em', color: 'var(--text-muted)' }}>{new Date(j.updated_at).toLocaleDateString()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: '0 0 5px 0' }}>{j.name}</h3>
                                <button
                                    onClick={(e) => handleDelete(e, j.id)}
                                    style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                                    title="Delete Journey"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.9em', color: 'var(--text-muted)' }}>{j.active_instances || 0} active customers</p>
                        </div>
                    ))}
                </div>

                {showCreate && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                        <div style={{ background: 'var(--card-bg)', padding: '30px', borderRadius: '12px', width: '400px', color: 'var(--text-color)' }}>
                            <h2 style={{ marginTop: 0 }}>New Journey</h2>
                            <input
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                placeholder="Journey Name"
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--input-border)', marginBottom: '20px' }}
                            />
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={handleCreate} style={{ flex: 1, padding: '12px', borderRadius: '8px', fontWeight: 'bold' }}>Create</button>
                                <button onClick={() => setShowCreate(false)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid var(--input-border)', borderRadius: '8px', cursor: 'pointer', color: 'var(--primary-color)', fontWeight: 'bold' }}>Cancel</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div style={{ height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column' }}>
            {/* TOOLBAR */}
            <div style={{ height: '60px', borderBottom: '1px solid var(--input-border)', display: 'flex', alignItems: 'center', padding: '0 20px', justifyContent: 'space-between', background: 'var(--card-bg)', color: 'var(--text-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button onClick={() => setView('list')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2em' }}>⬅</button>
                    <div>
                        <h3 style={{ margin: 0 }}>{currentJourney?.name}</h3>
                        <div style={{ fontSize: '0.8em', color: 'var(--text-muted)' }}>Version 1.0</div>
                    </div>
                </div>

                {/* MODE TOGGLE */}
                <div style={{ background: 'var(--sidebar-hover-bg)', padding: '4px', borderRadius: '8px', display: 'flex' }}>
                    <button
                        onClick={() => setBuilderMode('map')}
                        style={{
                            padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.9em', display: 'flex', gap: '6px', alignItems: 'center',
                            background: builderMode === 'map' ? 'var(--surface-bg)' : 'transparent',
                            boxShadow: builderMode === 'map' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                            fontWeight: builderMode === 'map' ? '600' : 'normal'
                        }}
                    >
                        <Map size={16} /> Map
                    </button>
                    <button
                        onClick={() => setBuilderMode('flow')}
                        style={{
                            padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.9em', display: 'flex', gap: '6px', alignItems: 'center',
                            background: builderMode === 'flow' ? 'var(--surface-bg)' : 'transparent',
                            boxShadow: builderMode === 'flow' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                            fontWeight: builderMode === 'flow' ? '600' : 'normal'
                        }}
                    >
                        <Activity size={16} /> Workflow
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    {builderMode === 'flow' && (
                        <>
                            <button onClick={() => addNode('trigger', 'Start')} style={{ padding: '8px 16px', background: 'var(--deep-bg)', color: 'var(--text-muted)', border: '1px solid var(--status-success)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9em' }}>+ Trigger</button>
                            <button onClick={() => addNode('action', 'Action')} style={{ padding: '8px 16px', background: 'var(--surface-bg)', color: 'var(--secondary-color)', border: '1px solid var(--secondary-color)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9em' }}>+ Action</button>
                        </>
                    )}
                    <button onClick={handleSave} style={{ padding: '8px 24px', borderRadius: '6px', fontWeight: 'bold' }}>Save</button>
                </div>
            </div>

            {/* CANVAS */}
            <div style={{ flex: 1, background: 'var(--deep-bg)', overflow: 'hidden' }}>
                {builderMode === 'map' ? (
                    <JourneyMapView data={mapData} onChange={setMapData} />
                ) : (
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        nodeTypes={nodeTypes}
                        fitView
                    >
                        <Background />
                        <Controls />
                        <MiniMap />
                    </ReactFlow>
                )}
            </div>
        </div>
    );
}
