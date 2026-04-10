// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate, useLocation } from "react-router-dom";

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
import EntregaMovil from "./EntregaMovil";
import Pagos from "./Pagos";
import CierreMes from "./CierreMes";
import "./estilos/Inicio.css";
import "./App.css";

const API_URL = process.env.REACT_APP_API_URL || "https://aguaruta-backend.onrender.com";

const USUARIO_MAESTRO = { username: "che.gustrago", password: "", role: "dios" };

const usuariosLocales = [
  USUARIO_MAESTRO,
  { username: "laguna_verde", password: "delegacion", role: "editor" },
  { username: "operaciones",  password: "direccion",  role: "editor" },
];

const menuItems = [
  { path: "/",                    label: "Inicio",            roles: ["dios","editor","invitado"] },
  { path: "/mapa",                label: "Mapa",              roles: ["dios","editor","invitado"] },
  { path: "/graficos",            label: "Gráficos",          roles: ["dios","editor","invitado"] },
  { path: "/estadisticas-camion", label: "Est. Camión",       roles: ["dios","editor","invitado"] },
  { path: "/comparacion-semanal", label: "Comparación",       roles: ["dios","editor","invitado"] },
  { path: "/rutas-por-camion",    label: "Rutas Camión",      roles: ["dios","editor","invitado"] },
  { path: "/rutas-activas",       label: "Ruta Activa",       roles: ["dios","editor"] },
  { path: "/registrar-entrega",   label: "Registrar Entrega", roles: ["dios","editor"] },
  { path: "/entregas",            label: "Entregas",          roles: ["dios","editor"] },
  { path: "/registrar-punto",     label: "Nuevo Punto",       roles: ["dios","editor"] },
  { path: "/no-entregadas",       label: "No Entregadas",     roles: ["dios","editor"] },
  { path: "/entregas-app",        label: "Entregas App",      roles: ["dios","editor"] },
  { path: "/pagos",               label: "💰 Pagos",          roles: ["dios","editor"] },
  { path: "/cierre-mes",          label: "📅 Cierre Mes",     roles: ["dios"] },
  { path: "/auditoria",           label: "Auditoría",         roles: ["dios"] },
  { path: "/usuarios",            label: "Usuarios",          roles: ["dios"] },
];

// ── Navbar ──
function Navbar({ usuarioActual, onLogout }) {
  const location = useLocation();

  const itemsVisibles = menuItems.filter(item => {
    if (!item.roles.includes(usuarioActual.role)) return false;
    if (usuarioActual.role === "dios") return true;
    if (usuarioActual.permisos && Array.isArray(usuarioActual.permisos)) {
      return usuarioActual.permisos.includes(item.path);
    }
    return true;
  });

  return (
    <nav className="navbar-aguaruta">
      <Link to="/" className="navbar-brand">
        <span className="navbar-brand-icon">💧</span>
        <span className="navbar-brand-name">AguaRuta</span>
      </Link>
      <div className="navbar-links">
        {itemsVisibles.map(item => (
          <Link key={item.path} to={item.path}
            className={`navbar-link${location.pathname === item.path ? " active" : ""}`}>
            {item.label}
          </Link>
        ))}
      </div>
      <button onClick={onLogout} className="navbar-logout">Cerrar sesión</button>
    </nav>
  );
}

// ── Controlador externo ──
function ControladorExterno({ children, usuarioActual }) {
  const navigate = useNavigate();
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.origin !== "https://fazo-logistica-aura.netlify.app" && event.origin !== "http://localhost:3000") return;
      if (!usuarioActual) return;
      const { type, target } = event.data;
      if (type === "GO_TO" && target) navigate(target);
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

// ── App ──
function App() {
  const [usuarioActual, setUsuarioActual] = useState(() => {
    try {
      const saved = localStorage.getItem("aura_session");
      if (saved) return JSON.parse(saved);
    } catch {}
    try { localStorage.setItem("aura_session", JSON.stringify(USUARIO_MAESTRO)); } catch {}
    return USUARIO_MAESTRO;
  });

  const handleLogin = async (username, password, invitado = false) => {
    if (invitado) {
      const u = { username: "Invitado", role: "invitado" };
      setUsuarioActual(u);
      return true;
    }

    // 1. Verificar usuarios locales (maestro + hardcodeados)
    const userLocal = usuariosLocales.find(u =>
      u.username === username && (u.password === "" || u.password === password)
    );
    if (userLocal) {
      setUsuarioActual(userLocal);
      try { localStorage.setItem("aura_session", JSON.stringify(userLocal)); } catch {}
      return true;
    }

    // 2. Verificar en base de datos
    try {
      const res = await fetch(`${API_URL}/login-usuario`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario: username, password }),
      });
      if (res.ok) {
        const data = await res.json();
        const u = {
          username: data.usuario,
          role: data.rol,
          permisos: data.permisos || null,
        };
        setUsuarioActual(u);
        try { localStorage.setItem("aura_session", JSON.stringify(u)); } catch {}
        return true;
      }
    } catch {}

    return false;
  };

  const handleLogout = () => {
    setUsuarioActual(null);
    try { localStorage.removeItem("aura_session"); } catch {}
  };

  return (
    <Router>
      <Routes>
        <Route path="/movil" element={<EntregaMovil />} />
        <Route path="*" element={
          <>
            {usuarioActual && <Navbar usuarioActual={usuarioActual} onLogout={handleLogout} />}
            <Routes>
              {!usuarioActual ? (
                <Route path="*" element={
                  <LoginApp onLogin={handleLogin} onInvitado={() => handleLogin("","",true)} />
                } />
              ) : (
                <Route path="*" element={
                  <ControladorExterno usuarioActual={usuarioActual}>
                    <Routes>
                      <Route path="/"                    element={<Inicio />} />
                      <Route path="/mapa"                element={<Mapa />} />
                      <Route path="/graficos"            element={<Graficos />} />
                      <Route path="/estadisticas-camion" element={<CamionEstadisticas />} />
                      <Route path="/comparacion-semanal" element={<ComparacionSemanal />} />
                      <Route path="/rutas-por-camion"    element={<RutasPorCamion />} />
                      <Route path="/rutas-activas"       element={<RutasActivas />} />
                      <Route path="/registrar-entrega"   element={<RegistrarEntrega />} />
                      <Route path="/entregas"            element={<Entregas />} />
                      <Route path="/registrar-punto"     element={<RegistrarNuevoPunto />} />
                      <Route path="/no-entregadas"       element={<NoEntregadas />} />
                      <Route path="/entregas-app"        element={<EntregasApp />} />
                      <Route path="/pagos"               element={<Pagos />} />
                      <Route path="/cierre-mes"          element={<CierreMes />} />
                      <Route path="/auditoria"           element={<Auditoria />} />
                      <Route path="/usuarios"            element={<AdminUsuarios />} />
                      <Route path="*"                    element={<Navigate to="/" />} />
                    </Routes>
                  </ControladorExterno>
                } />
              )}
            </Routes>
          </>
        } />
      </Routes>
    </Router>
  );
}

export default App;
