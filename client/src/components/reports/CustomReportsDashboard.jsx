/**
 * Custom Reports Dashboard
 *
 * List and manage all custom reports
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus,
    BarChart3,
    Edit,
    Trash2,
    Eye,
    Share2,
    Calendar
} from 'lucide-react';
import axios from '../../axiosConfig';
import './CustomReportsDashboard.css';

const CustomReportsDashboard = () => {
    const navigate = useNavigate();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        fetchReports();
    }, [filter]);

    const fetchReports = async () => {
        try {
            setLoading(true);
            const params = filter !== 'all' ? { category: filter } : {};
            const response = await axios.get('/api/custom-reports', { params });
            setReports(response.data.data);
        } catch (error) {
            console.error('Failed to fetch reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteReport = async (reportId) => {
        if (!confirm('Are you sure you want to delete this report?')) return;

        try {
            await axios.delete(`/api/custom-reports/${reportId}`);
            setReports(reports.filter(r => r.id !== reportId));
            alert('Report deleted successfully');
        } catch (error) {
            console.error('Failed to delete report:', error);
            alert('Failed to delete report');
        }
    };

    const handleViewReport = (reportId) => {
        navigate(`/custom-reports/${reportId}`);
    };

    const handleEditReport = (reportId) => {
        navigate(`/custom-reports/${reportId}/edit`);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="custom-reports-dashboard">
            {/* Header */}
            <div className="dashboard-header">
                <div>
                    <h1>Custom Reports</h1>
                    <p>Create and manage drag-and-drop visual reports</p>
                </div>

                <button
                    className="btn-create-report"
                    onClick={() => navigate('/custom-reports/new')}
                >
                    <Plus size={20} />
                    Create Report
                </button>
            </div>

            {/* Filters */}
            <div className="dashboard-filters">
                <button
                    className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                    onClick={() => setFilter('all')}
                >
                    All Reports ({reports.length})
                </button>
                <button
                    className={`filter-btn ${filter === 'custom' ? 'active' : ''}`}
                    onClick={() => setFilter('custom')}
                >
                    Custom
                </button>
                <button
                    className={`filter-btn ${filter === 'analytics' ? 'active' : ''}`}
                    onClick={() => setFilter('analytics')}
                >
                    Analytics
                </button>
                <button
                    className={`filter-btn ${filter === 'executive' ? 'active' : ''}`}
                    onClick={() => setFilter('executive')}
                >
                    Executive
                </button>
            </div>

            {/* Reports Grid */}
            {loading ? (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading reports...</p>
                </div>
            ) : reports.length === 0 ? (
                <div className="empty-state">
                    <BarChart3 size={64} color="#D1D5DB" />
                    <h3>No Reports Yet</h3>
                    <p>Create your first custom report with drag-and-drop widgets</p>
                    <button
                        className="btn-create-report"
                        onClick={() => navigate('/custom-reports/new')}
                    >
                        <Plus size={20} />
                        Create Report
                    </button>
                </div>
            ) : (
                <div className="reports-grid">
                    {reports.map((report) => (
                        <div key={report.id} className="report-card">
                            <div className="card-header">
                                <h3>{report.name}</h3>
                                <span className="widget-count">{report.widgetCount} widgets</span>
                            </div>

                            {report.description && (
                                <p className="card-description">{report.description}</p>
                            )}

                            <div className="card-meta">
                                <span className="meta-item">
                                    <Calendar size={14} />
                                    {formatDate(report.updatedAt)}
                                </span>
                                <span className="meta-item">
                                    <Eye size={14} />
                                    {report.viewCount} views
                                </span>
                            </div>

                            <div className="card-tags">
                                {report.tags.map((tag, index) => (
                                    <span key={index} className="tag">{tag}</span>
                                ))}
                            </div>

                            <div className="card-actions">
                                <button
                                    className="action-btn view"
                                    onClick={() => handleViewReport(report.id)}
                                    title="View Report"
                                >
                                    <Eye size={16} />
                                </button>
                                <button
                                    className="action-btn edit"
                                    onClick={() => handleEditReport(report.id)}
                                    title="Edit Report"
                                >
                                    <Edit size={16} />
                                </button>
                                <button
                                    className="action-btn delete"
                                    onClick={() => handleDeleteReport(report.id)}
                                    title="Delete Report"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CustomReportsDashboard;
