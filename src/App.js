import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import {
  FaHome, FaMapMarkedAlt, FaBookOpen, FaClipboardList,
  FaChartPie, FaTruckMoving, FaChartLine, FaTimesCircle,
  FaPlusCircle, FaSyncAlt, FaEdit, FaHistory
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

const RegistroAcciones = ({ acciones }) => (
  <div style={{ maxWidth: 800, margin: '2em auto', background: 'white', padding: 16, borderRadius: 8 }}>
    <h3>Registro de Acciones</h3>
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ background: '#eee' }}>
          <th style={{ border: '1px solid #ccc', padding: 5 }}>Fecha/Hora</th>
          <th style={{ border: '1px solid #ccc', padding: 5 }}>Usuario</th>
          <th style={{ border: '1px solid #ccc', padding: 5 }}>Rol</th>
          <th style={{ border: '1px solid #ccc', padding: 5 }}>Acción</th>
          <th style={{ border: '1px solid #ccc', padding: 5 }}>Detalle</th>
        </tr>
      </thead>
      <tbody>
        {acciones.length === 0 ? (
          <tr><td colSpan={5} style={{ textAlign: "center", color: "#999" }}>Sin movimientos aún</td></tr>
        ) : (
          acciones.map((acc, i) => (
            <tr key={i}>
              <td style={{ border: '1px solid #ccc', padding: 5 }}>{acc.fecha}</td>
              <td style={{ border: '1px solid #ccc', padding: 5 }}>{acc.usuario}</td>
              <td style={{ border: '1px solid #ccc', padding: 5 }}>{acc.rol}</td>
              <td style={{ border: '1px solid #ccc', padding: 5 }}>{acc.accion}</td>
              <td style={{ border: '1px solid #ccc', padding: 5 }}>{acc.detalle || ""}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

function App() {
  const [rol, setRol] = useState(localStorage.getItem("rol"));
  const [usuario, setUsuario] = useState(localStorage.getItem("usuario"));
  const [acciones, setAcciones] = useState(
    JSON.parse(localStorage.getItem("acciones") || "[]")
  );
  const [mostrarRegistro, setMostrarRegistro] = useState(false);

  useEffect(() => {
    if (!rol) {
      localStorage.removeItem("rol");
      localStorage.removeItem("usuario");
      setRol(null);
      setUsuario(null);
    }
  }, [rol]);

  // Guardar registro de acciones en localStorage
  const registrarAccion = (accion, detalle) => {
    const nueva = {
      fecha: new Date().toLocaleString(),
      usuario,
      rol,
      accion,
      detalle,
    };
    const nuevoLog = [nueva, ...acciones].slice(0, 1000);
    setAcciones(nuevoLog);
    localStorage.setItem("acciones", JSON.stringify(nuevoLog));
  };

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
      <div className="menu" style={{
        display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center',
        gap: '1rem', padding: '1rem', background: '#f8f8f8', borderBottom: '1px solid #ddd'
      }}>
        <span style={{ fontWeight: 'bold', marginRight: 15 }}>
          Usuario: {usuario} ({rol})
        </span>
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
        {(rol === "dios" || rol === "editor") && (
          <>
            <Link to="/rutas-activas"><FaClipboardList /> Rutas Activas</Link>
            <Link to="/no-entregadas"><FaTimesCircle /> No Entregadas</Link>
            <Link to="/registrar-entrega"><FaPlusCircle /> Registrar Entrega</Link>
            <Link to="/registrar-punto"><FaPlusCircle /> Registrar Punto</Link>
            <Link to="/nueva-distribucion"><FaSyncAlt /> Nueva Distribución</Link>
          </>
        )}

        {/* Solo DIOS puede acceder a editar redistribución y mapa redistribución */}
        {rol === "dios" && (
          <>
            <Link to="/mapa-redistribucion"><FaBookOpen /> Mapa Redistribución</Link>
            <Link to="/editar-redistribucion"><FaEdit /> Editar Redistribución</Link>
            <button onClick={() => setMostrarRegistro(r => !r)} style={{ marginLeft: 20, background: "#0856a6", color: "white", border: "none", borderRadius: 5, padding: "5px 14px", fontWeight: "bold", cursor: "pointer" }}>
              <FaHistory /> Registro de acciones
            </button>
          </>
        )}
      </div>

      {mostrarRegistro && rol === "dios" && <RegistroAcciones acciones={acciones} />}

      {/* --- RUTAS --- */}
      <Routes>
        {/* Rutas SIEMPRE visibles */}
        <Route path="/" element={<Inicio />} />
        <Route path="/mapa" element={<Mapa />} />
        <Route path="/graficos" element={<Graficos />} />
        <Route path="/estadisticas-camion" element={<CamionEstadisticas rol={rol} registrarAccion={registrarAccion} />} />
        <Route path="/comparacion-semanal" element={<ComparacionSemanal rol={rol} registrarAccion={registrarAccion} />} />
        <Route path="/rutas-por-camion" element={<RutasPorCamion rol={rol} registrarAccion={registrarAccion} />} />

        {/* Rutas solo para DIOS o EDITOR */}
        <Route path="/rutas-activas" element={(rol === "dios" || rol === "editor") ? <RutasActivas rol={rol} usuario={usuario} registrarAccion={registrarAccion} /> : <Navigate to="/" />} />
        <Route path="/no-entregadas" element={(rol === "dios" || rol === "editor") ? <NoEntregadas rol={rol} registrarAccion={registrarAccion} /> : <Navigate to="/" />} />
        <Route path="/registrar-entrega" element={(rol === "dios" || rol === "editor") ? <RegistrarEntrega rol={rol} usuario={usuario} registrarAccion={registrarAccion} /> : <Navigate to="/" />} />
        <Route path="/registrar-punto" element={(rol === "dios" || rol === "editor") ? <RegistrarNuevoPunto rol={rol} usuario={usuario} registrarAccion={registrarAccion} /> : <Navigate to="/" />} />
        <Route path="/nueva-distribucion" element={(rol === "dios" || rol === "editor") ? <NuevaDistribucion rol={rol} registrarAccion={registrarAccion} /> : <Navigate to="/" />} />

        {/* SOLO DIOS */}
        <Route path="/mapa-redistribucion" element={rol === "dios" ? <MapaRedistribucion rol={rol} registrarAccion={registrarAccion} /> : <Navigate to="/" />} />
        <Route path="/editar-redistribucion" element={rol === "dios" ? <EditarRedistribucion rol={rol} registrarAccion={registrarAccion} /> : <Navigate to="/" />} />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
