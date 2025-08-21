// src/Mapa.js
import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import API_URL from "./config";
import "./App.css";

// Paleta y helper de colores
import { CAMION_COLORS, CAMION_ORDER, getCamionColor } from "./config/camionColors";

// ---------- util ----------
const toNum = (v) => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim().replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

function normaliza(r, idx) {
  const lat = r.latitud ?? r.lat ?? r.latitude ?? r.Latitud ?? null;
  const lon = r.longitud ?? r.lon ?? r.lng ?? r.longitude ?? r.Longitud ?? null;
  const dia = r.dia_asignado ?? r.dia ?? r.DIA ?? r.diaAsignado ?? null;

  return {
    id: r.id ?? idx + 1,
    // 👇 clave extra para el JSON fallback
    camion: r.camion ?? r.CAMION ?? r.camion_asignado ?? r.id_camion ?? null,
    nombre: r.nombre ?? r.NOMBRE ?? r.jefe_hogar ?? r.jefe ?? null,
    litros: toNum(r.litros ?? r.LITROS ?? r.litros_de_entrega),
    telefono: r.telefono ?? r.TELEFONO ?? r.phone ?? null,
    dia,
    latitud: toNum(lat),
    longitud: toNum(lon),
  };
}

// Icono redondo coloreado
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

// Control de leyenda (mismos colores que Mapa Redistribución)
function LegendControl() {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const legend = L.control({ position: "bottomleft" });
    legend.onAdd = () => {
      const div = L.DomUtil.create("div", "legend-camiones");
      div.innerHTML = CAMION_ORDER
        .filter((k) => CAMION_COLORS[k])
        .map(
          (k) =>
            `<span class="leg-item"><i style="background:${CAMION_COLORS[k]}"></i>${k}</span>`
        )
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

      // 🔥 Warm-up para Render: evita el ERR_FAILED/CORS al primer hit
      await axios.get(`${API_URL}/health`, { timeout: 8000 }).catch(() => {});

      // 1) DB: /rutas-activas
      try {
        const { data } = await axios.get(`${API_URL}/rutas-activas`, { timeout: 15000 });
        const arr = Array.isArray(data) ? data : [];
        const norm = arr
          .map(normaliza)
          .filter((p) => Number.isFinite(p.latitud) && Number.isFinite(p.longitud));
        if (norm.length > 0) {
          setPuntos(norm);
          return;
        }
      } catch (e) {
        console.warn("DB /rutas-activas error:", e?.message || e);
      }

      // 2) Fallback JSON estático en public/
      const rutasJSON = [
        "/datos/RutasMapaFinal_con_telefono.json",
        "/data/RutasMapaFinal_con_telefono.json",
      ];
      for (const ruta of rutasJSON) {
        try {
          const { data } = await axios.get(ruta, { timeout: 15000 });
          const arr = Array.isArray(data) ? data : [];
          const norm = arr
            .map(normaliza)
            .filter((p) => Number.isFinite(p.latitud) && Number.isFinite(p.longitud));
          if (norm.length > 0) {
            setPuntos(norm);
            return;
          }
        } catch {
          // prueba la siguiente ruta
        }
      }

      setPuntos([]);
      setError("No se pudieron cargar puntos ni de la DB ni del archivo local.");
    })();
  }, []);

  const marcadores = useMemo(() => {
    const arr = puntos.map((p, i) => ({
      key: p.id ?? i,
      lat: p.latitud,
      lon: p.longitud,
      nombre: p.nombre,
      camion: p.camion,
      dia: p.dia,
      litros: p.litros,
      telefono: p.telefono,
    }));
    // (opcional) no-M3 primero, M3 al final para que quede encima
    return arr.sort((a, b) => {
      const am3 = String(a.camion || "").toUpperCase() === "M3";
      const bm3 = String(b.camion || "").toUpperCase() === "M3";
      return am3 === bm3 ? 0 : am3 ? 1 : -1;
    });
  }, [puntos]);

  const center = [-33.07, -71.63]; // Laguna Verde / Valpo aprox.

  return (
    <main style={{ padding: 20 }}>
      <h2 className="titulo">Mapa de Rutas Activas</h2>
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <MapContainer
        center={center}
        zoom={13}
        style={{ height: "70vh", width: "100%" }}
        preferCanvas={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />

        {/* Leyenda de colores por camión */}
        <LegendControl />

        {marcadores.map((m) => {
          const cam = String(m.camion || "").toUpperCase();
          const color = getCamionColor(cam);
          // M3 un poco más grande y borde blanco para que el negro resalte
          const size = cam === "M3" ? 14 : 12;
          const icon = crearIcono(color, size, "#ffffff");

          return (
            <Marker key={m.key} position={[m.lat, m.lon]} icon={icon}>
              <Popup>
                <strong>{m.nombre ?? "Sin nombre"}</strong>
                <br />
                Camión: {cam || "-"}
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

      {/* Estilos mínimos de la leyenda */}
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
