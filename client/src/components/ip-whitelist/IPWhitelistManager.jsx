import React, { useState, useEffect, useCallback } from 'react';
import axios from '../../axiosConfig';
import {
    Shield, Plus, Edit2, Trash2, Power, AlertTriangle, Info,
    Globe, Check, X, Search, RefreshCw, TestTube
} from 'lucide-react';
import './IPWhitelistManager.css';

function IPWhitelistManager() {
    const [rules, setRules] = useState([]);
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingRule, setEditingRule] = useState(null);
    const [currentIP, setCurrentIP] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Form state
    const [formData, setFormData] = useState({
        ip_address: '',
        ip_range: '',
        description: '',
        is_active: true
    });

    useEffect(() => {
        fetchData();
        fetchCurrentIP();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            const [rulesRes, configRes] = await Promise.all([
                axios.get('/api/ip-whitelist/rules'),
                axios.get('/api/ip-whitelist/config')
            ]);
            setRules(rulesRes.data.rules || []);
            setConfig(configRes.data);
        } catch (err) {
            console.error('Failed to fetch IP whitelist data:', err);
            setError('Failed to load IP whitelist settings');
        } finally {
            setLoading(false);
        }
    };

    const fetchCurrentIP = async () => {
        try {
            const response = await axios.get('/api/ip-whitelist/current');
            setCurrentIP(response.data.ip_address);
        } catch (err) {
            console.error('Failed to fetch current IP:', err);
        }
    };

    const handleToggleEnabled = async () => {
        try {
            const response = await axios.put('/api/ip-whitelist/config', {
                enabled: !config.enabled
            });
            setConfig(response.data.config);
            await fetchData();
        } catch (err) {
            console.error('Failed to toggle IP whitelist:', err);
            alert('Failed to update configuration');
        }
    };

    const handleEnforcementModeChange = async (mode) => {
        try {
            const response = await axios.put('/api/ip-whitelist/config', {
                enforcement_mode: mode
            });
            setConfig(response.data.config);
        } catch (err) {
            console.error('Failed to update enforcement mode:', err);
            alert('Failed to update enforcement mode');
        }
    };

    const handleOpenAddModal = () => {
        setFormData({
            ip_address: '',
            ip_range: '',
            description: '',
            is_active: true
        });
        setEditingRule(null);
        setShowAddModal(true);
    };

    const handleOpenEditModal = (rule) => {
        setFormData({
            ip_address: rule.ip_address || '',
            ip_range: rule.ip_range || '',
            description: rule.description || '',
            is_active: rule.is_active
        });
        setEditingRule(rule);
        setShowAddModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate
        if (!formData.ip_address && !formData.ip_range) {
            alert('Please provide either an IP address or CIDR range');
            return;
        }

        if (formData.ip_address && formData.ip_range) {
            alert('Please provide only one: IP address OR CIDR range');
            return;
        }

        try {
            if (editingRule) {
                await axios.put(`/api/ip-whitelist/rules/${editingRule.id}`, formData);
            } else {
                await axios.post('/api/ip-whitelist/rules', formData);
            }
            setShowAddModal(false);
            await fetchData();
        } catch (err) {
            console.error('Failed to save rule:', err);
            alert(err.response?.data?.error || 'Failed to save rule');
        }
    };

    const handleDelete = async (ruleId) => {
        if (!window.confirm('Are you sure you want to delete this rule?')) {
            return;
        }

        try {
            await axios.delete(`/api/ip-whitelist/rules/${ruleId}`);
            await fetchData();
        } catch (err) {
            console.error('Failed to delete rule:', err);
            alert('Failed to delete rule');
        }
    };

    const handleToggleActive = async (rule) => {
        try {
            await axios.put(`/api/ip-whitelist/rules/${rule.id}`, {
                is_active: !rule.is_active
            });
            await fetchData();
        } catch (err) {
            console.error('Failed to toggle rule:', err);
            alert('Failed to update rule');
        }
    };

    const handleTestIP = async () => {
        const testIP = prompt('Enter IP address to test:');
        if (!testIP) return;

        try {
            const response = await axios.post('/api/ip-whitelist/test', {
                ip_address: testIP
            });
            const result = response.data;

            const message = result.allowed
                ? `✅ IP ${testIP} is WHITELISTED\nReason: ${result.reason}`
                : `❌ IP ${testIP} is NOT WHITELISTED\nReason: ${result.reason}`;

            alert(message);
        } catch (err) {
            console.error('Failed to test IP:', err);
            alert(err.response?.data?.error || 'Failed to test IP address');
        }
    };

    const handleAddCurrentIP = () => {
        if (currentIP) {
            setFormData({
                ip_address: currentIP,
                ip_range: '',
                description: 'My current IP address',
                is_active: true
            });
            setEditingRule(null);
            setShowAddModal(true);
        }
    };

    const filteredRules = rules.filter(rule => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
            (rule.ip_address && rule.ip_address.includes(search)) ||
            (rule.ip_range && rule.ip_range.includes(search)) ||
            (rule.description && rule.description.toLowerCase().includes(search))
        );
    });

    if (loading) {
        return (
            <div className="ip-whitelist-manager">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading IP whitelist...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="ip-whitelist-manager">
            <div className="manager-header">
                <div className="header-left">
                    <Shield size={24} />
                    <div>
                        <h1>IP Whitelisting</h1>
                        <p>Restrict access to specific IP addresses or ranges</p>
                    </div>
                </div>
                <div className="header-right">
                    <button className="btn-refresh" onClick={fetchData}>
                        <RefreshCw size={16} />
                        Refresh
                    </button>
                    <button className="btn-test" onClick={handleTestIP}>
                        <TestTube size={16} />
                        Test IP
                    </button>
                    <button className="btn-add" onClick={handleOpenAddModal}>
                        <Plus size={16} />
                        Add Rule
                    </button>
                </div>
            </div>

            {error && (
                <div className="error-message">
                    <AlertTriangle size={16} />
                    <span>{error}</span>
                </div>
            )}

            {/* Current IP Banner */}
            {currentIP && (
                <div className="current-ip-banner">
                    <Globe size={16} />
                    <span>Your current IP: <strong>{currentIP}</strong></span>
                    <button className="btn-link" onClick={handleAddCurrentIP}>
                        Add to whitelist
                    </button>
                </div>
            )}

            {/* Configuration Panel */}
            {config && (
                <div className="config-panel">
                    <div className="config-header">
                        <h2>Configuration</h2>
                        <div className="config-toggle">
                            <span>IP Whitelisting</span>
                            <button
                                className={`toggle-btn ${config.enabled ? 'active' : ''}`}
                                onClick={handleToggleEnabled}
                            >
                                {config.enabled ? <Check size={16} /> : <X size={16} />}
                                <span>{config.enabled ? 'Enabled' : 'Disabled'}</span>
                            </button>
                        </div>
                    </div>

                    <div className="enforcement-modes">
                        <label>Enforcement Mode:</label>
                        <div className="mode-buttons">
                            <button
                                className={`mode-btn ${config.enforcement_mode === 'enforce' ? 'active' : ''}`}
                                onClick={() => handleEnforcementModeChange('enforce')}
                            >
                                <Shield size={16} />
                                <div>
                                    <strong>Enforce</strong>
                                    <span>Block non-whitelisted IPs</span>
                                </div>
                            </button>
                            <button
                                className={`mode-btn ${config.enforcement_mode === 'monitor' ? 'active' : ''}`}
                                onClick={() => handleEnforcementModeChange('monitor')}
                            >
                                <Info size={16} />
                                <div>
                                    <strong>Monitor</strong>
                                    <span>Log violations but allow access</span>
                                </div>
                            </button>
                            <button
                                className={`mode-btn ${config.enforcement_mode === 'disabled' ? 'active' : ''}`}
                                onClick={() => handleEnforcementModeChange('disabled')}
                            >
                                <Power size={16} />
                                <div>
                                    <strong>Disabled</strong>
                                    <span>No IP checking</span>
                                </div>
                            </button>
                        </div>
                    </div>

                    {config.enforcement_mode === 'enforce' && rules.length === 0 && (
                        <div className="warning-box">
                            <AlertTriangle size={16} />
                            <span>
                                Warning: Enforce mode is active but no rules are defined.
                                All access will be blocked until you add whitelist rules.
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Search */}
            <div className="search-bar">
                <Search size={16} />
                <input
                    type="text"
                    placeholder="Search IP addresses, ranges, or descriptions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Rules List */}
            <div className="rules-list">
                {filteredRules.length === 0 ? (
                    <div className="empty-state">
                        <Shield size={48} />
                        <h3>No IP Rules</h3>
                        <p>Add your first IP whitelist rule to restrict access</p>
                        <button className="btn-add" onClick={handleOpenAddModal}>
                            <Plus size={16} />
                            Add Rule
                        </button>
                    </div>
                ) : (
                    filteredRules.map(rule => (
                        <div key={rule.id} className={`rule-card ${!rule.is_active ? 'inactive' : ''}`}>
                            <div className="rule-main">
                                <div className="rule-indicator">
                                    {rule.is_active ? (
                                        <Check size={16} style={{ color: '#10B981' }} />
                                    ) : (
                                        <X size={16} style={{ color: '#6B7280' }} />
                                    )}
                                </div>
                                <div className="rule-content">
                                    <div className="rule-ip">
                                        {rule.ip_address || rule.ip_range}
                                    </div>
                                    {rule.description && (
                                        <div className="rule-description">{rule.description}</div>
                                    )}
                                    <div className="rule-meta">
                                        <span className="meta-badge">
                                            {rule.ip_address ? 'Single IP' : 'CIDR Range'}
                                        </span>
                                        <span className="meta-date">
                                            Added {new Date(rule.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                <div className="rule-actions">
                                    <button
                                        className="btn-icon"
                                        onClick={() => handleToggleActive(rule)}
                                        aria-label={rule.is_active ? `Deactivate rule ${rule.ip_address || rule.ip_range}` : `Activate rule ${rule.ip_address || rule.ip_range}`}
                                    >
                                        <Power size={16} aria-hidden="true" />
                                    </button>
                                    <button
                                        className="btn-icon"
                                        onClick={() => handleOpenEditModal(rule)}
                                        aria-label={`Edit rule ${rule.ip_address || rule.ip_range}`}
                                    >
                                        <Edit2 size={16} aria-hidden="true" />
                                    </button>
                                    <button
                                        className="btn-icon danger"
                                        onClick={() => handleDelete(rule.id)}
                                        aria-label={`Delete rule ${rule.ip_address || rule.ip_range}`}
                                    >
                                        <Trash2 size={16} aria-hidden="true" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add/Edit Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingRule ? 'Edit Rule' : 'Add IP Rule'}</h2>
                            <button className="btn-close" onClick={() => setShowAddModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>IP Address</label>
                                <input
                                    type="text"
                                    placeholder="192.168.1.1 or 2001:db8::1"
                                    value={formData.ip_address}
                                    onChange={(e) => setFormData({ ...formData, ip_address: e.target.value, ip_range: '' })}
                                />
                                <span className="field-help">Single IPv4 or IPv6 address</span>
                            </div>

                            <div className="form-divider">OR</div>

                            <div className="form-group">
                                <label>CIDR Range</label>
                                <input
                                    type="text"
                                    placeholder="192.168.1.0/24"
                                    value={formData.ip_range}
                                    onChange={(e) => setFormData({ ...formData, ip_range: e.target.value, ip_address: '' })}
                                />
                                <span className="field-help">Network range in CIDR notation</span>
                            </div>

                            <div className="form-group">
                                <label>Description</label>
                                <input
                                    type="text"
                                    placeholder="e.g., Office WiFi, VPN Gateway"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    />
                                    <span>Active (rule is enforced)</span>
                                </label>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary">
                                    {editingRule ? 'Update Rule' : 'Add Rule'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default IPWhitelistManager;
