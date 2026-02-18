/**
 * Workflow Templates Browser
 *
 * Browse and instantiate pre-built workflow templates
 */

import React, { useState, useEffect } from 'react';
import axios from '../../axiosConfig';
import {
    Search,
    Filter,
    Heart,
    AlertTriangle,
    Mail,
    Frown,
    AlertCircle,
    UserPlus,
    FlaskConical,
    CheckCircle,
    TrendingUp,
    Users,
    MessageSquare
} from 'lucide-react';
import './WorkflowTemplatesBrowser.css';

const WorkflowTemplatesBrowser = ({ onTemplateSelect }) => {
    const [templates, setTemplates] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [showPreview, setShowPreview] = useState(false);
    const [creating, setCreating] = useState(false);

    // Fetch categories only once on mount
    useEffect(() => {
        fetchCategories();
    }, []);

    // Fetch templates with debouncing
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchTemplates();
        }, 300); // 300ms debounce

        return () => clearTimeout(timer);
    }, [selectedCategory, searchQuery]);

    const fetchTemplates = async () => {
        try {
            const params = {
                ...(selectedCategory !== 'all' && { category: selectedCategory }),
                ...(searchQuery && { search: searchQuery })
            };

            const response = await axios.get('/api/workflow-templates', { params });
            setTemplates(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch templates:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await axios.get('/api/workflow-templates/categories');
            setCategories(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch categories:', error);
        }
    };

    const handlePreviewTemplate = async (template) => {
        setSelectedTemplate(template);
        setShowPreview(true);
    };

    const handleCreateFromTemplate = async () => {
        if (!selectedTemplate) return;

        setCreating(true);

        try {
            const response = await axios.post(
                `/api/workflow-templates/${selectedTemplate.id}/instantiate`,
                {
                    name: `${selectedTemplate.name} (My Copy)`,
                    is_active: true
                }
            );

            alert('Workflow created successfully!');
            setShowPreview(false);

            if (onTemplateSelect) {
                onTemplateSelect(response.data.data);
            }
        } catch (error) {
            console.error('Failed to create workflow:', error);
            alert('Failed to create workflow. Please try again.');
        } finally {
            setCreating(false);
        }
    };

    const getIconForTemplate = (iconName) => {
        const iconMap = {
            'alert-triangle': AlertTriangle,
            'heart': Heart,
            'frown': Frown,
            'alert-circle': AlertCircle,
            'user-plus': UserPlus,
            'mail': Mail
        };

        const IconComponent = iconMap[iconName] || FlaskConical;
        return <IconComponent size={24} />;
    };

    const getCategoryIcon = (category) => {
        const iconMap = {
            'customer_service': MessageSquare,
            'sales': TrendingUp,
            'marketing': Users,
            'operations': CheckCircle
        };

        const IconComponent = iconMap[category] || FlaskConical;
        return <IconComponent size={16} />;
    };

    const getCategoryLabel = (category) => {
        const labels = {
            'customer_service': 'Customer Service',
            'sales': 'Sales',
            'marketing': 'Marketing',
            'operations': 'Operations'
        };
        return labels[category] || category;
    };

    return (
        <div className="workflow-templates-browser">
            {/* Header */}
            <div className="templates-header">
                <div className="header-content">
                    <h1>Workflow Templates</h1>
                    <p>Choose from pre-built workflows or create your own</p>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="templates-filters">
                <div className="search-box">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Search templates..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="category-filters">
                    <button
                        className={selectedCategory === 'all' ? 'active' : ''}
                        onClick={() => setSelectedCategory('all')}
                    >
                        All Templates
                    </button>
                    {categories.map((cat) => (
                        <button
                            key={cat.category}
                            className={selectedCategory === cat.category ? 'active' : ''}
                            onClick={() => setSelectedCategory(cat.category)}
                        >
                            {getCategoryIcon(cat.category)}
                            {getCategoryLabel(cat.category)}
                            <span className="count">({cat.template_count})</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Templates Grid */}
            <div className="templates-grid">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading templates...</p>
                    </div>
                ) : templates.length === 0 ? (
                    <div className="empty-state">
                        <FlaskConical size={48} />
                        <h3>No templates found</h3>
                        <p>Try adjusting your search or filters</p>
                    </div>
                ) : (
                    templates.map((template) => (
                        <div
                            key={template.id}
                            className="template-card"
                            onClick={() => handlePreviewTemplate(template)}
                        >
                            <div className="template-icon">
                                {getIconForTemplate(template.icon)}
                            </div>

                            <div className="template-content">
                                <div className="template-header">
                                    <h3>{template.name}</h3>
                                    {template.is_public && (
                                        <span className="badge public">Official</span>
                                    )}
                                </div>

                                <p className="template-use-case">{template.use_case}</p>
                                <p className="template-description">{template.description}</p>

                                <div className="template-meta">
                                    <span className="category">
                                        {getCategoryLabel(template.category)}
                                    </span>
                                    {template.usage_count > 0 && (
                                        <span className="usage">
                                            Used {template.usage_count} times
                                        </span>
                                    )}
                                </div>

                                {template.tags && template.tags.length > 0 && (
                                    <div className="template-tags">
                                        {template.tags.slice(0, 3).map((tag, index) => (
                                            <span key={index} className="tag">{tag}</span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="template-actions">
                                <button className="btn-preview">
                                    Preview & Use
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Template Preview Modal */}
            {showPreview && selectedTemplate && (
                <div className="modal-overlay" onClick={() => setShowPreview(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title-section">
                                <div className="modal-icon">
                                    {getIconForTemplate(selectedTemplate.icon)}
                                </div>
                                <div>
                                    <h2>{selectedTemplate.name}</h2>
                                    <p className="modal-subtitle">{selectedTemplate.use_case}</p>
                                </div>
                            </div>
                            <button
                                className="close-button"
                                onClick={() => setShowPreview(false)}
                            >
                                ×
                            </button>
                        </div>

                        <div className="modal-body">
                            <section className="preview-section">
                                <h3>Description</h3>
                                <p>{selectedTemplate.description}</p>
                            </section>

                            <section className="preview-section">
                                <h3>How It Works</h3>
                                <div className="workflow-steps">
                                    <div className="step">
                                        <div className="step-number">1</div>
                                        <div className="step-content">
                                            <h4>Trigger</h4>
                                            <p>
                                                {(() => {
                                                    const def = typeof selectedTemplate.workflow_definition === 'string'
                                                        ? JSON.parse(selectedTemplate.workflow_definition)
                                                        : selectedTemplate.workflow_definition;
                                                    return def.trigger_event.replace(/_/g, ' ');
                                                })()}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="step">
                                        <div className="step-number">2</div>
                                        <div className="step-content">
                                            <h4>Conditions</h4>
                                            <p>
                                                {(() => {
                                                    const def = typeof selectedTemplate.workflow_definition === 'string'
                                                        ? JSON.parse(selectedTemplate.workflow_definition)
                                                        : selectedTemplate.workflow_definition;

                                                    if (!def.conditions || def.conditions.length === 0) {
                                                        return 'No conditions (runs on every trigger)';
                                                    }

                                                    const nonLogicConditions = def.conditions.filter(c => !c.logic);
                                                    return `${nonLogicConditions.length} condition(s) must be met`;
                                                })()}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="step">
                                        <div className="step-number">3</div>
                                        <div className="step-content">
                                            <h4>Actions</h4>
                                            <p>
                                                {(() => {
                                                    const def = typeof selectedTemplate.workflow_definition === 'string'
                                                        ? JSON.parse(selectedTemplate.workflow_definition)
                                                        : selectedTemplate.workflow_definition;

                                                    const actionTypes = def.actions.map(a =>
                                                        a.type.replace(/_/g, ' ')
                                                    ).join(', ');

                                                    return `${def.actions.length} action(s): ${actionTypes}`;
                                                })()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="preview-section">
                                <h3>Category & Tags</h3>
                                <div className="meta-info">
                                    <span className="category-badge">
                                        {getCategoryLabel(selectedTemplate.category)}
                                    </span>
                                    {selectedTemplate.tags && selectedTemplate.tags.length > 0 && (
                                        <div className="tags-list">
                                            {selectedTemplate.tags.map((tag, index) => (
                                                <span key={index} className="tag">{tag}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </section>

                            {selectedTemplate.usage_count > 0 && (
                                <div className="usage-stats">
                                    <CheckCircle size={16} />
                                    <span>Used by {selectedTemplate.usage_count} teams</span>
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button
                                className="btn-secondary"
                                onClick={() => setShowPreview(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn-primary"
                                onClick={handleCreateFromTemplate}
                                disabled={creating}
                            >
                                {creating ? 'Creating...' : 'Create Workflow from Template'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkflowTemplatesBrowser;
