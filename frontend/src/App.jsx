import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
        <Route path="/" element={<Dashboard />} />
        <Route path="/print/summary" element={<PrintSummary />} />
        <Route path="/print/orders" element={<PrintSheets />} />

        {/* Admin Routes */}
        <Route path="/organizations" element={<Organizations />} />
        <Route path="/organizations/:id" element={<OrganizationDashboard />} />

        {/* Public Routes */}
        <Route path="/c/:id" element={<PublicCampaign />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
