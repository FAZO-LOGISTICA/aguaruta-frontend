// src/AdminUsuarios.js
import React, { useState } from 'react';

export default function AdminUsuarios({
  usuarios,
  setUsuarios,
  agregarUsuario,
  eliminarUsuario,
  cambiarContraseña
}) {
  const [nuevoUsuario, setNuevoUsuario] = useState({
    username: "",
    password: "",
    role: "editor"
  });
  const [mostrarPassNuevo, setMostrarPassNuevo] = useState(false);

  const [editando, setEditando] = useState(null);
  const [editData, setEditData] = useState({ username: "", password: "", role: "" });
  const [mostrarPassEdit, setMostrarPassEdit] = useState(false);

  // Crear nuevo usuario
  const handleAgregar = (e) => {
    e.preventDefault();
    if (!nuevoUsuario.username || !nuevoUsuario.password) return;
    agregarUsuario(nuevoUsuario);
    setNuevoUsuario({ username: "", password: "", role: "editor" });
    setMostrarPassNuevo(false);
  };

  // Editar usuario existente
  const handleEditar = (usuario) => {
    setEditando(usuario.username);
    setEditData({ ...usuario, password: "" }); // no prellenar contraseñas
    setMostrarPassEdit(false);
  };

  const handleGuardarEdicion = (e) => {
    e.preventDefault();
    cambiarContraseña(editData.username, editData.password, editData.role);
    setEditando(null);
    setMostrarPassEdit(false);
  };

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", padding: 24, background: "#fff", borderRadius: 8, boxShadow: "0 2px 12px #0001" }}>
      <h2 style={{ marginTop: 0 }}>Administración de Usuarios</h2>

      {/* Crear nuevo usuario */}
      <form onSubmit={handleAgregar} autoComplete="on" style={{ marginBottom: 24 }}>
        <h4>Crear nuevo usuario</h4>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: "1 1 180px" }}>
            <label htmlFor="nuevo-username" style={{ display: "block", marginBottom: 4 }}>Usuario</label>
            <input
              id="nuevo-username"
              name="username"
              type="text"
              placeholder="Usuario"
              value={nuevoUsuario.username}
              onChange={e => setNuevoUsuario({ ...nuevoUsuario, username: e.target.value })}
              required
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ddd" }}
            />
          </div>

          <div style={{ flex: "1 1 220px", position: "relative" }}>
            <label htmlFor="nuevo-password" style={{ display: "block", marginBottom: 4 }}>Contraseña</label>
            <input
              id="nuevo-password"
              name="new-password"
              type={mostrarPassNuevo ? "text" : "password"}
              placeholder="Contraseña"
              value={nuevoUsuario.password}
              onChange={e => setNuevoUsuario({ ...nuevoUsuario, password: e.target.value })}
              required
              autoComplete="new-password"
              style={{ width: "100%", padding: "8px 70px 8px 8px", borderRadius: 6, border: "1px solid #ddd" }}
            />
            <button
              type="button"
              onClick={() => setMostrarPassNuevo(v => !v)}
              title={mostrarPassNuevo ? "Ocultar contraseña" : "Mostrar contraseña"}
              style={{
                position: "absolute", right: 6, top: 28,
                padding: "6px 10px", borderRadius: 6, border: "1px solid #ccc",
                background: "#eee", cursor: "pointer", fontSize: 12
              }}
            >
              {mostrarPassNuevo ? "Ocultar" : "Ver"}
            </button>
          </div>

          <div style={{ flex: "0 0 150px" }}>
            <label htmlFor="nuevo-rol" style={{ display: "block", marginBottom: 4 }}>Rol</label>
            <select
              id="nuevo-rol"
              value={nuevoUsuario.role}
              onChange={e => setNuevoUsuario({ ...nuevoUsuario, role: e.target.value })}
              style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ddd" }}
            >
              <option value="editor">Editor</option>
              <option value="dios">Dios</option>
            </select>
          </div>

          <div style={{ flex: "0 0 auto", alignSelf: "end" }}>
            <button type="submit" style={{ padding: "10px 16px", borderRadius: 6, border: "none", background: "#2563eb", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
              Crear
            </button>
          </div>
        </div>
      </form>

      {/* Usuarios existentes */}
      <h4 style={{ marginTop: 0 }}>Usuarios existentes</h4>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ border: "1px solid #eee", padding: 8, textAlign: "left" }}>Usuario</th>
            <th style={{ border: "1px solid #eee", padding: 8, textAlign: "left" }}>Rol</th>
            <th style={{ border: "1px solid #eee", padding: 8, textAlign: "left" }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((usuario) =>
            editando === usuario.username ? (
              <tr key={usuario.username}>
                <td style={{ border: "1px solid #f3f3f3", padding: 8 }}>
                  <input
                    value={editData.username}
                    disabled
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ddd", background: "#f9f9f9" }}
                    aria-label="Usuario (no editable)"
                  />
                </td>
                <td style={{ border: "1px solid #f3f3f3", padding: 8 }}>
                  <select
                    value={editData.role}
                    onChange={e => setEditData({ ...editData, role: e.target.value })}
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ddd" }}
                  >
                    <option value="editor">Editor</option>
                    <option value="dios">Dios</option>
                  </select>
                </td>
                <td style={{ border: "1px solid #f3f3f3", padding: 8 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <div style={{ flex: "1 1 auto", position: "relative" }}>
                      <input
                        id="editar-password"
                        name="new-password"
                        type={mostrarPassEdit ? "text" : "password"}
                        placeholder="Nueva contraseña"
                        value={editData.password}
                        onChange={e => setEditData({ ...editData, password: e.target.value })}
                        autoComplete="new-password"
                        style={{ width: "100%", padding: "8px 70px 8px 8px", borderRadius: 6, border: "1px solid #ddd" }}
                      />
                      <button
                        type="button"
                        onClick={() => setMostrarPassEdit(v => !v)}
                        title={mostrarPassEdit ? "Ocultar contraseña" : "Mostrar contraseña"}
                        style={{
                          position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
                          padding: "6px 10px", borderRadius: 6, border: "1px solid #ccc",
                          background: "#eee", cursor: "pointer", fontSize: 12
                        }}
                      >
                        {mostrarPassEdit ? "Ocultar" : "Ver"}
                      </button>
                    </div>

                    <button
                      onClick={handleGuardarEdicion}
                      style={{ padding: "8px 12px", borderRadius: 6, border: "none", background: "#16a34a", color: "#fff", fontWeight: 600, cursor: "pointer" }}
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => setEditando(null)}
                      style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #ccc", background: "#fff", cursor: "pointer" }}
                    >
                      Cancelar
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              <tr key={usuario.username}>
                <td style={{ border: "1px solid #f3f3f3", padding: 8 }}>{usuario.username}</td>
                <td style={{ border: "1px solid #f3f3f3", padding: 8 }}>{usuario.role}</td>
                <td style={{ border: "1px solid #f3f3f3", padding: 8 }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => handleEditar(usuario)}
                      style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #ccc", background: "#fff", cursor: "pointer" }}
                    >
                      Editar
                    </button>
                    {usuario.username !== "che.gustrago" && (
                      <button
                        onClick={() => eliminarUsuario(usuario.username)}
                        style={{ padding: "8px 12px", borderRadius: 6, border: "none", background: "#ef4444", color: "#fff", cursor: "pointer" }}
                        title="Eliminar usuario"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}
