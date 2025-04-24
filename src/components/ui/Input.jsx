import React from 'react';
export function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${className}`}
      {...props}
    />
  );
}