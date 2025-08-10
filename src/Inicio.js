import React, { useState, useEffect } from 'react';   // ✅ ajusta los hooks que realmente uses
import "./App.css";
import "./estilos/Inicio.css";

const Inicio = () => {
  const [fondo, setFondo] = useState("");

  useEffect(() => {
    const aleatorio = Math.floor(Math.random() * 9) + 1;
    setFondo(`/img/valparaiso/valparaiso${aleatorio}.jpg`);
  }, []);

  return (
    <main className="inicio-main" style={{ backgroundImage: `url(${fondo})` }}>
      <div className="inicio-overlay">
        <img
          src="/img/logos/logos-institucionales.png"
          alt="Logo institucional"
          className="logo-inicio"
        />
        <div className="texto-inicio">
          <h1>Sistema de Seguimiento - AguaRuta</h1>
          <p>
            Plataforma oficial de monitoreo de entregas de agua potable para Laguna Verde,
            Municipalidad de Valparaíso.
          </p>
        </div>
      </div>
    </main>
  );
};

export default Inicio;

