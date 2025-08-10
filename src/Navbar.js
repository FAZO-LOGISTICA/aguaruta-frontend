// src/Navbar.js
import React from "react";
import { NavLink } from "react-router-dom";
import "./estilos/Navbar.css";

const linkClass = ({ isActive }) => (isActive ? "active" : undefined);

export default function Navbar() {
  return (
    <nav className="navbar">
      <ul>
        <li><NavLink to="/" end className={linkClass}>🏠 Inicio</NavLink></li>
        <li><NavLink to="/rutas-activas" className={linkClass}>🚚 Rutas Activas</NavLink></li>
        <li><NavLink to="/mapa" className={linkClass}>🗺️ Mapa</NavLink></li>
        <li><NavLink to="/graficos" className={linkClass}>📊 Gráficos</NavLink></li>
        <li><NavLink to="/registrar-entrega" className={linkClass}>📝 Registrar Entrega</NavLink></li>
        <li><NavLink to="/rutas-por-camion" className={linkClass}>📅 Rutas por Camión</NavLink></li>
      </ul>
    </nav>
  );
}
