// src/AdminUsuarios.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import API_URL from "./config";
import "./App.css";

const ROLES = [
  { id: "dios",     label: "Dios",     desc: "Acceso total — sin restricciones",           color: "#7c3aed", bg: "#ede9fe" },
  { id: "editor",   label: "Editor",   desc: "Rutas, entregas y pagos — sin cierre de mes", color: "#0369a1", bg: "#e0f2fe" },
  { id: "invitado", label: "Invitado", desc: "Solo lectura — sin modificaciones",            color: "#64748b", bg: "#f1f5f9" },
];

const PERMISOS = {
  dios:     ["Inicio","Mapa","Gráficos","Est. Camión","Comparación","Rutas Camión","Ruta Activa","Registrar Entrega","Entregas","Nuevo Punto","No Entregadas","Entregas App","Pagos","Cierre Mes","Auditoría","Usuarios"],
  editor:   ["Inicio","Mapa","Gráficos","Est. Camión","Comparación","Rutas Camión","Ruta Activa","Registrar Entrega","Entregas","Nuevo Punto","No Entregadas","Entregas App","Pagos"],
  invitado: ["Inicio","Mapa","Gráficos","Est. Camión","Comparación","Rutas Camión"],
};

export default function AdminUsuarios() {
  const [usuarios, setUsuarios]   = useState([]);
  const [cargando, setCargando]   = useState(true);
  const [error, setError]         = useState("");
  const [modal, setModal]         = useState(null); // null | "crear" | "editar"
  const [usuarioEdit, setUsuarioEdit] = useState(null);
  const [form, setForm]           = useState({ username: "", password: "", rol: "editor" });
  const [guardando, setGuardando] = useState(false);
  const [msgExito, setMsgExito]   = useState("");

  const cargar = async () => {
    try {
      setCargando(true); setError("");
      const res = await axios.get(`${API_URL}/usuarios-lista`);
      setUsuarios(Array.isArray(res.data) ? res.data : []);
    } catch {
      setError("No se pudieron cargar los usuarios.");
    } finally { setCargando(false); }
  };

  useEffect(() => { cargar(); }, []);

  const abrirCrear = () => {
    setForm({ username: "", password: "", rol: "editor" });
    setUsuarioEdit(null);
    setModal("crear");
    setMsgExito("");
  };

  const abrirEditar = (u) => {
    setForm({ username: u.usuario, password: "", rol: u.rol });
    setUsuarioEdit(u);
    setModal("editar");
    setMsgExito("");
  };

  const cerrarModal = () => { setModal(null); setUsuarioEdit(null); setMsgExito(""); };

  const guardar = async () => {
    if (!form.username.trim()) return alert("El usuario es obligatorio");
    if (modal === "crear" && !form.password.trim()) return alert("La contraseña es obligatoria");
    try {
      setGuardando(true);
      if (modal === "crear") {
        await axios.post(`${API_URL}/usuarios-lista`, {
          usuario: form.username.trim(),
          password: form.password,
          rol: form.rol,
        });
        setMsgExito(`✅ Usuario "${form.username}" creado correctamente`);
      } else {
        await axios.put(`${API_URL}/usuarios-lista/${usuarioEdit.id}`, {
          usuario: form.username.trim(),
          rol: form.rol,
          ...(form.password ? { password: form.password } : {}),
        });
        setMsgExito(`✅ Usuario "${form.username}" actualizado`);
      }
      await cargar();
      setTimeout(cerrarModal, 1500);
    } catch (e) {
      alert(e.response?.data?.detail || "Error al guardar usuario");
    } finally { setGuardando(false); }
  };

  const eliminar = async (u) => {
    if (!window.confirm(`¿Eliminar al usuario "${u.usuario}"? Esta acción no se puede deshacer.`)) return;
    try {
      await axios.delete(`${API_URL}/usuarios-lista/${u.id}`);
      await cargar();
    } catch { alert("Error al eliminar usuario"); }
  };

  const rolInfo = (rol) => ROLES.find(r => r.id === rol) || ROLES[2];

  return (
    <div className="main-container fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <h2 className="titulo" style={{ margin: 0 }}>👤 Gestión de Usuarios</h2>
        <button onClick={abrirCrear} style={sBtn("#0f4c81", "#fff")}>
          + Nuevo usuario
        </button>
      </div>

      {/* Roles info */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
        {ROLES.map(r => (
          <div key={r.id} style={{ background: r.bg, border: `1px solid ${r.color}30`, borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontWeight: 700, color: r.color, fontSize: 14, marginBottom: 4 }}>{r.label}</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>{r.desc}</div>
            <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
              {PERMISOS[r.id].map(p => (
                <span key={p} style={{ fontSize: 10, background: "#fff", border: `1px solid ${r.color}40`, color: r.color, padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>{p}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {error && <div style={{ color: "#dc2626", marginBottom: 12, padding: "10px 14px", background: "#fee2e2", borderRadius: 8 }}>{error}</div>}

      {/* Tabla usuarios */}
      <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>
            {cargando ? "Cargando..." : `${usuarios.length} usuario${usuarios.length !== 1 ? "s" : ""} registrado${usuarios.length !== 1 ? "s" : ""}`}
          </div>
          <button onClick={cargar} style={{ ...sBtn("#f1f5f9", "#374151"), fontSize: 12 }}>🔄 Actualizar</button>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {["Usuario", "Rol", "Permisos", "Creado", ""].map(h => (
                <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cargando && (
              <tr><td colSpan={5} style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>⏳ Cargando usuarios...</td></tr>
            )}
            {!cargando && usuarios.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>Sin usuarios registrados</td></tr>
            )}
            {!cargando && usuarios.map(u => {
              const ri = rolInfo(u.rol);
              return (
                <tr key={u.id} style={{ borderTop: "1px solid #f1f5f9" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                  onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                  <td style={{ padding: "12px 16px", fontWeight: 600, color: "#0f172a" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: "50%", background: ri.bg, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, color: ri.color }}>
                        {u.usuario?.charAt(0).toUpperCase()}
                      </div>
                      {u.usuario}
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ background: ri.bg, color: ri.color, padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                      {ri.label}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 3, maxWidth: 400 }}>
                      {PERMISOS[u.rol]?.slice(0,6).map(p => (
                        <span key={p} style={{ fontSize: 10, background: "#f1f5f9", color: "#64748b", padding: "2px 6px", borderRadius: 4 }}>{p}</span>
                      ))}
                      {PERMISOS[u.rol]?.length > 6 && (
                        <span style={{ fontSize: 10, color: "#94a3b8" }}>+{PERMISOS[u.rol].length - 6} más</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px", color: "#64748b", fontSize: 12 }}>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString("es-CL") : "—"}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => abrirEditar(u)} style={sBtn("#e0f2fe", "#0369a1")}>✏️ Editar</button>
                      {u.rol !== "dios" && (
                        <button onClick={() => eliminar(u)} style={sBtn("#fee2e2", "#dc2626")}>🗑️</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal crear/editar */}
      {modal && (
        <div style={sOverlay}>
          <div style={sModal}>
            <h3 style={{ marginBottom: 4, color: "#0f172a" }}>
              {modal === "crear" ? "➕ Nuevo usuario" : "✏️ Editar usuario"}
            </h3>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>
              {modal === "crear" ? "Completa los datos del nuevo usuario" : `Editando: ${usuarioEdit?.usuario}`}
            </p>

            {msgExito && (
              <div style={{ background: "#dcfce7", color: "#166534", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13, fontWeight: 600 }}>
                {msgExito}
              </div>
            )}

            <label style={sLabel}>Nombre de usuario *</label>
            <input
              placeholder="Ej: laguna_verde"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              style={{ ...sInput, marginBottom: 14 }}
            />

            <label style={sLabel}>Contraseña {modal === "editar" ? "(dejar vacío para no cambiar)" : "*"}</label>
            <input
              type="password"
              placeholder={modal === "editar" ? "••••••••" : "Contraseña segura"}
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              style={{ ...sInput, marginBottom: 14 }}
            />

            <label style={sLabel}>Rol *</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 20 }}>
              {ROLES.map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, rol: r.id }))}
                  style={{
                    padding: "10px 8px",
                    borderRadius: 10,
                    border: `2px solid ${form.rol === r.id ? r.color : "#e2e8f0"}`,
                    background: form.rol === r.id ? r.bg : "#f8fafc",
                    color: form.rol === r.id ? r.color : "#64748b",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all 0.15s",
                  }}
                >
                  {r.label}
                  <div style={{ fontSize: 10, fontWeight: 400, marginTop: 2, color: form.rol === r.id ? r.color : "#94a3b8" }}>
                    {r.desc.split("—")[0].trim()}
                  </div>
                </button>
              ))}
            </div>

            {/* Preview permisos */}
            <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 14px", marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Módulos que verá este usuario
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {PERMISOS[form.rol]?.map(p => (
                  <span key={p} style={{ fontSize: 11, background: "#fff", border: "1px solid #e2e8f0", color: "#374151", padding: "3px 8px", borderRadius: 6 }}>{p}</span>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={guardar}
                disabled={guardando}
                style={{ ...sBtn("#0f4c81", "#fff"), flex: 1, padding: "11px 0", opacity: guardando ? 0.7 : 1 }}
              >
                {guardando ? "⏳ Guardando..." : modal === "crear" ? "✅ Crear usuario" : "💾 Guardar cambios"}
              </button>
              <button onClick={cerrarModal} style={{ ...sBtn("#f1f5f9", "#374151"), flex: 1, padding: "11px 0" }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function sBtn(bg, color) {
  return { padding: "8px 16px", borderRadius: 8, border: "none", background: bg, color, fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit" };
}
const sLabel  = { fontSize: 12, color: "#64748b", display: "block", marginBottom: 5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.3px" };
const sInput  = { width: "100%", padding: "10px 12px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, outline: "none", fontFamily: "inherit", color: "#0f172a", boxSizing: "border-box" };
const sOverlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 };
const sModal  = { background: "#fff", borderRadius: 16, padding: "28px 32px", width: "100%", maxWidth: 480, boxShadow: "0 8px 40px rgba(0,0,0,0.15)", maxHeight: "90vh", overflowY: "auto" };
