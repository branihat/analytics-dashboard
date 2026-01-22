import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Sidebar from './components/Sidebar';
import './styles/Sidebar.css';
import './styles/animations.css';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './pages/Dashboard';
import Features from './pages/Features';
import Upload from './pages/Upload';
import MapView from './pages/MapView';
import TableView from './pages/TableView';
import ProfilePage from './pages/ProfilePage';

import Sites from './pages/Sites';
import InferredReports from './pages/InferredReports';
import UploadedATR from './pages/UploadedATR';

// Layout wrapper component
const AppLayout = ({ children }) => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  
  // Don't show sidebar on login/signup pages
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';
  
  if (isAuthPage || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        {children}
      </div>
    );
  }
  
  return (
    <div className="app-with-sidebar">
      <Sidebar />
      <div className="main-content">
        <div className="main-content-inner">
          {children}
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppLayout>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            
            {/* Protected routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/features" element={
              <ProtectedRoute>
                <Features />
              </ProtectedRoute>
            } />
            <Route path="/upload" element={
              <ProtectedRoute>
                <AdminRoute>
                  <Upload />
                </AdminRoute>
              </ProtectedRoute>
            } />
            <Route path="/map" element={
              <ProtectedRoute>
                <MapView />
              </ProtectedRoute>
            } />
            <Route path="/table" element={
              <ProtectedRoute>
                <TableView />
              </ProtectedRoute>
            } />
            <Route path="/sites" element={
              <ProtectedRoute>
                <Sites />
              </ProtectedRoute>
            } />
            <Route path="/inferred-reports" element={
              <ProtectedRoute>
                <InferredReports />
              </ProtectedRoute>
            } />
            <Route path="/uploaded-atr" element={
              <ProtectedRoute>
                <UploadedATR />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } />
            
            {/* Redirect any unknown routes to login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </AppLayout>
        <Toaster position="top-right" />
      </Router>
    </AuthProvider>
  );
}

export default App; 