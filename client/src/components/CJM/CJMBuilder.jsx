import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useToast } from '../common/Toast';
import { DndContext, closestCenter, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { SidebarToolbox } from './SidebarToolbox';
import { CJMGrid } from './CJMGrid';
import { CJMHeader } from './CJMHeader';
import { CJMComments } from './CJMComments';
import { ShareDialog } from './ShareDialog';
import { VersionHistory } from './VersionHistory';
import { CJMAnalytics } from './CJMAnalytics';
import { CJMExportModal } from './CJMExportModal';
import { AIInsightsPanel } from './AIInsightsPanel';
import { AIMapGenerator } from './AIMapGenerator';

import './CJMBuilder.css';

export default function CJMBuilder({ onBack }) {
    const { mapId } = useParams();
    const { t } = useTranslation();
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [currentMapId, setCurrentMapId] = useState(mapId);

    // Sync state with URL params
    useEffect(() => {
        if (mapId && mapId !== currentMapId) {
            setCurrentMapId(mapId);
            setLoading(true); // Trigger reload
        }
    }, [mapId]);
    const [mapData, setMapData] = useState({
        project_name: "Untitled Journey",
        stages: [],
        sections: []
    });
    const [activeDragId, setActiveDragId] = useState(null);
    const [saveStatus, setSaveStatus] = useState(null);
    const [comments, setComments] = useState([]);
    const [personas, setPersonas] = useState([]);
    const [selectedPersonaId, setSelectedPersonaId] = useState(null);

    // Panel visibility
    const [showToolbox, setShowToolbox] = useState(false); // Closed by default
    const [showComments, setShowComments] = useState(false);
    const [showShare, setShowShare] = useState(false);
    const [showVersions, setShowVersions] = useState(false);
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [showExport, setShowExport] = useState(false);
    const [showAIInsights, setShowAIInsights] = useState(false);
    const [showAIGenerator, setShowAIGenerator] = useState(false);

    // Auto-save ref
    const autoSaveTimer = useRef(null);
    const lastSavedData = useRef(null);

    // Initial Load
    useEffect(() => {
        if (currentMapId) {
            axios.get(`/api/cjm/${currentMapId}`)
                .then(res => {
                    const data = res.data.data || {};
                    if (!data.stages) data.stages = [{ id: 'st_1', name: 'Awareness', style: { bg_color: '#F0F4FF', text_color: '#000000' } }];
                    if (!data.sections) data.sections = [];

                    const md = {
                        project_name: res.data.title || "Untitled",
                        stages: data.stages,
                        sections: data.sections
                    };
                    setMapData(md);
                    setSelectedPersonaId(res.data.persona_id);
                    lastSavedData.current = JSON.stringify(md);
                    setLoading(false);
                })
                .catch(err => {
                    console.error(err);
                    toast.error("Failed to load map");
                    setLoading(false);
                });

            // Load comments
            axios.get(`/api/cjm/${currentMapId}/comments`).then(res => setComments(res.data)).catch(() => { });
        } else {
            const md = {
                project_name: "New Journey Map",
                stages: [
                    { id: 'st_1', name: 'Awareness', style: { bg_color: '#f8fafc', text_color: '#0f172a' } },
                    { id: 'st_2', name: 'Consideration', style: { bg_color: '#f8fafc', text_color: '#0f172a' } },
                    { id: 'st_3', name: 'Purchase', style: { bg_color: '#f8fafc', text_color: '#0f172a' } }
                ],
                sections: [
                    {
                        id: 'sec_1', type: 'text', title: 'User Goals',
                        cells: { 'st_1': { value: 'Learn about product' } }
                    }
                ]
            };
            setMapData(md);
            lastSavedData.current = JSON.stringify(md);
            setLoading(false);
        }

        // Load personas
        axios.get('/api/cx-personas').then(res => setPersonas(res.data || [])).catch(() => { });
    }, [currentMapId]);

    // Auto-save: debounced 30 seconds
    useEffect(() => {
        if (!currentMapId || loading) return;
        const currentData = JSON.stringify(mapData);
        if (currentData === lastSavedData.current) return;

        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);

        autoSaveTimer.current = setTimeout(async () => {
            try {
                setSaveStatus('saving');
                await axios.put(`/api/cjm/${currentMapId}`, {
                    title: mapData.project_name,
                    data: mapData,
                    persona_id: selectedPersonaId
                });
                lastSavedData.current = JSON.stringify(mapData);
                setSaveStatus('saved');
                setTimeout(() => setSaveStatus(null), 2000);
            } catch (e) {
                console.error("Auto-save failed:", e);
                setSaveStatus(null);
            }
        }, 30000);

        return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
    }, [mapData, currentMapId, loading, selectedPersonaId]);

    const handleSave = async () => {
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        setSaveStatus('saving');

        if (!currentMapId) {
            try {
                const res = await axios.post('/api/cjm', {
                    title: mapData.project_name,
                    data: mapData,
                    persona_id: selectedPersonaId
                });
                setCurrentMapId(res.data.id);
                lastSavedData.current = JSON.stringify(mapData);
                setSaveStatus('saved');
                setTimeout(() => setSaveStatus(null), 2000);
            } catch (e) {
                toast.error("Save failed: " + e.message);
                setSaveStatus(null);
            }
        } else {
            try {
                await axios.put(`/api/cjm/${currentMapId}`, {
                    title: mapData.project_name,
                    data: mapData,
                    persona_id: selectedPersonaId
                });
                lastSavedData.current = JSON.stringify(mapData);
                setSaveStatus('saved');
                setTimeout(() => setSaveStatus(null), 2000);
            } catch (e) {
                toast.error("Save failed: " + e.message);
                setSaveStatus(null);
            }
        }
    };

    // State Updates
    const addStage = () => {
        const newId = `st_${Date.now()}`;
        setMapData(prev => ({
            ...prev,
            stages: [...prev.stages, { id: newId, name: 'New Stage', style: { bg_color: '#f8fafc', text_color: '#000000' } }]
        }));
    };

    const deleteStage = (id) => {
        setMapData(prev => ({
            ...prev,
            stages: prev.stages.filter(s => s.id !== id)
        }));
    };

    const addSection = (type) => {
        const newId = `sec_${Date.now()}`;
        setMapData(prev => ({
            ...prev,
            sections: [...prev.sections, { id: newId, type, title: 'New Section', cells: {} }]
        }));
    };

    const updateCell = (sectionId, stageId, value) => {
        setMapData(prev => ({
            ...prev,
            sections: prev.sections.map(sec => {
                if (sec.id !== sectionId) return sec;
                return {
                    ...sec,
                    cells: {
                        ...sec.cells,
                        [stageId]: { ...sec.cells[stageId], ...value }
                    }
                };
            })
        }));
    };

    // Sensor for Drag (Pointer)
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    const handleDragEnd = (event) => {
        const { active, over } = event;
        setActiveDragId(null);
        if (!over) return;

        if (active.data.current?.type === 'SECTION' && over.data.current?.type === 'SECTION') {
            if (active.id !== over.id) {
                setMapData(prev => {
                    const oldIndex = prev.sections.findIndex(s => s.id === active.id);
                    const newIndex = prev.sections.findIndex(s => s.id === over.id);
                    return { ...prev, sections: arrayMove(prev.sections, oldIndex, newIndex) };
                });
            }
        }

        if (active.data.current?.type === 'STAGE' && over.data.current?.type === 'STAGE') {
            if (active.id !== over.id) {
                setMapData(prev => {
                    const oldIndex = prev.stages.findIndex(s => s.id === active.id);
                    const newIndex = prev.stages.findIndex(s => s.id === over.id);
                    return { ...prev, stages: arrayMove(prev.stages, oldIndex, newIndex) };
                });
            }
        }

        if (active.data.current?.type === 'TOOLBOX_ITEM' && over.id === 'canvas_droppable') {
            addSection(active.data.current.payload);
        }
    };

    const handleVersionRestore = async (versionData) => {
        setMapData({
            project_name: mapData.project_name,
            stages: versionData.stages || [],
            sections: versionData.sections || []
        });
        setShowVersions(false);
    };

    if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#94a3b8' }}>Loading Builder...</div>;

    return (
        <div className="cjm-builder-container">
            <CJMHeader
                title={mapData.project_name}
                onTitleChange={t => setMapData(p => ({ ...p, project_name: t }))}
                onSave={handleSave}
                onBack={onBack}
                onShareClick={() => setShowShare(true)}
                onExportClick={() => setShowExport(true)}
                onCommentsClick={() => setShowComments(!showComments)}
                onVersionsClick={() => setShowVersions(!showVersions)}
                onAnalyticsClick={() => setShowAnalytics(!showAnalytics)}
                onAIInsightsClick={() => setShowAIInsights(!showAIInsights)}
                onAIGenerateClick={() => setShowAIGenerator(true)}
                commentCount={comments.filter(c => !c.resolved).length}
                saveStatus={saveStatus}
                personas={personas}
                selectedPersonaId={selectedPersonaId}
                onPersonaChange={setSelectedPersonaId}
            />

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={e => setActiveDragId(e.active.id)} onDragEnd={handleDragEnd}>
                <div className="cjm-workspace">
                    {showToolbox && <SidebarToolbox onClose={() => setShowToolbox(false)} />}

                    {/* Show Toolbox Button when hidden */}
                    {!showToolbox && (
                        <button
                            onClick={() => setShowToolbox(true)}
                            style={{
                                position: 'fixed',
                                left: '16px',
                                top: '80px',
                                zIndex: 100,
                                padding: '8px 12px',
                                background: '#ffffff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '13px',
                                fontWeight: '500',
                                color: '#475569',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#f8fafc';
                                e.currentTarget.style.borderColor = '#cbd5e1';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#ffffff';
                                e.currentTarget.style.borderColor = '#e2e8f0';
                            }}
                            title="Show Toolbox"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                            </svg>
                            Show Toolbox
                        </button>
                    )}

                    <div className="cjm-canvas-wrapper" id="canvas_droppable" style={{ flex: 1 }}>
                        {showAnalytics ? (
                            <CJMAnalytics mapData={mapData} mapId={currentMapId} />
                        ) : (
                            <CJMGrid
                                stages={mapData.stages}
                                sections={mapData.sections}
                                onUpdateCell={updateCell}
                                onAddStage={addStage}
                                onAddSection={addSection}
                                onDeleteStage={deleteStage}
                                onUpdateStage={(id, val) => {
                                    setMapData(p => ({
                                        ...p,
                                        stages: p.stages.map(s => s.id === id ? { ...s, ...val } : s)
                                    }));
                                }}
                                onUpdateSection={(id, val) => {
                                    setMapData(p => ({
                                        ...p,
                                        sections: p.sections.map(s => s.id === id ? { ...s, ...val } : s)
                                    }));
                                }}
                                onDeleteSection={(id) => {
                                    setMapData(p => ({ ...p, sections: p.sections.filter(s => s.id !== id) }));
                                }}
                                comments={comments}
                            />
                        )}
                    </div>

                    {/* Right side panels */}
                    {showComments && currentMapId && (
                        <CJMComments
                            mapId={currentMapId}
                            comments={comments}
                            onCommentsChange={setComments}
                            onClose={() => setShowComments(false)}
                        />
                    )}

                    {showVersions && currentMapId && (
                        <VersionHistory
                            mapId={currentMapId}
                            onRestore={handleVersionRestore}
                            onClose={() => setShowVersions(false)}
                        />
                    )}

                    {showAIInsights && (
                        <AIInsightsPanel
                            mapData={mapData}
                            onClose={() => setShowAIInsights(false)}
                        />
                    )}
                </div>
                <DragOverlay>
                    {activeDragId ? <div className="cjm-drag-overlay">Dragging...</div> : null}
                </DragOverlay>
            </DndContext>

            {/* Modals */}
            {showShare && currentMapId && (
                <ShareDialog
                    mapId={currentMapId}
                    onClose={() => setShowShare(false)}
                />
            )}

            {showExport && (
                <CJMExportModal
                    mapId={currentMapId}
                    mapData={mapData}
                    onClose={() => setShowExport(false)}
                />
            )}

            {showAIGenerator && (
                <AIMapGenerator
                    onGenerate={(generatedData) => {
                        setMapData({
                            project_name: generatedData.project_name || mapData.project_name,
                            stages: generatedData.stages || [],
                            sections: generatedData.sections || []
                        });
                        setShowAIGenerator(false);
                    }}
                    onClose={() => setShowAIGenerator(false)}
                />
            )}
        </div>
    );
}
