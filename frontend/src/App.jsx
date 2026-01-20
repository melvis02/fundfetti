import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminProvider } from './context/AdminContext';
import { AuthProvider } from './context/AuthContext';
import AdminLayout from './layouts/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';

import PrintSummary from './components/PrintSummary';
import PrintSheets from './components/PrintSheets';
import Dashboard from './components/Dashboard';
import Organizations from './pages/Organizations';
import OrganizationDashboard from './pages/OrganizationDashboard';
import Users from './pages/Users';
import PublicCampaign from './pages/PublicCampaign';
import Login from './pages/Login';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/c/:id" element={<PublicCampaign />} />
          <Route path="/login" element={<Login />} />

          {/* Print Routes (Standalone - protected?) - Maybe keep public for ease of printing, or protect? Let's protect them for now as they contain data */}
          <Route path="/print/summary" element={
            <ProtectedRoute>
              <PrintSummary />
            </ProtectedRoute>
          } />
          <Route path="/print/orders" element={
            <ProtectedRoute>
              <PrintSheets />
            </ProtectedRoute>
          } />

          {/* Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminProvider>
                <AdminLayout />
              </AdminProvider>
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="organizations" element={<Organizations />} />
            <Route path="organizations/:id" element={<OrganizationDashboard />} />
            <Route path="users" element={<Users />} />
          </Route>

          {/* Redirect Root to Admin */}
          <Route path="/" element={<Navigate to="/admin" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
