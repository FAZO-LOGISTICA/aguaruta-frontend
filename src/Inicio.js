// src/Inicio.js
import React, { useState, useEffect } from 'react';
import "./estilos/Inicio.css";

const STATS = [
  { icon: "💧", valor: "864", label: "Familias atendidas" },
  { icon: "🚚", valor: "8",   label: "Camiones activos" },
  { icon: "📍", valor: "5",   label: "Días de cobertura" },
  { icon: "🏛️", valor: "1",   label: "Municipio" },
];

const Inicio = () => {
  const [fondo, setFondo] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const aleatorio = Math.floor(Math.random() * 9) + 1;
    setFondo(`/img/valparaiso/valparaiso${aleatorio}.jpg`);
    setTimeout(() => setVisible(true), 100);
  }, []);

  return (
    <main className="inicio-main" style={{ backgroundImage: `url(${fondo})` }}>
      <div className="inicio-overlay" />

      <div className={`inicio-contenido ${visible ? "visible" : ""}`}>

        {/* Logo + título */}
        <div className="inicio-header">
          <img
            alt="Logo institucional"
            className="logo-inicio"
          />
          <div className="inicio-titulo-wrap">
  
            <h1 className="inicio-titulo">AguaRuta</h1>
            <p className="inicio-subtitulo">
              Plataforma de monitoreo y gestión de entregas de agua potable<br />
              para el Gran Valparaíso — Placilla y Laguna Verde
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="inicio-stats">
          {STATS.map((s, i) => (
            <div className="inicio-stat" key={i}>
              <span className="inicio-stat-icon">{s.icon}</span>
              <span className="inicio-stat-valor">{s.valor}</span>
              <span className="inicio-stat-label">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Pie */}
        <div className="inicio-footer-text">
        </div>

      </div>
    </main>
  );
};

export default Inicio;
