// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
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

function App() {
  return (
    <Router>
      <div className="menu" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem', padding: '1rem' }}>
        <Link to="/"><FaHome /> Inicio</Link>
        <Link to="/mapa"><FaMapMarkedAlt /> Mapa</Link>
        <Link to="/mapa-redistribucion"><FaBookOpen /> Mapa Redistribución</Link>
        <Link to="/rutas-activas"><FaClipboardList /> Rutas Activas</Link>
        <Link to="/graficos"><FaChartPie /> Gráficos</Link>
        <Link to="/estadisticas-camion"><FaTruckMoving /> Estadísticas Camión</Link>
        <Link to="/rutas-por-camion"><FaClipboardList /> Rutas por Camión</Link>
        <Link to="/comparacion-semanal"><FaChartLine /> Comparación Semanal</Link>
        <Link to="/no-entregadas"><FaTimesCircle /> No Entregadas</Link>
        <Link to="/registrar-entrega"><FaPlusCircle /> Registrar Entrega</Link>
        <Link to="/registrar-punto"><FaPlusCircle /> Registrar Punto</Link>
        <Link to="/nueva-distribucion"><FaSyncAlt /> Nueva Distribución</Link>
        <Link to="/editar-redistribucion"><FaEdit /> Editar Redistribución</Link>
      </div>

      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/mapa" element={<Mapa />} />
        <Route path="/mapa-redistribucion" element={<MapaRedistribucion />} />
        <Route path="/rutas-activas" element={<RutasActivas />} />
        <Route path="/graficos" element={<Graficos />} />
        <Route path="/estadisticas-camion" element={<CamionEstadisticas />} />
        <Route path="/rutas-por-camion" element={<RutasPorCamion />} />
        <Route path="/comparacion-semanal" element={<ComparacionSemanal />} />
        <Route path="/no-entregadas" element={<NoEntregadas />} />
        <Route path="/registrar-entrega" element={<RegistrarEntrega />} />
        <Route path="/registrar-punto" element={<RegistrarNuevoPunto />} />
        <Route path="/nueva-distribucion" element={<NuevaDistribucion />} />
        <Route path="/editar-redistribucion" element={<EditarRedistribucion />} />
      </Routes>
    </Router>
  );
}

export default App;
