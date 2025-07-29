import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from "react-router-dom";
import LoginApp from "./LoginApp";
import Mapa from "./Mapa";
import Graficos from "./Graficos";
import CamionEstadisticas from "./CamionEstadisticas";
import ComparacionSemanal from "./ComparacionSemanal";
import RutasPorCamion from "./RutasPorCamion";
import AdminUsuarios from "./AdminUsuarios";
// IMPORTA aquí cualquier otra página/ruta que tengas

const initialUsuarios = [
  { username: "che.gustrago", password: "FAZO-LOGISTICA", role: "dios" },
  { username: "laguna_verde", password: "delegacion", role: "editor" },
  { username: "operaciones", password: "direccion", role: "editor" },
];

function App() {
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [usuarios, setUsuarios] = useState(initialUsuarios);

  // ---- ADMIN DE USUARIOS ----
  const agregarUsuario = ({ username, password, role }) => {
    if (usuarios.find(u => u.username === username)) return alert("Ese usuario ya existe.");
    setUsuarios([...usuarios, { username, password, role }]);
  };

  const eliminarUsuario = (username) => {
    if (window.confirm(`¿Seguro que deseas eliminar a ${username}?`))
      setUsuarios(usuarios.filter(u => u.username !== username));
  };

  const cambiarContraseña = (username, newPassword, newRole) => {
    setUsuarios(usuarios.map(u =>
      u.username === username
        ? { ...u, password: newPassword || u.password, role: newRole || u.role }
        : u
    ));
  };

  // ---- LOGIN / LOGOUT ----
  const handleLogin = (username, password) => {
    const found = usuarios.find(u => u.username === username && u.password === password);
    if (found) {
      setUsuarioActual({ username: found.username, role: found.role });
      return true; // OK
    } else {
      return false; // Error
    }
  };

  const handleInvitado = () => setUsuarioActual({ username: "invitado", role: "invitado" });
  const handleLogout = () => setUsuarioActual(null);

  // ---- MENU DINÁMICO ----
  const menuItems = [
    { path: "/", label: "Inicio", roles: ["dios", "editor", "invitado"] },
    { path: "/mapa", label: "Mapa", roles: ["dios", "editor", "invitado"] },
    { path: "/graficos", label: "Gráficos", roles: ["dios", "editor", "invitado"] },
    { path: "/estadisticas-camion", label: "Estadísticas Camión", roles: ["dios", "editor", "invitado"] },
    { path: "/comparacion-semanal", label: "Comparación Semanal", roles: ["dios", "editor", "invitado"] },
    { path: "/rutas-por-camion", label: "Rutas por Camión", roles: ["dios", "editor", "invitado"] },
    // Solo para editores y dios (puedes agregar más)
    { path: "/ruta-activa", label: "Ruta Activa", roles: ["dios", "editor"] },
    { path: "/nueva-distribucion", label: "Nueva Distribución", roles: ["dios", "editor"] },
    { path: "/registro-entrega", label: "Registro Entrega", roles: ["dios", "editor"] },
    // Solo dios
    { path: "/admin-usuarios", label: "Panel Usuarios", roles: ["dios"] },
  ];

  // ---- PROTEGER RUTAS SOLO DIOS ----
  const RutaProtegidaDios = ({ children }) =>
    usuarioActual?.role === "dios" ? children : <Navigate to="/" replace />;

  return (
    <Router>
      <div>
        {/* ----- MENÚ DE NAVEGACIÓN SEGÚN ROL ------ */}
        {usuarioActual && (
          <nav style={{
            display: "flex", gap: 16, padding: "10px 30px", background: "#eee",
            borderBottom: "1px solid #ddd", marginBottom: 24
          }}>
            {menuItems
              .filter(item => item.roles.includes(usuarioActual.role))
              .map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  style={{
                    textDecoration: "none",
                    color: "#1a237e",
                    fontWeight: "bold",
                    padding: "6px 10px",
                    borderRadius: 5
                  }}
                >
                  {item.label}
                </Link>
              ))}
            <span style={{ marginLeft: "auto" }}>
              Usuario: {usuarioActual.username} ({usuarioActual.role})
              <button style={{ marginLeft: 16 }} onClick={handleLogout}>Cerrar sesión</button>
            </span>
          </nav>
        )}

        {/* ------ RUTAS PRINCIPALES ------ */}
        <Routes>
          {/* LOGIN */}
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

          {/* SOLO USUARIO LOGUEADO VE EL RESTO */}
          {usuarioActual && (
            <>
              <Route path="/" element={<Mapa usuario={usuarioActual} />} />
              <Route path="/mapa" element={<Mapa usuario={usuarioActual} />} />
              <Route path="/graficos" element={<Graficos usuario={usuarioActual} />} />
              <Route path="/estadisticas-camion" element={<CamionEstadisticas usuario={usuarioActual} />} />
              <Route path="/comparacion-semanal" element={<ComparacionSemanal usuario={usuarioActual} />} />
              <Route path="/rutas-por-camion" element={<RutasPorCamion usuario={usuarioActual} />} />

              {/* SOLO EDITOR/DIOS */}
              <Route path="/ruta-activa" element={["dios", "editor"].includes(usuarioActual.role) ? <div>Ruta Activa</div> : <Navigate to="/" />} />
              <Route path="/nueva-distribucion" element={["dios", "editor"].includes(usuarioActual.role) ? <div>Nueva Distribución</div> : <Navigate to="/" />} />
              <Route path="/registro-entrega" element={["dios", "editor"].includes(usuarioActual.role) ? <div>Registro Entrega</div> : <Navigate to="/" />} />

              {/* PANEL ADMIN SOLO DIOS */}
              <Route
                path="/admin-usuarios"
                element={
                  <RutaProtegidaDios>
                    <AdminUsuarios
                      usuarios={usuarios}
                      setUsuarios={setUsuarios}
                      agregarUsuario={agregarUsuario}
                      eliminarUsuario={eliminarUsuario}
                      cambiarContraseña={cambiarContraseña}
                    />
                  </RutaProtegidaDios>
                }
              />
              {/* DEFAULT */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          )}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
