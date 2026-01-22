import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, Upload, Map, Table2, User, LogOut, Settings, Layers, Video, MapPin, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Check if user is admin
  const isAdmin = user?.role === 'admin' || user?.userType === 'admin';

  // Filter navigation items based on role
  const allNavItems = [
    { path: '/', name: 'Dashboard', icon: BarChart3 },
    { path: '/features', name: 'Features', icon: Layers },
    { path: '/sites', name: 'Sites', icon: MapPin },
    { path: '/upload', name: 'Upload', icon: Upload, adminOnly: true },
    { path: '/upload-atr', name: 'Upload ATR', icon: FileText },
    { path: '/video-links', name: 'Video Links', icon: Video },
    { path: '/map', name: 'Map View', icon: Map },
    { path: '/table', name: 'Table View', icon: Table2 },
  ];

  const navItems = allNavItems.filter(item => !item.adminOnly || isAdmin);

  // Don't show navbar on login/signup pages
  if (location.pathname === '/login' || location.pathname === '/signup') {
    return null;
  }

  return (
    <nav className="bg-white shadow-lg border-b">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2 max-w-md">
            <BarChart3 className="h-8 w-8 text-blue-600 flex-shrink-0" />
            <span className="text-lg font-bold text-gray-900 leading-tight">AI Driven Aerial Monitoring & Analytics System For Mine Operations</span>
          </div>
          
          <div className="flex items-center space-x-4">
            {isAuthenticated && (
              <div className="flex space-x-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            )}

            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                >
                  <User className="h-4 w-4" />
                  <span>{user?.username}</span>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                    <div className="px-4 py-2 text-sm text-gray-700 border-b">
                      <div className="font-medium">{user?.username}</div>
                      <div className="text-gray-500">{user?.email}</div>
                      <div className="text-xs text-blue-600 capitalize">{user?.role || user?.userType}</div>
                    </div>
                    {isAdmin && (
                      <Link
                        to="/profile"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Profile Settings
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        logout();
                        setShowUserMenu(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex space-x-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  Sign in
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 