// src/Mapa.js — AguaRuta (Versión definitiva octubre 2025)
// Autor: Equipo FAZO-LOGÍSTICA

import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import API_URL from "./config";
import { getCamionColor, normalizeCamion } from "./config/camionColors";
import "./App.css";

/* ================= Axios con warm-up ================= */
const api = axios.create({
  baseURL: API_URL, // Ej: "https://aguaruta-backend.onrender.com"
  timeout: 60000,
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function warmUp() {
  try {
    await api.get("/health", { timeout: 8000 });
  } catch {}
}

/* ================= Función corregida ================= */
async function fetchRutasActivas(intentos = 3) {
  await warmUp();
  let delay = 1500;
  for (let i = 0; i < intentos; i++) {
    try {
      const { data } = await api.get("/rutas-activas");
      // ✅ Backend devuelve { data: [...] }
      return Array.isArray(data.data) ? data.data : [];
    } catch (e) {
      if (i === intentos - 1) throw e;
      await sleep(delay);
      delay *= 2;
    }
  }
}

/* ================= Utils ================= */
const toNum = (v) => {
  if (v === null || v === undefined) return null;
  const n = Number(String(v).trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

function normaliza(r, idx) {
  const lat = r.latitud ?? r.lat ?? r.latitude ?? r.Latitud ?? null;
  const lon = r.longitud ?? r.lon ?? r.lng ?? r.longitude ?? r.Longitud ?? null;
  const dia = r.dia_asignado ?? r.dia ?? r.DIA ?? r.diaAsignado ?? null;

  return {
    id: r.id ?? idx + 1,
    camion: r.camion ?? r.CAMION ?? r.camion_asignado ?? r.id_camion ?? null,
    nombre: r.nombre ?? r.NOMBRE ?? r.jefe_hogar ?? r.jefe ?? null,
    litros: toNum(r.litros ?? r.LITROS ?? r.litros_de_entrega),
    telefono: r.telefono ?? r.TELEFONO ?? r.phone ?? null,
    dia,
    latitud: toNum(lat),
    longitud: toNum(lon),
  };
}

function crearIcono(color = "#007bff", size = 12, border = "#fff") {
  const s = Math.max(8, Math.min(18, Number(size) || 12));
  return new L.DivIcon({
    className: "custom-marker",
    html: `<div style="
      width:${s}px;height:${s}px;background:${color};
      border-radius:50%;border:2px solid ${border};
      box-shadow:0 0 0 0 rgba(0,0,0,0.15);
    "></div>`,
    iconSize: [s, s],
    iconAnchor: [s / 2, s / 2],
    popupAnchor: [0, -s / 2],
  });
}

/* ================= Leyenda ================= */
function LegendControl({ items }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const legend = L.control({ position: "bottomleft" });
    legend.onAdd = () => {
      const div = L.DomUtil.create("div", "legend-camiones");
      div.innerHTML = items
        .map(
          ({ camion, color }) =>
            `<span class="leg-item"><i style="background:${color}"></i>${camion}</span>`
        )
        .join(" ");
      return div;
    };
    legend.addTo(map);
    return () => legend.remove();
  }, [map, items]);

  return null;
}

/* ================= Componente principal ================= */
export default function Mapa() {
  const [puntos, setPuntos] = useState([]);
  const [error, setError] = useState("");

  const [selected, setSelected] = useState(new Set());
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      setError("");

      try {
        const arr = await fetchRutasActivas(3);
        const norm = arr
          .map(normaliza)
          .filter((p) => Number.isFinite(p.latitud) && Number.isFinite(p.longitud));
        if (norm.length > 0) {
          setPuntos(norm);
          window.__PUNTOS = norm;
          return;
        }
      } catch (e) {
        console.warn("DB /rutas-activas error:", e?.message || e);
      }

      // 🔧 Sin fallback local: no se mostrarán puntos falsos.
      setError("⚠️ No se pudieron cargar los puntos del backend.");
    })();
  }, []);

  const marcadores = useMemo(
    () =>
      puntos.map((p, i) => ({
        key: p.id ?? i,
        lat: p.latitud,
        lon: p.longitud,
        nombre: p.nombre,
        camion: normalizeCamion(p.camion),
        dia: p.dia,
        litros: p.litros,
        telefono: p.telefono,
      })),
    [puntos]
  );

  const allCamiones = useMemo(() => {
    const set = new Set();
    for (const m of marcadores) if (m.camion) set.add(m.camion);
    return [...set].sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
  }, [marcadores]);

  useEffect(() => {
    if (allCamiones.length && selected.size === 0) {
      setSelected(new Set(allCamiones));
    }
  }, [allCamiones.length]);

  const toggleCamion = (c) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  };
  const selectAll = () => setSelected(new Set(allCamiones));
  const selectNone = () => setSelected(new Set());
  const invert = () => {
    const next = new Set();
    allCamiones.forEach((c) => {
      if (!selected.has(c)) next.add(c);
    });
    setSelected(next);
  };

  const filteredMarcadores = useMemo(() => {
    if (!selected.size) return [];
    return marcadores.filter((m) => selected.has(m.camion));
  }, [marcadores, selected]);

  const legendItems = useMemo(() => {
    const base = selected.size
      ? allCamiones.filter((c) => selected.has(c))
      : allCamiones;
    return base.map((c) => ({ camion: c, color: getCamionColor(c) }));
  }, [allCamiones, selected]);

  const center = [-33.07, -71.63];

  return (
    <main
      className="main-container fade-in"
      style={{
        padding: 20,
        backgroundImage: `url(/img/valparaiso/valparaiso${
          Math.floor(Math.random() * 9) + 1
        }.jpg)`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <img
        src="/img/logos/logos-institucionales.png"
        alt="Logo Institucional"
        style={{
          display: "block",
          margin: "0 auto 10px auto",
          maxWidth: 300,
        }}
      />
      <h2 className="titulo">Mapa de Rutas Activas</h2>
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <div className="filtros-camion">
        <div className="fila-1">
          <strong>Filtrar por camión:</strong>
          <div className="acciones">
            <button onClick={selectAll}>Todos</button>
            <button onClick={selectNone}>Ninguno</button>
            <button onClick={invert}>Invertir</button>
          </div>
          <input
            className="buscador"
            placeholder="Buscar (ej. A1, M2)"
            value={query}
            onChange={(e) => setQuery(e.target.value.toUpperCase())}
          />
          <span className="contador">
            Mostrando {filteredMarcadores.length} / {marcadores.length} puntos
          </span>
        </div>

        <div className="chips">
          {allCamiones
            .filter((c) => !query || c.includes(query))
            .map((c) => {
              const on = selected.has(c);
              const color = getCamionColor(c);
              return (
                <button
                  key={c}
                  className={`chip ${on ? "on" : ""}`}
                  title={`Camión ${c}`}
                  onClick={() => toggleCamion(c)}
                >
                  <i style={{ background: color }} /> {c}
                </button>
              );
            })}
        </div>
      </div>

      <MapContainer
        center={center}
        zoom={13}
        style={{
          height: "65vh",
          width: "100%",
          borderRadius: "10px",
          boxShadow: "0 0 10px rgba(0,0,0,0.2)",
        }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />

        <LegendControl items={legendItems} />

        {filteredMarcadores.map((m) => {
          const color = getCamionColor(m.camion);
          const size = m.camion === "M3" ? 14 : 12;
          const icon = crearIcono(color, size, "#fff");
          return (
            <Marker key={m.key} position={[m.lat, m.lon]} icon={icon}>
              <Popup>
                <strong>{m.nombre ?? "Sin nombre"}</strong>
                <br />
                Camión: {m.camion || "-"}
                <br />
                Día: {m.dia ?? "-"}
                <br />
                Litros: {m.litros ?? 0}
                <br />
                Tel: {m.telefono ?? "-"}
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <style>{`
        .legend-camiones {
          background: #fff;
          padding: 6px 8px;
          border-radius: 6px;
          box-shadow: 0 1px 4px rgba(0,0,0,.2);
          font: 12px/14px system-ui, Arial, sans-serif;
        }
        .legend-camiones .leg-item {
          margin-right: 10px;
          display: inline-flex;
          align-items: center;
        }
        .legend-camiones i {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          display: inline-block;
          margin-right: 6px;
          border: 1px solid rgba(0,0,0,.25);
        }

        .filtros-camion {
          background: rgba(255,255,255,0.9);
          border: 1px solid #e5e7eb;
          padding: 10px;
          border-radius: 8px;
          margin-bottom: 10px;
          box-shadow: 0 1px 2px rgba(0,0,0,.04);
        }
        .filtros-camion .fila-1 {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }
        .filtros-camion .acciones button {
          margin-right: 6px;
        }
        .filtros-camion .buscador {
          padding: 6px 8px;
          border: 1px solid #d0d7de;
          border-radius: 6px;
        }
        .filtros-camion .contador {
          margin-left: auto;
          font-size: 12px;
          opacity: 0.8;
        }

        .chips {
          margin-top: 8px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .chip {
          border: 1px solid #d0d7de;
          padding: 4px 8px;
          border-radius: 999px;
          background: #fff;
          cursor: pointer;
          font-size: 12px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .chip.on { background: #e9ecef; }
        .chip i {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          display: inline-block;
          border: 1px solid rgba(0,0,0,.25);
        }
      `}</style>
    </main>
  );
}
