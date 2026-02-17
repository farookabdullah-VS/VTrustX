import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from './common/Toast';
import {
  Building2,
  Users,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
  Edit,
  Trash2,
  Settings,
  Mail,
  Phone,
  Globe,
  Calendar,
  DollarSign,
  Shield,
  X
} from 'lucide-react';
import './TenantManagement.css';

const TenantManagement = () => {
  const toast = useToast();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showModulesModal, setShowModulesModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [availableModules, setAvailableModules] = useState([]);
  const [tenantModules, setTenantModules] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    subdomain: '',
    contact_email: '',
    contact_phone: '',
    status: 'active',
    plan: 'starter',
    max_users: 10,
    max_surveys: 100,
    max_responses: 1000,
    storage_limit_mb: 1000,
    billing_email: '',
    billing_address: '',
    tax_id: '',
    notes: ''
  });

  useEffect(() => {
    fetchTenants();
    fetchAvailableModules();
  }, []);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/tenants');
      setTenants(response.data);
    } catch (error) {
      console.error('Error fetching tenants:', error);
      toast.error('Failed to load tenants');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableModules = async () => {
    try {
      const response = await axios.get('/api/tenants/modules/available');
      setAvailableModules(response.data);
    } catch (error) {
      console.error('Error fetching modules:', error);
      toast.error('Failed to load modules');
    }
  };

  const fetchTenantModules = async (tenantId) => {
    try {
      const response = await axios.get(`/api/tenants/${tenantId}/modules`);
      setTenantModules(response.data);
    } catch (error) {
      console.error('Error fetching tenant modules:', error);
      toast.error('Failed to load tenant modules');
    }
  };

  const handleCreateTenant = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/tenants', formData);
      toast.success('Tenant created successfully');
      setShowCreateModal(false);
      resetForm();
      fetchTenants();
    } catch (error) {
      console.error('Error creating tenant:', error);
      toast.error(error.response?.data?.error || 'Failed to create tenant');
    }
  };

  const handleEditTenant = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/tenants/${selectedTenant.id}`, formData);
      toast.success('Tenant updated successfully');
      setShowEditModal(false);
      resetForm();
      fetchTenants();
    } catch (error) {
      console.error('Error updating tenant:', error);
      toast.error('Failed to update tenant');
    }
  };

  const handleDeleteTenant = async (tenantId) => {
    if (!window.confirm('Are you sure you want to delete this tenant? This action cannot be undone.')) {
      return;
    }
    try {
      await axios.delete(`/api/tenants/${tenantId}`);
      toast.success('Tenant deleted successfully');
      fetchTenants();
    } catch (error) {
      console.error('Error deleting tenant:', error);
      toast.error('Failed to delete tenant');
    }
  };

  const handleOpenModulesModal = async (tenant) => {
    setSelectedTenant(tenant);
    await fetchTenantModules(tenant.id);
    setShowModulesModal(true);
  };

  const handleToggleModule = (moduleId) => {
    setTenantModules(prev =>
      prev.map(mod =>
        mod.id === moduleId ? { ...mod, enabled: !mod.enabled } : mod
      )
    );
  };

  const handleSaveModules = async () => {
    try {
      const modules = tenantModules
        .filter(mod => mod.enabled && !mod.is_core)
        .map(mod => ({
          module_id: mod.id,
          enabled: mod.enabled,
          expires_at: mod.expires_at || null
        }));

      await axios.post(`/api/tenants/${selectedTenant.id}/modules`, { modules });
      toast.success('Subscription modules updated successfully');
      setShowModulesModal(false);
      fetchTenants();
    } catch (error) {
      console.error('Error updating modules:', error);
      toast.error('Failed to update modules');
    }
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const openEditModal = (tenant) => {
    setSelectedTenant(tenant);
    setFormData({
      name: tenant.name || '',
      domain: tenant.domain || '',
      subdomain: tenant.subdomain || '',
      contact_email: tenant.contact_email || '',
      contact_phone: tenant.contact_phone || '',
      status: tenant.status || 'active',
      plan: tenant.plan || 'starter',
      max_users: tenant.max_users || 10,
      max_surveys: tenant.max_surveys || 100,
      max_responses: tenant.max_responses || 1000,
      storage_limit_mb: tenant.storage_limit_mb || 1000,
      billing_email: tenant.billing_email || '',
      billing_address: tenant.billing_address || '',
      tax_id: tenant.tax_id || '',
      notes: tenant.notes || ''
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      domain: '',
      subdomain: '',
      contact_email: '',
      contact_phone: '',
      status: 'active',
      plan: 'starter',
      max_users: 10,
      max_surveys: 100,
      max_responses: 1000,
      storage_limit_mb: 1000,
      billing_email: '',
      billing_address: '',
      tax_id: '',
      notes: ''
    });
    setSelectedTenant(null);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="status-icon active" />;
      case 'trial':
        return <Clock className="status-icon trial" />;
      case 'suspended':
        return <XCircle className="status-icon suspended" />;
      case 'inactive':
        return <XCircle className="status-icon inactive" />;
      default:
        return null;
    }
  };

  const groupedModules = tenantModules.reduce((acc, mod) => {
    const category = mod.category || 'other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(mod);
    return acc;
  }, {});

  if (loading) {
    return <div className="tenant-loading">Loading tenants...</div>;
  }

  return (
    <div className="tenant-management">
      <div className="tenant-header">
        <div className="tenant-header-left">
          <Building2 size={32} />
          <div>
            <h1>Tenant Management</h1>
            <p>Manage organizations and subscription modules</p>
          </div>
        </div>
        <button className="btn-primary" onClick={openCreateModal}>
          <Plus size={20} />
          Create Tenant
        </button>
      </div>

      <div className="tenant-grid">
        {tenants.map((tenant) => (
          <div key={tenant.id} className="tenant-card">
            <div className="tenant-card-header">
              <div className="tenant-card-title">
                <Building2 size={24} />
                <div>
                  <h3>{tenant.name}</h3>
                  <span className="tenant-subdomain">{tenant.subdomain || tenant.domain || 'No domain'}</span>
                </div>
              </div>
              <div className="tenant-card-actions">
                <button
                  className="btn-icon"
                  onClick={() => handleOpenModulesModal(tenant)}
                  title="Manage Modules"
                >
                  <Package size={18} />
                </button>
                <button
                  className="btn-icon"
                  onClick={() => openEditModal(tenant)}
                  title="Edit Tenant"
                >
                  <Edit size={18} />
                </button>
                <button
                  className="btn-icon danger"
                  onClick={() => handleDeleteTenant(tenant.id)}
                  title="Delete Tenant"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <div className="tenant-card-body">
              <div className="tenant-status">
                {getStatusIcon(tenant.status)}
                <span className={`status-badge ${tenant.status}`}>
                  {tenant.status?.toUpperCase()}
                </span>
              </div>

              <div className="tenant-stats">
                <div className="tenant-stat">
                  <Users size={18} />
                  <span>{tenant.user_count || 0} Users</span>
                </div>
                <div className="tenant-stat">
                  <Package size={18} />
                  <span>{tenant.active_modules_count || 0} Modules</span>
                </div>
              </div>

              {tenant.contact_email && (
                <div className="tenant-contact">
                  <Mail size={16} />
                  <span>{tenant.contact_email}</span>
                </div>
              )}

              {tenant.plan && (
                <div className="tenant-plan">
                  <Shield size={16} />
                  <span>Plan: {tenant.plan}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create Tenant Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content large">
            <div className="modal-header">
              <h2>Create New Tenant</h2>
              <button className="btn-close" onClick={() => setShowCreateModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateTenant}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Tenant Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Domain</label>
                    <input
                      type="text"
                      value={formData.domain}
                      onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                      placeholder="example.com"
                    />
                  </div>

                  <div className="form-group">
                    <label>Subdomain</label>
                    <input
                      type="text"
                      value={formData.subdomain}
                      onChange={(e) => setFormData({ ...formData, subdomain: e.target.value })}
                      placeholder="tenant-name"
                    />
                  </div>

                  <div className="form-group">
                    <label>Contact Email</label>
                    <input
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Contact Phone</label>
                    <input
                      type="text"
                      value={formData.contact_phone}
                      onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="active">Active</option>
                      <option value="trial">Trial</option>
                      <option value="suspended">Suspended</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Plan</label>
                    <input
                      type="text"
                      value={formData.plan}
                      onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                      placeholder="starter, professional, enterprise"
                    />
                  </div>

                  <div className="form-group">
                    <label>Max Users</label>
                    <input
                      type="number"
                      value={formData.max_users}
                      onChange={(e) => setFormData({ ...formData, max_users: parseInt(e.target.value) })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Max Surveys</label>
                    <input
                      type="number"
                      value={formData.max_surveys}
                      onChange={(e) => setFormData({ ...formData, max_surveys: parseInt(e.target.value) })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Max Responses</label>
                    <input
                      type="number"
                      value={formData.max_responses}
                      onChange={(e) => setFormData({ ...formData, max_responses: parseInt(e.target.value) })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Storage Limit (MB)</label>
                    <input
                      type="number"
                      value={formData.storage_limit_mb}
                      onChange={(e) => setFormData({ ...formData, storage_limit_mb: parseInt(e.target.value) })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Billing Email</label>
                    <input
                      type="email"
                      value={formData.billing_email}
                      onChange={(e) => setFormData({ ...formData, billing_email: e.target.value })}
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Billing Address</label>
                    <textarea
                      value={formData.billing_address}
                      onChange={(e) => setFormData({ ...formData, billing_address: e.target.value })}
                      rows={2}
                    />
                  </div>

                  <div className="form-group">
                    <label>Tax ID</label>
                    <input
                      type="text"
                      value={formData.tax_id}
                      onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Tenant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Tenant Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content large">
            <div className="modal-header">
              <h2>Edit Tenant</h2>
              <button className="btn-close" onClick={() => setShowEditModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEditTenant}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Tenant Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Domain</label>
                    <input
                      type="text"
                      value={formData.domain}
                      onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Subdomain</label>
                    <input
                      type="text"
                      value={formData.subdomain}
                      onChange={(e) => setFormData({ ...formData, subdomain: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Contact Email</label>
                    <input
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Contact Phone</label>
                    <input
                      type="text"
                      value={formData.contact_phone}
                      onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="active">Active</option>
                      <option value="trial">Trial</option>
                      <option value="suspended">Suspended</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Plan</label>
                    <input
                      type="text"
                      value={formData.plan}
                      onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Max Users</label>
                    <input
                      type="number"
                      value={formData.max_users}
                      onChange={(e) => setFormData({ ...formData, max_users: parseInt(e.target.value) })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Max Surveys</label>
                    <input
                      type="number"
                      value={formData.max_surveys}
                      onChange={(e) => setFormData({ ...formData, max_surveys: parseInt(e.target.value) })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Max Responses</label>
                    <input
                      type="number"
                      value={formData.max_responses}
                      onChange={(e) => setFormData({ ...formData, max_responses: parseInt(e.target.value) })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Storage Limit (MB)</label>
                    <input
                      type="number"
                      value={formData.storage_limit_mb}
                      onChange={(e) => setFormData({ ...formData, storage_limit_mb: parseInt(e.target.value) })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Billing Email</label>
                    <input
                      type="email"
                      value={formData.billing_email}
                      onChange={(e) => setFormData({ ...formData, billing_email: e.target.value })}
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Billing Address</label>
                    <textarea
                      value={formData.billing_address}
                      onChange={(e) => setFormData({ ...formData, billing_address: e.target.value })}
                      rows={2}
                    />
                  </div>

                  <div className="form-group">
                    <label>Tax ID</label>
                    <input
                      type="text"
                      value={formData.tax_id}
                      onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Update Tenant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modules Modal */}
      {showModulesModal && (
        <div className="modal-overlay">
          <div className="modal-content large">
            <div className="modal-header">
              <h2>Subscription Modules - {selectedTenant?.name}</h2>
              <button className="btn-close" onClick={() => setShowModulesModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p className="modules-description">
                Select the modules to enable for this tenant. Core modules are always enabled.
              </p>

              {Object.entries(groupedModules).map(([category, modules]) => (
                <div key={category} className="module-category">
                  <h3 className="category-title">{category.toUpperCase()}</h3>
                  <div className="module-grid">
                    {modules.map((module) => (
                      <div
                        key={module.id}
                        className={`module-item ${module.enabled ? 'enabled' : ''} ${module.is_core ? 'core' : ''}`}
                      >
                        <label className="module-label">
                          <input
                            type="checkbox"
                            checked={module.enabled}
                            onChange={() => handleToggleModule(module.id)}
                            disabled={module.is_core}
                          />
                          <div className="module-info">
                            <span className="module-name">{module.module_name}</span>
                            {module.is_core && <span className="core-badge">CORE</span>}
                            {module.description && (
                              <span className="module-description">{module.description}</span>
                            )}
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setShowModulesModal(false)}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={handleSaveModules}>
                Save Modules
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantManagement;
