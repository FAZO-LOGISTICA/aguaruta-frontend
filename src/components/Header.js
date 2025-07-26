// src/components/Header.js
import React, { useEffect } from 'react';

const Header = () => {
  useEffect(() => {
    const logo = document.getElementById('logo-institucional');
    if (logo) {
      logo.style.width = '200px';
      logo.style.height = 'auto';
      logo.style.objectFit = 'contain';
      logo.style.marginBottom = '1rem';
    }
  }, []);

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <img
        id="logo-institucional"
        src="/img/logos/logos-institucionales.png"
        alt="Logos Institucionales"
      />
    </div>
  );
};

export default Header;

