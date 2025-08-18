// src/EditarRedistribucion.js
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import API_URL from "./config";
import "./App.css";

// ---------- Normalizador (mejorado: soporta comas como decimales) ----------
function toNum(x) {
  if (x === null || x === undefined) return null;
  const s = String(x).trim().replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function normaliza(r, idx) {
  const lat = r.latitud ?? r.lat ?? r.latitude ?? r.Latitud ?? null;
  const lon = r.longitud ?? r.lon ?? r.lng ?? r.longitude ?? r.Longitud ?? null;
  const diaN =
    r.dia_asignado ?? r.dia ?? r.DIA ?? r.diaAsignado ?? r.DIA_ASIGNADO ?? null;

  return {
    id: r.id ?? idx + 1,
    camion: r.camion ?? r.CAMION ?? r.camion_asignado ?? r.CAMION_ASIGNADO ?? null,
    nombre: r.nombre ?? r.NOMBRE ?? r.jefe_hogar ?? r.jefe ?? null,
    litros: toNum(r.litros ?? r.LITROS ?? r.litros_de_entrega),
    telefono: r.telefono ?? r.TELEFONO ?? r.phone ?? null,
    dia: diaN,
    dia_asignado: r.dia_asignado ?? null,
    latitud: toNum(lat),
    longitud: toNum(lon),
  };
}

const EditarRedistribucion = () => {
  const [filas, setFilas] = useState([]);
  const [camiones, setCamiones] = useState([]);
  const [dias, setDias] = useState([]);
  const [selCamion, setSelCamion] = useState("");
  const [selDia, setSelDia] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  // ---------- Loader híbrido ----------
  const cargarRedistribucion = async () => {
    setCargando(true);
    setError("");

    // 1) DB
    try {
      const { data } = await axios.get(`${API_URL}/redistribucion`, { timeout: 15000 });
      const arr = Array.isArray(data) ? data : [];
      if (arr.length > 0) {
        const filasN = arr.map(normaliza).filter(p => Number.isFinite(p.latitud) && Number.isFinite(p.longitud));
        if (filasN.length > 0) {
          setFilas(filasN);
          setCamiones([...new Set(filasN.map(p => p.camion))].filter(Boolean).sort());
          setDias([...new Set(filasN.map(p => p.dia_asignado || p.dia))].filter(Boolean).sort());
          setCargando(false);
          return;
        }
      }
    } catch (e) {
      console.warn("DB /redistribucion vacía o error:", e?.message || e);
    }

    // 2) Fallback JSON estático (mismo dominio: public/)
    const rutasJSON = [
      "/datos/RutasMapaFinal_con_telefono.json",
      "/data/RutasMapaFinal_con_telefono.json",
    ];
    for (const ruta of rutasJSON) {
      try {
        const { data } = await axios.get(ruta, { timeout: 15000 });
        const arr = Array.isArray(data) ? data : [];
        const filasN = arr.map(normaliza).filter(p => Number.isFinite(p.latitud) && Number.isFinite(p.longitud));
        if (filasN.length > 0) {
          setFilas(filasN);
          setCamiones([...new Set(filasN.map(p => p.camion))].filter(Boolean).sort());
          setDias([...new Set(filasN.map(p => p.dia_asignado || p.dia))].filter(Boolean).sort());
          setCargando(false);
          return;
        }
      } catch (e) {
        // sigue intentando con la siguiente ruta
      }
    }

    // 3) Nada disponible
    setFilas([]);
    setCamiones([]);
    setDias([]);
    setError("No se encontraron datos ni en la DB ni en el JSON de respaldo.");
    setCargando(false);
  };

  useEffect(() => {
    cargarRedistribucion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Filtrado en memoria ----------
  const filasFiltradas = useMemo(() => {
    return filas.filter(f =>
      (selCamion ? f.camion === selCamion : true) &&
      (selDia ? (f.dia_asignado || f.dia) === selDia : true)
    );
  }, [filas, selCamion, selDia]);

  return (
    <div className="main-container fade-in">
      <h2 className="titulo">Editar Redistribución</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "10px", marginBottom: 16 }}>
        <select value={selCamion} onChange={(e) => setSelCamion(e.target.value)}>
          <option value="">Todos los camiones</option>
          {camiones.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select value={selDia} onChange={(e) => setSelDia(e.target.value)}>
          <option value="">Todos los días</option>
          {dias.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <button onClick={cargarRedistribucion} disabled={cargando}>
          {cargando ? "Cargando..." : "↻ Recargar"}
        </button>
      </div>

      {error && <div style={{ color: "red", marginBottom: 12 }}>{error}</div>}

      <div className="tabla-wrapper" style={{ overflow: "auto", maxHeight: 600, border: "1px solid #eee" }}>
        <table className="tabla">
          <thead>
            <tr>
              <th>Camión</th>
              <th>Nombre</th>
              <th>Día</th>
              <th>Litros</th>
              <th>Teléfono</th>
              <th>Latitud</th>
              <th>Longitud</th>
            </tr>
          </thead>
          <tbody>
            {filasFiltradas.map((f) => (
              <tr key={`${f.id}-${f.nombre}-${f.camion}`}>
                <td>{f.camion || "-"}</td>
                <td>{f.nombre || "-"}</td>
                <td>{f.dia_asignado || f.dia || "-"}</td>
                <td>{f.litros ?? "-"}</td>
                <td>{f.telefono || "-"}</td>
                <td>{f.latitud ?? "-"}</td>
                <td>{f.longitud ?? "-"}</td>
              </tr>
            ))}
            {!cargando && filasFiltradas.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 16 }}>Sin resultados</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EditarRedistribucion;
