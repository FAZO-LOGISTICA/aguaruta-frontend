// src/components/ui/card.js
import React from 'react';

const Card = ({ children, className = '' }) => {
  return (
    <div className={`bg-white shadow-md rounded-xl p-4 ${className}`}>
      {children}
    </div>
  );
};

const CardContent = ({ children }) => {
  return <div className="mt-2">{children}</div>;
};

export default Card;
export { CardContent };
