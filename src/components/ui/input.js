import React from 'react';

export function Input({ type = 'text', ...props }) {
  return (
    <input
      type={type}
      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      {...props}
    />
  );
}
