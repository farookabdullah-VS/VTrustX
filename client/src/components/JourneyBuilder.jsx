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
import { Layout, Map, Activity } from 'lucide-react'; // Icons

// --- CUSTOM NODES (Existing Flowchart) ---
const TriggerNode = ({ data }) => {
    return (
        <div style={{ background: '#ecfdf5', border: '1px solid #10b981', borderRadius: '8px', padding: '10px', minWidth: '150px' }}>
            <Handle type="source" position={Position.Bottom} style={{ background: '#10b981' }} />
            <div style={{ fontWeight: 'bold', borderBottom: '1px solid #a7f3d0', paddingBottom: '5px', marginBottom: '5px', fontSize: '0.9em', color: '#065f46' }}>⚡ TRIGGER</div>
            <div style={{ fontSize: '0.85em' }}>{data.label}</div>
        </div>
    );
};

const ActionNode = ({ data }) => {
    return (
        <div style={{ background: '#eff6ff', border: '1px solid #3b82f6', borderRadius: '8px', padding: '10px', minWidth: '150px' }}>
            <Handle type="target" position={Position.Top} style={{ background: '#3b82f6' }} />
            <div style={{ fontWeight: 'bold', borderBottom: '1px solid #bfdbfe', paddingBottom: '5px', marginBottom: '5px', fontSize: '0.9em', color: '#1e40af' }}>🚀 ACTION</div>
            <div style={{ fontSize: '0.85em' }}>{data.label}</div>
            <Handle type="source" position={Position.Bottom} style={{ background: '#3b82f6' }} />
        </div>
    );
};

const ConditionNode = ({ data }) => {
    return (
        <div style={{ background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: '40px', padding: '15px', minWidth: '120px', textAlign: 'center' }}>
            <Handle type="target" position={Position.Top} style={{ background: '#f59e0b' }} />
            <div style={{ fontWeight: 'bold', fontSize: '0.9em', color: '#92400e', marginBottom: '4px' }}>❓ IF / ELSE</div>
            <div style={{ fontSize: '0.8em' }}>{data.label}</div>

            {/* Two outputs for Yes/No logic */}
            <div style={{ position: 'absolute', bottom: '-8px', left: '20%', fontSize: '0.6em', background: 'white', padding: '2px', color: '#10b981', fontWeight: 'bold' }}>YES</div>
            <Handle type="source" position={Position.Bottom} id="yes" style={{ left: '25%', background: '#10b981' }} />

            <div style={{ position: 'absolute', bottom: '-8px', right: '20%', fontSize: '0.6em', background: 'white', padding: '2px', color: '#ef4444', fontWeight: 'bold' }}>NO</div>
            <Handle type="source" position={Position.Bottom} id="no" style={{ left: '75%', background: '#ef4444' }} />
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
            .then(() => alert('Journey saved successfully!'))
            .catch(err => alert('Save failed: ' + err.message));
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
            <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto', fontFamily: "'Outfit', sans-serif" }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <div>
                        <h1 style={{ margin: 0 }}>Journey Orchestration</h1>
                        <p style={{ color: '#64748b' }}>Design automated customer experiences.</p>
                    </div>
                    <button
                        onClick={() => setShowCreate(true)}
                        style={{ padding: '12px 24px', background: '#064e3b', color: '#D9F8E5', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        + New Journey
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    {journeys.map(j => (
                        <div key={j.id}
                            onClick={() => openJourney(j)}
                            style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', cursor: 'pointer', transition: 'transform 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <span style={{ background: j.status === 'active' ? '#dcfce7' : '#f1f5f9', color: j.status === 'active' ? '#166534' : '#64748b', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8em', fontWeight: 'bold', textTransform: 'uppercase' }}>{j.status}</span>
                                <span style={{ fontSize: '0.8em', color: '#94a3b8' }}>{new Date(j.updated_at).toLocaleDateString()}</span>
                            </div>
                            <h3 style={{ margin: '0 0 5px 0' }}>{j.name}</h3>
                            <p style={{ margin: 0, fontSize: '0.9em', color: '#64748b' }}>{j.active_instances || 0} active customers</p>
                        </div>
                    ))}
                </div>

                {showCreate && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ background: '#D9F8E5', padding: '30px', borderRadius: '12px', width: '400px' }}>
                            <h2 style={{ marginTop: 0 }}>New Journey</h2>
                            <input
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                placeholder="Journey Name"
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '20px' }}
                            />
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={handleCreate} style={{ flex: 1, padding: '12px', background: '#064e3b', color: '#D9F8E5', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>Create</button>
                                <button onClick={() => setShowCreate(false)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', color: '#064e3b', fontWeight: 'bold' }}>Cancel</button>
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
            <div style={{ height: '60px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', padding: '0 20px', justifyContent: 'space-between', background: 'white' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button onClick={() => setView('list')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2em' }}>⬅</button>
                    <div>
                        <h3 style={{ margin: 0 }}>{currentJourney?.name}</h3>
                        <div style={{ fontSize: '0.8em', color: '#64748b' }}>Version 1.0</div>
                    </div>
                </div>

                {/* MODE TOGGLE */}
                <div style={{ background: '#f1f5f9', padding: '4px', borderRadius: '8px', display: 'flex' }}>
                    <button
                        onClick={() => setBuilderMode('map')}
                        style={{
                            padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.9em', display: 'flex', gap: '6px', alignItems: 'center',
                            background: builderMode === 'map' ? 'white' : 'transparent',
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
                            background: builderMode === 'flow' ? 'white' : 'transparent',
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
                            <button onClick={() => addNode('trigger', 'Start')} style={{ padding: '8px 16px', background: '#ecfdf5', color: '#065f46', border: '1px solid #10b981', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9em' }}>+ Trigger</button>
                            <button onClick={() => addNode('action', 'Action')} style={{ padding: '8px 16px', background: '#eff6ff', color: '#1e40af', border: '1px solid #3b82f6', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9em' }}>+ Action</button>
                        </>
                    )}
                    <button onClick={handleSave} style={{ padding: '8px 24px', background: '#064e3b', color: '#D9F8E5', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Save</button>
                </div>
            </div>

            {/* CANVAS */}
            <div style={{ flex: 1, background: '#f8fafc', overflow: 'hidden' }}>
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
