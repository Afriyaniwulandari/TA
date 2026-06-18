import React from 'react';

export default function Card({ title, subtitle, children, className = '', headerAction }) {
  return (
    <div className={`glass-panel p-6 ${className}`}>
      {(title || subtitle || headerAction) && (
        <div className="flex items-center justify-between border-b border-brand-grayMedium pb-4 mb-4">
          <div>
            {title && (
              <h3 className="font-bold text-slate-800 text-base md:text-lg tracking-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-brand-grayDark mt-0.5 font-medium">
                {subtitle}
              </p>
            )}
          </div>
          {headerAction && <div className="text-xs">{headerAction}</div>}
        </div>
      )}
      <div className="text-sm text-slate-600 leading-relaxed">
        {children}
      </div>
    </div>
  );
}
