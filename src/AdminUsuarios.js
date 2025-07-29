// src/AdminUsuarios.js
import React, { useState } from "react";

export default function AdminUsuarios({ usuarios, setUsuarios, agregarUsuario, eliminarUsuario, cambiarContraseña }) {
  const [nuevoUsuario, setNuevoUsuario] = useState({
    username: "",
    password: "",
    role: "editor"
  });
  const [editando, setEditando] = useState(null);
  const [editData, setEditData] = useState({ username: "", password: "", role: "" });

  // Crear nuevo usuario
  const handleAgregar = (e) => {
    e.preventDefault();
    if (!nuevoUsuario.username || !nuevoUsuario.password) return;
    agregarUsuario(nuevoUsuario);
    setNuevoUsuario({ username: "", password: "", role: "editor" });
  };

  // Editar usuario existente
  const handleEditar = (usuario) => {
    setEditando(usuario.username);
    setEditData({ ...usuario, password: "" });
  };

  const handleGuardarEdicion = (e) => {
    e.preventDefault();
    cambiarContraseña(editData.username, editData.password, editData.role);
    setEditando(null);
  };

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: 24, background: "#fff", borderRadius: 8 }}>
      <h2>Administración de Usuarios</h2>
      <form onSubmit={handleAgregar} style={{ marginBottom: 24 }}>
        <h4>Crear nuevo usuario</h4>
        <input
          type="text"
          placeholder="Usuario"
          value={nuevoUsuario.username}
          onChange={e => setNuevoUsuario({ ...nuevoUsuario, username: e.target.value })}
          required
          style={{ marginRight: 8 }}
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={nuevoUsuario.password}
          onChange={e => setNuevoUsuario({ ...nuevoUsuario, password: e.target.value })}
          required
          style={{ marginRight: 8 }}
        />
        <select
          value={nuevoUsuario.role}
          onChange={e => setNuevoUsuario({ ...nuevoUsuario, role: e.target.value })}
          style={{ marginRight: 8 }}
        >
          <option value="editor">Editor</option>
          <option value="dios">Dios</option>
        </select>
        <button type="submit">Crear</button>
      </form>
      <h4>Usuarios existentes</h4>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ border: "1px solid #ddd", padding: 6 }}>Usuario</th>
            <th style={{ border: "1px solid #ddd", padding: 6 }}>Rol</th>
            <th style={{ border: "1px solid #ddd", padding: 6 }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((usuario) =>
            editando === usuario.username ? (
              <tr key={usuario.username}>
                <td style={{ border: "1px solid #ddd", padding: 6 }}>
                  <input
                    value={editData.username}
                    disabled
                    style={{ width: "90%" }}
                  />
                </td>
                <td style={{ border: "1px solid #ddd", padding: 6 }}>
                  <select
                    value={editData.role}
                    onChange={e => setEditData({ ...editData, role: e.target.value })}
                  >
                    <option value="editor">Editor</option>
                    <option value="dios">Dios</option>
                  </select>
                </td>
                <td style={{ border: "1px solid #ddd", padding: 6 }}>
                  <input
                    type="password"
                    placeholder="Nueva contraseña"
                    value={editData.password}
                    onChange={e => setEditData({ ...editData, password: e.target.value })}
                    style={{ width: "60%" }}
                  />
                  <button onClick={handleGuardarEdicion} style={{ marginLeft: 8 }}>Guardar</button>
                  <button onClick={() => setEditando(null)} style={{ marginLeft: 8 }}>Cancelar</button>
                </td>
              </tr>
            ) : (
              <tr key={usuario.username}>
                <td style={{ border: "1px solid #ddd", padding: 6 }}>{usuario.username}</td>
                <td style={{ border: "1px solid #ddd", padding: 6 }}>{usuario.role}</td>
                <td style={{ border: "1px solid #ddd", padding: 6 }}>
                  <button onClick={() => handleEditar(usuario)}>Editar</button>
                  {usuario.username !== "che.gustrago" && (
                    <button
                      onClick={() => eliminarUsuario(usuario.username)}
                      style={{ marginLeft: 8, color: "red" }}
                    >
                      Eliminar
                    </button>
                  )}
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}
