// src/AdminUsuarios.js
import React, { useMemo, useState } from "react";

export default function AdminUsuarios({
  usuarios,
  setUsuarios,
  agregarUsuario,
  eliminarUsuario,
  actualizarUsuario,
  defaultPerms = {},
}) {
  const [nuevo, setNuevo] = useState({
    username: "",
    password: "",
    role: "editor",
    permisos: defaultPerms,
    mostrarPass: false,
  });

  const permisosKeys = useMemo(() => Object.keys(defaultPerms), [defaultPerms]);

  const onCrear = () => {
    const username = (nuevo.username || "").trim();
    const password = (nuevo.password || "").trim();
    if (!username || !password) return alert("Usuario y contraseña son obligatorios.");

    const basePerms =
      nuevo.role === "dios"
        ? Object.fromEntries(permisosKeys.map(k => [k, true]))
        : { ...defaultPerms, ...nuevo.permisos };

    agregarUsuario({
      username,
      password,
      role: nuevo.role,
      permisos: basePerms,
    });

    setNuevo({
      username: "",
      password: "",
      role: "editor",
      permisos: defaultPerms,
      mostrarPass: false,
    });
  };

  const togglePermUser = (u, key) => {
    const next = { ...u, permisos: { ...u.permisos, [key]: !u.permisos?.[key] } };
    actualizarUsuario(u.username, next);
  };

  const changeRole = (u, role) => {
    let perms = { ...u.permisos };
    if (role === "dios") {
      perms = Object.fromEntries(permisosKeys.map(k => [k, true]));
    }
    actualizarUsuario(u.username, { role, permisos: perms });
  };

  return (
    <div className="main-container fade-in" style={{ maxWidth: 900, margin: "0 auto" }}>
      <h2 className="titulo">Administración de Usuarios</h2>

      {/* Crear nuevo */}
      <div style={{ background: "#fff", padding: 16, borderRadius: 8, boxShadow: "0 2px 12px #0001", marginBottom: 16 }}>
        <h3 className="subtitulo" style={{ marginTop: 0 }}>Crear nuevo usuario</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 160px 120px", gap: 10, alignItems: "center" }}>
          <input
            placeholder="Usuario"
            value={nuevo.username}
            onChange={(e) => setNuevo((n) => ({ ...n, username: e.target.value }))}
          />
          <div style={{ display: "flex", gap: 6 }}>
            <input
              placeholder="Contraseña"
              type={nuevo.mostrarPass ? "text" : "password"}
              value={nuevo.password}
              onChange={(e) => setNuevo((n) => ({ ...n, password: e.target.value }))}
              style={{ flex: 1 }}
            />
            <button type="button" onClick={() => setNuevo(n => ({ ...n, mostrarPass: !n.mostrarPass }))}>
              {nuevo.mostrarPass ? "Ocultar" : "Ver"}
            </button>
          </div>
          <select
            value={nuevo.role}
            onChange={(e) => setNuevo(n => ({ ...n, role: e.target.value }))}
          >
            <option value="editor">Editor</option>
            <option value="dios">Dios</option>
            <option value="invitado">Invitado</option>
          </select>
          <button onClick={onCrear}>Crear</button>
        </div>

        {/* Permisos por defecto para el nuevo (sólo cuando no sea dios) */}
        {nuevo.role !== "dios" && (
          <div style={{ marginTop: 10 }}>
            <small style={{ display: "block", marginBottom: 6, opacity: 0.8 }}>
              Permisos por defecto para este usuario:
            </small>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {permisosKeys.map((key) => (
                <label key={key} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={!!nuevo.permisos?.[key]}
                    onChange={() =>
                      setNuevo(n => ({ ...n, permisos: { ...n.permisos, [key]: !n.permisos?.[key] } }))
                    }
                  />
                  {key}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Listado */}
      <div style={{ background: "#fff", padding: 16, borderRadius: 8, boxShadow: "0 2px 12px #0001" }}>
        <h3 className="subtitulo" style={{ marginTop: 0 }}>Usuarios existentes</h3>

        <table className="tabla">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Rol</th>
              <th>Permisos</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.username}>
                <td>{u.username}</td>
                <td>
                  <select
                    value={u.role}
                    onChange={(e) => changeRole(u, e.target.value)}
                  >
                    <option value="editor">Editor</option>
                    <option value="dios">Dios</option>
                    <option value="invitado">Invitado</option>
                  </select>
                </td>
                <td style={{ textAlign: "left" }}>
                  {u.role === "dios" ? (
                    <i>Tiene todos los permisos</i>
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                      {permisosKeys.map((key) => (
                        <label key={key} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <input
                            type="checkbox"
                            checked={!!u.permisos?.[key]}
                            onChange={() => togglePermUser(u, key)}
                          />
                          {key}
                        </label>
                      ))}
                    </div>
                  )}
                </td>
                <td>
                  {u.role !== "dios" && (
                    <button
                      style={{ background: "#c53030" }}
                      onClick={() => eliminarUsuario(u.username)}
                    >
                      Eliminar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p style={{ marginTop: 10, opacity: 0.8 }}>
          Tip: si quieres ocultar <b>Auditoría</b> para todos los editores, desmarca su permiso aquí.
        </p>
      </div>
    </div>
  );
}
