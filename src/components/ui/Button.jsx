import React from 'react';

export function Button({ children, className = '', ...props }) {
  return (
    <button
      className={`px-6 py-3 rounded-xl font-medium text-base transition-all duration-200 
      focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 
      disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}