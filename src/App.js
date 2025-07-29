import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from "react-router-dom";
import LoginApp from "./LoginApp";
import Mapa from "./Mapa";
import Graficos from "./Graficos";
import CamionEstadisticas from "./CamionEstadisticas";
import ComparacionSemanal from "./ComparacionSemanal";
import RutasPorCamion from "./RutasPorCamion";
import AdminUsuarios from "./AdminUsuarios";
// ...otros imports de tus páginas...

const initialUsuarios = [
  { username: "che.gustrago", password: "FAZO-LOGISTICA", role: "dios" },
  { username: "laguna_verde", password: "delegacion", role: "editor" },
  { username: "operaciones", password: "direccion", role: "editor" },
];

function App() {
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [usuarios, setUsuarios] = useState(initialUsuarios);

  // Admin: Agregar usuario
  const agregarUsuario = ({ username, password, role }) => {
    if (usuarios.find(u => u.username === username)) return alert("Ese usuario ya existe.");
    setUsuarios([...usuarios, { username, password, role }]);
  };

  // Admin: Eliminar usuario
  const eliminarUsuario = (username) => {
    if (window.confirm(`¿Seguro que deseas eliminar a ${username}?`))
      setUsuarios(usuarios.filter(u => u.username !== username));
  };

  // Admin: Cambiar contraseña/rol
  const cambiarContraseña = (username, newPassword, newRole) => {
    setUsuarios(usuarios.map(u =>
      u.username === username
        ? { ...u, password: newPassword || u.password, role: newRole || u.role }
        : u
    ));
  };

  // LOGIN/LOGOUT
  const handleLogin = (username, password) => {
    const found = usuarios.find(u => u.username === username && u.password === password);
    if (found) {
      setUsuarioActual({ username: found.username, role: found.role });
      return true; // Login OK
    } else {
      return false; // Login incorrecto
    }
  };

  const handleInvitado = () => setUsuarioActual({ username: "invitado", role: "invitado" });
  const handleLogout = () => setUsuarioActual(null);

  // Protege rutas de solo DIOS
  const RutaProtegidaDios = ({ children }) =>
    usuarioActual?.role === "dios" ? children : <Navigate to="/" replace />;

  return (
    <Router>
      <div>
        {/* Menú superior */}
        {usuarioActual && (
          <div style={{ background: "#f6f6f6", padding: 10 }}>
            <span>
              Usuario: {usuarioActual.username} ({usuarioActual.role})
            </span>
            <button style={{ marginLeft: 16 }} onClick={handleLogout}>Cerrar sesión</button>
            {/* Solo DIOS ve el link de admin */}
            {usuarioActual.role === "dios" && (
              <Link to="/admin-usuarios" style={{ marginLeft: 24, color: "blue" }}>
                Panel de usuarios
              </Link>
            )}
          </div>
        )}

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

          {/* RUTAS PRINCIPALES */}
          {usuarioActual && (
            <>
              <Route path="/" element={<Mapa usuario={usuarioActual} />} />
              <Route path="/mapa" element={<Mapa usuario={usuarioActual} />} />
              <Route path="/graficos" element={<Graficos usuario={usuarioActual} />} />
              <Route path="/estadisticas-camion" element={<CamionEstadisticas usuario={usuarioActual} />} />
              <Route path="/comparacion-semanal" element={<ComparacionSemanal usuario={usuarioActual} />} />
              <Route path="/rutas-por-camion" element={<RutasPorCamion usuario={usuarioActual} />} />
              {/* ...aquí pon todas tus otras rutas... */}

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
              {/* RUTA DEFAULT */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          )}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
