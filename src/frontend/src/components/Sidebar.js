import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, Upload, Map, Table2, LogOut, Layers, Video, MapPin, FileText, User, Menu, X, ChevronLeft, ChevronRight, Building } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Sidebar = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Check if user is admin or super admin
  const isAdmin = user?.role === 'admin' || user?.userType === 'admin';
  const isSuperAdmin = user?.email === 'superadmin@aero.com' || user?.username === 'SuperAdmin';

  // Navigation items
  const allNavItems = [
    { path: '/', name: 'Dashboard', icon: BarChart3 },
    { path: '/features', name: 'Features', icon: Layers },
    { path: '/sites', name: 'Sites', icon: MapPin },
    { path: '/organizations', name: 'Organizations', icon: Building, superAdminOnly: true },
    { path: '/upload', name: 'Upload', icon: Upload, adminOnly: true },
    { path: '/inferred-reports', name: 'Inferred Reports', icon: FileText },
    { path: '/uploaded-atr', name: 'Uploaded ATR', icon: FileText },
    { path: '/report-generator', name: 'Report Generator', icon: FileText, adminOnly: true },
    { path: '/map', name: 'Map View', icon: Map },
    { path: '/table', name: 'Table View', icon: Table2 },
  ];

  const navItems = allNavItems.filter(item => {
    if (item.superAdminOnly && !isSuperAdmin) return false;
    if (item.adminOnly && !isAdmin) return false;
    return true;
  });

  // Load collapsed state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState !== null) {
      setIsCollapsed(JSON.parse(savedState));
    }
  }, []);

  // Save collapsed state to localStorage
  const toggleCollapsed = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
  };

  // Toggle mobile sidebar
  const toggleMobile = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  // Close mobile sidebar when route changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  return (
    <>
      {/* Mobile Menu Button */}
      <button 
        className="mobile-menu-button"
        onClick={toggleMobile}
        aria-label="Toggle menu"
      >
        <Menu size={24} />
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="mobile-overlay"
          onClick={toggleMobile}
        />
      )}

      {/* Sidebar */}
      <div className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
        {/* Toggle Button */}
        <button 
          className="sidebar-toggle"
          onClick={toggleCollapsed}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        {/* Mobile Close Button */}
        <button 
          className="mobile-close-button"
          onClick={toggleMobile}
          aria-label="Close menu"
        >
          <X size={20} />
        </button>

        {/* Logo Section */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <BarChart3 className="logo-icon" />
            {!isCollapsed && (
              <div className="logo-text">
                <div className="logo-title">AI Driven</div>
                <div className="logo-title">Aerial Monitoring &</div>
                <div className="logo-title">Analytics System</div>
                <div className="logo-title">For Mine Operations</div>
              </div>
            )}
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
                title={isCollapsed ? item.name : ''}
              >
                <Icon className="sidebar-icon" />
                {!isCollapsed && <span>{item.name}</span>}
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
            {!isCollapsed && (
              <div className="user-info">
                <div className="user-name">{user?.username || 'User'}</div>
                <div className="user-role">{user?.department || user?.role || 'User'}</div>
                <Link to="/profile" className="user-profile-link">Profile</Link>
              </div>
            )}
          </div>
          <button 
            onClick={logout} 
            className="sidebar-logout" 
            title="Sign out"
          >
            <LogOut size={18} />
          </button>
        </div>

        {/* Copyright */}
        {!isCollapsed && (
          <div className="sidebar-copyright">
            © 2025 Aerovania Private Limited
            <br />
            v2.1(3) All Dashboard
          </div>
        )}
      </div>
    </>
  );
};

export default Sidebar;
