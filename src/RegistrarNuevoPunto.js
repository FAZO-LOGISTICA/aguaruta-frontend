// src/RegistrarNuevoPunto.js
import React, { useState } from "react";
import axios from "axios";
import API_URL from "./config";

const initForm = {
  nombre: "",
  litros: "",
  telefono: "",
  latitud: "",
  longitud: "",
  dia: "" // opcional
};

export default function RegistrarNuevoPunto() {
  const [form, setForm] = useState(initForm);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [resp, setResp] = useState(null);

  const toFloat = (v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(String(v).trim().replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };
  const toInt = (v) => {
    const f = toFloat(v);
    return f === null ? null : Math.round(f);
  };
  const validCoords = (lat, lon) =>
    lat !== null && lon !== null && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    setResp(null);

    const payload = {
      nombre: (form.nombre || "").trim(),
      litros: toInt(form.litros),
      telefono: (form.telefono || "").trim() || null,
      latitud: toFloat(form.latitud),
      longitud: toFloat(form.longitud),
      dia: (form.dia || "").trim() || null, // opcional, si no va, backend usa el del vecino
    };

    if (!payload.nombre) return setErr("Ingresa un nombre.");
    if (!payload.litros || payload.litros <= 0) return setErr("Litros debe ser un número > 0.");
    if (!validCoords(payload.latitud, payload.longitud)) return setErr("Coordenadas fuera de rango.");

    try {
      setLoading(true);
      const { data } = await axios.post(`${API_URL}/registrar-nuevo-punto-auto`, payload, { timeout: 20000 });
      setResp(data);
      if (data?.ok) {
        setMsg(
          `Registrado. Camión: ${data.asignacion?.camion ?? "-"} | Día: ${data.asignacion?.dia ?? "-"} | ID: ${data.id}`
        );
        // Limpia (deja coords para registrar varios en la misma zona)
        setForm((f) => ({ ...initForm, latitud: f.latitud, longitud: f.longitud }));
      } else {
        setErr(data?.mensaje || "No se pudo registrar el punto.");
      }
    } catch (e2) {
      const det = e2?.response?.data?.detail || e2?.message || "Error desconocido";
      setErr(`Error: ${det}`);
    } finally {
      setLoading(false);
    }
  };

  const limpiar = () => {
    setForm(initForm);
    setMsg(null);
    setErr(null);
    setResp(null);
  };

  return (
    <div className="main-container fade-in" style={{ maxWidth: 720, margin: "0 auto" }}>
      <h2 className="titulo">Registrar Nuevo Punto</h2>

      <div style={{ background: "#fff", padding: 16, borderRadius: 8, boxShadow: "0 2px 12px #0001" }}>
        <form onSubmit={onSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label>
              Nombre
              <input
                name="nombre"
                type="text"
                value={form.nombre}
                onChange={onChange}
                required
                autoComplete="name"
                placeholder="Jefe de hogar"
                style={{ width: "100%" }}
              />
            </label>
            <label>
              Teléfono
              <input
                name="telefono"
                type="tel"
                value={form.telefono}
                onChange={onChange}
                autoComplete="tel"
                placeholder="+569...."
                style={{ width: "100%" }}
              />
            </label>

            <label>
              Litros
              <input
                name="litros"
                type="number"
                min="1"
                step="1"
                value={form.litros}
                onChange={onChange}
                required
                autoComplete="off"
                placeholder="Ej: 1200"
                style={{ width: "100%" }}
              />
            </label>
            <label>
              Día (opcional)
              <input
                name="dia"
                type="text"
                value={form.dia}
                onChange={onChange}
                autoComplete="off"
                placeholder="LUNES / MARTES / ... (si no, se copia del vecino)"
                style={{ width: "100%" }}
              />
            </label>

            <label>
              Latitud
              <input
                name="latitud"
                type="number"
                step="any"
                value={form.latitud}
                onChange={onChange}
                required
                autoComplete="off"
                placeholder="-33.07..."
                style={{ width: "100%" }}
              />
            </label>
            <label>
              Longitud
              <input
                name="longitud"
                type="number"
                step="any"
                value={form.longitud}
                onChange={onChange}
                required
                autoComplete="off"
                placeholder="-71.63..."
                style={{ width: "100%" }}
              />
            </label>
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <button type="submit" disabled={loading}>
              {loading ? "Guardando..." : "Guardar y auto-asignar"}
            </button>
            <button type="button" onClick={limpiar} disabled={loading}>
              Limpiar
            </button>
          </div>
        </form>

        {msg && (
          <div style={{ marginTop: 12, padding: 10, background: "#e6ffed", color: "#03543f", borderRadius: 6 }}>
            {msg}
          </div>
        )}
        {err && (
          <div style={{ marginTop: 12, padding: 10, background: "#ffe6e6", color: "#8a1f1f", borderRadius: 6 }}>
            {err}
          </div>
        )}

        {resp && (
          <pre style={{ marginTop: 12, background: "#f7f7f7", padding: 10, borderRadius: 6, overflowX: "auto" }}>
{JSON.stringify(resp, null, 2)}
          </pre>
        )}
      </div>

      <p style={{ marginTop: 12, color: "#555" }}>
        * El camión y día se copian del punto <b>más cercano</b> ya existente en <code>ruta_activa</code>. Si no hay
        vecinos, caerá en camión <b>A1</b> y el día será el que escribas (o vacío si no lo pones).
      </p>
    </div>
  );
}
