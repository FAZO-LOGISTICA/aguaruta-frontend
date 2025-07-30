import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from "react-router-dom";
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
import LoginApp from "./LoginApp";

// Define tus roles y rutas aquí
const menuItems = [
  { path: "/", label: "Inicio", roles: ["dios", "editor", "invitado"] },
  { path: "/mapa", label: "Mapa", roles: ["dios", "editor", "invitado"] },
  { path: "/graficos", label: "Gráficos", roles: ["dios", "editor", "invitado"] },
  { path: "/estadisticas-camion", label: "Estadísticas Camión", roles: ["dios", "editor", "invitado"] },
  { path: "/comparacion-semanal", label: "Comparación Semanal", roles: ["dios", "editor", "invitado"] },
  { path: "/rutas-por-camion", label: "Rutas por Camión", roles: ["dios", "editor", "invitado"] },
  { path: "/rutas-activas", label: "Ruta Activa", roles: ["dios", "editor"] },
  { path: "/registrar-entrega", label: "Registrar Entrega", roles: ["dios", "editor"] },
  { path: "/registrar-punto", label: "Registrar Punto", roles: ["dios", "editor"] },
  { path: "/nueva-distribucion", label: "Nueva Distribución", roles: ["dios", "editor"] },
  { path: "/no-entregadas", label: "No Entregadas", roles: ["dios", "editor"] },
  { path: "/mapa-redistribucion", label: "Mapa Redistribución", roles: ["dios"] },
  { path: "/editar-redistribucion", label: "Editar Redistribución", roles: ["dios"] },
  { path: "/usuarios", label: "Usuarios", roles: ["dios"] }
];

// Usuarios de ejemplo
const usuariosEjemplo = [
  { username: "che.gustrago", password: "FAZO-LOGISTICA", role: "dios" },
  { username: "laguna_verde", password: "delegacion", role: "editor" },
  { username: "operaciones", password: "direccion", role: "editor" }
];

function App() {
  const [usuarioActual, setUsuarioActual] = useState(null);

  const handleLogin = (username, password, invitado = false) => {
    if (invitado) {
      setUsuarioActual({ username: "Invitado", role: "invitado" });
      return true;
    }
    const user = usuariosEjemplo.find(
      (u) => u.username === username && u.password === password
    );
    if (user) {
      setUsuarioActual(user);
      return true;
    }
    return false;
  };

  const handleLogout = () => setUsuarioActual(null);

  return (
    <Router>
      {usuarioActual && (
        <nav
  style={{
    background: "#153a5e",
    boxShadow: "0 2px 8px #0002",
    padding: 0,
    position: "sticky",
    top: 0,
    zIndex: 100,
  }}
>
  <div
    style={{
      maxWidth: 1400,
      margin: "0 auto",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0.2rem 2rem",
      flexWrap: "wrap"
    }}
  >
    <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
      {menuItems
        .filter((item) => item.roles.includes(usuarioActual.role))
        .map((item) => (
          <Link
            key={item.path}
            to={item.path}
            style={{
              color: "#fff",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: "1.12rem",
              padding: "0.55rem 0.7rem",
              borderRadius: "6px",
              transition: "background 0.2s",
              background: window.location.pathname === item.path ? "#2c5482" : "transparent",
              margin: 0,
              display: "block"
            }}
            onMouseOver={(e) => (e.target.style.background = "#20446d")}
            onMouseOut={(e) =>
              (e.target.style.background =
                window.location.pathname === item.path ? "#2c5482" : "transparent")
            }
          >
            {item.label}
          </Link>
        ))}
    </div>
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "1.4rem"
      }}
    >
      <span style={{ color: "#fff", fontWeight: 400 }}>
        Usuario: <b>{usuarioActual.username}</b> ({usuarioActual.role})
      </span>
      <button
        onClick={handleLogout}
        style={{
          padding: "0.42rem 1rem",
          borderRadius: "7px",
          border: "none",
          background: "#f03a4b",
          color: "#fff",
          fontWeight: 600,
          fontSize: "1rem",
          cursor: "pointer",
          boxShadow: "0 2px 5px #0001",
          transition: "background 0.15s"
        }}
        onMouseOver={e => (e.target.style.background = "#B82637")}
        onMouseOut={e => (e.target.style.background = "#f03a4b")}
      >
        Cerrar sesión
      </button>
    </div>
  </div>
</nav>
      )}

      <Routes>
        {!usuarioActual ? (
          <Route path="*" element={<LoginApp onLogin={handleLogin} />} />
        ) : (
          <>
            <Route path="/" element={<Inicio />} />
            <Route path="/mapa" element={<Mapa />} />
            <Route path="/graficos" element={<Graficos />} />
            <Route path="/estadisticas-camion" element={<CamionEstadisticas />} />
            <Route path="/comparacion-semanal" element={<ComparacionSemanal />} />
            <Route path="/rutas-por-camion" element={<RutasPorCamion />} />
            <Route path="/rutas-activas" element={<RutasActivas />} />
            <Route path="/registrar-entrega" element={<RegistrarEntrega />} />
            <Route path="/registrar-punto" element={<RegistrarNuevoPunto />} />
            <Route path="/nueva-distribucion" element={<NuevaDistribucion />} />
            <Route path="/no-entregadas" element={<NoEntregadas />} />
            <Route path="/mapa-redistribucion" element={<MapaRedistribucion />} />
            <Route path="/editar-redistribucion" element={<EditarRedistribucion />} />
            <Route path="/usuarios" element={<AdminUsuarios />} />
            <Route path="*" element={<Navigate to="/" />} />
          </>
        )}
      </Routes>
    </Router>
  );
}

export default App;
