// src/App.js
import React, { useEffect, useMemo, useState } from "react";
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
import NoEntregadas from "./NoEntregadas";
import EntregasApp from "./EntregasApp";
import Entregas from "./Entregas";
import AdminUsuarios from "./AdminUsuarios";
import LoginApp from "./LoginApp";

// ---- helpers storage
const LS_KEY = "usuarios";
const loadUsers = () => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
const saveUsers = (arr) => {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(arr));
  } catch {}
};

// permisos por defecto (mismo set que AdminUsuarios)
const PERM_KEYS = [
  "auditoria",
  "rutasActivas",
  "registrarEntrega",
  "entregas",
  "registrarPunto",
  "graficos",
  "mapa",
  "estadisticasCamion",
  "comparacionSemanal",
  "rutasPorCamion",
  "noEntregadas",
  "entregasApp",
];
const defaultPerms = (role) => {
  const base = Object.fromEntries(PERM_KEYS.map((k) => [k, false]));
  if (role === "dios") return Object.fromEntries(PERM_KEYS.map((k) => [k, true]));
  if (role === "editor")
    return {
      ...base,
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
  // invitado
  return { ...base, mapa: true, graficos: true, estadisticasCamion: true, comparacionSemanal: true };
};

// usuarios semilla si no hay nada guardado
const seedUsers = [
  { username: "che.gustrago", password: "FAZO-LOGISTICA", role: "dios", permisos: defaultPerms("dios") },
  { username: "laguna_verde", password: "delegacion", role: "editor", permisos: defaultPerms("editor") },
  { username: "operaciones", password: "direccion", role: "editor", permisos: defaultPerms("editor") },
];

// Menú con clave de permiso por ítem (permKey)
const menuItems = [
  { path: "/", label: "Inicio", roles: ["dios", "editor", "invitado"] },
  { path: "/mapa", label: "Mapa", roles: ["dios", "editor", "invitado"], permKey: "mapa" },
  { path: "/graficos", label: "Gráficos", roles: ["dios", "editor", "invitado"], permKey: "graficos" },
  { path: "/estadisticas-camion", label: "Estadísticas Camión", roles: ["dios", "editor", "invitado"], permKey: "estadisticasCamion" },
  { path: "/comparacion-semanal", label: "Comparación Semanal", roles: ["dios", "editor", "invitado"], permKey: "comparacionSemanal" },
  { path: "/rutas-por-camion", label: "Rutas por Camión", roles: ["dios", "editor", "invitado"], permKey: "rutasPorCamion" },
  { path: "/rutas-activas", label: "Ruta Activa", roles: ["dios", "editor"], permKey: "rutasActivas" },
  { path: "/registrar-entrega", label: "Registrar Entrega", roles: ["dios", "editor"], permKey: "registrarEntrega" },
  { path: "/entregas", label: "Entregas", roles: ["dios", "editor"], permKey: "entregas" },
  { path: "/registrar-punto", label: "Registrar Punto", roles: ["dios", "editor"], permKey: "registrarPunto" },
  { path: "/no-entregadas", label: "No Entregadas", roles: ["dios", "editor"], permKey: "noEntregadas" },
  { path: "/entregas-app", label: "Entregas App", roles: ["dios", "editor"], permKey: "entregasApp" },
  // Usuarios solo “dios”
  { path: "/usuarios", label: "Usuarios", roles: ["dios"] },
];

function App() {
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [usuarios, setUsuarios] = useState(() => loadUsers() || seedUsers);

  // persiste siempre que cambie
  useEffect(() => {
    saveUsers(usuarios);
  }, [usuarios]);

  const handleLogin = (username, password, invitado = false) => {
    if (invitado) {
      setUsuarioActual({ username: "Invitado", role: "invitado", permisos: defaultPerms("invitado") });
      return true;
    }
    const user = usuarios.find((u) => u.username === username && u.password === password);
    if (user) {
      setUsuarioActual(user);
      return true;
    }
    return false;
  };

  const handleLogout = () => setUsuarioActual(null);

  const agregarUsuario = (nuevo) => {
    if (usuarios.find((u) => u.username === nuevo.username)) return alert("Ese usuario ya existe.");
    setUsuarios([...usuarios, nuevo]);
  };
  const eliminarUsuario = (username) => {
    if (window.confirm("¿Eliminar usuario?")) {
      setUsuarios(usuarios.filter((u) => u.username !== username));
    }
  };
  const cambiarContraseña = (username, password, role) => {
    setUsuarios(
      usuarios.map((u) =>
        u.username === username ? { ...u, password: password || u.password, role: role || u.role } : u
      )
    );
  };

  const pathname = typeof window !== "undefined" ? window.location.pathname : "/";
  const menuVisible = useMemo(() => {
    if (!usuarioActual) return [];
    return menuItems.filter((item) => {
      if (!item.roles.includes(usuarioActual.role)) return false;
      if (!item.permKey) return true; // “Usuarios” no tiene permKey
      // dios siempre ve todo
      if (usuarioActual.role === "dios") return true;
      return !!usuarioActual.permisos?.[item.permKey];
    });
  }, [usuarioActual]);

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
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
              {menuVisible.map((item) => (
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
                    background: pathname === item.path ? "#2c5482" : "transparent",
                  }}
                  onMouseOver={(e) => (e.target.style.background = "#20446d")}
                  onMouseOut={(e) =>
                    (e.target.style.background = pathname === item.path ? "#2c5482" : "transparent")
                  }
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
                style={{
                  padding: "0.42rem 1rem",
                  borderRadius: "7px",
                  border: "none",
                  background: "#f03a4b",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
                onMouseOver={(e) => (e.target.style.background = "#B82637")}
                onMouseOut={(e) => (e.target.style.background = "#f03a4b")}
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </nav>
      )}

      <Routes>
        {!usuarioActual ? (
          <Route
            path="*"
            element={<LoginApp onLogin={handleLogin} onInvitado={() => handleLogin(null, null, true)} />}
          />
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
            <Route path="/entregas" element={<Entregas />} />
            <Route path="/registrar-punto" element={<RegistrarNuevoPunto />} />
            <Route path="/no-entregadas" element={<NoEntregadas />} />
            <Route path="/entregas-app" element={<EntregasApp />} />
            <Route
              path="/usuarios"
              element={
                usuarioActual.role === "dios" ? (
                  <AdminUsuarios
                    usuarios={usuarios}
                    setUsuarios={setUsuarios}
                    agregarUsuario={agregarUsuario}
                    eliminarUsuario={eliminarUsuario}
                    cambiarContraseña={cambiarContraseña}
                  />
                ) : (
                  <Navigate to="/" />
                )
              }
            />
            <Route path="*" element={<Navigate to="/" />} />
          </>
        )}
      </Routes>
    </Router>
  );
}

export default App;
