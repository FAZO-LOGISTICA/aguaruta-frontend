// src/Layout.js
import React, { useEffect, useState } from 'react';
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

const Layout = ({ children }) => {
  const location = useLocation();
  const [backgroundImage, setBackgroundImage] = useState('');

  useEffect(() => {
    const randomNumber = Math.floor(Math.random() * 9) + 1;
    setBackgroundImage(`/img/valparaiso/valparaiso${randomNumber}.jpg`);
  }, [location.pathname]);

  return (
    <div
      className="min-h-screen bg-cover bg-center"
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      <header className="bg-white bg-opacity-90 shadow p-2 flex justify-center items-center">
        <img
          src="/img/logos/logos-unificados.png"
          alt="Logo Municipalidad"
          className="h-20 object-contain"
        />
      </header>

      <nav className="bg-blue-800 bg-opacity-90 text-white flex justify-around p-2 shadow-md text-sm">
        <Link to="/" className="flex items-center space-x-1 hover:text-yellow-300">
          <FaHome /> <span>Inicio</span>
        </Link>
        <Link to="/rutas" className="flex items-center space-x-1 hover:text-yellow-300">
          <FaTruckMoving /> <span>Rutas Activas</span>
        </Link>
        <Link to="/mapa" className="flex items-center space-x-1 hover:text-yellow-300">
          <FaMapMarkedAlt /> <span>Mapa</span>
        </Link>
        <Link to="/graficos" className="flex items-center space-x-1 hover:text-yellow-300">
          <FaChartPie /> <span>Gráficos</span>
        </Link>
        <Link to="/camion-estadisticas" className="flex items-center space-x-1 hover:text-yellow-300">
          <FaRegClipboard /> <span>Camión Estadísticas</span>
        </Link>
        <Link to="/registrar" className="flex items-center space-x-1 hover:text-yellow-300">
          <FaPlus /> <span>Registrar Entrega</span>
        </Link>
        <Link to="/no-entregadas" className="flex items-center space-x-1 hover:text-yellow-300">
          <FaFileAlt /> <span>No Entregadas</span>
        </Link>
      </nav>

      <main className="bg-white bg-opacity-90 p-4 m-4 rounded-2xl shadow-xl min-h-[75vh]">
        {children}
      </main>
    </div>
  );
};

export default Layout;
