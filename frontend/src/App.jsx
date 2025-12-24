import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PrintSummary from './components/PrintSummary';
import PrintSheets from './components/PrintSheets';
import Dashboard from './components/Dashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/print/summary" element={<PrintSummary />} />
        <Route path="/print/orders" element={<PrintSheets />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
