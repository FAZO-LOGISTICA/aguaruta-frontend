import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from "react-router-dom";
import LoginApp from "./LoginApp";
import Mapa from "./Mapa";
import Graficos from "./Graficos";
import CamionEstadisticas from "./CamionEstadisticas";
import ComparacionSemanal from "./ComparacionSemanal";
import RutasPorCamion from "./RutasPorCamion";
// ...tus otros imports...
import AdminUsuarios from "./AdminUsuarios"; // <--- NUEVO

// Usuarios iniciales (esto puede venir de tu backend en el futuro)
const initialUsuarios = [
  { username: "che.gustrago", password: "FAZO-LOGISTICA", role: "dios" },
  { username: "laguna_verde", password: "delegacion", role: "editor" },
  { username: "operaciones", password: "direccion", role: "editor" },
];

function App() {
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [usuarios, setUsuarios] = useState(initialUsuarios);

  // -------- FUNCIONES PARA EL ADMIN --------
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
  // -----------------------------------------

  // LOGIN LOGOUT
  const handleLogin = (username, password) => {
    const found = usuarios.find(u => u.username === username && u.password === password);
    if (found) setUsuarioActual({ username: found.username, role: found.role });
    else alert("Usuario o contraseña incorrectos");
  };
  const handleInvitado = () => setUsuarioActual({ username: "invitado", role: "invitado" });
  const handleLogout = () => setUsuarioActual(null);

  // PROTECCIÓN DE RUTAS (para dios)
  const RutaProtegidaDios = ({ children }) => usuarioActual?.role === "dios"
    ? children
    : <Navigate to="/" replace />;

  return (
    <Router>
      <div>
        {/* Barra superior o menú */}
        {usuarioActual && (
          <div style={{ background: "#f6f6f6", padding: 10 }}>
            <span>
              Usuario: {usuarioActual.username}
              {"  "}({usuarioActual.role})
            </span>
            <button style={{ marginLeft: 16 }} onClick={handleLogout}>Cerrar sesión</button>
            {/* Link al panel solo si es dios */}
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
              {/* ...todas tus otras rutas... */}

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
