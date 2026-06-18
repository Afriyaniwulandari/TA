import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-brand-grayMedium py-4 px-6 md:px-8 text-center text-xs text-brand-grayDark mt-auto">
      <div className="flex flex-col md:flex-row items-center justify-between gap-2 max-w-7xl mx-auto">
        <p>
          <strong>DYNASALT v1.0</strong> - Decision Support System untuk Rantai Pasok Garam.
        </p>
        <p className="md:text-right">
          Integrasi Pendekatan <em>System Dynamics</em> & <em>Analytic Network Process (ANP)</em> • 2026
        </p>
      </div>
    </footer>
  );
}
