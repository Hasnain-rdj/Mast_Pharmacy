import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';
import ClinicInventory from './components/ClinicInventory';
import AdminMedicineModule from './components/admin/AdminMedicineModule';
import AdminAnalytics from './components/admin/AdminAnalytics';
import AdminSalesModule from './components/admin/AdminSalesModule';
import WorkerAnalytics from './components/WorkerAnalytics';
import AdminSalesByDate from './components/admin/AdminSalesByDate';
import { SettingsProvider } from './components/context/SettingsContext';
import { getStoredUser } from './utils';
import './App.css';

function RootRedirect() {
  const user = getStoredUser();
  return user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
}

// Requires user to be logged in (any role)
function ProtectedRoute({ children }) {
  const user = getStoredUser();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

// Requires user to be logged in AS ADMIN
function AdminRoute({ children }) {
  const user = getStoredUser();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

// Auth pages (login/signup) - redirect to /dashboard if already logged in
function PublicRoute({ children }) {
  const user = getStoredUser();
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function App() {
  return (
    <SettingsProvider>
      <Router>
        <Navbar />
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
          
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/inventory" element={<ProtectedRoute><ClinicInventory /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/worker/analytics" element={<ProtectedRoute><WorkerAnalytics /></ProtectedRoute>} />
          
          {/* Sales functionality is now part of Dashboard */}
          <Route path="/sales" element={<Navigate to="/dashboard" replace />} />

          {/* Admin routes */}
          <Route path="/admin/medicines" element={<AdminRoute><AdminMedicineModule /></AdminRoute>} />
          <Route path="/admin/analytics" element={<AdminRoute><AdminAnalytics /></AdminRoute>} />
          <Route path="/admin/sales" element={<AdminRoute><AdminSalesModule /></AdminRoute>} />
          <Route path="/admin/sales-by-date" element={<AdminRoute><AdminSalesByDate /></AdminRoute>} />
          
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </SettingsProvider>
  );
}

export default App;
