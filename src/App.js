import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import {
  FaHome, FaMapMarkedAlt, FaBookOpen, FaClipboardList,
  FaChartPie, FaTruckMoving, FaChartLine, FaTimesCircle,
  FaPlusCircle, FaSyncAlt, FaEdit
} from 'react-icons/fa';

import Inicio from './Inicio';
import Mapa from './Mapa';
import MapaRedistribucion from './MapaRedistribucion';
import RutasActivas from './RutasActivas';
import Graficos from './Graficos';
import CamionEstadisticas from './CamionEstadisticas';
import RutasPorCamion from './RutasPorCamion';
import ComparacionSemanal from './ComparacionSemanal';
import NoEntregadas from './NoEntregadas';
import RegistrarEntrega from './RegistrarEntrega';
import RegistrarNuevoPunto from './RegistrarNuevoPunto';
import NuevaDistribucion from './NuevaDistribucion';
import EditarRedistribucion from './EditarRedistribucion';
import LoginApp from './LoginApp';

function App() {
  const [rol, setRol] = useState(localStorage.getItem("rol"));
  const [usuario, setUsuario] = useState(localStorage.getItem("usuario"));

  useEffect(() => {
    if (!rol) {
      localStorage.removeItem("rol");
      localStorage.removeItem("usuario");
      setRol(null);
      setUsuario(null);
    }
  }, [rol]);

  function logout() {
    localStorage.removeItem("rol");
    localStorage.removeItem("usuario");
    setRol(null);
    setUsuario(null);
  }

  if (!rol) {
    return <LoginApp onLogin={(usuario, rol) => { setRol(rol); setUsuario(usuario); }} />;
  }

  return (
    <Router>
      <div className="menu" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '1rem', padding: '1rem', background: '#f8f8f8', borderBottom: '1px solid #ddd' }}>
        <span style={{ fontWeight: 'bold', marginRight: 15 }}>Usuario: {usuario} ({rol})</span>
        <button
          onClick={logout}
          style={{
            background: '#c23',
            color: 'white',
            border: 'none',
            borderRadius: 5,
            padding: '6px 12px',
            cursor: 'pointer',
            fontWeight: 'bold',
            marginRight: 20
          }}
        >Cerrar sesión</button>

        {/* Solo muestra lo permitido para INVITADO */}
        <Link to="/"><FaHome /> Inicio</Link>
        <Link to="/mapa"><FaMapMarkedAlt /> Mapa</Link>
        <Link to="/graficos"><FaChartPie /> Gráficos</Link>
        <Link to="/estadisticas-camion"><FaTruckMoving /> Estadísticas Camión</Link>
        <Link to="/comparacion-semanal"><FaChartLine /> Comparación Semanal</Link>
        <Link to="/rutas-por-camion"><FaClipboardList /> Rutas por Camión</Link>

        {/* El resto solo lo ve DIOS o EDITOR */}
        {rol !== "invitado" && (
          <>
            <Link to="/mapa-redistribucion"><FaBookOpen /> Mapa Redistribución</Link>
            <Link to="/rutas-activas"><FaClipboardList /> Rutas Activas</Link>
            <Link to="/no-entregadas"><FaTimesCircle /> No Entregadas</Link>
            <Link to="/registrar-entrega"><FaPlusCircle /> Registrar Entrega</Link>
            <Link to="/registrar-punto"><FaPlusCircle /> Registrar Punto</Link>
            <Link to="/nueva-distribucion"><FaSyncAlt /> Nueva Distribución</Link>
            <Link to="/editar-redistribucion"><FaEdit /> Editar Redistribución</Link>
          </>
        )}
      </div>

      {/* --- RUTAS --- */}
      <Routes>
        {/* Rutas SIEMPRE visibles */}
        <Route path="/" element={<Inicio />} />
        <Route path="/mapa" element={<Mapa />} />
        <Route path="/graficos" element={<Graficos />} />

        {/* PASA EL PROP 'rol' A ESTOS COMPONENTES */}
        <Route path="/estadisticas-camion" element={<CamionEstadisticas rol={rol} />} />
        <Route path="/comparacion-semanal" element={<ComparacionSemanal rol={rol} />} />
        <Route path="/rutas-por-camion" element={<RutasPorCamion rol={rol} />} />

        {/* Rutas solo para DIOS/EDITOR (si entra invitado, redirige a inicio) */}
        <Route path="/mapa-redistribucion" element={rol === "invitado" ? <Navigate to="/" /> : <MapaRedistribucion />} />
        <Route path="/rutas-activas" element={rol === "invitado" ? <Navigate to="/" /> : <RutasActivas />} />
        <Route path="/no-entregadas" element={rol === "invitado" ? <Navigate to="/" /> : <NoEntregadas />} />
        <Route path="/registrar-entrega" element={rol === "invitado" ? <Navigate to="/" /> : <RegistrarEntrega />} />
        <Route path="/registrar-punto" element={rol === "invitado" ? <Navigate to="/" /> : <RegistrarNuevoPunto />} />
        <Route path="/nueva-distribucion" element={rol === "invitado" ? <Navigate to="/" /> : <NuevaDistribucion />} />
        <Route path="/editar-redistribucion" element={rol === "invitado" ? <Navigate to="/" /> : <EditarRedistribucion />} />
      </Routes>
    </Router>
  );
}

export default App;
