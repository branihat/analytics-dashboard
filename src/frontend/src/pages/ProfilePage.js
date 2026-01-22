import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Edit2, Users } from 'lucide-react';
import EditNameModal from '../components/EditNameModal';
import api from '../services/api';
import '../styles/ProfilePage.css';

const ProfilePage = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [error, setError] = useState('');

  const isAdmin = user?.role === 'admin' || user?.userType === 'admin';

  // Fetch all users if admin
  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      // Direct API call without using users routes
      const response = await api.get('/auth/users');
      setUsers(response.data.users || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (userToEdit) => {
    setEditingUser(userToEdit);
    setShowEditModal(true);
  };

  const handleEditSave = async (newName) => {
    try {
      // Direct API call without using users routes
      if (editingUser.id === user.id) {
        await api.patch('/auth/update-name', { username: newName });
      } else {
        await api.patch(`/auth/update-user-name/${editingUser.id}`, { username: newName });
      }

      // Refresh users list
      await fetchUsers();
      setShowEditModal(false);
      setEditingUser(null);
    } catch (err) {
      console.error('Error updating name:', err);
      throw err;
    }
  };

  return (
    <div className="profile-page">
      <div className="profile-header">
        <User size={32} />
        <h1>Profile</h1>
      </div>

      {/* Current User Profile */}
      <div className="profile-section">
        <div className="profile-section-header">
          <h2>My Profile</h2>
          {isAdmin && (
            <button 
              className="edit-button"
              onClick={() => handleEditClick({ id: user.id, username: user.username })}
            >
              <Edit2 size={16} />
              Edit Name
            </button>
          )}
        </div>
        <div className="profile-info">
          <div className="profile-info-item">
            <span className="profile-label">Name:</span>
            <span className="profile-value">{user?.username || 'N/A'}</span>
          </div>
          <div className="profile-info-item">
            <span className="profile-label">Email:</span>
            <span className="profile-value">{user?.email || 'N/A'}</span>
          </div>
          <div className="profile-info-item">
            <span className="profile-label">Role:</span>
            <span className="profile-value">{user?.role || 'N/A'}</span>
          </div>
          {user?.department && (
            <div className="profile-info-item">
              <span className="profile-label">Department:</span>
              <span className="profile-value">{user.department}</span>
            </div>
          )}
        </div>
      </div>

      {/* User Management Section (Admin Only) */}
      {isAdmin && (
        <div className="profile-section">
          <div className="profile-section-header">
            <h2>
              <Users size={24} />
              User Management
            </h2>
            <span className="user-count">Total Users: {users.length}</span>
          </div>

          {loading ? (
            <div className="loading">Loading users...</div>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : (
            <div className="users-table">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.username}</td>
                      <td>{u.email || 'N/A'}</td>
                      <td>
                        <span className={`role-badge ${u.role}`}>
                          {u.role}
                        </span>
                      </td>
                      <td>{u.department || 'N/A'}</td>
                      <td>
                        <button
                          className="edit-button-small"
                          onClick={() => handleEditClick(u)}
                          title="Edit name"
                        >
                          <Edit2 size={14} />
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Edit Name Modal */}
      {showEditModal && (
        <EditNameModal
          user={editingUser}
          onClose={() => {
            setShowEditModal(false);
            setEditingUser(null);
          }}
          onSave={handleEditSave}
        />
      )}
    </div>
  );
};

export default ProfilePage;
