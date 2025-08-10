// src/Layout.js
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FaMapMarkedAlt,
  FaChartPie,
  FaTruckMoving,
  FaRegClipboard,
  FaPlus,
  FaHome,
  FaFileAlt
} from 'react-icons/fa';
import './App.css';

export default function Layout({ children }) {
  const location = useLocation();
  const [backgroundImage, setBackgroundImage] = useState('');

  useEffect(() => {
    const n = Math.floor(Math.random() * 9) + 1;
    setBackgroundImage(`/img/valparaiso/valparaiso${n}.jpg`);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-cover bg-center" style={{ backgroundImage: `url(${backgroundImage})` }}>
      <header className="bg-white/90 shadow p-2 flex justify-center items-center">
        <img
          src="/img/logos/logos-institucionales.png"
          alt="Logo Municipalidad"
          className="h-20 object-contain"
        />
      </header>

      <nav className="bg-blue-800/90 text-white flex justify-center gap-4 p-2 shadow-md text-sm flex-wrap">
        <Link to="/" className="flex items-center gap-1 hover:text-yellow-300">
          <FaHome /> <span>Inicio</span>
        </Link>
        <Link to="/rutas-activas" className="flex items-center gap-1 hover:text-yellow-300">
          <FaTruckMoving /> <span>Rutas Activas</span>
        </Link>
        <Link to="/mapa" className="flex items-center gap-1 hover:text-yellow-300">
          <FaMapMarkedAlt /> <span>Mapa</span>
        </Link>
        <Link to="/graficos" className="flex items-center gap-1 hover:text-yellow-300">
          <FaChartPie /> <span>Gráficos</span>
        </Link>
        <Link to="/estadisticas-camion" className="flex items-center gap-1 hover:text-yellow-300">
          <FaRegClipboard /> <span>Camión Estadísticas</span>
        </Link>
        <Link to="/registrar-entrega" className="flex items-center gap-1 hover:text-yellow-300">
          <FaPlus /> <span>Registrar Entrega</span>
        </Link>
        <Link to="/no-entregadas" className="flex items-center gap-1 hover:text-yellow-300">
          <FaFileAlt /> <span>No Entregadas</span>
        </Link>
      </nav>

      <main className="bg-white/90 p-4 m-4 rounded-2xl shadow-xl min-h-[75vh]">
        {children}
      </main>
    </div>
  );
}
