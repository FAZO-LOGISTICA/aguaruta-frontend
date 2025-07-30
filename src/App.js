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
            background: "#173A5E",
            padding: "0.7rem 2rem",
            boxShadow: "0 2px 8px #0002",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "2rem"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
            {menuItems
              .filter(item => item.roles.includes(usuarioActual.role))
              .map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  style={{
                    color: "#fff",
                    textDecoration: "none",
                    fontWeight: 500,
                    fontSize: "1.06rem",
                    padding: "0.25rem 0.6rem",
                    borderRadius: "7px",
                    transition: "background 0.2s",
                    marginRight: "0.2rem"
                  }}
                  onMouseOver={e => (e.target.style.background = "#20446d")}
                  onMouseOut={e => (e.target.style.background = "none")}
                >
                  {item.label}
                </Link>
              ))}
          </div>
          <div style={{ color: "#fff", fontWeight: 500 }}>
            Usuario: {usuarioActual.username} ({usuarioActual.role})
            <button
              onClick={handleLogout}
              style={{
                marginLeft: "1.2rem",
                padding: "0.25rem 0.85rem",
                borderRadius: "7px",
                border: "none",
                background: "#F03A4B",
                color: "#fff",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 2px 5px #0001",
                transition: "background 0.15s"
              }}
              onMouseOver={e => (e.target.style.background = "#B82637")}
              onMouseOut={e => (e.target.style.background = "#F03A4B")}
            >
              Cerrar sesión
            </button>
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
