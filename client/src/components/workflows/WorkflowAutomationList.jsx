import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Play, Pause, BarChart3, Trash2, Plus, Edit, Clock } from 'lucide-react';
import axios from '../../axiosConfig';
import './WorkflowAutomationList.css';

/**
 * Workflow Automation List Component
 *
 * Display and manage workflow automations:
 * - List all workflows with status
 * - Create new workflows
 * - Toggle workflow active/inactive
 * - View execution history
 * - Delete workflows
 */
export default function WorkflowAutomationList() {
    const navigate = useNavigate();
    const [workflows, setWorkflows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, active, inactive

    useEffect(() => {
        fetchWorkflows();
    }, [filter]);

    const fetchWorkflows = async () => {
        try {
            setLoading(true);
            const params = filter !== 'all' ? { isActive: filter === 'active' } : {};
            const response = await axios.get('/api/workflows-automation', { params });
            setWorkflows(response.data.workflows);
        } catch (error) {
            console.error('Failed to fetch workflows:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActive = async (workflowId, currentStatus) => {
        try {
            await axios.put(`/api/workflows-automation/${workflowId}`, {
                is_active: !currentStatus
            });
            fetchWorkflows();
        } catch (error) {
            console.error('Failed to toggle workflow:', error);
            alert('Failed to update workflow status');
        }
    };

    const handleDelete = async (workflowId) => {
        if (!confirm('Are you sure you want to delete this workflow? This action cannot be undone.')) {
            return;
        }

        try {
            await axios.delete(`/api/workflows-automation/${workflowId}`);
            fetchWorkflows();
        } catch (error) {
            console.error('Failed to delete workflow:', error);
            alert('Failed to delete workflow');
        }
    };

    const getTriggerLabel = (triggerType) => {
        const labels = {
            'response_received': 'On Response',
            'score_threshold': 'Score Threshold',
            'keyword_detected': 'Keyword Detected',
            'sentiment_detected': 'Sentiment Detected',
            'quality_threshold': 'Quality Threshold'
        };
        return labels[triggerType] || triggerType;
    };

    const getTriggerDescription = (triggerType, triggerConfig) => {
        try {
            const config = typeof triggerConfig === 'string'
                ? JSON.parse(triggerConfig)
                : triggerConfig;

            switch (triggerType) {
                case 'score_threshold':
                    return `${config.metric?.toUpperCase() || 'Score'} ${config.operator || '≤'} ${config.value || 0}`;
                case 'keyword_detected':
                    return `Keywords: ${config.keywords?.join(', ') || 'None'}`;
                case 'sentiment_detected':
                    return `Sentiment: ${config.sentimentType || 'Unknown'}`;
                case 'quality_threshold':
                    return `Quality ${config.operator || '≤'} ${config.value || 40}`;
                case 'response_received':
                    return 'Any response received';
                default:
                    return '';
            }
        } catch (error) {
            return '';
        }
    };

    if (loading) {
        return (
            <div className="workflow-automation-container">
                <div className="workflow-automation-loading">Loading workflows...</div>
            </div>
        );
    }

    return (
        <div className="workflow-automation-container">
            <div className="workflow-automation-header">
                <div className="workflow-automation-title-section">
                    <Zap size={28} className="workflow-automation-icon" />
                    <div>
                        <h1>Workflow Automations</h1>
                        <p>Automate actions based on survey responses</p>
                    </div>
                </div>
                <button
                    className="workflow-automation-create-btn"
                    onClick={() => navigate('/workflows-automation/new')}
                >
                    <Plus size={20} />
                    Create Workflow
                </button>
            </div>

            <div className="workflow-automation-filters">
                <button
                    className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                    onClick={() => setFilter('all')}
                >
                    All ({workflows.length})
                </button>
                <button
                    className={`filter-btn ${filter === 'active' ? 'active' : ''}`}
                    onClick={() => setFilter('active')}
                >
                    Active ({workflows.filter(w => w.is_active).length})
                </button>
                <button
                    className={`filter-btn ${filter === 'inactive' ? 'active' : ''}`}
                    onClick={() => setFilter('inactive')}
                >
                    Inactive ({workflows.filter(w => !w.is_active).length})
                </button>
            </div>

            {workflows.length === 0 ? (
                <div className="workflow-automation-empty">
                    <Zap size={64} className="empty-icon" />
                    <h2>No Workflows Yet</h2>
                    <p>Create your first workflow to automate actions based on survey responses</p>
                    <button
                        className="workflow-automation-create-btn"
                        onClick={() => navigate('/workflows-automation/new')}
                    >
                        <Plus size={20} />
                        Create Workflow
                    </button>
                </div>
            ) : (
                <div className="workflow-automation-grid">
                    {workflows.map((workflow) => (
                        <div
                            key={workflow.id}
                            className={`workflow-automation-card ${!workflow.is_active ? 'inactive' : ''}`}
                        >
                            <div className="workflow-automation-card-header">
                                <div className="workflow-automation-card-title">
                                    <h3>{workflow.name}</h3>
                                    <span className={`workflow-automation-status-badge ${workflow.is_active ? 'active' : 'inactive'}`}>
                                        {workflow.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                                <div className="workflow-automation-card-actions">
                                    <button
                                        className="icon-btn"
                                        title={workflow.is_active ? 'Pause' : 'Activate'}
                                        onClick={() => handleToggleActive(workflow.id, workflow.is_active)}
                                    >
                                        {workflow.is_active ? <Pause size={16} /> : <Play size={16} />}
                                    </button>
                                    <button
                                        className="icon-btn"
                                        title="Edit"
                                        onClick={() => navigate(`/workflows-automation/${workflow.id}/edit`)}
                                    >
                                        <Edit size={16} />
                                    </button>
                                    <button
                                        className="icon-btn danger"
                                        title="Delete"
                                        onClick={() => handleDelete(workflow.id)}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            {workflow.description && (
                                <p className="workflow-automation-description">{workflow.description}</p>
                            )}

                            <div className="workflow-automation-trigger-info">
                                <div className="trigger-label">
                                    <strong>Trigger:</strong> {getTriggerLabel(workflow.trigger_type)}
                                </div>
                                <div className="trigger-description">
                                    {getTriggerDescription(workflow.trigger_type, workflow.trigger_config)}
                                </div>
                            </div>

                            <div className="workflow-automation-stats">
                                <div className="stat">
                                    <Clock size={16} />
                                    <span>
                                        {workflow.execution_count || 0} executions
                                    </span>
                                </div>
                                {workflow.last_executed_at && (
                                    <div className="stat">
                                        <span className="stat-label">Last run:</span>
                                        <span>{new Date(workflow.last_executed_at).toLocaleDateString()}</span>
                                    </div>
                                )}
                            </div>

                            <div className="workflow-automation-card-footer">
                                <button
                                    className="workflow-automation-view-btn"
                                    onClick={() => navigate(`/workflows-automation/${workflow.id}/executions`)}
                                >
                                    <BarChart3 size={16} />
                                    View Executions
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
