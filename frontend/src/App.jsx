import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminProvider } from './context/AdminContext';
import AdminLayout from './layouts/AdminLayout';

import PrintSummary from './components/PrintSummary';
import PrintSheets from './components/PrintSheets';
import Dashboard from './components/Dashboard';
import Organizations from './pages/Organizations';
import OrganizationDashboard from './pages/OrganizationDashboard';
import PublicCampaign from './pages/PublicCampaign';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/c/:id" element={<PublicCampaign />} />

        {/* Print Routes (Standalone) */}
        <Route path="/print/summary" element={<PrintSummary />} />
        <Route path="/print/orders" element={<PrintSheets />} />

        {/* Admin Routes */}
        <Route path="/admin" element={
          <AdminProvider>
            <AdminLayout />
          </AdminProvider>
        }>
          <Route index element={<Dashboard />} />
          <Route path="organizations" element={<Organizations />} />
          <Route path="organizations/:id" element={<OrganizationDashboard />} />
        </Route>

        {/* Redirect Root to Admin */}
        <Route path="/" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
