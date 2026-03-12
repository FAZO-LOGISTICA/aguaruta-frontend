// src/RegistrarNuevoPunto.js
import React, { useState, useEffect } from "react";
import { apiMethods } from "./services/api";

const DIAS = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES"];
const CAMIONES = ["A1", "A2", "A3", "A4", "A5", "M1", "M2", "M3"];

const initForm = {
  nombre: "",
  litros: "",
  telefono: "",
  correo: "",
  latitud: "",
  longitud: "",
  dia: "",
  camion: "",
};

const toFloat = (v) => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(String(v).trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

const toInt = (v) => {
  const f = toFloat(v);
  return f === null ? null : Math.round(f);
};

function distanciaKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function puntoMasCercano(lat, lon, rutasActivas) {
  let mejor = null;
  let minDist = Infinity;
  for (const r of rutasActivas) {
    const rLat = Number(r.latitud);
    const rLon = Number(r.longitud);
    if (!rLat || !rLon) continue;
    const d = distanciaKm(lat, lon, rLat, rLon);
    if (d < minDist) {
      minDist = d;
      mejor = { ...r, distanciaKm: d.toFixed(3) };
    }
  }
  return mejor;
}

export default function RegistrarNuevoPunto() {
  const [form, setForm] = useState(initForm);
  const [rutasActivas, setRutasActivas] = useState([]);
  const [sugerencia, setSugerencia] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    apiMethods.getRutasActivas()
      .then((data) => setRutasActivas(Array.isArray(data) ? data : []))
      .catch(() => setRutasActivas([]));
  }, []);

  const set = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));

  const onCoordsChange = (campo, valor) => {
    set(campo, valor);
    const lat = toFloat(campo === "latitud" ? valor : form.latitud);
    const lon = toFloat(campo === "longitud" ? valor : form.longitud);
    if (lat && lon && rutasActivas.length > 0) {
      const cercano = puntoMasCercano(lat, lon, rutasActivas);
      if (cercano) {
        setSugerencia({ camion: cercano.camion, dia: cercano.dia, nombre: cercano.nombre, distanciaKm: cercano.distanciaKm });
        setForm((f) => ({
          ...f,
          [campo]: valor,
          camion: f.camion || cercano.camion,
          dia: f.dia || cercano.dia,
        }));
      }
    } else {
      setSugerencia(null);
    }
  };

  const obtenerGPS = () => {
    if (!navigator.geolocation) return alert("GPS no disponible");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        if (rutasActivas.length > 0) {
          const cercano = puntoMasCercano(lat, lon, rutasActivas);
          if (cercano) {
            setSugerencia({ camion: cercano.camion, dia: cercano.dia, nombre: cercano.nombre, distanciaKm: cercano.distanciaKm });
            setForm((f) => ({
              ...f,
              latitud: lat.toFixed(6),
              longitud: lon.toFixed(6),
              camion: f.camion || cercano.camion,
              dia: f.dia || cercano.dia,
            }));
            return;
          }
        }
        setForm((f) => ({ ...f, latitud: lat.toFixed(6), longitud: lon.toFixed(6) }));
      },
      () => alert("No se pudo obtener la ubicación")
    );
  };

  const limpiar = () => { setForm(initForm); setSugerencia(null); setMsg(null); setErr(null); };

  const onSubmit = async () => {
    setMsg(null); setErr(null);

    const nombre = form.nombre.trim();
    const litros = toInt(form.litros);

    if (!nombre) return setErr("Ingresa el nombre del beneficiario.");
    if (!litros || litros <= 0) return setErr("Ingresa los litros (debe ser > 0).");

    const camionFinal = (form.camion || sugerencia?.camion || "A1").toUpperCase().trim();
    const diaFinal = (form.dia || sugerencia?.dia || "LUNES").toUpperCase().trim();

    const payload = {
      nombre,
      litros,
      telefono: form.telefono.trim() || null,
      correo: form.correo.trim() || null,
      latitud: toFloat(form.latitud),
      longitud: toFloat(form.longitud),
      dia: diaFinal,
      camion: camionFinal,
    };

    try {
      setLoading(true);
      await apiMethods.addRutaActiva(payload);
      setMsg(`✅ Registrado. Camión: ${camionFinal} | Día: ${diaFinal}`);
      const nuevas = await apiMethods.getRutasActivas();
      setRutasActivas(Array.isArray(nuevas) ? nuevas : []);
      setForm((f) => ({ ...initForm, latitud: f.latitud, longitud: f.longitud }));
      setSugerencia(null);
    } catch (e) {
      const det = e?.response?.data?.detail || e.message || "Error desconocido";
      setErr(`Error al registrar: ${det}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main-container fade-in" style={{ maxWidth: 680, margin: "0 auto" }}>
      <h2 className="titulo">Registrar Nuevo Punto</h2>

      <div style={{ background: "#fff", padding: 20, borderRadius: 8, boxShadow: "0 2px 12px #0001", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Nombre + Teléfono */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label className="form-label">Nombre *</label>
            <input className="input" placeholder="Jefe de hogar" value={form.nombre} onChange={(e) => set("nombre", e.target.value)} />
          </div>
          <div>
            <label className="form-label">Teléfono</label>
            <input className="input" placeholder="+569...." value={form.telefono} onChange={(e) => set("telefono", e.target.value)} />
          </div>
        </div>

        {/* Correo — fila completa */}
        <div>
          <label className="form-label">📧 Correo electrónico</label>
          <input
            className="input"
            type="email"
            placeholder="ejemplo@correo.com"
            value={form.correo}
            onChange={(e) => set("correo", e.target.value)}
            style={{ width: "100%", boxSizing: "border-box" }}
          />
        </div>

        {/* Litros + Día */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label className="form-label">Litros *</label>
            <input className="input" type="number" min="1" placeholder="Ej: 1200" value={form.litros} onChange={(e) => set("litros", e.target.value)} />
          </div>
          <div>
            <label className="form-label">Día</label>
            <select className="input" value={form.dia} onChange={(e) => set("dia", e.target.value)}>
              <option value="">— auto por proximidad —</option>
              {DIAS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
        </div>

        {/* Coordenadas + GPS */}
        <div>
          <label className="form-label">Ubicación GPS</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              className="input"
              placeholder="Latitud (-33.07...)"
              value={form.latitud}
              onChange={(e) => onCoordsChange("latitud", e.target.value)}
              style={{ flex: 1 }}
            />
            <input
              className="input"
              placeholder="Longitud (-71.63...)"
              value={form.longitud}
              onChange={(e) => onCoordsChange("longitud", e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              onClick={obtenerGPS}
              title="Obtener ubicación actual"
              style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #d1d5db", background: "#f9fafb", cursor: "pointer", fontSize: 18, flexShrink: 0 }}
            >
              📍
            </button>
          </div>
        </div>

        {/* Sugerencia de proximidad */}
        {sugerencia && (
          <div style={{ padding: "10px 14px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, fontSize: 13 }}>
            📍 Punto más cercano: <strong>{sugerencia.nombre}</strong> — Camión <strong>{sugerencia.camion}</strong> | Día <strong>{sugerencia.dia}</strong> | {sugerencia.distanciaKm} km
          </div>
        )}

        {/* Camión */}
        <div>
          <label className="form-label">Camión</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {CAMIONES.map((c) => (
              <button
                key={c}
                onClick={() => set("camion", c)}
                style={{
                  padding: "6px 14px", borderRadius: 20, border: "2px solid",
                  borderColor: form.camion === c ? "#1d4ed8" : "#e5e7eb",
                  background: form.camion === c ? "#1d4ed8" : "#fff",
                  color: form.camion === c ? "#fff" : "#374151",
                  fontWeight: form.camion === c ? 700 : 400,
                  cursor: "pointer", fontSize: 13,
                }}
              >
                {c}
              </button>
            ))}
            <button
              onClick={() => set("camion", "")}
              style={{ padding: "6px 14px", borderRadius: 20, border: "2px solid #e5e7eb", background: "#f9fafb", color: "#6b7280", cursor: "pointer", fontSize: 13 }}
            >
              Auto
            </button>
          </div>
          {!form.camion && (
            <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
              Sin selección → se usará el camión del punto más cercano {sugerencia ? `(${sugerencia.camion})` : "(A1 si no hay vecinos)"}
            </p>
          )}
        </div>

        {/* Botones */}
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button
            onClick={onSubmit}
            disabled={loading}
            style={{
              flex: 1, padding: "12px 0", borderRadius: 8, border: "none",
              background: loading ? "#9ca3af" : "#1d4ed8",
              color: "#fff", fontSize: 15, fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Guardando..." : "💾 Guardar y asignar"}
          </button>
          <button
            onClick={limpiar}
            disabled={loading}
            style={{ padding: "12px 20px", borderRadius: 8, border: "1px solid #d1d5db", background: "#f9fafb", cursor: "pointer" }}
          >
            Limpiar
          </button>
        </div>

        {msg && <div style={{ padding: "10px 14px", background: "#dcfce7", color: "#166534", borderRadius: 8, fontWeight: 600 }}>{msg}</div>}
        {err && <div style={{ padding: "10px 14px", background: "#fee2e2", color: "#991b1b", borderRadius: 8, fontWeight: 600 }}>{err}</div>}
      </div>

      <p style={{ marginTop: 12, color: "#6b7280", fontSize: 13 }}>
        * Al ingresar coordenadas se calcula automáticamente el camión y día del punto más cercano en rutas activas.
        Puedes sobrescribir la asignación seleccionando un camión manualmente.
      </p>
    </div>
  );
}
