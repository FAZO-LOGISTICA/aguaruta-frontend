import React from "react";
import { Link } from "react-router-dom";
import "./estilos/Navbar.css";

const Navbar = () => {
  return (
    <nav className="navbar">
      <ul>
        <li><Link to="/">🏠 Inicio</Link></li>
        <li><Link to="/rutas-activas">🚚 Rutas Activas</Link></li>
        <li><Link to="/mapa">🗺️ Mapa</Link></li>
        <li><Link to="/graficos">📊 Gráficos</Link></li>
        <li><Link to="/registrar">📝 Registrar Entrega</Link></li>
        <li><Link to="/rutas-camion">📅 Rutas por Camión</Link></li>
      </ul>
    </nav>
  );
};

export default Navbar;
