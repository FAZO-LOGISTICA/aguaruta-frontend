// src/RegistrarEntrega.js
import React, { useState, useRef } from "react";
import api from "./services/api";

const CAMIONES = ["A1", "A2", "A3", "A4", "A5", "M1", "M2", "M3"];

const ESTADOS = [
  { valor: 1, label: "✅ Entregado",           color: "#16a34a", requiereFoto: false },
  { valor: 2, label: "🚪 Sin moradores",        color: "#d97706", requiereFoto: true  },
  { valor: 3, label: "📍 Dirección no existe",  color: "#6b7280", requiereFoto: false },
  { valor: 4, label: "🛣️ Camino malo",          color: "#dc2626", requiereFoto: true  },
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
  const fileRef = useRef();

  const estadoActual = ESTADOS.find((e) => e.valor === form.estado);
  const set = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));

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

  const onSubmit = async () => {
    if (!form.nombre.trim()) return alert("Escribe el nombre del beneficiario");
    if (form.estado === 1 && !form.litros) return alert("Ingresa los litros entregados");
    if (estadoActual.requiereFoto && !foto) return alert("Este estado requiere foto como evidencia");

    setCargando(true);
    setResultado(null);

    try {
      const fd = new FormData();
      fd.append("nombre",  form.nombre.trim());
      fd.append("camion",  form.camion);
      fd.append("litros",  form.estado === 1 ? form.litros : 0);
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

        {/* Beneficiario */}
        <div>
          <label className="form-label">Beneficiario *</label>
          <input
            className="input"
            placeholder="Nombre completo"
            value={form.nombre}
            onChange={(e) => set("nombre", e.target.value)}
          />
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

        {/* Estado */}
        <div>
          <label className="form-label">Estado de entrega *</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {ESTADOS.map((e) => (
              <button
                key={e.valor}
                onClick={() => set("estado", e.valor)}
                style={{
                  padding: "10px 12px", borderRadius: 8,
                  border: `2px solid ${form.estado === e.valor ? e.color : "#e5e7eb"}`,
                  background: form.estado === e.valor ? e.color + "18" : "#fff",
                  color: form.estado === e.valor ? e.color : "#374151",
                  fontWeight: form.estado === e.valor ? 700 : 400,
                  cursor: "pointer", textAlign: "left", fontSize: 13,
                  transition: "all 0.15s",
                }}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>

        {/* Litros — solo si entregado */}
        {form.estado === 1 && (
          <div>
            <label className="form-label">Litros entregados *</label>
            <input
              className="input"
              type="number"
              placeholder="Ej: 700"
              value={form.litros}
              onChange={(e) => set("litros", e.target.value)}
            />
          </div>
        )}

        {/* Motivo — si no fue entregado */}
        {form.estado !== 1 && (
          <div>
            <label className="form-label">Motivo / Observación</label>
            <input
              className="input"
              placeholder="Descripción del problema"
              value={form.motivo}
              onChange={(e) => set("motivo", e.target.value)}
            />
          </div>
        )}

        {/* Foto */}
        <div>
          <label className="form-label">
            Foto evidencia {estadoActual.requiereFoto && <span style={{ color: "#dc2626" }}>* (requerida)</span>}
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

        {/* Submit */}
        <button
          onClick={onSubmit}
          disabled={cargando}
          style={{
            marginTop: 4, padding: "12px 0", borderRadius: 8, border: "none",
            background: cargando ? "#9ca3af" : "#1d4ed8",
            color: "#fff", fontSize: 15, fontWeight: 700,
            cursor: cargando ? "not-allowed" : "pointer",
            transition: "background 0.2s",
          }}
        >
          {cargando ? "Enviando..." : "Registrar Entrega"}
        </button>

      </div>
    </div>
  );
}
