import React from 'react';
import { Award, BookOpen, Database } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-white border-b border-brand-grayMedium h-16 px-6 md:px-8 flex items-center justify-between sticky top-0 z-10 shadow-sm">
      {/* Left Title section */}
      <div className="flex flex-col">
        <h1 className="text-lg font-bold text-brand-dark flex items-center gap-2">
          DYNASALT
          <span className="hidden sm:inline-block text-xs font-normal text-brand-grayDark border-l border-brand-grayMedium pl-2">
            Simulasi & Analisis Kebijakan Rantai Pasok Garam Nasional
          </span>
        </h1>
      </div>

      {/* Right Academic Stats / Badges */}
      <div className="flex items-center gap-4">
        <span className="text-xs text-brand-grayDark font-medium hidden sm:inline-block">Integrated System Dynamics and ANP Platform</span>
      </div>
    </header>
  );
}
