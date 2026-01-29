import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Building, Users, FileText, Shield, Eye, EyeOff, Upload, UserPlus, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import '../styles/Organizations.css';

const Organizations = () => {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [expandedOrg, setExpandedOrg] = useState(null);
  const [orgUsers, setOrgUsers] = useState([]);
  const [userType, setUserType] = useState('user'); // 'user' or 'admin'
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    logo: null
  });
  const [userFormData, setUserFormData] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    department: '',
    access_level: 'basic',
    permissions: 'basic'
  });

  // Check if user is super admin
  const isSuperAdmin = user?.email === 'superadmin@aero.com' || user?.username === 'SuperAdmin';

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/organizations', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setOrganizations(data.organizations);
      } else {
        throw new Error('Failed to fetch organizations');
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
      toast.error('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrgUsers = async (orgId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/organizations/${orgId}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setOrgUsers(data.users);
      } else {
        throw new Error('Failed to fetch organization users');
      }
    } catch (error) {
      console.error('Error fetching organization users:', error);
      toast.error('Failed to load organization users');
    }
  };

  const handleExpandOrg = async (orgId) => {
    if (expandedOrg === orgId) {
      setExpandedOrg(null);
      setOrgUsers([]);
    } else {
      setExpandedOrg(orgId);
      await fetchOrgUsers(orgId);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.code.trim()) {
      toast.error('Organization name and code are required');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const submitData = new FormData();
      
      submitData.append('name', formData.name.trim());
      submitData.append('code', formData.code.trim().toUpperCase());
      submitData.append('description', formData.description.trim());
      submitData.append('contact_email', formData.contact_email.trim());
      submitData.append('contact_phone', formData.contact_phone.trim());
      submitData.append('address', formData.address.trim());
      
      if (formData.logo) {
        submitData.append('logo', formData.logo);
      }

      const url = editingOrg ? `/api/organizations/${editingOrg.id}` : '/api/organizations';
      const method = editingOrg ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: submitData
      });

      if (response.ok) {
        toast.success(`Organization ${editingOrg ? 'updated' : 'created'} successfully`);
        setShowModal(false);
        resetForm();
        fetchOrganizations();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save organization');
      }
    } catch (error) {
      console.error('Error saving organization:', error);
      toast.error(error.message);
    }
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    
    if (!userFormData.username.trim() || !userFormData.email.trim() || !userFormData.password.trim()) {
      toast.error('Username, email, and password are required');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const submitData = {
        ...userFormData,
        organization_id: selectedOrg.id,
        user_type: userType
      };

      const endpoint = userType === 'admin' ? 'admins' : 'users';
      const response = await fetch(`/api/organizations/${selectedOrg.id}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData)
      });

      if (response.ok) {
        toast.success(`${userType === 'admin' ? 'Admin' : 'User'} created successfully`);
        setShowUserModal(false);
        resetUserForm();
        fetchOrgUsers(selectedOrg.id);
        fetchOrganizations(); // Refresh stats
      } else {
        const error = await response.json();
        throw new Error(error.error || `Failed to create ${userType}`);
      }
    } catch (error) {
      console.error(`Error creating ${userType}:`, error);
      toast.error(error.message);
    }
  };

  const handleDeleteUser = async (userId, userName, userType) => {
    if (!window.confirm(`Are you sure you want to delete ${userType} "${userName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const endpoint = userType === 'admin' ? 'admins' : 'users';
      const response = await fetch(`/api/organizations/${selectedOrg.id}/${endpoint}/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast.success(`${userType === 'admin' ? 'Admin' : 'User'} deleted successfully`);
        fetchOrgUsers(selectedOrg.id);
        fetchOrganizations(); // Refresh stats
      } else {
        const error = await response.json();
        throw new Error(error.error || `Failed to delete ${userType}`);
      }
    } catch (error) {
      console.error(`Error deleting ${userType}:`, error);
      toast.error(error.message);
    }
  };

  const handleEdit = (org) => {
    setEditingOrg(org);
    setFormData({
      name: org.name,
      code: org.code,
      description: org.description || '',
      contact_email: org.contact_email || '',
      contact_phone: org.contact_phone || '',
      address: org.address || '',
      logo: null
    });
    setShowModal(true);
  };

  const handleToggleStatus = async (orgId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/organizations/${orgId}/toggle-status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast.success('Organization status updated');
        fetchOrganizations();
      } else {
        throw new Error('Failed to update organization status');
      }
    } catch (error) {
      console.error('Error toggling organization status:', error);
      toast.error('Failed to update organization status');
    }
  };

  const handleDelete = async (orgId, orgName) => {
    if (!window.confirm(`Are you sure you want to delete "${orgName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/organizations/${orgId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast.success('Organization deleted successfully');
        fetchOrganizations();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete organization');
      }
    } catch (error) {
      console.error('Error deleting organization:', error);
      toast.error(error.message);
    }
  };

  const handleAddUser = (org) => {
    setSelectedOrg(org);
    setUserType('user');
    setShowUserModal(true);
  };

  const handleAddAdmin = (org) => {
    setSelectedOrg(org);
    setUserType('admin');
    setShowUserModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      contact_email: '',
      contact_phone: '',
      address: '',
      logo: null
    });
    setEditingOrg(null);
  };

  const resetUserForm = () => {
    setUserFormData({
      username: '',
      email: '',
      password: '',
      full_name: '',
      department: '',
      access_level: 'basic',
      permissions: 'basic'
    });
    setSelectedOrg(null);
    setUserType('user');
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleCloseUserModal = () => {
    setShowUserModal(false);
    resetUserForm();
  };

  if (!isSuperAdmin) {
    return (
      <div className="organizations-page">
        <div className="access-denied">
          <Shield size={48} />
          <h2>Access Denied</h2>
          <p>Only Super Admins can manage organizations.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="organizations-page">
        <div className="loading">Loading organizations...</div>
      </div>
    );
  }

  return (
    <div className="organizations-page">
      <div className="page-header">
        <div className="header-content">
          <h1>
            <Building size={28} />
            Organizations Management
          </h1>
          <p>Manage organizations and their settings</p>
        </div>
        <button 
          className="btn-primary"
          onClick={() => setShowModal(true)}
        >
          <Plus size={20} />
          Add Organization
        </button>
      </div>

      <div className="organizations-grid">
        {organizations.map((org) => (
          <div key={org.id} className={`organization-card ${!org.is_active ? 'inactive' : ''}`}>
            <div className="org-header">
              <div className="org-logo">
                {org.logo_url ? (
                  <img src={org.logo_url} alt={`${org.name} logo`} />
                ) : (
                  <Building size={32} />
                )}
              </div>
              <div className="org-info">
                <h3>{org.name}</h3>
                <span className="org-code">{org.code}</span>
                <span className={`org-status ${org.is_active ? 'active' : 'inactive'}`}>
                  {org.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {org.description && (
              <p className="org-description">{org.description}</p>
            )}

            <div className="org-stats">
              <div className="stat">
                <Users size={16} />
                <span>{org.stats?.users || 0} Users</span>
              </div>
              <div className="stat">
                <Shield size={16} />
                <span>{org.stats?.admins || 0} Admins</span>
              </div>
              <div className="stat">
                <FileText size={16} />
                <span>{org.stats?.reports || 0} Reports</span>
              </div>
            </div>

            {(org.contact_email || org.contact_phone || org.address) && (
              <div className="org-contact">
                {org.contact_email && (
                  <div className="contact-item">
                    <strong>Email:</strong> {org.contact_email}
                  </div>
                )}
                {org.contact_phone && (
                  <div className="contact-item">
                    <strong>Phone:</strong> {org.contact_phone}
                  </div>
                )}
                {org.address && (
                  <div className="contact-item">
                    <strong>Address:</strong> {org.address}
                  </div>
                )}
              </div>
            )}

            <div className="org-actions">
              <button
                className="btn-icon"
                onClick={() => handleEdit(org)}
                title="Edit organization"
              >
                <Edit size={16} />
              </button>
              <button
                className="btn-icon btn-success"
                onClick={() => handleAddUser(org)}
                title="Add user"
              >
                <UserPlus size={16} />
              </button>
              <button
                className="btn-icon btn-warning"
                onClick={() => handleAddAdmin(org)}
                title="Add admin"
              >
                <Settings size={16} />
              </button>
              <button
                className="btn-icon"
                onClick={() => handleExpandOrg(org.id)}
                title={expandedOrg === org.id ? "Hide users" : "Show users"}
              >
                {expandedOrg === org.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              <button
                className={`btn-icon ${org.is_active ? 'btn-warning' : 'btn-success'}`}
                onClick={() => handleToggleStatus(org.id)}
                title={org.is_active ? 'Deactivate' : 'Activate'}
              >
                {org.is_active ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              <button
                className="btn-icon btn-danger"
                onClick={() => handleDelete(org.id, org.name)}
                title="Delete organization"
                disabled={org.stats?.users > 0 || org.stats?.admins > 0 || org.stats?.reports > 0}
              >
                <Trash2 size={16} />
              </button>
            </div>

            {/* Users List */}
            {expandedOrg === org.id && (
              <div className="org-users">
                <div className="users-header">
                  <h4>Organization Users</h4>
                </div>
                {orgUsers.length === 0 ? (
                  <p className="no-users">No users found for this organization.</p>
                ) : (
                  <div className="users-list">
                    {orgUsers.map((orgUser) => (
                      <div key={`${orgUser.user_type}-${orgUser.id}`} className="user-item">
                        <div className="user-info">
                          <div className="user-name">
                            <strong>{orgUser.full_name || orgUser.username}</strong>
                            <span className={`user-type ${orgUser.user_type}`}>
                              {orgUser.user_type === 'admin' ? 'Admin' : 'User'}
                            </span>
                          </div>
                          <div className="user-details">
                            <span>{orgUser.email}</span>
                            {orgUser.department && <span>• {orgUser.department}</span>}
                            <span>• {orgUser.access_level}</span>
                          </div>
                        </div>
                        <button
                          className="btn-icon btn-danger"
                          onClick={() => handleDeleteUser(orgUser.id, orgUser.full_name || orgUser.username, orgUser.user_type)}
                          title={`Delete ${orgUser.user_type}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="org-footer">
              <small>Created by {org.created_by_name || 'System'}</small>
              <small>{new Date(org.created_at).toLocaleDateString()}</small>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Organization Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {editingOrg ? 'Edit Organization' : 'Add New Organization'}
              </h2>
              <button className="modal-close" onClick={handleCloseModal}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="org-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Organization Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g., Coal India Limited"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Organization Code *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                    placeholder="e.g., CCL"
                    maxLength="10"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Brief description of the organization"
                  rows="3"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Contact Email</label>
                  <input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
                    placeholder="contact@organization.com"
                  />
                </div>
                <div className="form-group">
                  <label>Contact Phone</label>
                  <input
                    type="tel"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({...formData, contact_phone: e.target.value})}
                    placeholder="+91 12345 67890"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  placeholder="Organization address"
                  rows="2"
                />
              </div>

              <div className="form-group">
                <label>Logo</label>
                <div className="file-input-wrapper">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFormData({...formData, logo: e.target.files[0]})}
                    id="logo-upload"
                  />
                  <label htmlFor="logo-upload" className="file-input-label">
                    <Upload size={16} />
                    {formData.logo ? formData.logo.name : 'Choose logo image'}
                  </label>
                </div>
                <small>Recommended: 200x200px, PNG or JPG, max 5MB</small>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingOrg ? 'Update Organization' : 'Create Organization'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add User/Admin Modal */}
      {showUserModal && selectedOrg && (
        <div className="modal-overlay" onClick={handleCloseUserModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                Add {userType === 'admin' ? 'Admin' : 'User'} to {selectedOrg.name}
              </h2>
              <button className="modal-close" onClick={handleCloseUserModal}>×</button>
            </div>

            <form onSubmit={handleUserSubmit} className="org-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Username *</label>
                  <input
                    type="text"
                    value={userFormData.username}
                    onChange={(e) => setUserFormData({...userFormData, username: e.target.value})}
                    placeholder="e.g., john.doe"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({...userFormData, email: e.target.value})}
                    placeholder="john.doe@organization.com"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Password *</label>
                <input
                  type="password"
                  value={userFormData.password}
                  onChange={(e) => setUserFormData({...userFormData, password: e.target.value})}
                  placeholder="Enter secure password"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={userFormData.full_name}
                    onChange={(e) => setUserFormData({...userFormData, full_name: e.target.value})}
                    placeholder="John Doe"
                  />
                </div>
                <div className="form-group">
                  <label>Department</label>
                  <input
                    type="text"
                    value={userFormData.department}
                    onChange={(e) => setUserFormData({...userFormData, department: e.target.value})}
                    placeholder="e.g., Mining Operations"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Access Level</label>
                  <select
                    value={userFormData.access_level}
                    onChange={(e) => setUserFormData({...userFormData, access_level: e.target.value})}
                  >
                    <option value="basic">Basic</option>
                    <option value="advanced">Advanced</option>
                    {userType === 'admin' && <option value="admin">Admin</option>}
                  </select>
                </div>
                <div className="form-group">
                  <label>Permissions</label>
                  <select
                    value={userFormData.permissions}
                    onChange={(e) => setUserFormData({...userFormData, permissions: e.target.value})}
                  >
                    <option value="basic">Basic</option>
                    <option value="advanced">Advanced</option>
                    {userType === 'admin' && <option value="admin">Admin</option>}
                  </select>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={handleCloseUserModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create {userType === 'admin' ? 'Admin' : 'User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Organizations;