import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Footer from './components/Footer';
import Beranda from './pages/Beranda';
import Model from './pages/Model';
import Simulasi from './pages/Simulasi';
import ANP from './pages/ANP';
import Hasil from './pages/Hasil';

export default function App() {
  return (
    <Router>
      <div className="flex h-screen overflow-hidden bg-brand-light">
        {/* Left Collapsible Sidebar */}
        <Sidebar />

        {/* Right Content Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden print:overflow-visible">
          {/* Top Header - Hidden on Print */}
          <div className="print:hidden">
            <Header />
          </div>

          {/* Main Scrollable Content */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-2 md:p-4 bg-brand-grayLight print:bg-white print:overflow-visible">
            <div className="max-w-7xl mx-auto">
              <Routes>
                <Route path="/" element={<Beranda />} />
                <Route path="/model" element={<Model />} />
                <Route path="/simulasi" element={<Simulasi />} />
                <Route path="/anp" element={<ANP />} />
                <Route path="/hasil" element={<Hasil />} />
              </Routes>
            </div>
          </main>

          {/* Footer - Hidden on Print */}
          <div className="print:hidden">
            <Footer />
          </div>
        </div>
      </div>
    </Router>
  );
}
