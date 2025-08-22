// src/Mapa.js
import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import API_URL from "./config";
import "./App.css";

/* ---------------- Paleta y helpers en este archivo ---------------- */
const CAMION_COLORS = {
  A1: "#1E90FF", // azul
  A2: "#8A2BE2", // violeta
  A3: "#32CD32", // verde
  A4: "#FF7F50", // coral
  A5: "#FFD700", // dorado
  M1: "#00CED1", // turquesa
  M2: "#FF1493", // fucsia
  M3: "#000000", // negro
};
const CAMION_ORDER = ["A1", "A2", "A3", "A4", "A5", "M1", "M2", "M3"];

function normalizeCamion(value) {
  const s = String(value ?? "").toUpperCase().trim();
  if (!s) return null;
  if (CAMION_COLORS[s]) return s;
  const m = s.match(/\b([AM])\s*-?\s*(\d)\b/);   // A 1, A-1, M 2, etc.
  if (m) {
    const key = `${m[1]}${m[2]}`;
    return CAMION_COLORS[key] ? key : null;
  }
  return null;
}
function getCamionColor(value) {
  const key = normalizeCamion(value);
  return key ? CAMION_COLORS[key] : "#00AEEF"; // fallback celeste
}

/* ---------------- util ---------------- */
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
    // ⚠️ leemos todas las variantes posibles
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

// Leyenda
function LegendControl() {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const legend = L.control({ position: "bottomleft" });
    legend.onAdd = () => {
      const div = L.DomUtil.create("div", "legend-camiones");
      div.innerHTML = CAMION_ORDER
        .map((k) => `<span class="leg-item"><i style="background:${CAMION_COLORS[k]}"></i>${k}</span>`)
        .join(" ");
      return div;
    };
    legend.addTo(map);
    return () => legend.remove();
  }, [map]);
  return null;
}

export default function Mapa() {
  const [puntos, setPuntos] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setError("");

      // 1) DB
      try {
        const { data } = await axios.get(`${API_URL}/rutas-activas`, { timeout: 15000 });
        const arr = Array.isArray(data) ? data : [];
        const norm = arr.map(normaliza).filter(p => Number.isFinite(p.latitud) && Number.isFinite(p.longitud));
        if (norm.length > 0) {
          setPuntos(norm);
          window.__PUNTOS = norm;
          console.log("Camiones únicos (DB):", [...new Set(norm.map(x => x.camion))]);
          return;
        }
      } catch (e) {
        console.warn("DB /rutas-activas error:", e?.message || e);
      }

      // 2) Fallback JSON
      const rutasJSON = [
        "/datos/RutasMapaFinal_con_telefono.json",
        "/data/RutasMapaFinal_con_telefono.json",
      ];
      for (const ruta of rutasJSON) {
        try {
          const { data } = await axios.get(ruta, { timeout: 15000 });
          const arr = Array.isArray(data) ? data : [];
          const norm = arr.map(normaliza).filter(p => Number.isFinite(p.latitud) && Number.isFinite(p.longitud));
          if (norm.length > 0) {
            setPuntos(norm);
            window.__PUNTOS = norm;
            console.log("Camiones únicos (JSON):", [...new Set(norm.map(x => x.camion))]);
            return;
          }
        } catch {}
      }

      setPuntos([]);
      setError("No se pudieron cargar puntos ni de la DB ni del archivo local.");
    })();
  }, []);

  const marcadores = useMemo(
    () =>
      puntos.map((p, i) => ({
        key: p.id ?? i,
        lat: p.latitud,
        lon: p.longitud,
        nombre: p.nombre,
        camion: p.camion,
        dia: p.dia,
        litros: p.litros,
        telefono: p.telefono,
      })),
    [puntos]
  );

  const center = [-33.07, -71.63];

  return (
    <main style={{ padding: 20 }}>
      <h2 className="titulo">Mapa de Rutas Activas</h2>
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <MapContainer center={center} zoom={13} style={{ height: "70vh", width: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <LegendControl />

        {marcadores.map((m) => {
          const cam = normalizeCamion(m.camion);
          const color = getCamionColor(cam);
          const size = cam === "M3" ? 14 : 12;
          const icon = crearIcono(color, size, "#ffffff");
          return (
            <Marker key={m.key} position={[m.lat, m.lon]} icon={icon}>
              <Popup>
                <strong>{m.nombre ?? "Sin nombre"}</strong><br />
                Camión: {cam || "-"}<br />
                Día: {m.dia ?? "-"}<br />
                Litros: {m.litros ?? 0}<br />
                Tel: {m.telefono ?? "-"}
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <style>{`
        .legend-camiones{
          background:#fff;padding:6px 8px;border-radius:6px;
          box-shadow:0 1px 4px rgba(0,0,0,.2);font:12px/14px system-ui, Arial, sans-serif;
        }
        .legend-camiones .leg-item{margin-right:10px;display:inline-flex;align-items:center;}
        .legend-camiones i{
          width:10px;height:10px;border-radius:50%;display:inline-block;margin-right:6px;
          border:1px solid rgba(0,0,0,.25);
        }
      `}</style>
    </main>
  );
}
