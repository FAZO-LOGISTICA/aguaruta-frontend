// src/App.js
import React, { useEffect, useMemo, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from "react-router-dom";
import axios from "axios";

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
// Si no tienes una pantalla Auditoria, comenta la siguiente línea y la ruta.
// import Auditoria from "./Auditoria";
import LoginApp from "./LoginApp";

// ===== Permisos disponibles
const DEFAULT_PERMISOS = {
  auditoria: false,
  rutasActivas: true,
  registrarEntrega: true,
  entregas: true,
  registrarPunto: true,
  graficos: true,
  mapa: true,
  estadisticasCamion: true,
  comparacionSemanal: true,
  rutasPorCamion: true,
  noEntregadas: true,
  entregasApp: true,
};

// ===== Usuarios por defecto
const usuariosPorDefecto = [
  {
    username: "che.gustrago",
    password: "FAZO-LOGISTICA",
    role: "dios",
    permisos: Object.fromEntries(Object.keys(DEFAULT_PERMISOS).map(k => [k, true])),
  },
  {
    username: "laguna_verde",
    password: "delegacion",
    role: "editor",
    permisos: { ...DEFAULT_PERMISOS, auditoria: false },
  },
  {
    username: "operaciones",
    password: "direccion",
    role: "editor",
    permisos: { ...DEFAULT_PERMISOS, auditoria: false },
  },
];

// ===== Menú (cada item puede requerir un permiso)
const MENU = [
  { path: "/", label: "Inicio" },
  { path: "/mapa", label: "Mapa", perm: "mapa" },
  { path: "/graficos", label: "Gráficos", perm: "graficos" },
  { path: "/estadisticas-camion", label: "Estadísticas Camión", perm: "estadisticasCamion" },
  { path: "/comparacion-semanal", label: "Comparación Semanal", perm: "comparacionSemanal" },
  { path: "/rutas-por-camion", label: "Rutas por Camión", perm: "rutasPorCamion" },
  { path: "/rutas-activas", label: "Ruta Activa", perm: "rutasActivas" },
  { path: "/registrar-entrega", label: "Registrar Entrega", perm: "registrarEntrega" },
  { path: "/entregas", label: "Entregas", perm: "entregas" },
  { path: "/registrar-punto", label: "Registrar Punto", perm: "registrarPunto" },
  { path: "/no-entregadas", label: "No Entregadas", perm: "noEntregadas" },
  { path: "/entregas-app", label: "Entregas App", perm: "entregasApp" },
  { path: "/auditoria", label: "Auditoría", perm: "auditoria" },   // si no usas Auditoría, borra esta línea
  { path: "/usuarios", label: "Usuarios", onlyRole: "dios" },
];

function App() {
  // ===== Estado de sesión
  const [usuarioActual, setUsuarioActual] = useState(null);

  // ===== Usuarios (persistidos en localStorage)
  const [usuarios, setUsuarios] = useState(() => {
    try {
      const raw = localStorage.getItem("usuarios");
      return raw ? JSON.parse(raw) : usuariosPorDefecto;
    } catch {
      return usuariosPorDefecto;
    }
  });

  useEffect(() => {
    localStorage.setItem("usuarios", JSON.stringify(usuarios));
  }, [usuarios]);

  // ===== Helpers de permisos
  const isDios = (user) => user?.role === "dios";
  const can = (user, permKey) => {
    if (!permKey) return true;
    if (!user) return false;
    if (isDios(user)) return true;
    return !!user.permisos?.[permKey];
  };

  // ===== Login / Logout
  const handleLogin = (username, password, invitado = false) => {
    if (invitado) {
      const guest = { username: "Invitado", role: "invitado", permisos: {} };
      setUsuarioActual(guest);
      localStorage.setItem("usuario", guest.username);
      axios.defaults.headers.common["X-User"] = guest.username;
      return true;
    }
    const user = usuarios.find(u => u.username === username && u.password === password);
    if (user) {
      setUsuarioActual(user);
      localStorage.setItem("usuario", user.username);
      axios.defaults.headers.common["X-User"] = user.username;
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setUsuarioActual(null);
    localStorage.removeItem("usuario");
    delete axios.defaults.headers.common["X-User"];
  };

  // ===== Admin: crear / actualizar / eliminar usuarios (incluye permisos)
  const agregarUsuario = (nuevo) => {
    if (!nuevo?.username) return alert("Usuario vacío.");
    if (usuarios.some(u => u.username === nuevo.username)) return alert("Ese usuario ya existe.");
    const basePerms = nuevo.role === "dios"
      ? Object.fromEntries(Object.keys(DEFAULT_PERMISOS).map(k => [k, true]))
      : { ...DEFAULT_PERMISOS, ...nuevo.permisos };
    setUsuarios([...usuarios, { ...nuevo, permisos: basePerms }]);
  };

  const eliminarUsuario = (username) => {
    if (!window.confirm("¿Eliminar usuario?")) return;
    setUsuarios(usuarios.filter(u => u.username !== username));
  };

  const actualizarUsuario = (username, cambios = {}) => {
    setUsuarios(usuarios.map(u => (u.username === username ? { ...u, ...cambios } : u)));
  };

  // ===== Menú filtrado por permisos
  const pathname = typeof window !== "undefined" ? window.location.pathname : "/";
  const itemsMenu = useMemo(() => {
    if (!usuarioActual) return [];
    return MENU.filter(item => {
      if (item.onlyRole && usuarioActual.role !== item.onlyRole) return false;
      return can(usuarioActual, item.perm);
    });
  }, [usuarioActual, pathname]);

  // ===== Gate de rutas (si no puede ver, redirige)
  const gate = (permKey, element, onlyRole) => {
    if (!usuarioActual) return <Navigate to="/" replace />;
    if (onlyRole && usuarioActual.role !== onlyRole) return <Navigate to="/" replace />;
    if (!can(usuarioActual, permKey)) return <Navigate to="/" replace />;
    return element;
  };

  return (
    <Router>
      {usuarioActual && (
        <nav style={{ background: "#153a5e", boxShadow: "0 2px 8px #0002", padding: 0, position: "sticky", top: 0, zIndex: 100 }}>
          <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.2rem 2rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
              {itemsMenu.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  style={{
                    color: "#fff", textDecoration: "none", fontWeight: 600, fontSize: "1.12rem",
                    padding: "0.55rem 0.7rem", borderRadius: "6px",
                    background: pathname === item.path ? "#2c5482" : "transparent",
                  }}
                  onMouseOver={e => (e.target.style.background = "#20446d")}
                  onMouseOut={e => (e.target.style.background = pathname === item.path ? "#2c5482" : "transparent")}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "1.4rem" }}>
              <span style={{ color: "#fff", fontWeight: 400 }}>
                Usuario: <b>{usuarioActual.username}</b> ({usuarioActual.role})
              </span>
              <button
                onClick={handleLogout}
                style={{ padding: "0.42rem 1rem", borderRadius: "7px", border: "none", background: "#f03a4b", color: "#fff", fontWeight: 600, cursor: "pointer" }}
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
          <Route path="*" element={<LoginApp onLogin={handleLogin} onInvitado={() => handleLogin(null, null, true)} />} />
        ) : (
          <>
            <Route path="/" element={<Inicio />} />

            <Route path="/mapa" element={gate("mapa", <Mapa />)} />
            <Route path="/graficos" element={gate("graficos", <Graficos />)} />
            <Route path="/estadisticas-camion" element={gate("estadisticasCamion", <CamionEstadisticas />)} />
            <Route path="/comparacion-semanal" element={gate("comparacionSemanal", <ComparacionSemanal />)} />
            <Route path="/rutas-por-camion" element={gate("rutasPorCamion", <RutasPorCamion />)} />
            <Route path="/rutas-activas" element={gate("rutasActivas", <RutasActivas />)} />
            <Route path="/registrar-entrega" element={gate("registrarEntrega", <RegistrarEntrega />)} />
            <Route path="/entregas" element={gate("entregas", <Entregas />)} />
            <Route path="/registrar-punto" element={gate("registrarPunto", <RegistrarNuevoPunto />)} />
            <Route path="/no-entregadas" element={gate("noEntregadas", <NoEntregadas />)} />
            <Route path="/entregas-app" element={gate("entregasApp", <EntregasApp />)} />
            {/* Si no tienes Auditoría, comenta la siguiente línea */}
            {/* <Route path="/auditoria" element={gate("auditoria", <Auditoria />)} /> */}

            <Route
              path="/usuarios"
              element={gate(null,
                <AdminUsuarios
                  usuarios={usuarios}
                  setUsuarios={setUsuarios}
                  agregarUsuario={agregarUsuario}
                  eliminarUsuario={eliminarUsuario}
                  actualizarUsuario={actualizarUsuario}
                  defaultPerms={DEFAULT_PERMISOS}
                />,
                "dios"
              )}
            />
            <Route path="*" element={<Navigate to="/" />} />
          </>
        )}
      </Routes>
    </Router>
  );
}

export default App;
