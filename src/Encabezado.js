// src/Encabezado.js
import React, { useState, useEffect } from 'react';   // ✅ ajusta los hooks que realmente uses

const Encabezado = () => {
  return (
    <header className="header">
      <img
        src="/img/logos/logos-institucionales.png"
        alt="Logos institucionales"
        className="header-logo"
      />
    </header>
  );
};

export default Encabezado;

