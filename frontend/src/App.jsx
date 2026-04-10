import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminProvider } from './context/AdminContext';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import AdminLayout from './layouts/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';

import PrintSummary from './components/PrintSummary';
import PrintSheets from './components/PrintSheets';
import PrintSupplierOrder from './components/PrintSupplierOrder';
import Organizations from './pages/Organizations';
import OrganizationDashboard from './pages/OrganizationDashboard';
import CampaignDashboard from './pages/CampaignDashboard';
import Users from './pages/Users';
import PublicCampaign from './pages/PublicCampaign';
import PublicHome from './pages/PublicHome';
import Login from './pages/Login';
import About from './pages/About';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/c/:id" element={<PublicCampaign />} />
            <Route path="/c/:orgSlug/:campaignSlug" element={<PublicCampaign />} />
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
            <Route path="/print/supplier-order" element={
              <ProtectedRoute>
                <PrintSupplierOrder />
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

              <Route path="organizations" element={<Organizations />} />
              <Route path="organizations/:id" element={<OrganizationDashboard />} />
              <Route path="organizations/:id/campaigns/:campaignId" element={<CampaignDashboard />} />
              <Route path="users" element={<Users />} />
            </Route>

            {/* Public Home */}
            <Route path="/" element={<PublicHome />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
