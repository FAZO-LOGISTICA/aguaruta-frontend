// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate } from "react-router-dom";

import Inicio from "./Inicio";
import Mapa from "./Mapa";
import Graficos from "./Graficos";
import CamionEstadisticas from "./CamionEstadisticas";
import ComparacionSemanal from "./ComparacionSemanal";
import RutasPorCamion from "./RutasPorCamion";
import RutasActivas from "./RutasActivas";
import RegistrarEntrega from "./RegistrarEntrega";
import RegistrarNuevoPunto from "./RegistrarNuevoPunto";
import NoEntregadas from "./NoEntregadas";
import EntregasApp from "./EntregasApp";
import Entregas from "./Entregas";
import AdminUsuarios from "./AdminUsuarios";
import LoginApp from "./LoginApp";
import Auditoria from "./Auditoria";

// ================= USUARIOS =================

const usuariosEjemplo = [
  { username: "che.gustrago", password: "", role: "dios" },  // sin contraseña = acceso directo
  { username: "laguna_verde", password: "delegacion", role: "editor" },
  { username: "operaciones", password: "direccion", role: "editor" }
];

// ================= MENÚ =================

const menuItems = [
  { path: "/", label: "Inicio", roles: ["dios", "editor", "invitado"] },
  { path: "/mapa", label: "Mapa", roles: ["dios", "editor", "invitado"] },
  { path: "/graficos", label: "Gráficos", roles: ["dios", "editor", "invitado"] },
  { path: "/estadisticas-camion", label: "Estadísticas Camión", roles: ["dios", "editor", "invitado"] },
  { path: "/comparacion-semanal", label: "Comparación Semanal", roles: ["dios", "editor", "invitado"] },
  { path: "/rutas-por-camion", label: "Rutas por Camión", roles: ["dios", "editor", "invitado"] },
  { path: "/rutas-activas", label: "Ruta Activa", roles: ["dios", "editor"] },
  { path: "/registrar-entrega", label: "Registrar Entrega", roles: ["dios", "editor"] },
  { path: "/entregas", label: "Entregas", roles: ["dios", "editor"] },
  { path: "/registrar-punto", label: "Registrar Punto", roles: ["dios", "editor"] },
  { path: "/no-entregadas", label: "No Entregadas", roles: ["dios", "editor"] },
  { path: "/entregas-app", label: "Entregas App", roles: ["dios", "editor"] },
  { path: "/auditoria", label: "Auditoría", roles: ["dios"] },
  { path: "/usuarios", label: "Usuarios", roles: ["dios"] }
];

// ================= CONTROL EXTERNO (iframe) =================

function ControladorExterno({ children, usuarioActual }) {
  const navigate = useNavigate();

  useEffect(() => {
    const handleMessage = (event) => {
      if (
        event.origin !== "https://fazo-logistica-aura.netlify.app" &&
        event.origin !== "http://localhost:3000"
      ) return;

      if (!usuarioActual) return;

      const { type, target } = event.data;
      console.log("📩 Comando recibido desde FAZO:", event.data);

      if (type === "GO_TO" && target) {
        navigate(target);
      }

      if (type === "DESCARGAR_GRAFICOS_PDF") {
        const boton = document.querySelector("#btnDescargarPDF");
        if (boton) boton.click();
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [navigate, usuarioActual]);

  return children;
}

// ================= APP =================

function App() {
  const [usuarioActual, setUsuarioActual] = useState(() => {
    // Auto-login: restaurar sesión guardada
    try {
      const saved = localStorage.getItem("aura_session");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [usuarios, setUsuarios] = useState(usuariosEjemplo);

  const handleLogin = (username, password, invitado = false) => {
    if (invitado) {
      const u = { username: "Invitado", role: "invitado" };
      setUsuarioActual(u);
      return true;
    }

    // Si password está vacío en el usuario, solo verifica username
    const user = usuarios.find(u =>
      u.username === username &&
      (u.password === "" || u.password === password)
    );

    if (user) {
      setUsuarioActual(user);
      try { localStorage.setItem("aura_session", JSON.stringify(user)); } catch {}
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setUsuarioActual(null);
    try { localStorage.removeItem("aura_session"); } catch {}
  };

  return (
    <Router>
      {usuarioActual && (
        <nav style={{ background: "#153a5e", padding: "0.2rem 2rem", position: "sticky", top: 0, zIndex: 100 }}>
          {menuItems
            .filter(item => item.roles.includes(usuarioActual.role))
            .map(item => (
              <Link key={item.path} to={item.path}
                style={{ color: "#fff", marginRight: "1rem", textDecoration: "none" }}>
                {item.label}
              </Link>
            ))}
          <button onClick={handleLogout} style={{ marginLeft: "1rem" }}>
            Cerrar sesión
          </button>
        </nav>
      )}

      <Routes>
        {!usuarioActual ? (
          <Route path="*" element={
            <LoginApp
              onLogin={handleLogin}
              onInvitado={() => handleLogin("", "", true)}
            />
          } />
        ) : (
          <Route
            path="*"
            element={
              <ControladorExterno usuarioActual={usuarioActual}>
                <Routes>
                  <Route path="/" element={<Inicio />} />
                  <Route path="/mapa" element={<Mapa />} />
                  <Route path="/graficos" element={<Graficos />} />
                  <Route path="/estadisticas-camion" element={<CamionEstadisticas />} />
                  <Route path="/comparacion-semanal" element={<ComparacionSemanal />} />
                  <Route path="/rutas-por-camion" element={<RutasPorCamion />} />
                  <Route path="/rutas-activas" element={<RutasActivas />} />
                  <Route path="/registrar-entrega" element={<RegistrarEntrega />} />
                  <Route path="/entregas" element={<Entregas />} />
                  <Route path="/registrar-punto" element={<RegistrarNuevoPunto />} />
                  <Route path="/no-entregadas" element={<NoEntregadas />} />
                  <Route path="/entregas-app" element={<EntregasApp />} />
                  <Route path="/auditoria" element={<Auditoria />} />
                  <Route path="/usuarios" element={
                    <AdminUsuarios usuarios={usuarios} setUsuarios={setUsuarios} />
                  } />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </ControladorExterno>
            }
          />
        )}
      </Routes>
    </Router>
  );
}

export default App;
