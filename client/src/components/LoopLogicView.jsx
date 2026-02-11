import React, { useState, useEffect } from 'react';
import { Serializer } from "survey-core";
import enterpriseLoopJson from '../templates/enterprise-loop-survey.json';
import { toast } from './common/Toast';

export function LoopLogicView({ creator }) {
    const [loops, setLoops] = useState([]);
    const [questions, setQuestions] = useState([]);

    useEffect(() => {
        // Register the custom property 'loopConfigs' on the Survey object
        // This ensures it is serialized/saved with the JSON
        if (!Serializer.findProperty("survey", "loopConfigs")) {
            Serializer.addProperty("survey", {
                name: "loopConfigs",
                default: [],
                category: "logic",
                visible: false // We show it in our custom tab, not the property grid
            });
        }

        if (creator) {
            refreshData();
        }
    }, [creator]);

    const refreshData = () => {
        if (!creator) return;
        const survey = creator.survey;

        // Find all Dynamic Panels
        const panels = [];
        const allQuestions = [];

        // getAllQuestions returns a flat list including those inside panels
        survey.getAllQuestions().forEach(q => {
            allQuestions.push({ name: q.name, title: q.title || q.name, type: q.getType() });
            if (q.getType() === 'paneldynamic') {
                panels.push({ name: q.name, title: q.title || q.name });
            }
        });

        setQuestions(allQuestions);

        // Load existing loop configs from the Survey Model property
        const stored = survey.loopConfigs || [];

        // Match existing panels or initialize new configs
        if (stored.length > 0) {
            setLoops(stored);
        } else if (panels.length > 0) {
            // Auto-discover potential loops (Optional: only if explicit user action?)
            // For now, let's pre-populate so the user sees something they can configure
            setLoops(panels.map(p => ({
                targetPanel: p.name,
                sourceQuestion: '',
                keyProperty: 'tag_id',
                textProperty: 'tag_name'
            })));
        } else {
            setLoops([]);
        }
    };

    const loadExample = () => {
        if (!creator) return;
        if (confirm("⚠️ This will overwrite your current survey design with the Enterprise Loop Example.\n\nAre you sure you want to continue?")) {
            creator.text = JSON.stringify(enterpriseLoopJson, null, 4);
            // After loading, switch to Preview to show it off, then user can go back to Designer
            setTimeout(() => {
                creator.makeNewViewActive("test");
            }, 100);
        }
    };

    const handleSave = () => {
        if (creator) {
            const validLoops = loops.filter(l => l.sourceQuestion && l.targetPanel);

            // Validate: Ensure Source Question exists and is a multi-select type
            const errors = [];
            validLoops.forEach(l => {
                const q = questions.find(q => q.name === l.sourceQuestion);
                if (q && !['checkbox', 'tagbox', 'dropdown'].includes(q.type)) {
                    errors.push(`Question '${l.sourceQuestion}' is not a multi-select type (Checkbox/TagBox).`);
                }
            });

            if (errors.length > 0) {
                toast.error("Validation Error:\n" + errors.join("\n"));
                return;
            }

            // Save to Survey Model
            creator.survey.loopConfigs = validLoops;

            toast.success("Loop Logic Configuration Saved!");
        }
    };

    const updateLoop = (index, field, value) => {
        const newLoops = [...loops];
        newLoops[index][field] = value;
        setLoops(newLoops);
    };

    return (
        <div style={{ padding: '30px', maxWidth: '800px', margin: '0 auto', fontFamily: 'inherit' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.5em', color: '#1e293b', margin: 0 }}>Loop Logic Configuration</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={loadExample}
                        style={{
                            padding: '8px 16px',
                            background: '#f8fafc',
                            color: '#6366f1',
                            border: '1px solid #6366f1',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                        }}
                    >
                        <span>📚</span> Load Example
                    </button>
                    <button
                        onClick={refreshData}
                        style={{
                            padding: '8px 16px',
                            background: 'white',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            color: '#475569',
                            fontSize: '14px'
                        }}
                    >
                        ↻ Refresh Data
                    </button>
                </div>
            </div>

            <p style={{ color: '#64748b', marginBottom: '30px' }}>
                Connect a Multi-Select Question (Source) to a Dynamic Panel (Loop). The panel will automatically repeat for each selected item.
            </p>

            {loops.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '2em', marginBottom: '15px' }}>🔁</div>
                    <h3>No Loops Found</h3>
                    <p style={{ color: '#64748b' }}>
                        Add a <strong>Dynamic Panel</strong> or use the "Load Example" button above to try a demo.
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '15px' }}>
                        <button
                            onClick={refreshData}
                            style={{ padding: '8px 16px', cursor: 'pointer', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                        >
                            Refresh Data
                        </button>
                        <button
                            onClick={() => creator.makeNewViewActive("designer")}
                            style={{ padding: '8px 16px', cursor: 'pointer', background: '#0e7490', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}
                        >
                            ← Go to Designer
                        </button>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {loops.map((loop, idx) => (
                        <div key={idx} style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                            <div style={{ fontWeight: '600', marginBottom: '15px', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>🔁</span> Target Loop: <span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px' }}>{loop.targetPanel}</span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85em', color: '#64748b', marginBottom: '5px' }}>Source Question (Driver)</label>
                                    <select
                                        value={loop.sourceQuestion}
                                        onChange={(e) => updateLoop(idx, 'sourceQuestion', e.target.value)}
                                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                    >
                                        <option value="">Select Question...</option>
                                        {questions.filter(q => ['checkbox', 'tagbox', 'dropdown'].includes(q.type)).map(q => (
                                            <option key={q.name} value={q.name}>{q.title} ({q.name})</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85em', color: '#64748b', marginBottom: '5px' }}>Map Text To Property</label>
                                    <input
                                        value={loop.textProperty}
                                        onChange={(e) => updateLoop(idx, 'textProperty', e.target.value)}
                                        placeholder="e.g. product_name"
                                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}

                    <div style={{ marginTop: '20px', textAlign: 'right' }}>
                        <button
                            onClick={handleSave}
                            style={{ padding: '10px 24px', background: '#0e7490', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                        >
                            Save Configuration
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
