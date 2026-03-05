// src/AdminUsuarios.js
import React, { useMemo, useState } from "react";

/* ------ helpers de storage ------ */
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

/* ------ permisos conocidos (keys que usa el menú) ------ */
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

/* permisos por defecto por rol */
function defaultPermisosFor(role) {
  const base = Object.fromEntries(PERM_KEYS.map((k) => [k, false]));
  if (role === "dios") {
    return Object.fromEntries(PERM_KEYS.map((k) => [k, true]));
  }
  if (role === "editor") {
    return {
      ...base,
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
  }
  return {
    ...base,
    mapa: true,
    graficos: true,
    estadisticasCamion: true,
    comparacionSemanal: true,
  };
}

export default function AdminUsuarios({ usuarios, setUsuarios, agregarUsuario, eliminarUsuario, cambiarContraseña }) {
  const [users, setUsers] = useState(() => usuarios || loadUsers() || []);

  const [nuevoUser, setNuevoUser] = useState("");
  const [nuevoPass, setNuevoPass] = useState("");
  const [nuevoRol, setNuevoRol] = useState("editor");
  const [nuevoPerms, setNuevoPerms] = useState(defaultPermisosFor("editor"));

  const viewUsers = useMemo(() => usuarios || users, [usuarios, users]);
  const setAll = (arr) => {
    saveUsers(arr);
    if (setUsuarios) setUsuarios(arr);
    setUsers(arr);
  };

  const onCreate = () => {
    const username = (nuevoUser || "").trim();
    if (!username) return alert("Escribe un nombre de usuario");
    if (viewUsers.find((u) => u.username === username)) return alert("Ese usuario ya existe");
    const role = nuevoRol;
    const permisos = defaultPermisosFor(role);
    Object.assign(permisos, nuevoPerms);
    const nuevo = { username, password: (nuevoPass || "").trim(), role, permisos };
    setAll([...viewUsers, nuevo]);
    setNuevoUser("");
    setNuevoPass("");
  };

  const onDelete = (u) => {
    if (!window.confirm(`¿Eliminar usuario ${u.username}?`)) return;
    setAll(viewUsers.filter((x) => x.username !== u.username));
  };

  // ✅ NUEVO: borrar todos los usuarios
  const onDeleteAll = () => {
    if (!window.confirm("¿Eliminar TODOS los usuarios? Esta acción no se puede deshacer.")) return;
    setAll([]);
  };

  const onRoleChange = (u, role) => {
    const arr = viewUsers.map((x) =>
      x.username === u.username
        ? { ...x, role, permisos: defaultPermisosFor(role) }
        : x
    );
    setAll(arr);
  };

  const onPermToggle = (u, key, value) => {
    if (u.role === "dios") return;
    const arr = viewUsers.map((x) =>
      x.username === u.username ? { ...x, permisos: { ...x.permisos, [key]: !!value } } : x
    );
    setAll(arr);
  };

  return (
    <div className="main-container fade-in" style={{ maxWidth: 900, margin: "0 auto" }}>
      <h2 className="titulo">Administración de Usuarios</h2>

      <section style={{ background: "#fff", padding: 16, borderRadius: 8, boxShadow: "0 2px 10px #0001" }}>
        <h3 className="subtitulo">Crear nuevo usuario</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto auto", gap: 8, alignItems: "center" }}>
          <input
            placeholder="usuario"
            value={nuevoUser}
            onChange={(e) => setNuevoUser(e.target.value)}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <input
              placeholder="contraseña"
              type="password"
              value={nuevoPass}
              onChange={(e) => setNuevoPass(e.target.value)}
            />
          </div>
          <select value={nuevoRol} onChange={(e) => {
            const r = e.target.value;
            setNuevoRol(r);
            setNuevoPerms(defaultPermisosFor(r));
          }}>
            <option value="editor">Editor</option>
            <option value="invitado">Invitado</option>
            <option value="dios">Dios</option>
          </select>
          <button onClick={onCreate}>Crear</button>
        </div>

        <p style={{ marginTop: 10, marginBottom: 6 }}>Permisos por defecto para este usuario:</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
          {PERM_KEYS.map((k) => (
            <label key={k} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={!!nuevoPerms[k]}
                onChange={(e) => setNuevoPerms((p) => ({ ...p, [k]: e.target.checked }))}
              />
              {k}
            </label>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 20, background: "#fff", padding: 16, borderRadius: 8, boxShadow: "0 2px 10px #0001" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 className="subtitulo" style={{ margin: 0 }}>Usuarios existentes</h3>
          {viewUsers.length > 0 && (
            <button
              onClick={onDeleteAll}
              style={{ background: "#7f1d1d", color: "#fff", padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer" }}
            >
              🗑️ Borrar todos
            </button>
          )}
        </div>

        {viewUsers.length === 0 ? (
          <p style={{ color: "#888", textAlign: "center", padding: 20 }}>No hay usuarios registrados.</p>
        ) : (
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
              {viewUsers.map((u) => (
                <tr key={u.username}>
                  <td>{u.username}</td>
                  <td>
                    <select value={u.role} onChange={(e) => onRoleChange(u, e.target.value)}>
                      <option value="dios">Dios</option>
                      <option value="editor">Editor</option>
                      <option value="invitado">Invitado</option>
                    </select>
                  </td>
                  <td>
                    {u.role === "dios" ? (
                      <i>Tiene todos los permisos</i>
                    ) : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                        {PERM_KEYS.map((k) => (
                          <label key={k} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                            <input
                              type="checkbox"
                              checked={!!u.permisos?.[k]}
                              onChange={(e) => onPermToggle(u, k, e.target.checked)}
                            />
                            {k}
                          </label>
                        ))}
                      </div>
                    )}
                  </td>
                  {/* ✅ Botón Eliminar para TODOS los roles, incluido dios */}
                  <td>
                    <button style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", cursor: "pointer" }} onClick={() => onDelete(u)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
