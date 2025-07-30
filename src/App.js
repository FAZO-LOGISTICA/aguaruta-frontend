import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from "react-router-dom";
import LoginApp from "./LoginApp";
import Inicio from "./Inicio";
import Mapa from "./Mapa";
import Graficos from "./Graficos";
import CamionEstadisticas from "./CamionEstadisticas";
import ComparacionSemanal from "./ComparacionSemanal";
import RutasPorCamion from "./RutasPorCamion";
import RutasActivas from "./RutasActivas";
import RegistrarEntrega from "./RegistrarEntrega";
import RegistrarNuevoPunto from "./RegistrarNuevoPunto";
import NuevaDistribucion from "./NuevaDistribucion";
import NoEntregadas from "./NoEntregadas";
import MapaRedistribucion from "./MapaRedistribucion";
import EditarRedistribucion from "./EditarRedistribucion";
import AdminUsuarios from "./AdminUsuarios";

// --- Usuarios iniciales ---
const initialUsuarios = [
  { username: "che.gustrago", password: "FAZO-LOGISTICA", role: "dios" },
  { username: "laguna_verde", password: "delegacion", role: "editor" },
  { username: "operaciones", password: "direccion", role: "editor" }
];

function App() {
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [usuarios, setUsuarios] = useState(initialUsuarios);

  // --- LOGIN ---
  const handleLogin = (username, password) => {
    const user = usuarios.find(
      u => u.username === username && u.password === password
    );
    if (user) {
      setUsuarioActual({ username: user.username, role: user.role });
      localStorage.setItem("rol", user.role);
      return true;
    } else {
      return false;
    }
  };

  const handleInvitado = () => {
    setUsuarioActual({ username: "invitado", role: "invitado" });
    localStorage.setItem("rol", "invitado");
  };

  const handleLogout = () => {
    setUsuarioActual(null);
    localStorage.removeItem("rol");
  };

  // --- MENÚ ---
  const menuItems = [
    { path: "/", label: "Inicio", roles: ["dios", "editor", "invitado"] },
    { path: "/mapa", label: "Mapa", roles: ["dios", "editor", "invitado"] },
    { path: "/graficos", label: "Gráficos", roles: ["dios", "editor", "invitado"] },
    { path: "/estadisticas-camion", label: "Estadísticas Camión", roles: ["dios", "editor", "invitado"] },
    { path: "/comparacion-semanal", label: "Comparación Semanal", roles: ["dios", "editor", "invitado"] },
    { path: "/rutas-por-camion", label: "Rutas por Camión", roles: ["dios", "editor", "invitado"] },
    // Editor + dios
    { path: "/rutas-activas", label: "Ruta Activa", roles: ["dios", "editor"] },
    { path: "/registrar-entrega", label: "Registrar Entrega", roles: ["dios", "editor"] },
    { path: "/registrar-nuevo-punto", label: "Registrar Punto", roles: ["dios", "editor"] },
    // Solo dios
    { path: "/nueva-redistribucion", label: "Nueva Distribución", roles: ["dios"] },
    { path: "/no-entregadas", label: "No Entregadas", roles: ["dios"] },
    { path: "/mapa-redistribucion", label: "Mapa Redistribución", roles: ["dios"] },
    { path: "/editar-redistribucion", label: "Editar Redistribución", roles: ["dios"] },
    { path: "/admin-usuarios", label: "Usuarios", roles: ["dios"] }
  ];

  // --- RUTA PROTEGIDA ---
  const RutaProtegida = ({ allowedRoles, children }) =>
    allowedRoles.includes(usuarioActual.role) ? children : <Navigate to="/" replace />;

  return (
    <Router>
      <div>
        {/* ---------- MENÚ ---------- */}
        {usuarioActual && (
          <nav className="navbar">
            <ul>
              {menuItems
                .filter(item => item.roles.includes(usuarioActual.role))
                .map(item => (
                  <li key={item.path}>
                    <Link to={item.path}>{item.label}</Link>
                  </li>
                ))}
              <li style={{ float: "right" }}>
                Usuario: {usuarioActual.username} ({usuarioActual.role}){" "}
                <button onClick={handleLogout}>Cerrar sesión</button>
              </li>
            </ul>
          </nav>
        )}

        {/* ---------- RUTAS ---------- */}
        <Routes>
          {!usuarioActual && (
            <Route
              path="*"
              element={
                <LoginApp
                  onLogin={handleLogin}
                  onInvitado={handleInvitado}
                />
              }
            />
          )}
          {usuarioActual && (
            <>
              <Route path="/" element={<Inicio usuario={usuarioActual} />} />
              <Route path="/mapa" element={<Mapa usuario={usuarioActual} />} />
              <Route path="/graficos" element={<Graficos usuario={usuarioActual} />} />
              <Route path="/estadisticas-camion" element={<CamionEstadisticas usuario={usuarioActual} />} />
              <Route path="/comparacion-semanal" element={<ComparacionSemanal usuario={usuarioActual} />} />
              <Route path="/rutas-por-camion" element={<RutasPorCamion usuario={usuarioActual} />} />

              {/* EDITOR + DIOS */}
              <Route path="/rutas-activas" element={
                <RutaProtegida allowedRoles={["dios", "editor"]}>
                  <RutasActivas usuario={usuarioActual} />
                </RutaProtegida>
              } />
              <Route path="/registrar-entrega" element={
                <RutaProtegida allowedRoles={["dios", "editor"]}>
                  <RegistrarEntrega usuario={usuarioActual} />
                </RutaProtegida>
              } />
              <Route path="/registrar-nuevo-punto" element={
                <RutaProtegida allowedRoles={["dios", "editor"]}>
                  <RegistrarNuevoPunto usuario={usuarioActual} />
                </RutaProtegida>
              } />

              {/* SOLO DIOS */}
              <Route path="/nueva-redistribucion" element={
                <RutaProtegida allowedRoles={["dios"]}>
                  <NuevaDistribucion usuario={usuarioActual} />
                </RutaProtegida>
              } />
              <Route path="/no-entregadas" element={
                <RutaProtegida allowedRoles={["dios"]}>
                  <NoEntregadas usuario={usuarioActual} />
                </RutaProtegida>
              } />
              <Route path="/mapa-redistribucion" element={
                <RutaProtegida allowedRoles={["dios"]}>
                  <MapaRedistribucion usuario={usuarioActual} />
                </RutaProtegida>
              } />
              <Route path="/editar-redistribucion" element={
                <RutaProtegida allowedRoles={["dios"]}>
                  <EditarRedistribucion usuario={usuarioActual} />
                </RutaProtegida>
              } />
              <Route path="/admin-usuarios" element={
                <RutaProtegida allowedRoles={["dios"]}>
                  <AdminUsuarios
                    usuarios={usuarios}
                    setUsuarios={setUsuarios}
                  />
                </RutaProtegida>
              } />

              {/* DEFAULT: Redirigir si intenta algo raro */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          )}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
