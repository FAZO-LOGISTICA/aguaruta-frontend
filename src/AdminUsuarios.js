// src/AdminUsuarios.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import API_URL from "./config";
import "./App.css";

const ROLES = [
  { id: "dios",     label: "Dios",     color: "#7c3aed", bg: "#ede9fe", desc: "Acceso total" },
  { id: "editor",   label: "Editor",   color: "#0369a1", bg: "#e0f2fe", desc: "Personalizable" },
  { id: "invitado", label: "Invitado", color: "#64748b", bg: "#f1f5f9", desc: "Personalizable" },
];

const MODULOS = [
  { key: "/",                    label: "Inicio" },
  { key: "/mapa",                label: "Mapa" },
  { key: "/graficos",            label: "Gráficos" },
  { key: "/estadisticas-camion", label: "Est. Camión" },
  { key: "/comparacion-semanal", label: "Comparación Semanal" },
  { key: "/rutas-por-camion",    label: "Rutas por Camión" },
  { key: "/rutas-activas",       label: "Ruta Activa" },
  { key: "/registrar-entrega",   label: "Registrar Entrega" },
  { key: "/entregas",            label: "Entregas" },
  { key: "/registrar-punto",     label: "Nuevo Punto" },
  { key: "/no-entregadas",       label: "No Entregadas" },
  { key: "/entregas-app",        label: "Entregas App" },
  { key: "/pagos",               label: "Pagos" },
  { key: "/cierre-mes",          label: "Cierre Mes" },
  { key: "/auditoria",           label: "Auditoría" },
];

const TODOS = MODULOS.map(m => m.key);
const DEFAULT_EDITOR   = ["/","/mapa","/graficos","/estadisticas-camion","/comparacion-semanal","/rutas-por-camion","/rutas-activas","/registrar-entrega","/entregas","/registrar-punto","/no-entregadas","/entregas-app","/pagos"];
const DEFAULT_INVITADO = ["/","/mapa","/graficos","/estadisticas-camion","/comparacion-semanal","/rutas-por-camion"];

const permisosDefault = (rol) => {
  if (rol === "dios")     return TODOS;
  if (rol === "editor")   return DEFAULT_EDITOR;
  return DEFAULT_INVITADO;
};

const FORM_VACIO = { username: "", password: "", rol: "editor", permisos: DEFAULT_EDITOR };

export default function AdminUsuarios() {
  const [usuarios, setUsuarios]       = useState([]);
  const [cargando, setCargando]       = useState(true);
  const [error, setError]             = useState("");
  const [modal, setModal]             = useState(null);
  const [usuarioEdit, setUsuarioEdit] = useState(null);
  const [form, setForm]               = useState(FORM_VACIO);
  const [guardando, setGuardando]     = useState(false);
  const [msgExito, setMsgExito]       = useState("");

  const cargar = async () => {
    try {
      setCargando(true); setError("");
      const res = await axios.get(`${API_URL}/usuarios-lista`);
      setUsuarios(Array.isArray(res.data) ? res.data : []);
    } catch { setError("No se pudieron cargar los usuarios."); }
    finally { setCargando(false); }
  };

  useEffect(() => { cargar(); }, []);

  const abrirCrear = () => {
    setForm(FORM_VACIO);
    setUsuarioEdit(null);
    setModal("crear");
    setMsgExito("");
  };

  const abrirEditar = (u) => {
    let permisos = u.permisos;
    if (typeof permisos === "string") { try { permisos = JSON.parse(permisos); } catch { permisos = null; } }
    setForm({ username: u.usuario, password: "", rol: u.rol, permisos: permisos || permisosDefault(u.rol) });
    setUsuarioEdit(u);
    setModal("editar");
    setMsgExito("");
  };

  const cerrarModal = () => { setModal(null); setUsuarioEdit(null); setMsgExito(""); };

  const cambiarRol = (rol) => setForm(f => ({ ...f, rol, permisos: permisosDefault(rol) }));

  const toggleModulo = (key) => {
    if (form.rol === "dios") return;
    setForm(f => ({
      ...f,
      permisos: f.permisos.includes(key)
        ? f.permisos.filter(p => p !== key)
        : [...f.permisos, key],
    }));
  };

  const toggleTodos = (marcar) => {
    if (form.rol === "dios") return;
    setForm(f => ({ ...f, permisos: marcar ? TODOS : [] }));
  };

  const guardar = async () => {
    if (!form.username.trim()) return alert("El usuario es obligatorio");
    if (modal === "crear" && !form.password.trim()) return alert("La contraseña es obligatoria");
    try {
      setGuardando(true);
      const payload = {
        usuario: form.username.trim(),
        rol: form.rol,
        permisos: form.rol === "dios" ? TODOS : form.permisos,
        ...(form.password ? { password: form.password } : {}),
      };
      if (modal === "crear") {
        await axios.post(`${API_URL}/usuarios-lista`, payload);
        setMsgExito(`✅ Usuario "${form.username}" creado`);
      } else {
        await axios.put(`${API_URL}/usuarios-lista/${usuarioEdit.id}`, payload);
        setMsgExito(`✅ Usuario "${form.username}" actualizado`);
      }
      await cargar();
      setTimeout(cerrarModal, 1200);
    } catch (e) {
      alert(e.response?.data?.detail || "Error al guardar usuario");
    } finally { setGuardando(false); }
  };

  const eliminar = async (u) => {
    if (!window.confirm(`¿Eliminar al usuario "${u.usuario}"?`)) return;
    try { await axios.delete(`${API_URL}/usuarios-lista/${u.id}`); await cargar(); }
    catch { alert("Error al eliminar usuario"); }
  };

  const rolInfo = (rol) => ROLES.find(r => r.id === rol) || ROLES[1];

  const getPermisos = (u) => {
    if (u.rol === "dios") return TODOS;
    let p = u.permisos;
    if (typeof p === "string") { try { p = JSON.parse(p); } catch { p = null; } }
    return p || permisosDefault(u.rol);
  };

  return (
    <div className="main-container fade-in">
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <h2 className="titulo" style={{ margin:0 }}>👤 Gestión de Usuarios</h2>
        <button onClick={abrirCrear} style={sBtn("#0f4c81","#fff")}>+ Nuevo usuario</button>
      </div>

      {error && <div style={{ color:"#dc2626", marginBottom:12, padding:"10px 14px", background:"#fee2e2", borderRadius:8 }}>{error}</div>}

      <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 12px rgba(0,0,0,0.06)", overflow:"hidden" }}>
        <div style={{ padding:"14px 20px", borderBottom:"1px solid #f1f5f9", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontWeight:700, fontSize:14, color:"#0f172a" }}>
            {cargando ? "Cargando..." : `${usuarios.length} usuario${usuarios.length !== 1 ? "s" : ""}`}
          </div>
          <button onClick={cargar} style={{ ...sBtn("#f1f5f9","#374151"), fontSize:12 }}>🔄 Actualizar</button>
        </div>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <thead>
            <tr style={{ background:"#f8fafc" }}>
              {["Usuario","Rol","Módulos con acceso","Creado",""].map(h => (
                <th key={h} style={{ padding:"10px 16px", textAlign:"left", color:"#64748b", fontWeight:600, fontSize:12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cargando && <tr><td colSpan={5} style={{ padding:32, textAlign:"center", color:"#94a3b8" }}>⏳ Cargando...</td></tr>}
            {!cargando && usuarios.length === 0 && (
              <tr><td colSpan={5} style={{ padding:32, textAlign:"center", color:"#94a3b8" }}>Sin usuarios registrados</td></tr>
            )}
            {!cargando && usuarios.map(u => {
              const ri = rolInfo(u.rol);
              const perms = getPermisos(u);
              const labels = MODULOS.filter(m => perms.includes(m.key)).map(m => m.label);
              return (
                <tr key={u.id} style={{ borderTop:"1px solid #f1f5f9" }}
                  onMouseEnter={e => e.currentTarget.style.background="#f8fafc"}
                  onMouseLeave={e => e.currentTarget.style.background="#fff"}>
                  <td style={{ padding:"12px 16px", fontWeight:600, color:"#0f172a" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:34, height:34, borderRadius:"50%", background:ri.bg, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:13, color:ri.color, flexShrink:0 }}>
                        {u.usuario?.charAt(0).toUpperCase()}
                      </div>
                      {u.usuario}
                    </div>
                  </td>
                  <td style={{ padding:"12px 16px" }}>
                    <span style={{ background:ri.bg, color:ri.color, padding:"4px 10px", borderRadius:20, fontSize:12, fontWeight:700 }}>{ri.label}</span>
                  </td>
                  <td style={{ padding:"12px 16px" }}>
                    {u.rol === "dios" ? (
                      <span style={{ fontSize:12, color:"#7c3aed", fontWeight:600 }}>✨ Todos los módulos</span>
                    ) : (
                      <div style={{ display:"flex", flexWrap:"wrap", gap:3, maxWidth:380 }}>
                        {labels.slice(0,6).map(l => (
                          <span key={l} style={{ fontSize:10, background:"#f1f5f9", color:"#374151", padding:"2px 7px", borderRadius:5, border:"1px solid #e2e8f0" }}>{l}</span>
                        ))}
                        {labels.length > 6 && <span style={{ fontSize:10, color:"#94a3b8" }}>+{labels.length - 6} más</span>}
                      </div>
                    )}
                  </td>
                  <td style={{ padding:"12px 16px", color:"#64748b", fontSize:12 }}>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString("es-CL") : "—"}
                  </td>
                  <td style={{ padding:"12px 16px" }}>
                    <div style={{ display:"flex", gap:6 }}>
                      <button onClick={() => abrirEditar(u)} style={sBtn("#e0f2fe","#0369a1")}>✏️ Editar</button>
                      <button onClick={() => eliminar(u)} style={sBtn("#fee2e2","#dc2626")}>🗑️</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal && (
        <div style={sOverlay}>
          <div style={sModal}>
            <h3 style={{ marginBottom:4, color:"#0f172a" }}>
              {modal === "crear" ? "➕ Nuevo usuario" : `✏️ Editar — ${usuarioEdit?.usuario}`}
            </h3>
            <p style={{ fontSize:13, color:"#64748b", marginBottom:20 }}>
              Define qué puede ver y hacer este usuario
            </p>

            {msgExito && (
              <div style={{ background:"#dcfce7", color:"#166534", padding:"10px 14px", borderRadius:8, marginBottom:16, fontSize:13, fontWeight:600 }}>
                {msgExito}
              </div>
            )}

            <label style={sLabel}>Nombre de usuario *</label>
            <input placeholder="Ej: laguna_verde" value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              style={{ ...sInput, marginBottom:14 }} />

            <label style={sLabel}>Contraseña {modal === "editar" ? "(vacío = no cambiar)" : "*"}</label>
            <input type="password" placeholder={modal === "editar" ? "••••••••" : "Contraseña"}
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              style={{ ...sInput, marginBottom:14 }} />

            <label style={sLabel}>Rol *</label>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:20 }}>
              {ROLES.map(r => (
                <button key={r.id} type="button" onClick={() => cambiarRol(r.id)}
                  style={{
                    padding:"10px 8px", borderRadius:10, cursor:"pointer", fontFamily:"inherit",
                    border:`2px solid ${form.rol === r.id ? r.color : "#e2e8f0"}`,
                    background: form.rol === r.id ? r.bg : "#f8fafc",
                    color: form.rol === r.id ? r.color : "#64748b",
                    fontWeight:700, fontSize:13, transition:"all 0.15s",
                  }}>
                  {r.label}
                  <div style={{ fontSize:10, fontWeight:400, marginTop:2, color: form.rol === r.id ? r.color : "#94a3b8" }}>
                    {r.desc}
                  </div>
                </button>
              ))}
            </div>

            {/* Checkboxes módulos */}
            {form.rol !== "dios" ? (
              <div style={{ background:"#f8fafc", borderRadius:10, padding:"14px 16px", marginBottom:20 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"#374151", textTransform:"uppercase", letterSpacing:"0.5px" }}>
                    Módulos con acceso — {form.permisos.length} de {MODULOS.length}
                  </div>
                  <div style={{ display:"flex", gap:6 }}>
                    <button type="button" onClick={() => toggleTodos(true)}
                      style={{ ...sBtn("#e0f2fe","#0369a1"), fontSize:11, padding:"4px 10px" }}>Todos</button>
                    <button type="button" onClick={() => toggleTodos(false)}
                      style={{ ...sBtn("#f1f5f9","#64748b"), fontSize:11, padding:"4px 10px" }}>Ninguno</button>
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
                  {MODULOS.map(m => {
                    const activo = form.permisos.includes(m.key);
                    return (
                      <div key={m.key} onClick={() => toggleModulo(m.key)}
                        style={{
                          display:"flex", alignItems:"center", gap:8, padding:"9px 12px",
                          borderRadius:8, cursor:"pointer", transition:"all 0.15s",
                          background: activo ? "#dbeafe" : "#fff",
                          border:`2px solid ${activo ? "#3b82f6" : "#e2e8f0"}`,
                          color: activo ? "#1d4ed8" : "#64748b",
                          fontSize:13, fontWeight: activo ? 700 : 400,
                          userSelect:"none",
                        }}>
                        {/* Checkbox visual */}
                        <div style={{
                          width:18, height:18, borderRadius:5, flexShrink:0,
                          background: activo ? "#2563eb" : "#fff",
                          border:`2px solid ${activo ? "#2563eb" : "#cbd5e1"}`,
                          display:"flex", alignItems:"center", justifyContent:"center",
                        }}>
                          {activo && <span style={{ color:"#fff", fontSize:11, fontWeight:700, lineHeight:1 }}>✓</span>}
                        </div>
                        {m.label}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{ background:"#ede9fe", borderRadius:10, padding:"12px 16px", marginBottom:20, border:"1px solid #c4b5fd" }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#7c3aed" }}>✨ Acceso total</div>
                <div style={{ fontSize:12, color:"#8b5cf6", marginTop:4 }}>El rol Dios tiene acceso a todos los módulos sin restricción.</div>
              </div>
            )}

            <div style={{ display:"flex", gap:10 }}>
              <button onClick={guardar} disabled={guardando}
                style={{ ...sBtn("#0f4c81","#fff"), flex:1, padding:"11px 0", opacity: guardando ? 0.7 : 1 }}>
                {guardando ? "⏳ Guardando..." : modal === "crear" ? "✅ Crear usuario" : "💾 Guardar cambios"}
              </button>
              <button onClick={cerrarModal} style={{ ...sBtn("#f1f5f9","#374151"), flex:1, padding:"11px 0" }}>
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
  return { padding:"8px 16px", borderRadius:8, border:"none", background:bg, color, fontWeight:600, fontSize:13, cursor:"pointer", fontFamily:"inherit" };
}
const sLabel   = { fontSize:12, color:"#64748b", display:"block", marginBottom:5, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.3px" };
const sInput   = { width:"100%", padding:"10px 12px", border:"1.5px solid #e2e8f0", borderRadius:8, fontSize:13, outline:"none", fontFamily:"inherit", color:"#0f172a", boxSizing:"border-box" };
const sOverlay = { position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 };
const sModal   = { background:"#fff", borderRadius:16, padding:"28px 32px", width:"100%", maxWidth:520, boxShadow:"0 8px 40px rgba(0,0,0,0.15)", maxHeight:"90vh", overflowY:"auto" };
