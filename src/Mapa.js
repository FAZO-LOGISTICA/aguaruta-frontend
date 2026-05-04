// src/Mapa.js — AguaRuta v2.9.8
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  MapContainer, TileLayer, Marker, Popup,
  Polyline, Polygon, useMap, Tooltip,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { getCamionColor, normalizeCamion } from "./config/camionColors";
import { apiMethods } from "./services/api";
import "./App.css";

// ─── Constantes ───────────────────────────────────────────────────────────────
const VIGIA = { lat: -33.054015, lng: -71.648879, nombre: "El Vigía (Base)" };

const DIAS_ORDEN = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const COLORES_DIA = {
  Lunes:      { fill: "#B5D4F4", stroke: "#185FA5", fillOpacity: 0.35 },
  Martes:     { fill: "#9FE1CB", stroke: "#0F6E56", fillOpacity: 0.35 },
  Miércoles:  { fill: "#FAC775", stroke: "#BA7517", fillOpacity: 0.35 },
  Jueves:     { fill: "#F5C4B3", stroke: "#993C1D", fillOpacity: 0.35 },
  Viernes:    { fill: "#CECBF6", stroke: "#534AB7", fillOpacity: 0.35 },
  Sábado:     { fill: "#F4C0D1", stroke: "#993556", fillOpacity: 0.35 },
};

// ─── Helpers fetch ────────────────────────────────────────────────────────────
async function fetchRutasActivas(intentos = 3) {
  let delay = 1500;
  for (let i = 0; i < intentos; i++) {
    try { return await apiMethods.getRutasActivas(); }
    catch (e) {
      if (i === intentos - 1) throw e;
      await new Promise((r) => setTimeout(r, delay));
      delay *= 2;
    }
  }
}

function normaliza(r, idx) {
  const latRaw = r.latitud ?? r.lat ?? r.latitude ?? r.Latitud ?? "";
  const lonRaw = r.longitud ?? r.lon ?? r.lng ?? r.longitude ?? r.Longitud ?? "";
  const lat = Number(String(latRaw).replace(",", "."));
  const lon = Number(String(lonRaw).replace(",", "."));
  const dia = r.dia_asignado ?? r.dia ?? r.DIA ?? r.diaAsignado ?? "";
  return {
    id: r.id ?? idx + 1,
    camion: r.camion ?? r.CAMION ?? r.camion_asignado ?? r.id_camion ?? "",
    nombre: r.nombre ?? r.NOMBRE ?? r.jefe_hogar ?? r.jefe ?? "",
    litros: Number(r.litros ?? r.LITROS ?? r.litros_de_entrega ?? 0),
    telefono: r.telefono ?? r.TELEFONO ?? r.phone ?? "",
    dia,
    latitud:  isNaN(lat) || lat === 0 ? null : lat,
    longitud: isNaN(lon) || lon === 0 ? null : lon,
  };
}

// ─── Algoritmos geo ───────────────────────────────────────────────────────────
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Nearest neighbor partiendo siempre desde El Vigía
function nearestNeighborDesdeVigia(pts) {
  if (!pts.length) return [];
  const visited = new Array(pts.length).fill(false);
  const order = [];
  let curLat = VIGIA.lat, curLon = VIGIA.lng;
  for (let s = 0; s < pts.length; s++) {
    let best = -1, bestD = Infinity;
    for (let i = 0; i < pts.length; i++) {
      if (!visited[i]) {
        const d = haversineKm(curLat, curLon, pts[i].latitud, pts[i].longitud);
        if (d < bestD) { bestD = d; best = i; }
      }
    }
    if (best >= 0) {
      visited[best] = true;
      order.push(best);
      curLat = pts[best].latitud;
      curLon = pts[best].longitud;
    }
  }
  return order.map(i => pts[i]);
}

function convexHull(pts) {
  if (pts.length < 3) return pts.map(p => [p.latitud, p.longitud]);
  const sorted = [...pts].sort((a, b) => a.latitud - b.latitud || a.longitud - b.longitud);
  const cross = (o, a, b) =>
    (a.latitud - o.latitud) * (b.longitud - o.longitud) -
    (a.longitud - o.longitud) * (b.latitud - o.latitud);
  const lower = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (const p of [...sorted].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  upper.pop(); lower.pop();
  return [...lower, ...upper].map(p => [p.latitud, p.longitud]);
}

function formatMin(min) {
  const h = Math.floor(Math.abs(min) / 60);
  const m = Math.round(Math.abs(min) % 60);
  if (h === 0) return `${m} min`;
  return `${h}h ${m > 0 ? m + "min" : ""}`;
}

function addMinutes(hhmm, mins) {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + Math.round(mins);
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

// Calcula toda la optimización de una ruta camión+día
function calcularOptimizacion(puntosDia, params) {
  const { descMin, descMax, vel, horaIni, horaFin } = params;
  if (!puntosDia.length) return null;

  const ruta = nearestNeighborDesdeVigia(puntosDia);

  // Distancia Vigía → primera parada
  const dVigia1 = haversineKm(VIGIA.lat, VIGIA.lng, ruta[0].latitud, ruta[0].longitud);
  // Distancias entre paradas
  let distRuta = 0;
  for (let i = 1; i < ruta.length; i++)
    distRuta += haversineKm(ruta[i - 1].latitud, ruta[i - 1].longitud, ruta[i].latitud, ruta[i].longitud);
  // Distancia última parada → Vigía
  const dUltimaVigia = haversineKm(
    ruta[ruta.length - 1].latitud, ruta[ruta.length - 1].longitud,
    VIGIA.lat, VIGIA.lng
  );

  const distTotal = dVigia1 + distRuta + dUltimaVigia;
  const tMovTotal = (distTotal / vel) * 60;
  const tDescMin  = ruta.length * descMin;
  const tDescMax  = ruta.length * descMax;
  const totalMin  = tMovTotal + tDescMin;
  const totalMax  = tMovTotal + tDescMax;

  const [hI, mI] = horaIni.split(":").map(Number);
  const [hF, mF] = horaFin.split(":").map(Number);
  const jornadaMin = (hF * 60 + mF) - (hI * 60 + mI);
  const margen = jornadaMin - totalMax;
  const tPorPuntoExtra = (distRuta / Math.max(ruta.length, 1) / vel) * 60 + (descMin + descMax) / 2;
  const puntosExtra = Math.max(0, Math.floor(margen / tPorPuntoExtra));
  const uso = Math.round((totalMax / jornadaMin) * 100);

  // Cronograma
  const cronograma = [];
  let hora = horaIni;
  cronograma.push({ hora, txt: "Salida El Vigía", tipo: "base" });
  hora = addMinutes(hora, (dVigia1 / vel) * 60);
  for (let i = 0; i < ruta.length; i++) {
    if (i > 0) {
      const d = haversineKm(ruta[i-1].latitud, ruta[i-1].longitud, ruta[i].latitud, ruta[i].longitud);
      hora = addMinutes(hora, (d / vel) * 60);
    }
    cronograma.push({ hora, txt: `${i + 1}. ${ruta[i].nombre} · ${ruta[i].litros}L`, tipo: "parada" });
    hora = addMinutes(hora, (descMin + descMax) / 2);
  }
  hora = addMinutes(hora, (dUltimaVigia / vel) * 60);
  cronograma.push({ hora, txt: "Regreso El Vigía", tipo: "base" });

  // Polyline completa incluyendo Vigía inicio y fin
  const lineaRuta = [
    [VIGIA.lat, VIGIA.lng],
    ...ruta.map(p => [p.latitud, p.longitud]),
    [VIGIA.lat, VIGIA.lng],
  ];

  return {
    ruta, distTotal: distTotal.toFixed(1), tMovTotal,
    totalMin, totalMax, jornadaMin, puntosExtra, uso,
    cronograma, lineaRuta,
    dVigia1: dVigia1.toFixed(2), dUltimaVigia: dUltimaVigia.toFixed(2),
  };
}

// ─── Marcador El Vigía ────────────────────────────────────────────────────────
function iconoVigia() {
  return new L.DivIcon({
    className: "custom-marker",
    html: `<div style="width:18px;height:18px;background:#1e40af;border-radius:4px;border:3px solid #fff;transform:rotate(45deg);"></div>`,
    iconSize: [18, 18], iconAnchor: [9, 9], popupAnchor: [0, -9],
  });
}

function iconoNumero(color, num) {
  return new L.DivIcon({
    className: "custom-marker",
    html: `<div style="width:22px;height:22px;background:${color};border-radius:50%;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;line-height:1;">${num}</div>`,
    iconSize: [22, 22], iconAnchor: [11, 11], popupAnchor: [0, -11],
  });
}

function crearIcono(color = "#007bff", size = 12) {
  const s = Math.max(8, Math.min(18, Number(size) || 12));
  return new L.DivIcon({
    className: "custom-marker",
    html: `<div style="width:${s}px;height:${s}px;background:${color};border-radius:50%;border:2px solid #fff;"></div>`,
    iconSize: [s, s], iconAnchor: [s / 2, s / 2], popupAnchor: [0, -s / 2],
  });
}

// ─── Leyenda camiones ─────────────────────────────────────────────────────────
function LegendControl({ items }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const legend = L.control({ position: "bottomleft" });
    legend.onAdd = () => {
      const div = L.DomUtil.create("div", "legend-camiones");
      div.innerHTML = items
        .map(({ camion, color }) => `<span class="leg-item"><i style="background:${color}"></i>${camion}</span>`)
        .join(" ");
      return div;
    };
    legend.addTo(map);
    return () => legend.remove();
  }, [map, items]);
  return null;
}

// ─── Panel Optimizador ────────────────────────────────────────────────────────
function PanelOptimizador({ puntos, camionesDisponibles, onClose }) {
  const [camion,   setCamion]   = useState(camionesDisponibles[0] ?? "A1");
  const [dia,      setDia]      = useState("Lunes");
  const [descMin,  setDescMin]  = useState(5);
  const [descMax,  setDescMax]  = useState(10);
  const [vel,      setVel]      = useState(25);
  const [horaIni,  setHoraIni]  = useState("07:00");
  const [horaFin,  setHoraFin]  = useState("17:00");

  const puntosBase = useMemo(() =>
    puntos.filter(p =>
      normalizeCamion(p.camion) === camion &&
      (p.dia ?? "").trim().toLowerCase() === dia.toLowerCase()
    ), [puntos, camion, dia]
  );

  const resultado = useMemo(() => {
    if (!puntosBase.length) return null;
    return calcularOptimizacion(puntosBase, { descMin, descMax, vel, horaIni, horaFin });
  }, [puntosBase, descMin, descMax, vel, horaIni, horaFin]);

  const colorCamion = getCamionColor(camion);

  const panelStyle = {
    position: "absolute", top: 0, right: 0, width: 310, height: "100%",
    background: "rgba(8,16,32,0.96)", backdropFilter: "blur(10px)",
    borderLeft: "1px solid rgba(100,160,255,0.2)", zIndex: 1000,
    overflowY: "auto", padding: "14px 14px 24px", boxSizing: "border-box",
    fontFamily: "sans-serif",
  };
  const lbl  = { fontSize: 11, color: "#64748b", display: "block", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.05em" };
  const selS = {
    width: "100%", fontSize: 13, padding: "5px 7px",
    background: "rgba(20,35,60,0.9)", color: "#e2e8f0",
    border: "1px solid rgba(100,160,255,0.25)", borderRadius: 6, marginBottom: 10,
  };
  const slRow = { display: "flex", alignItems: "center", gap: 8, marginBottom: 10 };
  const slVal = { fontSize: 12, fontWeight: 700, color: "#93c5fd", minWidth: 44, textAlign: "right" };

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#93c5fd" }}>Optimizador de ruta</p>
          <p style={{ margin: 0, fontSize: 11, color: "#475569" }}>Nearest Neighbor · desde El Vigía</p>
        </div>
        <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#475569", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
      </div>

      {/* Selectores */}
      <label style={lbl}>Camión</label>
      <select value={camion} onChange={e => setCamion(e.target.value)} style={selS}>
        {camionesDisponibles.map(c => <option key={c}>{c}</option>)}
      </select>

      <label style={lbl}>Día</label>
      <select value={dia} onChange={e => setDia(e.target.value)} style={selS}>
        {DIAS_ORDEN.map(d => <option key={d}>{d}</option>)}
      </select>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
        <div>
          <label style={lbl}>Inicio jornada</label>
          <input type="time" value={horaIni} onChange={e => setHoraIni(e.target.value)}
            style={{ ...selS, marginBottom: 0 }} />
        </div>
        <div>
          <label style={lbl}>Fin jornada</label>
          <input type="time" value={horaFin} onChange={e => setHoraFin(e.target.value)}
            style={{ ...selS, marginBottom: 0 }} />
        </div>
      </div>

      <label style={lbl}>Descarga por cliente</label>
      <div style={slRow}>
        <span style={{ fontSize: 11, color: "#475569", minWidth: 24 }}>min</span>
        <input type="range" min={1} max={20} value={descMin} step={1} style={{ flex: 1 }} onChange={e => setDescMin(+e.target.value)} />
        <span style={slVal}>{descMin} min</span>
      </div>
      <div style={slRow}>
        <span style={{ fontSize: 11, color: "#475569", minWidth: 24 }}>max</span>
        <input type="range" min={1} max={20} value={descMax} step={1} style={{ flex: 1 }} onChange={e => setDescMax(+e.target.value)} />
        <span style={slVal}>{descMax} min</span>
      </div>

      <label style={lbl}>Velocidad promedio</label>
      <div style={slRow}>
        <input type="range" min={10} max={60} value={vel} step={5} style={{ flex: 1 }} onChange={e => setVel(+e.target.value)} />
        <span style={slVal}>{vel} km/h</span>
      </div>

      <div style={{ height: 1, background: "rgba(100,160,255,0.1)", margin: "12px 0" }} />

      {/* Sin datos */}
      {!resultado && (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <p style={{ color: "#f87171", fontSize: 13 }}>Sin puntos para {camion} el {dia}</p>
        </div>
      )}

      {/* Resultados */}
      {resultado && (
        <>
          {/* Métricas */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 12 }}>
            {[
              { label: "Paradas",      val: resultado.ruta.length,   sub: camion + " · " + dia,          color: "#e2e8f0" },
              { label: "Distancia",    val: resultado.distTotal+" km", sub: "ruta completa c/Vigía",      color: "#e2e8f0" },
              { label: "Tiempo total", val: formatMin(resultado.totalMin)+" – "+formatMin(resultado.totalMax),
                sub: "de " + formatMin(resultado.jornadaMin) + " jornada",
                color: resultado.uso > 100 ? "#f87171" : resultado.uso > 90 ? "#fcd34d" : "#6ee7b7" },
              { label: "Puntos extra", val: resultado.puntosExtra > 0 ? "+ " + resultado.puntosExtra : "0",
                sub: resultado.puntosExtra > 0 ? "caben en jornada" : "jornada al límite",
                color: resultado.puntosExtra > 0 ? "#6ee7b7" : "#f87171" },
            ].map(({ label, val, sub, color }) => (
              <div key={label} style={{ background: "rgba(20,35,60,0.8)", borderRadius: 8, padding: "8px 10px" }}>
                <p style={{ fontSize: 10, color: "#475569", margin: "0 0 3px", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</p>
                <p style={{ fontSize: 13, fontWeight: 700, margin: "0 0 2px", color }}>{val}</p>
                <p style={{ fontSize: 10, color: "#334155", margin: 0 }}>{sub}</p>
              </div>
            ))}
          </div>

          {/* Barra uso jornada */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>Uso de jornada</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: resultado.uso > 100 ? "#f87171" : resultado.uso > 90 ? "#fcd34d" : "#6ee7b7" }}>{resultado.uso}%</span>
            </div>
            <div style={{ background: "rgba(20,35,60,0.8)", borderRadius: 4, height: 8, overflow: "hidden" }}>
              <div style={{
                width: Math.min(resultado.uso, 100) + "%", height: "100%", borderRadius: 4,
                background: resultado.uso > 100 ? "#ef4444" : resultado.uso > 90 ? "#f59e0b" : "#10b981",
                transition: "width 0.4s ease",
              }} />
            </div>
          </div>

          {/* Info Vigía */}
          <div style={{ background: "rgba(24,95,165,0.15)", border: "1px solid rgba(24,95,165,0.3)", borderRadius: 8, padding: "8px 10px", marginBottom: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#93c5fd", margin: "0 0 4px" }}>Desde El Vigía</p>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, color: "#64748b" }}>Ida al primer punto</span>
              <span style={{ fontSize: 11, color: "#cbd5e1" }}>{resultado.dVigia1} km · {formatMin((resultado.dVigia1 / vel) * 60)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, color: "#64748b" }}>Regreso desde último</span>
              <span style={{ fontSize: 11, color: "#cbd5e1" }}>{resultado.dUltimaVigia} km · {formatMin((resultado.dUltimaVigia / vel) * 60)}</span>
            </div>
          </div>

          {/* Cronograma */}
          <p style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>
            Cronograma estimado
          </p>
          <div style={{ borderLeft: "2px solid rgba(24,95,165,0.3)", paddingLeft: 12 }}>
            {resultado.cronograma.map((item, i) => (
              <div key={i} style={{ marginBottom: 7, position: "relative" }}>
                <div style={{
                  position: "absolute", left: -17, top: 4,
                  width: 8, height: 8, borderRadius: "50%",
                  background: item.tipo === "base" ? "#185FA5" : colorCamion,
                  border: "1.5px solid rgba(8,16,32,0.9)",
                }} />
                <span style={{ fontSize: 10, color: "#475569", marginRight: 6, fontVariantNumeric: "tabular-nums" }}>{item.hora}</span>
                <span style={{ fontSize: 11, color: item.tipo === "base" ? "#93c5fd" : "#cbd5e1" }}>{item.txt}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Panel Polígonos ──────────────────────────────────────────────────────────
function PanelPoligonos({ puntos, camionesDisponibles, onClose }) {
  const [camion,    setCamion]    = useState(camionesDisponibles[0] ?? "A1");
  const [diasOn,    setDiasOn]    = useState(new Set(DIAS_ORDEN));
  const [showTotal, setShowTotal] = useState(true);

  const toggle = (d) => setDiasOn(prev => {
    const n = new Set(prev); n.has(d) ? n.delete(d) : n.add(d); return n;
  });

  const pCamion = useMemo(() =>
    puntos.filter(p => normalizeCamion(p.camion) === camion),
    [puntos, camion]
  );

  const diasActivos = useMemo(() =>
    DIAS_ORDEN.filter(d => pCamion.some(p => (p.dia ?? "").trim().toLowerCase() === d.toLowerCase())),
    [pCamion]
  );

  const hullTotal = useMemo(() => convexHull(pCamion), [pCamion]);

  const hullsPorDia = useMemo(() =>
    Object.fromEntries(
      diasActivos.map(d => {
        const pts = pCamion.filter(p => (p.dia ?? "").trim().toLowerCase() === d.toLowerCase());
        return [d, convexHull(pts)];
      })
    ), [pCamion, diasActivos]
  );

  const stats = useMemo(() => ({
    total:  pCamion.length,
    litros: pCamion.reduce((s, p) => s + p.litros, 0),
    dias:   diasActivos.length,
  }), [pCamion, diasActivos]);

  const selS = {
    width: "100%", fontSize: 13, padding: "5px 7px",
    background: "rgba(20,35,60,0.9)", color: "#e2e8f0",
    border: "1px solid rgba(100,160,255,0.25)", borderRadius: 6, marginBottom: 10,
  };

  return (
    <>
      {/* Polígonos en el mapa */}
      {showTotal && hullTotal.length >= 3 && (
        <Polygon positions={hullTotal}
          pathOptions={{ color: "#6a8c6a", fillColor: "rgba(100,140,100,0.08)", weight: 2, dashArray: "8,4" }}>
          <Tooltip sticky>Zona total {camion}</Tooltip>
        </Polygon>
      )}
      {diasActivos.map(d => {
        if (!diasOn.has(d)) return null;
        const hull = hullsPorDia[d];
        if (hull.length < 3) return null;
        const c = COLORES_DIA[d] ?? { fill: "#ddd", stroke: "#999", fillOpacity: 0.3 };
        return (
          <Polygon key={d} positions={hull}
            pathOptions={{ color: c.stroke, fillColor: c.fill, fillOpacity: c.fillOpacity, weight: 2 }}>
            <Tooltip sticky>{d} · {pCamion.filter(p => (p.dia ?? "").toLowerCase() === d.toLowerCase()).length} puntos</Tooltip>
          </Polygon>
        );
      })}

      {/* Panel lateral */}
      <div style={{
        position: "absolute", top: 0, right: 0, width: 220, height: "100%",
        background: "rgba(8,16,32,0.96)", backdropFilter: "blur(10px)",
        borderLeft: "1px solid rgba(100,160,255,0.2)", zIndex: 1000,
        overflowY: "auto", padding: "14px 14px 24px", boxSizing: "border-box",
        fontFamily: "sans-serif",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#93c5fd" }}>Zonas de reparto</p>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#475569", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.05em" }}>Camión</label>
        <select value={camion} onChange={e => setCamion(e.target.value)} style={selS}>
          {camionesDisponibles.map(c => <option key={c}>{c}</option>)}
        </select>

        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#64748b", marginBottom: 12, cursor: "pointer" }}>
          <input type="checkbox" checked={showTotal} onChange={e => setShowTotal(e.target.checked)} />
          Mostrar zona total semana
        </label>

        <p style={{ fontSize: 10, color: "#334155", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>Días activos</p>
        {diasActivos.map(d => {
          const c = COLORES_DIA[d] ?? { fill: "#ddd", stroke: "#999" };
          const nPts = pCamion.filter(p => (p.dia ?? "").toLowerCase() === d.toLowerCase()).length;
          return (
            <label key={d} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={diasOn.has(d)} onChange={() => toggle(d)} />
              <span style={{ width: 10, height: 10, borderRadius: 2, flexShrink: 0, background: c.fill, border: "1.5px solid " + c.stroke, display: "inline-block" }} />
              <span style={{ fontSize: 12, color: "#cbd5e1", flex: 1 }}>{d}</span>
              <span style={{ fontSize: 11, color: "#475569" }}>{nPts}</span>
            </label>
          );
        })}

        <div style={{ height: 1, background: "rgba(100,160,255,0.1)", margin: "10px 0" }} />

        <p style={{ fontSize: 10, color: "#334155", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>Resumen {camion}</p>
        {[
          { label: "Puntos totales", val: stats.total },
          { label: "Días activos",   val: stats.dias },
          { label: "Litros / semana", val: stats.litros + " L" },
          { label: "Prom. por día",  val: stats.dias ? Math.round(stats.total / stats.dias) + " pts" : "—" },
        ].map(({ label, val }) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontSize: 11, color: "#475569" }}>{label}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#e2e8f0" }}>{val}</span>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── Capa de optimización sobre el mapa (rutas dibujadas) ─────────────────────
function CapaOptimizacion({ puntos, camion, dia, params }) {
  const resultado = useMemo(() => {
    const base = puntos.filter(p =>
      normalizeCamion(p.camion) === camion &&
      (p.dia ?? "").trim().toLowerCase() === dia.toLowerCase()
    );
    if (!base.length) return null;
    return calcularOptimizacion(base, params);
  }, [puntos, camion, dia, params]);

  if (!resultado) return null;
  const colorCamion = getCamionColor(camion);

  return (
    <>
      {/* Línea de ruta optimizada */}
      <Polyline
        positions={resultado.lineaRuta}
        pathOptions={{ color: colorCamion, weight: 3, opacity: 0.85, dashArray: "6,4" }}
      />
      {/* Marcadores numerados */}
      {resultado.ruta.map((p, i) => (
        <Marker
          key={p.id ?? i}
          position={[p.latitud, p.longitud]}
          icon={iconoNumero(colorCamion, i + 1)}
        >
          <Popup>
            <strong>#{i + 1} · {p.nombre}</strong><br />
            Camión: {camion} · {dia}<br />
            Litros: {p.litros} L<br />
            Tel: {p.telefono ?? "—"}<br />
            Hora aprox: {resultado.cronograma[i + 1]?.hora ?? "—"}
          </Popup>
        </Marker>
      ))}
    </>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Mapa() {
  const [puntos,   setPuntos]   = useState([]);
  const [error,    setError]    = useState("");
  const [cargando, setCargando] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [query,    setQuery]    = useState("");
  const [panelAct, setPanelAct] = useState(null); // null | "optimizador" | "poligonos"

  // Parámetros optimizador (compartidos entre panel y capa mapa)
  const [optParams] = useState({ descMin: 5, descMax: 10, vel: 25, horaIni: "07:00", horaFin: "17:00" });
  const [optCamion, setOptCamion] = useState(null);
  const [optDia,    setOptDia]    = useState("Lunes");

  useEffect(() => {
    (async () => {
      setCargando(true); setError("");
      try {
        const arr = await fetchRutasActivas(3);
        if (!Array.isArray(arr) || arr.length === 0) {
          setError("⚠️ El backend no devolvió puntos."); setCargando(false); return;
        }
        const norm = arr.map(normaliza).filter(p => p.latitud !== null && p.longitud !== null);
        setPuntos(norm);
      } catch {
        setError("⚠️ No se pudieron cargar los puntos del backend.");
      } finally { setCargando(false); }
    })();
  }, []);

  const marcadores = useMemo(() => puntos.map((p, i) => ({
    key: p.id ?? i, lat: p.latitud, lon: p.longitud,
    nombre: p.nombre, camion: normalizeCamion(p.camion),
    dia: p.dia, litros: p.litros, telefono: p.telefono,
  })), [puntos]);

  const allCamiones = useMemo(() => {
    const set = new Set();
    for (const m of marcadores) if (m.camion) set.add(m.camion);
    return [...set].sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
  }, [marcadores]);

  useEffect(() => {
    if (allCamiones.length) {
      if (selected.size === 0) setSelected(new Set(allCamiones));
      if (!optCamion) setOptCamion(allCamiones[0]);
    }
  }, [allCamiones.length]);

  const toggleCamion = (c) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(c)) next.delete(c); else next.add(c);
    return next;
  });
  const selectAll  = () => setSelected(new Set(allCamiones));
  const selectNone = () => setSelected(new Set());
  const invert     = () => {
    const next = new Set();
    allCamiones.forEach(c => { if (!selected.has(c)) next.add(c); });
    setSelected(next);
  };

  const filteredMarcadores = useMemo(() => {
    const q = query.toLowerCase().trim();
    return marcadores.filter(m =>
      selected.has(m.camion) && (!q ||
        m.nombre?.toLowerCase().includes(q) ||
        m.camion?.toLowerCase().includes(q) ||
        m.dia?.toLowerCase().includes(q))
    );
  }, [marcadores, selected, query]);

  const legendItems = useMemo(() =>
    (selected.size ? allCamiones.filter(c => selected.has(c)) : allCamiones)
      .map(c => ({ camion: c, color: getCamionColor(c) })),
    [allCamiones, selected]
  );

  const exportarKML = () => {
    if (!filteredMarcadores.length) { alert("No hay puntos visibles para exportar."); return; }
    const placemarks = filteredMarcadores.map(m => `
      <Placemark>
        <name>${m.nombre || "Sin nombre"}</name>
        <description><![CDATA[Camión: ${m.camion}<br/>Día: ${m.dia}<br/>Litros: ${m.litros}<br/>Teléfono: ${m.telefono}]]></description>
        <Point><coordinates>${m.lon},${m.lat},0</coordinates></Point>
      </Placemark>`).join("\n");
    const kml = `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>Rutas Activas AguaRuta</name>${placemarks}</Document></kml>`;
    const blob = new Blob([kml], { type: "application/vnd.google-earth.kml+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "rutas_activas.kml";
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const abrirPanel = (nombre) => setPanelAct(prev => prev === nombre ? null : nombre);

  return (
    <div className="main-container fade-in">
      <h2 className="titulo">🗺️ Mapa de Rutas Activas</h2>

      {cargando && <p style={{ color: "#64748b", textAlign: "center", marginBottom: 12 }}>⏳ Cargando puntos del mapa...</p>}
      {error    && <p style={{ color: "#ef4444", textAlign: "center", marginBottom: 12 }}>{error}</p>}
      {!cargando && !error && (
        <p style={{ color: "#16a34a", fontWeight: 600, marginBottom: 12, fontSize: 13 }}>
          ✅ {puntos.length} beneficiarios cargados · {filteredMarcadores.length} visibles
        </p>
      )}

      <div className="filtros-camion">
        <div className="fila-1">
          <strong>Buscar / Filtrar:</strong>
          <div className="acciones">
            <button onClick={selectAll}>Todos</button>
            <button onClick={selectNone}>Ninguno</button>
            <button onClick={invert}>Invertir</button>
          </div>
          <input className="buscador" placeholder="Buscar por nombre, camión o día"
            value={query} onChange={e => setQuery(e.target.value)} />
          <button onClick={exportarKML}>🌍 Exportar KML</button>

          {/* Botones nuevos paneles */}
          <button
            onClick={() => abrirPanel("optimizador")}
            style={{
              background: panelAct === "optimizador" ? "#185FA5" : "transparent",
              color: panelAct === "optimizador" ? "#fff" : undefined,
              border: "1px solid #185FA5", borderRadius: 6, padding: "4px 10px",
              fontSize: 12, cursor: "pointer", fontWeight: 600,
            }}>
            🔀 Optimizar ruta
          </button>
          <button
            onClick={() => abrirPanel("poligonos")}
            style={{
              background: panelAct === "poligonos" ? "#0F6E56" : "transparent",
              color: panelAct === "poligonos" ? "#fff" : undefined,
              border: "1px solid #0F6E56", borderRadius: 6, padding: "4px 10px",
              fontSize: 12, cursor: "pointer", fontWeight: 600,
            }}>
            🗺️ Zonas
          </button>

          <span className="contador">Mostrando {filteredMarcadores.length} / {marcadores.length} puntos</span>
        </div>
        <div className="chips">
          {allCamiones.map(c => {
            const on = selected.has(c);
            const color = getCamionColor(c);
            return (
              <button key={c} className={`chip ${on ? "on" : ""}`} onClick={() => toggleCamion(c)}>
                <i style={{ background: color }} /> {c}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mapa + paneles superpuestos */}
      <div style={{ position: "relative" }}>
        <MapContainer
          center={[VIGIA.lat, VIGIA.lng]} zoom={13}
          style={{ height: "65vh", width: "100%", borderRadius: 12 }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          <LegendControl items={legendItems} />

          {/* Marcador El Vigía siempre visible */}
          <Marker position={[VIGIA.lat, VIGIA.lng]} icon={iconoVigia()}>
            <Popup>
              <strong>El Vigía</strong><br />
              Base de operaciones<br />
              Punto de inicio y retorno de todos los camiones
            </Popup>
          </Marker>

          {/* Puntos normales (cuando NO hay optimizador activo) */}
          {panelAct !== "optimizador" && filteredMarcadores.map(m => (
            <Marker key={m.key} position={[m.lat, m.lon]} icon={crearIcono(getCamionColor(m.camion), 12)}>
              <Popup>
                <strong>{m.nombre ?? "Sin nombre"}</strong><br />
                Camión: {m.camion || "—"}<br />
                Día: {m.dia ?? "—"}<br />
                Litros: {m.litros ?? 0}<br />
                Tel: {m.telefono ?? "—"}
              </Popup>
            </Marker>
          ))}

          {/* Capa optimizador: ruta numerada + polyline */}
          {panelAct === "optimizador" && optCamion && (
            <CapaOptimizacion
              puntos={puntos}
              camion={optCamion}
              dia={optDia}
              params={optParams}
            />
          )}

          {/* Polígonos de zonas */}
          {panelAct === "poligonos" && allCamiones.length > 0 && (
            <PanelPoligonos
              puntos={puntos}
              camionesDisponibles={allCamiones}
              onClose={() => setPanelAct(null)}
            />
          )}
        </MapContainer>

        {/* Panel optimizador (fuera del MapContainer para scroll) */}
        {panelAct === "optimizador" && (
          <PanelOptimizador
            puntos={puntos}
            camionesDisponibles={allCamiones}
            onClose={() => setPanelAct(null)}
          />
        )}
      </div>
    </div>
  );
}
