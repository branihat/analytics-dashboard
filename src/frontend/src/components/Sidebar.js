import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, Upload, Map, Table2, LogOut, Layers, Video, MapPin, FileText, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Sidebar = () => {
  const location = useLocation();
  const { user, logout } = useAuth();

  // Check if user is admin
  const isAdmin = user?.role === 'admin' || user?.userType === 'admin';

  // Navigation items
  const allNavItems = [
    { path: '/', name: 'Dashboard', icon: BarChart3 },
    { path: '/features', name: 'Features', icon: Layers },
    { path: '/sites', name: 'Sites', icon: MapPin },
    { path: '/upload', name: 'Upload', icon: Upload, adminOnly: true },
    { path: '/inferred-reports', name: 'Inferred Reports', icon: FileText },
    { path: '/uploaded-atr', name: 'Uploaded ATR', icon: FileText },
    { path: '/map', name: 'Map View', icon: Map },
    { path: '/table', name: 'Table View', icon: Table2 },
  ];

  const navItems = allNavItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <div className="sidebar">
      {/* Logo Section */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <BarChart3 className="logo-icon" />
          <div className="logo-text">
            <div className="logo-title">AI Driven</div>
            <div className="logo-title">Aerial Monitoring &</div>
            <div className="logo-title">Analytics System</div>
            <div className="logo-title">For Mine Operations</div>
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-item ${isActive ? 'active' : ''}`}
            >
              <Icon className="sidebar-icon" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="user-avatar">
            <User size={20} />
          </div>
          <div className="user-info">
            <div className="user-name">{user?.username || 'User'}</div>
            <div className="user-role">{user?.department || user?.role || 'User'}</div>
            <Link to="/profile" className="user-profile-link">Profile</Link>
          </div>
        </div>
        <button onClick={logout} className="sidebar-logout" title="Sign out">
          <LogOut size={18} />
        </button>
      </div>

      {/* Copyright */}
      <div className="sidebar-copyright">
        © 2025 Aerovania Private Limited
        <br />
        v2.1(3) All Dashboard
      </div>
    </div>
  );
};

export default Sidebar;
