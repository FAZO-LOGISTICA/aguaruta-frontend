// src/RegistrarEntrega.js
import React, { useState, useRef, useEffect } from "react";
import api from "./services/api";

const API_URL = "https://aguaruta-backend.onrender.com";
const CAMIONES = ["A1", "A2", "A3", "A4", "A5", "M1", "M2", "M3"];

const ESTADOS = [
  { valor: 0, label: "🚫 No entrega",                 color: "#6b7280", requiereFoto: true,  requiereLitros: false, requiereMotivo: false },
  { valor: 1, label: "✅ Entrega",                    color: "#16a34a", requiereFoto: false, requiereLitros: true,  requiereMotivo: false },
  { valor: 2, label: "🚪 No encontrado",              color: "#d97706", requiereFoto: false, requiereLitros: false, requiereMotivo: false },
  { valor: 3, label: "🚧 Camino malo",                color: "#7c3aed", requiereFoto: true,  requiereLitros: false, requiereMotivo: false },
  { valor: 4, label: "⚠️ Falta al protocolo",         color: "#b45309", requiereFoto: true,  requiereLitros: false, requiereMotivo: false },
  { valor: 5, label: "📉 Menor cantidad entregada",   color: "#0369a1", requiereFoto: false, requiereLitros: true,  requiereMotivo: false },
  { valor: 6, label: "📈 Mayor cantidad entregada",   color: "#0f766e", requiereFoto: false, requiereLitros: true,  requiereMotivo: false },
  { valor: 7, label: "🏛️ Apoyo municipal",            color: "#4f46e5", requiereFoto: false, requiereLitros: false, requiereMotivo: false },
  { valor: 8, label: "🙅 No quiere recibir x motivo", color: "#dc2626", requiereFoto: false, requiereLitros: false, requiereMotivo: true  },
];

const hoy = () => new Date().toISOString().split("T")[0];

export default function RegistrarEntrega() {
  const [form, setForm] = useState({
    nombre: "",
    camion: "A1",
    litros: "",
    estado: 1,
    fecha: hoy(),
    motivo: "",
    latitud: "",
    longitud: "",
  });
  const [foto, setFoto] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [rutas, setRutas] = useState([]);
  const [sugerencias, setSugerencias] = useState([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const fileRef = useRef();
  const inputRef = useRef();

  const estadoActual = ESTADOS.find((e) => e.valor === form.estado);
  const set = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));

  // Cargar rutas activas para autocompletar
  useEffect(() => {
    fetch(`${API_URL}/rutas-activas`)
      .then(r => r.json())
      .then(data => setRutas(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // Filtrar sugerencias al escribir nombre
  const onNombreChange = (valor) => {
    set("nombre", valor);
    if (valor.length >= 1) {
      const q = valor.toLowerCase();
      const filtradas = rutas
        .filter(r => (r.nombre || "").toLowerCase().includes(q))
        .slice(0, 8);
      setSugerencias(filtradas);
      setMostrarSugerencias(filtradas.length > 0);
    } else {
      setSugerencias([]);
      setMostrarSugerencias(false);
    }
  };

  const seleccionarSugerencia = (ruta) => {
    setForm(f => ({
      ...f,
      nombre: ruta.nombre,
      camion: ruta.camion || f.camion,
      litros: ruta.litros ? String(ruta.litros) : f.litros,
    }));
    setSugerencias([]);
    setMostrarSugerencias(false);
  };

  const onFoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFoto(file);
    const reader = new FileReader();
    reader.onload = (ev) => setFotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const obtenerGPS = () => {
    if (!navigator.geolocation) return alert("GPS no disponible");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set("latitud", pos.coords.latitude.toFixed(6));
        set("longitud", pos.coords.longitude.toFixed(6));
      },
      () => alert("No se pudo obtener la ubicación")
    );
  };

  const limpiar = () => {
    setForm({ nombre: "", camion: "A1", litros: "", estado: 1, fecha: hoy(), motivo: "", latitud: "", longitud: "" });
    setFoto(null);
    setFotoPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const formularioValido = () => {
    if (!form.nombre.trim()) return false;
    if (estadoActual.requiereLitros && !form.litros) return false;
    if (estadoActual.requiereFoto && !foto) return false;
    if (estadoActual.requiereMotivo && !form.motivo.trim()) return false;
    return true;
  };

  const onSubmit = async () => {
    if (!form.nombre.trim()) return alert("Escribe el nombre del beneficiario");
    if (estadoActual.requiereLitros && !form.litros) return alert("Ingresa los litros entregados");
    if (estadoActual.requiereFoto && !foto) return alert("Este estado requiere foto como evidencia");
    if (estadoActual.requiereMotivo && !form.motivo.trim()) return alert("Ingresa el motivo de rechazo");

    setCargando(true);
    setResultado(null);

    try {
      const fd = new FormData();
      fd.append("nombre",  form.nombre.trim());
      fd.append("camion",  form.camion);
      fd.append("litros",  estadoActual.requiereLitros ? form.litros : 0);
      fd.append("estado",  form.estado);
      fd.append("fecha",   form.fecha);
      if (form.motivo)   fd.append("motivo",   form.motivo);
      if (form.latitud)  fd.append("latitud",  form.latitud);
      if (form.longitud) fd.append("longitud", form.longitud);
      if (foto)          fd.append("foto",     foto);

      await api.registrarEntrega(fd);
      setResultado({ ok: true, msg: `✅ Entrega registrada para ${form.nombre}` });
      limpiar();
    } catch (err) {
      setResultado({ ok: false, msg: `❌ Error: ${err.message || "No se pudo registrar"}` });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="main-container fade-in" style={{ maxWidth: 600, margin: "0 auto" }}>
      <h2 className="titulo">Registrar Entrega</h2>

      {resultado && (
        <div style={{
          padding: "12px 16px", borderRadius: 8, marginBottom: 16,
          background: resultado.ok ? "#dcfce7" : "#fee2e2",
          color:      resultado.ok ? "#166534" : "#991b1b",
          fontWeight: 600,
        }}>
          {resultado.msg}
        </div>
      )}

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Beneficiario con autocompletar */}
        <div style={{ position: "relative" }}>
          <label className="form-label">Beneficiario *</label>
          <input
            ref={inputRef}
            className="input"
            placeholder="Escribe una letra para buscar..."
            value={form.nombre}
            onChange={(e) => onNombreChange(e.target.value)}
            onFocus={() => sugerencias.length > 0 && setMostrarSugerencias(true)}
            onBlur={() => setTimeout(() => setMostrarSugerencias(false), 150)}
            autoComplete="off"
          />
          {mostrarSugerencias && (
            <div style={{
              position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
              background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 8,
              boxShadow: "0 4px 16px rgba(0,0,0,0.1)", maxHeight: 260, overflowY: "auto"
            }}>
              {sugerencias.map((r, i) => (
                <button
                  key={i}
                  onMouseDown={() => seleccionarSugerencia(r)}
                  style={{
                    width: "100%", padding: "10px 14px", border: "none",
                    borderBottom: "1px solid #f1f5f9", background: "#fff",
                    textAlign: "left", cursor: "pointer", display: "block",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                  onMouseLeave={e => e.currentTarget.style.background = "#fff"}
                >
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{r.nombre}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2, display: "flex", gap: 8 }}>
                    <span>🚚 {r.camion}</span>
                    <span>📅 {r.dia}</span>
                    <span>💧 {(r.litros || 0).toLocaleString()} L</span>
                    {r.telefono && <span>📞 {r.telefono}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Camión + Fecha */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label className="form-label">Camión *</label>
            <select className="input" value={form.camion} onChange={(e) => set("camion", e.target.value)}>
              {CAMIONES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Fecha *</label>
            <input
              className="input"
              type="date"
              value={form.fecha}
              onChange={(e) => set("fecha", e.target.value)}
            />
          </div>
        </div>

        {/* Estados — grid 3 columnas */}
        <div>
          <label className="form-label">Estado de entrega *</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {ESTADOS.map((e) => (
              <button
                key={e.valor}
                onClick={() => set("estado", e.valor)}
                style={{
                  padding: "10px 8px", borderRadius: 8,
                  border: `2px solid ${form.estado === e.valor ? e.color : "#e5e7eb"}`,
                  background: form.estado === e.valor ? e.color + "18" : "#fff",
                  color: form.estado === e.valor ? e.color : "#374151",
                  fontWeight: form.estado === e.valor ? 700 : 400,
                  cursor: "pointer", textAlign: "left", fontSize: 12,
                  transition: "all 0.15s", lineHeight: 1.3,
                }}
              >
                {e.label}
                {e.requiereFoto && <span style={{ display: "block", fontSize: 10, opacity: 0.7 }}>📷 foto requerida</span>}
                {e.requiereMotivo && <span style={{ display: "block", fontSize: 10, opacity: 0.7 }}>✏️ motivo requerido</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Litros — estados 1, 5, 6 */}
        {estadoActual.requiereLitros && (
          <div>
            <label className="form-label">
              Litros entregados *
              {(form.estado === 5 || form.estado === 6) && (
                <span style={{ color: "#64748b", fontWeight: 400 }}> (cantidad real)</span>
              )}
            </label>
            <input
              className="input"
              type="number"
              placeholder="Ej: 700"
              value={form.litros}
              onChange={(e) => set("litros", e.target.value)}
            />
          </div>
        )}

        {/* Motivo — estado 8 obligatorio, resto opcional */}
        {(form.estado !== 1 && form.estado !== 7) && (
          <div>
            <label className="form-label">
              {estadoActual.requiereMotivo
                ? <span>Motivo de rechazo <span style={{ color: "#dc2626" }}>* (requerido)</span></span>
                : "Motivo / Observación"}
            </label>
            <input
              className="input"
              placeholder={estadoActual.requiereMotivo
                ? "Ej: El vecino indica que ya tiene agua suficiente..."
                : "Descripción del problema (opcional)"}
              value={form.motivo}
              onChange={(e) => set("motivo", e.target.value)}
            />
          </div>
        )}

        {/* Foto */}
        <div>
          <label className="form-label">
            Foto evidencia{" "}
            {estadoActual.requiereFoto
              ? <span style={{ color: "#dc2626" }}>* (requerida)</span>
              : <span style={{ color: "#64748b", fontWeight: 400 }}>(opcional)</span>}
          </label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onFoto}
            style={{ display: "block", marginBottom: 8 }}
          />
          {fotoPreview && (
            <img
              src={fotoPreview}
              alt="preview"
              style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 8, border: "1px solid #e5e7eb" }}
            />
          )}
        </div>

        {/* GPS */}
        <div>
          <label className="form-label">Ubicación GPS</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              className="input"
              placeholder="Latitud"
              value={form.latitud}
              onChange={(e) => set("latitud", e.target.value)}
              style={{ flex: 1 }}
            />
            <input
              className="input"
              placeholder="Longitud"
              value={form.longitud}
              onChange={(e) => set("longitud", e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              onClick={obtenerGPS}
              title="Obtener ubicación actual"
              style={{
                padding: "8px 12px", borderRadius: 8,
                border: "1px solid #d1d5db", background: "#f9fafb",
                cursor: "pointer", fontSize: 18, flexShrink: 0,
              }}
            >
              📍
            </button>
          </div>
        </div>

        {/* Hint si falta algo */}
        {!formularioValido() && form.nombre.trim() && (
          <div style={{ fontSize: 12, color: "#dc2626", background: "#fee2e2", padding: "8px 12px", borderRadius: 8 }}>
            {estadoActual.requiereFoto && !foto && "📷 Falta la foto de evidencia  "}
            {estadoActual.requiereLitros && !form.litros && "💧 Falta ingresar los litros  "}
            {estadoActual.requiereMotivo && !form.motivo.trim() && "✏️ Falta el motivo de rechazo"}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={onSubmit}
          disabled={cargando || !formularioValido()}
          style={{
            marginTop: 4, padding: "12px 0", borderRadius: 8, border: "none",
            background: (cargando || !formularioValido()) ? "#9ca3af" : "#1d4ed8",
            color: "#fff", fontSize: 15, fontWeight: 700,
            cursor: (cargando || !formularioValido()) ? "not-allowed" : "pointer",
            transition: "background 0.2s",
          }}
        >
          {cargando ? "Enviando..." : "Registrar Entrega"}
        </button>

      </div>
    </div>
  );
}
