// src/components/ui/button.js
import React from 'react';

const Button = ({ children, onClick, className = '', type = 'button' }) => {
  return (
    <button
      onClick={onClick}
      type={type}
      className={`bg-cyan-700 text-white px-4 py-2 rounded hover:bg-cyan-800 transition ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;
