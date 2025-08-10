// src/Header.js
import React, { useState, useEffect } from 'react';   // ✅ ajusta los hooks que realmente uses
import './App.css';

function Header() {
  return (
    <header className="header">
      <img
        src="/img/logos/logos-institucionales.png"
        alt="Logo Institucional"
        className="header-logo"
      />
    </header>
  );
}

export default Header;

