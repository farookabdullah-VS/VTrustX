import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const DEFAULT_PERMISSIONS = {
    forms: { view: false, create: false, update: false, delete: false },
    submissions: { view: false, create: false, update: false, delete: false },
    users: { view: false, create: false, update: false, delete: false },
    roles: { view: false, create: false, update: false, delete: false },
    tickets: { view: false, create: false, update: false, delete: false },
    crm: { view: false, create: false, update: false, delete: false },
    settings: { view: false, create: false, update: false, delete: false }
};



export function RoleMaster() {
    const { t, i18n } = useTranslation();
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState(null);

    // Form state
    const [roleName, setRoleName] = useState('');
    const [description, setDescription] = useState('');
    const [permissions, setPermissions] = useState({ ...DEFAULT_PERMISSIONS });

    useEffect(() => {
        loadRoles();
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
                const msg = err.response?.data?.error || err.message;
                alert("Error loading roles: " + msg);
                setLoading(false);
            });
    };

    const handleOpenModal = (role = null) => {
        if (role) {
            setEditingRole(role);
            setRoleName(role.name);
            setDescription(role.description);
            setPermissions(role.permissions || { ...DEFAULT_PERMISSIONS });
        } else {
            setEditingRole(null);
            setRoleName('');
            setDescription('');
            setPermissions({ ...DEFAULT_PERMISSIONS });
        }
        setIsModalOpen(true);
    };

    const handleSave = () => {
        const payload = { name: roleName, description, permissions };
        const request = editingRole
            ? axios.put(`/api/roles/${editingRole.id}`, payload)
            : axios.post('/api/roles', payload);

        request.then(() => {
            alert("Role saved successfully");
            setIsModalOpen(false);
            loadRoles();
        }).catch(err => alert("Error saving role"));
    };

    const handleDelete = (id) => {
        if (confirm("Delete this role?")) {
            axios.delete(`/api/roles/${id}`).then(loadRoles);
        }
    };

    const togglePermission = (module, action) => {
        setPermissions(prev => ({
            ...prev,
            [module]: {
                ...prev[module],
                [action]: !prev[module][action]
            }
        }));
    };

    return (
        <div style={{ padding: '40px', fontFamily: "'Outfit', sans-serif" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h1 style={{ margin: 0 }}>Role Master</h1>
                    <p style={{ color: '#64748b' }}>Define user roles and module permissions.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    style={{ background: '#2563eb', color: 'white', padding: '12px 24px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    + Create New Role
                </button>
            </div>

            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <tr>
                            <th style={{ padding: '15px', textAlign: 'left' }}>Role Name</th>
                            <th style={{ padding: '15px', textAlign: 'left' }}>Description</th>
                            <th style={{ padding: '15px', textAlign: 'left' }}>Created</th>
                            <th style={{ padding: '15px', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {roles.map(r => (
                            <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '15px', fontWeight: '600' }}>{r.name}</td>
                                <td style={{ padding: '15px', color: '#475569' }}>{r.description}</td>
                                <td style={{ padding: '15px', color: '#94a3b8' }}>{new Date(r.created_at).toLocaleDateString()}</td>
                                <td style={{ padding: '15px', textAlign: 'right' }}>
                                    <button onClick={() => handleOpenModal(r)} style={{ marginRight: '10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2em' }} title="Edit">✏️</button>
                                    <button onClick={() => handleDelete(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2em' }} title="Delete">🗑️</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001 }}>
                    <div style={{ background: 'white', width: '500px', padding: '30px', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <h2 style={{ marginTop: 0 }}>{editingRole ? 'Edit Role' : 'Create Role'}</h2>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Role Name</label>
                            <input
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                                value={roleName} onChange={e => setRoleName(e.target.value)}
                                placeholder="e.g. Survey Manager"
                            />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Description</label>
                            <textarea
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', minHeight: '60px' }}
                                value={description} onChange={e => setDescription(e.target.value)}
                            />
                        </div>

                        <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '25px' }}>
                            <h3 style={{ margin: '0 0 15px 0', fontSize: '1em' }}>Module Permissions</h3>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', alignItems: 'center', gap: '10px' }}>
                                <div style={{ fontWeight: 'bold' }}>Module</div>
                                <div style={{ textAlign: 'center' }}>View</div>
                                <div style={{ textAlign: 'center' }}>Create</div>
                                <div style={{ textAlign: 'center' }}>Update</div>
                                <div style={{ textAlign: 'center' }}>Delete</div>

                                {Object.entries(permissions).map(([module, perms]) => (
                                    <React.Fragment key={module}>
                                        <div style={{ fontWeight: '500', textTransform: 'capitalize' }}>{module.replace('_', ' ')}</div>
                                        <div style={{ textAlign: 'center' }}><input type="checkbox" checked={perms.view} onChange={() => togglePermission(module, 'view')} /></div>
                                        <div style={{ textAlign: 'center' }}><input type="checkbox" checked={perms.create} onChange={() => togglePermission(module, 'create')} /></div>
                                        <div style={{ textAlign: 'center' }}><input type="checkbox" checked={perms.update} onChange={() => togglePermission(module, 'update')} /></div>
                                        <div style={{ textAlign: 'center' }}><input type="checkbox" checked={perms.delete} onChange={() => togglePermission(module, 'delete')} /></div>
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '10px' }}>Cancel</button>
                            <button
                                onClick={handleSave}
                                style={{ background: '#2563eb', color: 'white', padding: '10px 25px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
