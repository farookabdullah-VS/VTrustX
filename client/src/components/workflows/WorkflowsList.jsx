/**
 * Workflows List
 *
 * View and manage created workflows
 */

import React, { useState, useEffect } from 'react';
import axios from '../../axiosConfig';
import {
    Play,
    Pause,
    Trash2,
    Edit,
    TrendingUp,
    CheckCircle,
    XCircle,
    Clock,
    BarChart3
} from 'lucide-react';
import './WorkflowsList.css';

const WorkflowsList = () => {
    const [workflows, setWorkflows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);

    useEffect(() => {
        fetchWorkflows();
        fetchStats();
    }, []);

    const fetchWorkflows = async () => {
        try {
            const response = await axios.get('/api/workflows');
            setWorkflows(response.data || []);
        } catch (error) {
            console.error('Failed to fetch workflows:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await axios.get('/api/workflow-executions/stats/overview');
            setStats(response.data.data);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    };

    const handleToggleActive = async (workflow) => {
        try {
            await axios.put(`/api/workflows/${workflow.id}`, {
                is_active: !workflow.is_active
            });

            setWorkflows(workflows.map(w =>
                w.id === workflow.id ? { ...w, is_active: !w.is_active } : w
            ));

            alert(`Workflow ${!workflow.is_active ? 'activated' : 'paused'} successfully`);
        } catch (error) {
            console.error('Failed to toggle workflow:', error);
            alert('Failed to update workflow');
        }
    };

    const handleDeleteWorkflow = async (workflowId) => {
        if (!confirm('Are you sure you want to delete this workflow?')) {
            return;
        }

        try {
            await axios.delete(`/api/workflows/${workflowId}`);
            setWorkflows(workflows.filter(w => w.id !== workflowId));
            alert('Workflow deleted successfully');
        } catch (error) {
            console.error('Failed to delete workflow:', error);
            alert('Failed to delete workflow');
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getSuccessRate = (workflow) => {
        if (workflow.execution_count === 0) return 0;
        return Math.round((workflow.success_count / workflow.execution_count) * 100);
    };

    return (
        <div className="workflows-list-container">
            {/* Header with Stats */}
            <div className="workflows-header">
                <div className="header-content">
                    <h1>My Workflows</h1>
                    <p>Manage and monitor your automated workflows</p>
                </div>

                {stats && (
                    <div className="stats-summary">
                        <div className="stat-card">
                            <div className="stat-icon">
                                <TrendingUp size={20} />
                            </div>
                            <div className="stat-content">
                                <div className="stat-value">
                                    {stats.statusBreakdown.reduce((sum, s) => sum + parseInt(s.count), 0)}
                                </div>
                                <div className="stat-label">Total Executions</div>
                            </div>
                        </div>

                        <div className="stat-card success">
                            <div className="stat-icon">
                                <CheckCircle size={20} />
                            </div>
                            <div className="stat-content">
                                <div className="stat-value">
                                    {stats.statusBreakdown.find(s => s.status === 'completed')?.count || 0}
                                </div>
                                <div className="stat-label">Completed</div>
                            </div>
                        </div>

                        <div className="stat-card error">
                            <div className="stat-icon">
                                <XCircle size={20} />
                            </div>
                            <div className="stat-content">
                                <div className="stat-value">
                                    {stats.statusBreakdown.find(s => s.status === 'failed')?.count || 0}
                                </div>
                                <div className="stat-label">Failed</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Workflows List */}
            {loading ? (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading workflows...</p>
                </div>
            ) : workflows.length === 0 ? (
                <div className="empty-state">
                    <BarChart3 size={48} />
                    <h3>No workflows yet</h3>
                    <p>Create your first workflow from a template to get started</p>
                </div>
            ) : (
                <div className="workflows-table">
                    {workflows.map((workflow) => (
                        <div key={workflow.id} className="workflow-row">
                            <div className="workflow-info">
                                <div className="workflow-header-row">
                                    <h3>{workflow.name}</h3>
                                    <span className={`status-badge ${workflow.is_active ? 'active' : 'paused'}`}>
                                        {workflow.is_active ? 'Active' : 'Paused'}
                                    </span>
                                </div>

                                {workflow.description && (
                                    <p className="workflow-description">{workflow.description}</p>
                                )}

                                <div className="workflow-meta">
                                    <span className="meta-item">
                                        <strong>Trigger:</strong> {workflow.trigger_event?.replace(/_/g, ' ')}
                                    </span>
                                    <span className="meta-item">
                                        <strong>Conditions:</strong>{' '}
                                        {workflow.conditions?.length || 0}
                                    </span>
                                    <span className="meta-item">
                                        <strong>Actions:</strong>{' '}
                                        {workflow.actions?.length || 0}
                                    </span>
                                </div>
                            </div>

                            <div className="workflow-stats">
                                <div className="stat">
                                    <div className="stat-label">Executions</div>
                                    <div className="stat-value">{workflow.execution_count || 0}</div>
                                </div>

                                <div className="stat">
                                    <div className="stat-label">Success Rate</div>
                                    <div className="stat-value">
                                        {getSuccessRate(workflow)}%
                                    </div>
                                </div>

                                <div className="stat">
                                    <div className="stat-label">Avg Duration</div>
                                    <div className="stat-value">
                                        {workflow.average_duration_ms
                                            ? `${(workflow.average_duration_ms / 1000).toFixed(1)}s`
                                            : 'N/A'}
                                    </div>
                                </div>

                                <div className="stat">
                                    <div className="stat-label">Last Run</div>
                                    <div className="stat-value small">
                                        {formatDate(workflow.last_executed_at)}
                                    </div>
                                </div>
                            </div>

                            <div className="workflow-actions">
                                <button
                                    className={`action-btn ${workflow.is_active ? 'pause' : 'play'}`}
                                    onClick={() => handleToggleActive(workflow)}
                                    title={workflow.is_active ? 'Pause' : 'Activate'}
                                >
                                    {workflow.is_active ? <Pause size={18} /> : <Play size={18} />}
                                </button>

                                <button
                                    className="action-btn edit"
                                    onClick={() => alert('Edit functionality coming in Phase 2')}
                                    title="Edit"
                                >
                                    <Edit size={18} />
                                </button>

                                <button
                                    className="action-btn delete"
                                    onClick={() => handleDeleteWorkflow(workflow.id)}
                                    title="Delete"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default WorkflowsList;
