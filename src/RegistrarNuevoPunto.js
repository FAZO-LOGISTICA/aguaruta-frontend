// src/RegistrarNuevoPunto.js
import React, { useState } from "react";
import axios from "axios";
import API_URL from "./config";
import CamionColorPicker from "./components/CamionColorPicker";

const initForm = {
  nombre: "",
  litros: "",
  telefono: "",
  latitud: "",
  longitud: "",
  dia: "" // opcional
};

// --- helpers ---
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

// normaliza como en backend: "M 6" / "M-6" → "M6"
const normalizeOverride = (s) => {
  if (!s) return null;
  const t = String(s).toUpperCase().trim().replace(/\s*-\s*/g, "").replace(/\s+/g, "");
  // acepta A/M + 1..99
  return /^[AM]\d{1,2}$/.test(t) ? t : t; // lo envío igual; backend también normaliza
};

// ⚠️ baseURL normalizada y SIEMPRE sin usar "/" inicial en los paths
const api = axios.create({
  baseURL: API_URL.replace(/\/+$/, "") + "/", // ej: https://.../api/
  timeout: 20000
});
const warmUp = async () => {
  try {
    await api.get("health", { timeout: 6000 }); // sin slash inicial
  } catch {}
};

export default function RegistrarNuevoPunto() {
  const [form, setForm] = useState(initForm);
  const [camion, setCamion] = useState(""); // ✅ camión opcional (A6, M6, etc.)
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [resp, setResp] = useState(null);

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
      camion_override: normalizeOverride(camion) || null
    };

    // validaciones mínimas
    if (!payload.nombre) return setErr("Ingresa un nombre.");
    if (!payload.litros || payload.litros <= 0) return setErr("Litros debe ser un número > 0.");
    if (!validCoords(payload.latitud, payload.longitud)) return setErr("Coordenadas fuera de rango.");

    try {
      setLoading(true);
      await warmUp(); // ayuda con Render en frío

      // ⚠️ sin slash inicial para NO romper baseURL
      const { data } = await api.post("registrar-nuevo-punto-auto", payload, {
        headers: { "Content-Type": "application/json" }
      });
      setResp(data);

      if (data?.ok) {
        setMsg(
          `✅ Registrado. Camión: ${data.asignacion?.camion ?? "-"} | Día: ${data.asignacion?.dia ?? "-"} | ID: ${data.id ?? "(s/ID)"}`
        );
        // Limpia (deja coords para registrar varios en la misma zona)
        setForm((f) => ({ ...initForm, latitud: f.latitud, longitud: f.longitud }));
        setCamion(""); // limpia el campo camión también
      } else {
        setErr(data?.mensaje || "No se pudo registrar el punto.");
      }
    } catch (e2) {
      const status = e2?.response?.status;
      const det = e2?.response?.data?.detail || e2?.message || "Error desconocido";
      setErr(`Error${status ? " " + status : ""}: ${det}`);
      console.error("registrar-nuevo-punto-auto FAIL:", e2?.response || e2);
    } finally {
      setLoading(false);
    }
  };

  const limpiar = () => {
    setForm(initForm);
    setCamion("");
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

          {/* === CAMIÓN (opcional) con color/verificación/sugerencia === */}
          <div
            style={{
              marginTop: 12,
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              padding: 12,
              background: "#fff"
            }}
          >
            <label style={{ fontWeight: 600, marginBottom: 6, display: "block" }}>
              Camión (opcional)
            </label>
            <CamionColorPicker camion={camion} onChangeCamion={setCamion} />
            <small style={{ opacity: 0.75 }}>
              Si lo dejas vacío, el backend copiará <b>camión y día</b> del punto más cercano en <code>ruta_activa</code>.{" "}
              Si escribes, por ejemplo <b>M6</b>, se usará ese camión para este punto.
            </small>
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
