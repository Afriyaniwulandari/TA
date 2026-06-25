import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import logoImg from '../assets/logo.png';
import {
  Home,
  Layers,
  TrendingUp,
  GitBranch,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { name: 'Beranda',  path: '/',         icon: Home },
    { name: 'Model',    path: '/model',    icon: Layers },
    { name: 'ANP',      path: '/anp',      icon: GitBranch },
    { name: 'Simulasi', path: '/simulasi', icon: TrendingUp },
  ];

  return (
    <aside 
      className={`bg-slate-900 text-slate-100 flex flex-col h-screen sticky top-0 transition-all duration-300 ease-in-out border-r border-slate-800 shadow-xl z-20 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Section */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 h-16">
        {!isCollapsed && (
          <div className="flex items-center gap-2 animate-fade-in">
            <img src={logoImg} alt="DYNASALT Logo" className="h-8 w-auto object-contain" />
            <span className="font-extrabold text-xl tracking-wider text-white bg-clip-text bg-gradient-to-r from-white via-slate-100 to-brand-accent">
              DYNASALT
            </span>
          </div>
        )}
        {isCollapsed && (
          <div className="mx-auto text-brand-accent flex justify-center w-full">
            <img src={logoImg} alt="Logo" className="h-8 w-auto object-contain" />
          </div>
        )}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors focus:outline-none"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Thesis Info Mini Card */}
      {!isCollapsed && (
        <div className="p-4 mx-4 my-4 bg-slate-800/50 border border-slate-700/50 rounded-xl text-xs text-slate-400 animate-fade-in">
          <p className="font-semibold text-slate-200 uppercase tracking-wider text-[10px]">Platform Analisis</p>
          <p className="mt-1 font-medium truncate">Rantai Pasok Garam</p>
          <p className="text-[10px] text-slate-500 mt-0.5">System Dynamics & ANP</p>
        </div>
      )}

      {/* Nav Menu */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto sidebar-scroll">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => 
                `flex items-center gap-4 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                  isActive 
                    ? 'bg-brand-cobalt text-white shadow-lg shadow-brand-cobalt/25' 
                    : 'text-slate-400 hover:bg-slate-800/80 hover:text-white'
                }`
              }
            >
              <Icon size={20} className="flex-shrink-0" />
              {!isCollapsed && (
                <span className="text-sm truncate animate-fade-in">
                  {item.name}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer / Developer Mini Label */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-center">
        {!isCollapsed ? (
          <div className="animate-fade-in text-[10px] text-slate-500">
            <p className="font-semibold">Versi 1.0.0</p>
            <p className="mt-0.5">© 2026 DYNASALT</p>
          </div>
        ) : (
          <span className="text-[10px] text-slate-600 font-bold">1.0</span>
        )}
      </div>
    </aside>
  );
}
