/**
 * Custom Fields Manager
 *
 * Manage custom field definitions for contacts
 * - Create field schemas (text, number, date, boolean, select, multi_select)
 * - Define field options for select types
 * - Set required/optional flags
 * - Control display order
 * - Activate/deactivate fields
 */

import React, { useState, useEffect } from 'react';
import axios from '../../axiosConfig';
import {
    Settings,
    Plus,
    Edit3,
    Trash2,
    GripVertical,
    Eye,
    EyeOff,
    Type,
    Hash,
    Calendar,
    ToggleLeft,
    List,
    CheckSquare
} from 'lucide-react';
import './CustomFieldsManager.css';

const CustomFieldsManager = () => {
    const [fields, setFields] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingField, setEditingField] = useState(null);

    const [newField, setNewField] = useState({
        field_key: '',
        field_label: '',
        field_type: 'text',
        field_options: [],
        is_required: false,
        display_order: 0,
        is_active: true
    });

    const [optionInput, setOptionInput] = useState('');

    useEffect(() => {
        fetchFields();
    }, []);

    const fetchFields = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/advanced-contacts/custom-fields');
            setFields(response.data.fields || []);
        } catch (error) {
            console.error('Failed to fetch custom fields:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateField = async () => {
        try {
            // Validate field_key (alphanumeric + underscores only)
            const keyRegex = /^[a-z0-9_]+$/;
            if (!keyRegex.test(newField.field_key)) {
                alert('Field key must contain only lowercase letters, numbers, and underscores');
                return;
            }

            // Clean up field options for select types
            const fieldData = { ...newField };
            if (fieldData.field_type === 'select' || fieldData.field_type === 'multi_select') {
                if (fieldData.field_options.length === 0) {
                    alert('Please add at least one option for select fields');
                    return;
                }
                fieldData.field_options = { options: fieldData.field_options };
            } else {
                fieldData.field_options = null;
            }

            await axios.post('/api/advanced-contacts/custom-fields', fieldData);

            alert('Custom field created successfully!');
            setShowCreateModal(false);
            resetForm();
            fetchFields();
        } catch (error) {
            alert('Failed to create field: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleToggleActive = async (fieldId, currentStatus) => {
        try {
            const field = fields.find(f => f.id === fieldId);
            await axios.post('/api/advanced-contacts/custom-fields', {
                ...field,
                is_active: !currentStatus
            });
            fetchFields();
        } catch (error) {
            alert('Failed to toggle field: ' + error.message);
        }
    };

    const resetForm = () => {
        setNewField({
            field_key: '',
            field_label: '',
            field_type: 'text',
            field_options: [],
            is_required: false,
            display_order: 0,
            is_active: true
        });
        setOptionInput('');
        setEditingField(null);
    };

    const addOption = () => {
        if (optionInput.trim()) {
            setNewField(prev => ({
                ...prev,
                field_options: [...prev.field_options, optionInput.trim()]
            }));
            setOptionInput('');
        }
    };

    const removeOption = (index) => {
        setNewField(prev => ({
            ...prev,
            field_options: prev.field_options.filter((_, i) => i !== index)
        }));
    };

    const getFieldTypeIcon = (type) => {
        const iconMap = {
            text: <Type size={18} />,
            number: <Hash size={18} />,
            date: <Calendar size={18} />,
            boolean: <ToggleLeft size={18} />,
            select: <List size={18} />,
            multi_select: <CheckSquare size={18} />
        };
        return iconMap[type] || <Type size={18} />;
    };

    const getFieldTypeLabel = (type) => {
        const labelMap = {
            text: 'Text',
            number: 'Number',
            date: 'Date',
            boolean: 'Yes/No',
            select: 'Dropdown',
            multi_select: 'Multi-Select'
        };
        return labelMap[type] || type;
    };

    if (loading) {
        return (
            <div className="custom-fields-manager">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading custom fields...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="custom-fields-manager">
            {/* Header */}
            <div className="fields-header">
                <div>
                    <h1><Settings size={28} /> Custom Fields</h1>
                    <p>Define custom fields for contact profiles</p>
                </div>
                <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                    <Plus size={18} />
                    Add Field
                </button>
            </div>

            {/* Fields List */}
            {fields.length === 0 ? (
                <div className="empty-state">
                    <Settings size={64} />
                    <h3>No custom fields yet</h3>
                    <p>Create custom fields to capture additional contact information</p>
                    <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                        <Plus size={18} />
                        Add Field
                    </button>
                </div>
            ) : (
                <div className="fields-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Label</th>
                                <th>Key</th>
                                <th>Type</th>
                                <th>Required</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {fields
                                .sort((a, b) => a.display_order - b.display_order)
                                .map(field => (
                                    <tr key={field.id} className={!field.is_active ? 'inactive' : ''}>
                                        <td>
                                            <div className="field-label">
                                                {getFieldTypeIcon(field.field_type)}
                                                <strong>{field.field_label}</strong>
                                            </div>
                                        </td>
                                        <td>
                                            <code>{field.field_key}</code>
                                        </td>
                                        <td>
                                            <span className="type-badge">
                                                {getFieldTypeLabel(field.field_type)}
                                            </span>
                                        </td>
                                        <td>
                                            {field.is_required ? (
                                                <span className="badge-required">Required</span>
                                            ) : (
                                                <span className="badge-optional">Optional</span>
                                            )}
                                        </td>
                                        <td>
                                            {field.is_active ? (
                                                <span className="status-active">Active</span>
                                            ) : (
                                                <span className="status-inactive">Inactive</span>
                                            )}
                                        </td>
                                        <td>
                                            <div className="field-actions">
                                                <button
                                                    className="btn-icon"
                                                    onClick={() => handleToggleActive(field.id, field.is_active)}
                                                    title={field.is_active ? 'Deactivate' : 'Activate'}
                                                >
                                                    {field.is_active ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Add Custom Field</h3>
                            <button onClick={() => setShowCreateModal(false)}>&times;</button>
                        </div>

                        <div className="modal-body">
                            <div className="form-group">
                                <label>Field Label *</label>
                                <input
                                    type="text"
                                    value={newField.field_label}
                                    onChange={(e) => {
                                        const label = e.target.value;
                                        // Auto-generate field_key from label
                                        const key = label
                                            .toLowerCase()
                                            .replace(/[^a-z0-9\s]/g, '')
                                            .replace(/\s+/g, '_');
                                        setNewField({ ...newField, field_label: label, field_key: key });
                                    }}
                                    placeholder="e.g., Company Size"
                                />
                                <small>Display name for this field</small>
                            </div>

                            <div className="form-group">
                                <label>Field Key *</label>
                                <input
                                    type="text"
                                    value={newField.field_key}
                                    onChange={(e) => setNewField({ ...newField, field_key: e.target.value })}
                                    placeholder="e.g., company_size"
                                />
                                <small>Unique identifier (lowercase, numbers, underscores only)</small>
                            </div>

                            <div className="form-group">
                                <label>Field Type *</label>
                                <select
                                    value={newField.field_type}
                                    onChange={(e) => setNewField({ ...newField, field_type: e.target.value })}
                                >
                                    <option value="text">Text</option>
                                    <option value="number">Number</option>
                                    <option value="date">Date</option>
                                    <option value="boolean">Yes/No</option>
                                    <option value="select">Dropdown (Single Select)</option>
                                    <option value="multi_select">Multi-Select</option>
                                </select>
                            </div>

                            {(newField.field_type === 'select' || newField.field_type === 'multi_select') && (
                                <div className="form-group">
                                    <label>Options *</label>
                                    <div className="options-input">
                                        {newField.field_options.map((option, index) => (
                                            <span key={index} className="option-tag">
                                                {option}
                                                <button onClick={() => removeOption(index)}>&times;</button>
                                            </span>
                                        ))}
                                        <div className="add-option">
                                            <input
                                                type="text"
                                                value={optionInput}
                                                onChange={(e) => setOptionInput(e.target.value)}
                                                onKeyPress={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        addOption();
                                                    }
                                                }}
                                                placeholder="Type option and press Enter"
                                            />
                                            <button className="btn-add-option" onClick={addOption}>
                                                <Plus size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="form-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={newField.is_required}
                                        onChange={(e) => setNewField({ ...newField, is_required: e.target.checked })}
                                    />
                                    <span>Required field</span>
                                </label>
                            </div>

                            <div className="form-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={newField.is_active}
                                        onChange={(e) => setNewField({ ...newField, is_active: e.target.checked })}
                                    />
                                    <span>Active (visible in contact forms)</span>
                                </label>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                                Cancel
                            </button>
                            <button
                                className="btn-primary"
                                onClick={handleCreateField}
                                disabled={!newField.field_key || !newField.field_label}
                            >
                                Create Field
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomFieldsManager;
