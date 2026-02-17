import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useToast } from './common/Toast';
import { Check, X } from 'lucide-react';

export function RoleMaster() {
    const { t } = useTranslation();
    const toast = useToast();
    const [roles, setRoles] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState(null);

    // Form state
    const [roleName, setRoleName] = useState('');
    const [description, setDescription] = useState('');
    const [menuPermissions, setMenuPermissions] = useState([]);
    const [expandedGroups, setExpandedGroups] = useState({});

    useEffect(() => {
        loadRoles();
        loadMenuItems();
    }, []);

    const loadRoles = () => {
        setLoading(true);
        axios.get('/api/roles')
            .then(res => {
                setRoles(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error loading roles:", err);
                toast.error("Error loading roles: " + (err.response?.data?.error || err.message));
                setLoading(false);
            });
    };

    const loadMenuItems = () => {
        axios.get('/api/roles/menu-items')
            .then(res => {
                setMenuItems(res.data);
                // Expand all groups by default
                const groups = {};
                res.data.forEach(item => {
                    groups[item.group_id] = true;
                });
                setExpandedGroups(groups);
            })
            .catch(err => {
                console.error("Error loading menu items:", err);
                toast.error("Error loading menu items");
            });
    };

    const handleOpenModal = async (role = null) => {
        if (role) {
            setEditingRole(role);
            setRoleName(role.name);
            setDescription(role.description);

            // Load menu permissions for this role
            try {
                const res = await axios.get(`/api/roles/${role.id}/menu-permissions`);
                setMenuPermissions(res.data);
            } catch (err) {
                console.error("Error loading role permissions:", err);
                toast.error("Error loading permissions");
            }
        } else {
            setEditingRole(null);
            setRoleName('');
            setDescription('');
            // Initialize with all permissions off
            setMenuPermissions(menuItems.map(item => ({
                ...item,
                can_access: false
            })));
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        try {
            const rolePayload = {
                name: roleName,
                description,
                permissions: {} // Keep empty for backward compatibility
            };

            let roleId;
            if (editingRole) {
                await axios.put(`/api/roles/${editingRole.id}`, rolePayload);
                roleId = editingRole.id;
            } else {
                const res = await axios.post('/api/roles', rolePayload);
                roleId = res.data.id;
            }

            // Save menu permissions
            const permissionsPayload = {
                menuPermissions: menuPermissions.map(item => ({
                    menu_item_id: item.id,
                    can_access: item.can_access
                }))
            };
            await axios.post(`/api/roles/${roleId}/menu-permissions`, permissionsPayload);

            toast.success("Role saved successfully");
            setIsModalOpen(false);
            loadRoles();
        } catch (err) {
            console.error("Error saving role:", err);
            toast.error("Error saving role: " + (err.response?.data?.error || err.message));
        }
    };

    const handleDelete = (id) => {
        if (confirm("Delete this role?")) {
            axios.delete(`/api/roles/${id}`)
                .then(loadRoles)
                .catch(err => toast.error("Error deleting role"));
        }
    };

    const togglePermission = (menuItemId) => {
        setMenuPermissions(prev =>
            prev.map(item =>
                item.id === menuItemId
                    ? { ...item, can_access: !item.can_access }
                    : item
            )
        );
    };

    const toggleGroup = (groupId) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupId]: !prev[groupId]
        }));
    };

    const toggleGroupPermissions = (groupId, value) => {
        setMenuPermissions(prev =>
            prev.map(item =>
                item.group_id === groupId
                    ? { ...item, can_access: value }
                    : item
            )
        );
    };

    // Group menu items by group_id
    const groupedMenuItems = menuPermissions.reduce((acc, item) => {
        const group = item.group_id || 'other';
        if (!acc[group]) {
            acc[group] = {
                title: item.group_title || 'Other',
                items: []
            };
        }
        acc[group].items.push(item);
        return acc;
    }, {});

    return (
        <div style={{ padding: '40px', fontFamily: "'Outfit', sans-serif" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h1 style={{ margin: 0, color: 'var(--text-color)' }}>Role Master</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Define user roles and menu-item permissions.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    style={{
                        background: 'var(--primary-color)',
                        color: 'white',
                        padding: '12px 24px',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    + Create New Role
                </button>
            </div>

            <div style={{ background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--input-border)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: 'var(--sidebar-bg)', borderBottom: '1px solid var(--input-border)' }}>
                        <tr>
                            <th style={{ padding: '15px', textAlign: 'left', color: 'var(--text-muted)' }}>Role Name</th>
                            <th style={{ padding: '15px', textAlign: 'left', color: 'var(--text-muted)' }}>Description</th>
                            <th style={{ padding: '15px', textAlign: 'left', color: 'var(--text-muted)' }}>Created</th>
                            <th style={{ padding: '15px', textAlign: 'right', color: 'var(--text-muted)' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {roles.map(r => (
                            <tr key={r.id} style={{ borderBottom: '1px solid var(--input-border)' }}>
                                <td style={{ padding: '15px', fontWeight: '600', color: 'var(--text-color)' }}>{r.name}</td>
                                <td style={{ padding: '15px', color: 'var(--text-muted)' }}>{r.description}</td>
                                <td style={{ padding: '15px', color: 'var(--text-muted)' }}>{new Date(r.created_at).toLocaleDateString()}</td>
                                <td style={{ padding: '15px', textAlign: 'right' }}>
                                    <button
                                        onClick={() => handleOpenModal(r)}
                                        style={{ marginRight: '10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2em' }}
                                        title="Edit"
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        onClick={() => handleDelete(r.id)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2em' }}
                                        title="Delete"
                                    >
                                        🗑️
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1001,
                    overflow: 'auto',
                    padding: '20px'
                }}>
                    <div style={{
                        background: 'var(--card-bg)',
                        width: '800px',
                        maxWidth: '90vw',
                        maxHeight: '90vh',
                        padding: '30px',
                        borderRadius: '16px',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                        border: '1px solid var(--input-border)',
                        overflow: 'auto'
                    }}>
                        <h2 style={{ marginTop: 0, color: 'var(--text-color)' }}>
                            {editingRole ? 'Edit Role' : 'Create Role'}
                        </h2>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: 'var(--text-color)' }}>
                                Role Name
                            </label>
                            <input
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--input-border)',
                                    background: 'var(--input-bg)',
                                    color: 'var(--input-text)',
                                    boxSizing: 'border-box'
                                }}
                                value={roleName}
                                onChange={e => setRoleName(e.target.value)}
                                placeholder="e.g. Survey Manager"
                            />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: 'var(--text-color)' }}>
                                Description
                            </label>
                            <textarea
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--input-border)',
                                    background: 'var(--input-bg)',
                                    color: 'var(--input-text)',
                                    minHeight: '60px',
                                    boxSizing: 'border-box'
                                }}
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Describe what this role can do..."
                            />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '15px', color: 'var(--text-color)' }}>
                                Menu Item Permissions
                            </h3>
                            <div style={{
                                background: 'var(--sidebar-bg)',
                                borderRadius: '8px',
                                padding: '15px',
                                maxHeight: '400px',
                                overflow: 'auto'
                            }}>
                                {Object.entries(groupedMenuItems).map(([groupId, group]) => (
                                    <div key={groupId} style={{ marginBottom: '15px' }}>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '8px 12px',
                                            background: 'var(--input-bg)',
                                            borderRadius: '6px',
                                            marginBottom: '8px',
                                            cursor: 'pointer'
                                        }}
                                            onClick={() => toggleGroup(groupId)}
                                        >
                                            <div style={{ fontWeight: '600', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span>{expandedGroups[groupId] ? '▼' : '▶'}</span>
                                                <span>{group.title}</span>
                                                <span style={{ fontSize: '0.85em', opacity: 0.7 }}>({group.items.length} items)</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); toggleGroupPermissions(groupId, true); }}
                                                    style={{
                                                        padding: '4px 12px',
                                                        borderRadius: '4px',
                                                        border: '1px solid var(--primary-color)',
                                                        background: 'transparent',
                                                        color: 'var(--primary-color)',
                                                        cursor: 'pointer',
                                                        fontSize: '0.8em'
                                                    }}
                                                >
                                                    Enable All
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); toggleGroupPermissions(groupId, false); }}
                                                    style={{
                                                        padding: '4px 12px',
                                                        borderRadius: '4px',
                                                        border: '1px solid var(--text-muted)',
                                                        background: 'transparent',
                                                        color: 'var(--text-muted)',
                                                        cursor: 'pointer',
                                                        fontSize: '0.8em'
                                                    }}
                                                >
                                                    Disable All
                                                </button>
                                            </div>
                                        </div>

                                        {expandedGroups[groupId] && (
                                            <div style={{ paddingLeft: '20px' }}>
                                                {group.items.map(item => (
                                                    <div
                                                        key={item.id}
                                                        onClick={() => togglePermission(item.id)}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            padding: '10px 12px',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            marginBottom: '5px',
                                                            background: item.can_access ? 'rgba(0, 245, 255, 0.1)' : 'transparent',
                                                            border: `1px solid ${item.can_access ? 'var(--primary-color)' : 'var(--input-border)'}`,
                                                            transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        <div style={{
                                                            width: '24px',
                                                            height: '24px',
                                                            borderRadius: '4px',
                                                            border: `2px solid ${item.can_access ? 'var(--primary-color)' : 'var(--input-border)'}`,
                                                            background: item.can_access ? 'var(--primary-color)' : 'transparent',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            marginRight: '12px'
                                                        }}>
                                                            {item.can_access && <Check size={16} color="white" />}
                                                        </div>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ color: 'var(--text-color)', fontWeight: '500' }}>
                                                                {item.label}
                                                            </div>
                                                            {item.route && (
                                                                <div style={{ fontSize: '0.8em', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                                    {item.route}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                style={{
                                    padding: '10px 20px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--input-border)',
                                    background: 'transparent',
                                    color: 'var(--text-color)',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                style={{
                                    padding: '10px 20px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: 'var(--primary-color)',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                Save Role
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
