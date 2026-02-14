import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Zap } from 'lucide-react';
import axios from '../../axiosConfig';
import './WorkflowAutomationBuilder.css';

/**
 * Workflow Automation Builder Component
 *
 * Create and configure workflow automations:
 * - Select trigger type and configuration
 * - Configure actions (email, ticket, etc.)
 * - Set workflow name and description
 */
export default function WorkflowAutomationBuilder() {
    const navigate = useNavigate();
    const [forms, setForms] = useState([]);
    const [saving, setSaving] = useState(false);

    const [workflow, setWorkflow] = useState({
        name: '',
        description: '',
        formId: null,
        triggerType: 'response_received',
        triggerConfig: {},
        workflowDefinition: { nodes: [], edges: [] },
        isActive: true
    });

    // Action configuration
    const [actions, setActions] = useState([{
        id: 'action_1',
        type: 'send_email',
        config: {
            to: '',
            subject: '',
            body: ''
        }
    }]);

    useEffect(() => {
        fetchForms();
    }, []);

    const fetchForms = async () => {
        try {
            const response = await axios.get('/api/forms');
            setForms(response.data || []);
        } catch (error) {
            console.error('Failed to fetch forms:', error);
        }
    };

    const handleTriggerConfigChange = (key, value) => {
        setWorkflow(prev => ({
            ...prev,
            triggerConfig: {
                ...prev.triggerConfig,
                [key]: value
            }
        }));
    };

    const handleActionConfigChange = (actionIndex, key, value) => {
        setActions(prev => {
            const updated = [...prev];
            updated[actionIndex].config[key] = value;
            return updated;
        });
    };

    const addAction = () => {
        setActions(prev => [...prev, {
            id: `action_${prev.length + 1}`,
            type: 'send_email',
            config: {}
        }]);
    };

    const removeAction = (index) => {
        setActions(prev => prev.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        if (!workflow.name.trim()) {
            alert('Please enter a workflow name');
            return;
        }

        try {
            setSaving(true);

            // Convert actions to workflow definition
            const workflowDefinition = {
                nodes: actions.map((action, index) => ({
                    id: action.id,
                    type: action.type,
                    data: action.config,
                    position: { x: 0, y: index * 100 }
                })),
                edges: []
            };

            const payload = {
                name: workflow.name,
                description: workflow.description,
                formId: workflow.formId || null,
                triggerType: workflow.triggerType,
                triggerConfig: workflow.triggerConfig,
                workflowDefinition,
                isActive: workflow.isActive
            };

            await axios.post('/api/workflows-automation', payload);

            alert('Workflow created successfully!');
            navigate('/workflows-automation');
        } catch (error) {
            console.error('Failed to save workflow:', error);
            alert(error.response?.data?.error || 'Failed to save workflow');
        } finally {
            setSaving(false);
        }
    };

    const renderTriggerConfig = () => {
        switch (workflow.triggerType) {
            case 'score_threshold':
                return (
                    <div className="trigger-config-section">
                        <h4>Score Threshold Configuration</h4>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Metric</label>
                                <select
                                    value={workflow.triggerConfig.metric || 'nps'}
                                    onChange={(e) => handleTriggerConfigChange('metric', e.target.value)}
                                >
                                    <option value="nps">NPS</option>
                                    <option value="csat">CSAT</option>
                                    <option value="ces">CES</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Operator</label>
                                <select
                                    value={workflow.triggerConfig.operator || '<='}
                                    onChange={(e) => handleTriggerConfigChange('operator', e.target.value)}
                                >
                                    <option value="<=">≤ Less than or equal</option>
                                    <option value="<">{'<'} Less than</option>
                                    <option value=">=">≥ Greater than or equal</option>
                                    <option value=">">{'>'} Greater than</option>
                                    <option value="==">= Equal to</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Value</label>
                                <input
                                    type="number"
                                    value={workflow.triggerConfig.value || 6}
                                    onChange={(e) => handleTriggerConfigChange('value', parseInt(e.target.value))}
                                />
                            </div>
                        </div>
                        <p className="help-text">
                            Example: Trigger when NPS ≤ 6 (detractors)
                        </p>
                    </div>
                );

            case 'keyword_detected':
                return (
                    <div className="trigger-config-section">
                        <h4>Keyword Detection Configuration</h4>
                        <div className="form-group">
                            <label>Keywords (comma-separated)</label>
                            <input
                                type="text"
                                placeholder="refund, cancel, unhappy"
                                value={(workflow.triggerConfig.keywords || []).join(', ')}
                                onChange={(e) => handleTriggerConfigChange('keywords', e.target.value.split(',').map(k => k.trim()))}
                            />
                        </div>
                        <div className="form-group">
                            <label>Match Type</label>
                            <select
                                value={workflow.triggerConfig.matchType || 'any'}
                                onChange={(e) => handleTriggerConfigChange('matchType', e.target.value)}
                            >
                                <option value="any">Match Any Keyword</option>
                                <option value="all">Match All Keywords</option>
                            </select>
                        </div>
                    </div>
                );

            case 'sentiment_detected':
                return (
                    <div className="trigger-config-section">
                        <h4>Sentiment Detection Configuration</h4>
                        <div className="form-group">
                            <label>Sentiment Type</label>
                            <select
                                value={workflow.triggerConfig.sentimentType || 'negative'}
                                onChange={(e) => handleTriggerConfigChange('sentimentType', e.target.value)}
                            >
                                <option value="positive">Positive</option>
                                <option value="negative">Negative</option>
                                <option value="neutral">Neutral</option>
                            </select>
                        </div>
                    </div>
                );

            case 'quality_threshold':
                return (
                    <div className="trigger-config-section">
                        <h4>Quality Threshold Configuration</h4>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Operator</label>
                                <select
                                    value={workflow.triggerConfig.operator || '<='}
                                    onChange={(e) => handleTriggerConfigChange('operator', e.target.value)}
                                >
                                    <option value="<=">≤ Less than or equal</option>
                                    <option value="<">{'<'} Less than</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Quality Score</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={workflow.triggerConfig.value || 40}
                                    onChange={(e) => handleTriggerConfigChange('value', parseInt(e.target.value))}
                                />
                            </div>
                        </div>
                        <p className="help-text">
                            Trigger when quality score is below threshold (0-100)
                        </p>
                    </div>
                );

            default:
                return (
                    <p className="help-text">
                        This workflow will trigger on every completed response.
                    </p>
                );
        }
    };

    const renderActionConfig = (action, index) => {
        switch (action.type) {
            case 'send_email':
                return (
                    <div className="action-config">
                        <div className="form-group">
                            <label>To (Email Address)</label>
                            <input
                                type="email"
                                placeholder="manager@company.com"
                                value={action.config.to || ''}
                                onChange={(e) => handleActionConfigChange(index, 'to', e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Subject</label>
                            <input
                                type="text"
                                placeholder="New Detractor Response"
                                value={action.config.subject || ''}
                                onChange={(e) => handleActionConfigChange(index, 'subject', e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Body</label>
                            <textarea
                                rows="4"
                                placeholder="Use {{field_name}} for dynamic values"
                                value={action.config.body || ''}
                                onChange={(e) => handleActionConfigChange(index, 'body', e.target.value)}
                            />
                            <p className="help-text">
                                Use {'{{field_name}}'} to insert response data
                            </p>
                        </div>
                    </div>
                );

            case 'create_ticket':
                return (
                    <div className="action-config">
                        <div className="form-group">
                            <label>Ticket Title</label>
                            <input
                                type="text"
                                placeholder="Follow up with detractor"
                                value={action.config.title || ''}
                                onChange={(e) => handleActionConfigChange(index, 'title', e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Description</label>
                            <textarea
                                rows="3"
                                placeholder="Use {{field_name}} for dynamic values"
                                value={action.config.description || ''}
                                onChange={(e) => handleActionConfigChange(index, 'description', e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Priority</label>
                            <select
                                value={action.config.priority || 'medium'}
                                onChange={(e) => handleActionConfigChange(index, 'priority', e.target.value)}
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                            </select>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="workflow-automation-builder-container">
            <div className="workflow-automation-builder-header">
                <button
                    className="back-btn"
                    onClick={() => navigate('/workflows-automation')}
                >
                    <ArrowLeft size={20} />
                    Back
                </button>
                <h1>Create Workflow Automation</h1>
            </div>

            <div className="workflow-automation-builder-content">
                {/* Basic Info */}
                <section className="builder-section">
                    <h2><Zap size={20} /> Workflow Details</h2>
                    <div className="form-group">
                        <label>Workflow Name *</label>
                        <input
                            type="text"
                            placeholder="NPS Detractor Follow-up"
                            value={workflow.name}
                            onChange={(e) => setWorkflow(prev => ({ ...prev, name: e.target.value }))}
                        />
                    </div>
                    <div className="form-group">
                        <label>Description</label>
                        <textarea
                            rows="2"
                            placeholder="Automatically create a ticket and email the CSM when an NPS detractor is detected"
                            value={workflow.description}
                            onChange={(e) => setWorkflow(prev => ({ ...prev, description: e.target.value }))}
                        />
                    </div>
                    <div className="form-group">
                        <label>Apply to Form (optional)</label>
                        <select
                            value={workflow.formId || ''}
                            onChange={(e) => setWorkflow(prev => ({ ...prev, formId: e.target.value ? parseInt(e.target.value) : null }))}
                        >
                            <option value="">All Forms</option>
                            {forms.map(form => (
                                <option key={form.id} value={form.id}>{form.name}</option>
                            ))}
                        </select>
                    </div>
                </section>

                {/* Trigger */}
                <section className="builder-section">
                    <h2>Trigger</h2>
                    <div className="form-group">
                        <label>When should this workflow run?</label>
                        <select
                            value={workflow.triggerType}
                            onChange={(e) => setWorkflow(prev => ({ ...prev, triggerType: e.target.value, triggerConfig: {} }))}
                        >
                            <option value="response_received">On Every Response</option>
                            <option value="score_threshold">Score Threshold (NPS, CSAT, CES)</option>
                            <option value="keyword_detected">Keyword Detected</option>
                            <option value="sentiment_detected">Sentiment Detected</option>
                            <option value="quality_threshold">Quality Threshold</option>
                        </select>
                    </div>
                    {renderTriggerConfig()}
                </section>

                {/* Actions */}
                <section className="builder-section">
                    <h2>Actions</h2>
                    {actions.map((action, index) => (
                        <div key={action.id} className="action-card">
                            <div className="action-card-header">
                                <h3>Action {index + 1}</h3>
                                {actions.length > 1 && (
                                    <button
                                        className="remove-action-btn"
                                        onClick={() => removeAction(index)}
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                            <div className="form-group">
                                <label>Action Type</label>
                                <select
                                    value={action.type}
                                    onChange={(e) => {
                                        const updated = [...actions];
                                        updated[index].type = e.target.value;
                                        updated[index].config = {};
                                        setActions(updated);
                                    }}
                                >
                                    <option value="send_email">Send Email</option>
                                    <option value="create_ticket">Create Support Ticket</option>
                                </select>
                            </div>
                            {renderActionConfig(action, index)}
                        </div>
                    ))}
                    <button className="add-action-btn" onClick={addAction}>
                        + Add Another Action
                    </button>
                </section>

                {/* Footer */}
                <div className="workflow-automation-builder-footer">
                    <label className="active-toggle">
                        <input
                            type="checkbox"
                            checked={workflow.isActive}
                            onChange={(e) => setWorkflow(prev => ({ ...prev, isActive: e.target.checked }))}
                        />
                        <span>Activate workflow immediately</span>
                    </label>
                    <div className="footer-actions">
                        <button
                            className="cancel-btn"
                            onClick={() => navigate('/workflows-automation')}
                        >
                            Cancel
                        </button>
                        <button
                            className="save-btn"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            <Save size={18} />
                            {saving ? 'Saving...' : 'Create Workflow'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
