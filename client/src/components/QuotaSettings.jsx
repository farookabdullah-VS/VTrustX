import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Plus, Trash2, Edit2, CheckCircle, XCircle, Filter, Settings2 } from 'lucide-react';

export function QuotaSettings({ form }) {
    const formId = form?.id;
    const [quotas, setQuotas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [newQuota, setNewQuota] = useState(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalCriteria, setModalCriteria] = useState({});
    const [onModalSave, setOnModalSave] = useState(() => () => { });

    // flatten questions for the dropdown
    const availableQuestions = useMemo(() => {
        console.log("QuotaSettings: Form ID:", form?.id, "Has Definition:", !!form?.definition);
        const questions = [];

        const extractQuestions = (elements) => {
            if (!elements) return;
            elements.forEach(el => {
                // Recursive for Panels
                if (el.type === 'panel' && el.elements) {
                    extractQuestions(el.elements);
                } else if (el.type === 'paneldynamic' && el.templateElements) {
                    extractQuestions(el.templateElements);
                }
                else if (el.name && !['html', 'expression', 'image'].includes(el.type)) {
                    questions.push({
                        name: el.valueName || el.name,
                        title: el.title || el.name,
                        type: el.type,
                        choices: el.choices
                    });
                }
            });
        };

        if (form?.definition && form.definition.pages) {
            console.log("QuotaSettings: Extracting from pages count:", form.definition.pages.length);
            form.definition.pages.forEach(page => {
                extractQuestions(page.elements);
            });
        } else {
            console.warn("QuotaSettings: No pages in definition. Definition keys:", form?.definition ? Object.keys(form.definition) : 'N/A');
        }
        console.log("QuotaSettings: Questions Found:", questions.length, questions);
        return questions;
    }, [form]);

    // Initial load
    useEffect(() => {
        loadQuotas();
    }, [formId]);

    const loadQuotas = () => {
        setLoading(true);
        axios.get(`/api/quotas?formId=${formId}`)
            .then(res => {
                setQuotas(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    };

    const handleSave = (item, isNew = false) => {
        if (!formId) {
            alert("Error: No Form ID found. Please refresh.");
            return;
        }
        const payload = {
            ...item,
            limit_count: parseInt(item.limit_count),
            form_id: formId,
            criteria: item.criteria || {},
            action: item.action || 'reject',
            reset_period: item.reset_period || 'never',
            is_active: item.is_active !== false
        };

        if (isNew) {
            axios.post('/api/quotas', payload)
                .then(res => {
                    setQuotas([...quotas, res.data]);
                    setNewQuota(null);
                })
                .catch(err => alert("Failed to create quota: " + err.message));
        } else {
            axios.put(`/api/quotas/${item.id}`, payload)
                .then(res => {
                    setQuotas(quotas.map(q => q.id === item.id ? res.data : q));
                    setEditingId(null);
                })
                .catch(err => alert("Failed to update quota: " + err.message));
        }
    };

    const handleDelete = (id) => {
        if (confirm("Delete this quota?")) {
            axios.delete(`/api/quotas/${id}`)
                .then(() => setQuotas(quotas.filter(q => q.id !== id)))
                .catch(err => alert("Delete failed"));
        }
    };

    const openFilterBuilder = (currentCriteria, saveCallback) => {
        setModalCriteria(currentCriteria || {});
        // Explicitly wrap the callback function in an object or another function 
        // to avoid React interpreting it as an updater function.
        setOnModalSave(() => (criteria) => saveCallback(criteria));
        setIsModalOpen(true);
    };


    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h3 style={{ margin: 0, color: '#0f172a' }}>Response Quotas</h3>
                <button
                    onClick={() => setNewQuota({ label: '', limit_count: 100, criteria: {} })}
                    style={styles.addBtn}
                >
                    <Plus size={16} /> Add Quota
                </button>
            </div>

            {loading && <div>Loading quotas...</div>}

            <div style={styles.grid}>
                {quotas.map(q => (
                    <QuotaRow
                        key={q.id}
                        item={q}
                        isEditing={editingId === q.id}
                        onSave={handleSave}
                        onCancel={() => setEditingId(null)}
                        onOpenFilter={openFilterBuilder}
                        onEdit={() => setEditingId(q.id)}
                        onDelete={() => handleDelete(q.id)}
                    />
                ))}

                {newQuota && (
                    <QuotaRow
                        item={newQuota}
                        isNew={true}
                        onSave={handleSave}
                        onCancel={() => setNewQuota(null)}
                        onOpenFilter={openFilterBuilder}
                    />
                )}
            </div>

            {/* FILTER BUILDER MODAL */}
            {isModalOpen && (
                <FilterModal
                    initialCriteria={modalCriteria}
                    questions={availableQuestions}
                    onSave={(newCriteria) => {
                        onModalSave(newCriteria);
                        setIsModalOpen(false);
                    }}
                    onClose={() => setIsModalOpen(false)}
                />
            )}
        </div >
    );
}

// Extracted Row Component
function QuotaRow({ item, isEditing, isNew, onSave, onCancel, onOpenFilter, onEdit, onDelete }) {
    const [localState, setLocalState] = useState(item);

    useEffect(() => {
        setLocalState(item);
    }, [item]);

    const handleChange = (field, val) => {
        setLocalState(prev => ({ ...prev, [field]: val }));
    };

    if (isEditing || isNew) {
        const criteriaCount = localState.criteria ? Object.keys(localState.criteria).length : 0;

        return (
            <div style={styles.rowEditing}>
                <div style={{ ...styles.col, flex: 1.5 }}>
                    <label style={styles.label}>Quota Label</label>
                    <input
                        style={styles.input}
                        value={localState.label || ''}
                        onChange={e => handleChange('label', e.target.value)}
                        placeholder="e.g. Daily Response Limit"
                    />
                </div>
                <div style={{ ...styles.col, maxWidth: '100px' }}>
                    <label style={styles.label}>Limit</label>
                    <input
                        style={styles.input}
                        type="number"
                        value={localState.limit_count || ''}
                        onChange={e => handleChange('limit_count', e.target.value)}
                    />
                </div>
                <div style={styles.col}>
                    <label style={styles.label}>Reset Period</label>
                    <select
                        style={styles.input}
                        value={localState.reset_period || 'never'}
                        onChange={e => handleChange('reset_period', e.target.value)}
                    >
                        <option value="never">No Reset (Global)</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                    </select>
                </div>
                <div style={styles.col}>
                    <label style={styles.label}>Action</label>
                    <select
                        style={styles.input}
                        value={localState.action || 'reject'}
                        onChange={e => handleChange('action', e.target.value)}
                    >
                        <option value="reject">Reject Response</option>
                        <option value="termination">Termination Message</option>
                    </select>
                </div>
                <div style={styles.col}>
                    <label style={styles.label}>Conditions</label>
                    <button
                        onClick={() => onOpenFilter(localState.criteria, (newCriteria) => handleChange('criteria', newCriteria))}
                        style={styles.filterBtn}
                    >
                        <Settings2 size={16} />
                        {criteriaCount === 0 ? "All Responses" : `${criteriaCount} Filter(s)`}
                    </button>
                </div>
                <div style={styles.actions}>
                    <button onClick={() => onSave(localState, isNew)} style={styles.saveBtn}>Save</button>
                    <button onClick={onCancel} style={styles.cancelBtn}>Cancel</button>
                </div>
            </div>
        );
    }

    const criteriaCount = item.criteria ? Object.keys(item.criteria).length : 0;
    const progress = Math.min(100, (item.current_count / item.limit_count) * 100);

    return (
        <div style={styles.row}>
            <div style={{ ...styles.col, flex: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ color: '#0f172a', fontSize: '1.05em' }}>{item.label}</strong>
                    {item.reset_period && item.reset_period !== 'never' && (
                        <span style={{ fontSize: '0.7em', padding: '2px 6px', background: '#e0f2fe', color: '#0369a1', borderRadius: '4px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                            {item.reset_period}
                        </span>
                    )}
                </div>
                <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {criteriaCount === 0 ? (
                        <span style={{ fontSize: '0.85em', color: '#94a3b8', fontStyle: 'italic' }}>Global Quota</span>
                    ) : (
                        Object.entries(item.criteria || {}).map(([k, v]) => {
                            const valStr = String(v);
                            let op = '=';
                            let displayVal = valStr;
                            if (valStr.startsWith('>=')) { op = '≥'; displayVal = valStr.substring(2); }
                            else if (valStr.startsWith('<=')) { op = '≤'; displayVal = valStr.substring(2); }
                            else if (valStr.startsWith('>')) { op = '>'; displayVal = valStr.substring(1); }
                            else if (valStr.startsWith('<')) { op = '<'; displayVal = valStr.substring(1); }
                            else if (valStr.startsWith('!=')) { op = '≠'; displayVal = valStr.substring(2); }

                            return (
                                <div key={k} style={{ background: '#f8fafc', padding: '2px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '0.81em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Filter size={10} color="#94a3b8" />
                                    <span style={{ color: '#64748b' }}>{k}</span>
                                    <span style={{ fontWeight: 'bold', color: '#3b82f6' }}>{op}</span>
                                    <span style={{ fontWeight: '600', color: '#334155' }}>{displayVal}</span>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
            <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
                <div style={{ textAlign: 'right', minWidth: '120px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.8em', color: '#64748b' }}>Usage</span>
                        <span style={{ fontSize: '0.8em', fontWeight: 'bold', color: item.current_count >= item.limit_count ? '#ef4444' : '#0f172a' }}>
                            {item.current_count} / {item.limit_count}
                        </span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${progress}%`, height: '100%', background: progress >= 100 ? '#ef4444' : (progress >= 80 ? '#f59e0b' : '#10b981'), transition: 'width 0.3s ease' }}></div>
                    </div>
                </div>
                <div style={{ textAlign: 'center', borderLeft: '1px solid #e2e8f0', paddingLeft: '20px' }}>
                    <div style={{ fontSize: '0.75em', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Modified</div>
                    <div style={{ fontWeight: '500', fontSize: '0.85em', color: '#475569', marginTop: '2px' }}>
                        {new Date(item.updated_at || item.created_at).toLocaleDateString()}
                    </div>
                </div>
            </div>
            <div style={styles.actions}>
                <button onClick={() => onEdit(item.id)} style={styles.editBtn} title="Edit"><Edit2 size={18} /></button>
                <button onClick={() => onDelete(item.id)} style={styles.deleteBtn} title="Delete"><Trash2 size={18} /></button>
            </div>
        </div>
    );
};


// Sub-component: Filter Builder Modal
function FilterModal({ initialCriteria, questions, onSave, onClose }) {
    const [filters, setFilters] = useState(() => {
        return Object.entries(initialCriteria || {}).map(([k, v]) => {
            const valStr = String(v);
            let op = '=';
            let actualVal = valStr;

            if (valStr.startsWith('>=')) { op = '>='; actualVal = valStr.substring(2); }
            else if (valStr.startsWith('<=')) { op = '<='; actualVal = valStr.substring(2); }
            else if (valStr.startsWith('>')) { op = '>'; actualVal = valStr.substring(1); }
            else if (valStr.startsWith('<')) { op = '<'; actualVal = valStr.substring(1); }
            else if (valStr.startsWith('!=')) { op = '!='; actualVal = valStr.substring(2); }

            return {
                id: Math.random().toString(36).substr(2, 9),
                field: k,
                operator: op,
                value: actualVal
            };
        });
    });

    const addFilter = () => {
        setFilters([...filters, { id: Math.random().toString(36), field: '', operator: '=', value: '' }]);
    };

    const updateFilter = (id, key, val) => {
        setFilters(prev => prev.map(f => f.id === id ? { ...f, [key]: val } : f));
    };

    const removeFilter = (id) => {
        setFilters(prev => prev.filter(f => f.id !== id));
    };

    const handleSave = () => {
        // Convert Array back to Object
        const newCriteria = {};
        filters.forEach(f => {
            if (f.field && String(f.value).trim() !== '') {
                const combinedVal = f.operator === '=' ? f.value : `${f.operator}${f.value}`;
                newCriteria[f.field] = combinedVal;
            }
        });

        if (Object.keys(newCriteria).length === 0 && filters.length > 0) {
            alert("⚠️ Filter Not Saved! \n\nPlease ensure you have selected a QUESTION and entered a VALUE.");
            return; // Don't close modal, let them fix it
        }

        onSave(newCriteria);
    };

    return (
        <div style={modalStyles.overlay}>
            <div style={modalStyles.content}>
                <div style={modalStyles.header}>
                    <h3 style={{ margin: 0 }}>Configure Conditions</h3>
                    <button onClick={onClose} style={modalStyles.closeBtn}>&times;</button>
                </div>
                <div style={modalStyles.body}>
                    <p style={{ marginTop: 0, color: '#64748b', fontSize: '0.9em' }}>
                        Define logic to filter which responses this quota applies to.
                        Supports Equals, Numeric (&gt;, &lt;, &gt;=, &lt;=) and Not-Equal (!=) matching.
                    </p>

                    {filters.length === 0 && (
                        <div style={{ padding: '20px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', color: '#94a3b8' }}>
                            No conditions set. This quota applies to <strong>ALL</strong> responses.
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {filters.map((f, idx) => {
                            const selectedQ = questions.find(q => q.name === f.field);

                            return (
                                <div key={f.id} style={modalStyles.filterRow}>
                                    <span style={{ color: '#94a3b8', fontSize: '0.8em', width: '20px' }}>{idx + 1}.</span>

                                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                        {!f.manualMode ? (
                                            <select
                                                style={modalStyles.select}
                                                value={f.field}
                                                onChange={e => updateFilter(f.id, 'field', e.target.value)}
                                            >
                                                <option value="">Select Question...</option>
                                                {questions.map(q => (
                                                    <option key={q.name} value={q.name}>{q.title}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input
                                                style={modalStyles.input}
                                                placeholder="Question Key"
                                                value={f.field}
                                                onChange={e => updateFilter(f.id, 'field', e.target.value)}
                                            />
                                        )}
                                        <label style={{ fontSize: '0.7em', color: '#64748b', cursor: 'pointer', marginTop: '2px' }}>
                                            <input
                                                type="checkbox"
                                                checked={!!f.manualMode}
                                                onChange={e => updateFilter(f.id, 'manualMode', e.target.checked)}
                                            /> Manual Input
                                        </label>
                                    </div>

                                    <select
                                        style={{ ...modalStyles.select, maxWidth: '70px', fontWeight: 'bold', textAlign: 'center' }}
                                        value={f.operator || '='}
                                        onChange={e => updateFilter(f.id, 'operator', e.target.value)}
                                    >
                                        <option value="=">=</option>
                                        <option value=">">&gt;</option>
                                        <option value="<">&lt;</option>
                                        <option value=">=">&ge;</option>
                                        <option value="<=">&le;</option>
                                        <option value="!=">&ne;</option>
                                    </select>

                                    {/* Value Input (Text or Dropdown if choices exist) */}
                                    {selectedQ && selectedQ.choices && selectedQ.choices.length > 0 && f.operator === '=' ? (
                                        <select
                                            style={modalStyles.input}
                                            value={f.value}
                                            onChange={e => updateFilter(f.id, 'value', e.target.value)}
                                        >
                                            <option value="">Select Value...</option>
                                            {selectedQ.choices.map(c => {
                                                const val = typeof c === 'object' ? c.value : c;
                                                const label = typeof c === 'object' ? c.text : c;
                                                return <option key={val} value={val}>{label}</option>
                                            })}
                                        </select>
                                    ) : (
                                        <input
                                            style={modalStyles.input}
                                            placeholder="Value"
                                            value={f.value}
                                            onChange={e => updateFilter(f.id, 'value', e.target.value)}
                                        />
                                    )}

                                    <button onClick={() => removeFilter(f.id)} style={modalStyles.deleteBtn}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    <button onClick={addFilter} style={modalStyles.addBtn}>
                        <Plus size={16} /> Add Condition
                    </button>

                </div>
                <div style={modalStyles.footer}>
                    <button onClick={onClose} style={modalStyles.cancelBtn}>Cancel</button>
                    <button onClick={handleSave} style={modalStyles.confirmBtn}>Apply Filter</button>
                </div>
            </div>
        </div>
    );
}

const styles = {
    container: {
        padding: '24px',
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        marginBottom: '20px',
        fontFamily: "'Inter', 'Outfit', sans-serif",
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
    },
    addBtn: {
        display: 'flex', alignItems: 'center', gap: '8px',
        background: '#0f172a', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer',
        fontSize: '0.95em', fontWeight: '600', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)'
    },
    grid: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
    },
    row: {
        display: 'flex',
        alignItems: 'center',
        background: '#ffffff',
        padding: '18px 22px',
        borderRadius: '12px',
        border: '1px solid #f1f5f9',
        gap: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
        transition: 'transform 0.2s, box-shadow 0.2s'
    },
    rowEditing: {
        display: 'flex',
        alignItems: 'center',
        background: '#f8fbfc',
        padding: '20px',
        borderRadius: '12px',
        border: '1px solid #3b82f6',
        gap: '16px',
        flexWrap: 'wrap',
        boxShadow: '0 10px 20px -5px rgba(59, 130, 246, 0.1)'
    },
    col: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column'
    },
    label: {
        fontSize: '0.72em',
        fontWeight: '700',
        textTransform: 'uppercase',
        color: '#64748b',
        marginBottom: '6px',
        letterSpacing: '0.5px'
    },
    input: {
        padding: '10px 12px',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        width: '100%',
        boxSizing: 'border-box',
        fontSize: '0.9em',
        outline: 'none',
        background: 'white'
    },
    actions: {
        display: 'flex',
        gap: '4px',
        marginLeft: 'auto'
    },
    editBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '8px', borderRadius: '6px', transition: 'all 0.2s' },
    deleteBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '8px', borderRadius: '6px', transition: 'all 0.2s' },
    saveBtn: { background: '#059669', border: 'none', borderRadius: '6px', padding: '8px 20px', color: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(5, 150, 105, 0.2)', fontWeight: '600', fontSize: '0.9em' },
    cancelBtn: { background: '#64748b', border: 'none', borderRadius: '6px', padding: '8px 20px', color: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(100, 116, 139, 0.2)', fontWeight: '600', fontSize: '0.9em' },
    filterBtn: {
        display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center',
        padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0',
        background: 'white', cursor: 'pointer', color: '#334155', fontSize: '0.85em', fontWeight: '500', transition: 'all 0.2s'
    }
};

const modalStyles = {
    overlay: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)'
    },
    content: {
        background: 'white', padding: '0', borderRadius: '20px',
        width: '90%', maxWidth: '650px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex', flexDirection: 'column',
        maxHeight: '85vh',
        overflow: 'hidden'
    },
    header: {
        padding: '24px', borderBottom: '1px solid #f1f5f9',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: '#f8fafc'
    },
    closeBtn: { background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#94a3b8', transition: 'color 0.2s' },
    body: {
        padding: '24px', overflowY: 'auto'
    },
    filterRow: {
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '16px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0',
        marginBottom: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
    },
    select: {
        flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9em', outline: 'none'
    },
    input: {
        flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9em', outline: 'none'
    },
    addBtn: {
        marginTop: '20px', background: '#f1f5f9', border: '1px dashed #cbd5e1', color: '#475569',
        padding: '12px', width: '100%', borderRadius: '10px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        fontSize: '0.9em', fontWeight: '600', transition: 'all 0.2s'
    },
    deleteBtn: {
        background: '#fee2e2', border: 'none', color: '#ef4444', cursor: 'pointer',
        padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center'
    },
    footer: {
        padding: '20px 24px', borderTop: '1px solid #f1f5f9',
        display: 'flex', justifyContent: 'flex-end', gap: '12px',
        background: '#f8fafc'
    },
    cancelBtn: {
        padding: '10px 24px', background: 'white', border: '1px solid #e2e8f0',
        borderRadius: '10px', cursor: 'pointer', color: '#64748b', fontWeight: '500'
    },
    confirmBtn: {
        padding: '10px 24px', background: '#0f172a', border: 'none',
        borderRadius: '10px', cursor: 'pointer', color: 'white', fontWeight: '600',
        boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)'
    }
};
