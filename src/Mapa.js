// src/Mapa.js — AguaRuta v3.0.0
import React, { useState, useEffect, useMemo } from "react";
import {
  MapContainer, TileLayer, Marker, Popup,
  Polyline, Polygon, useMap, Tooltip,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { getCamionColor, normalizeCamion } from "./config/camionColors";
import { apiMethods } from "./services/api";
import "./App.css";

// ─── Constantes operacionales ─────────────────────────────────────────────────
const VIGIA = { lat: -33.054015, lng: -71.648879 };
const CAPACIDAD_L     = 10000;
const MERMA_L         = 50;
const VIGIA_ABRE      = 8  * 60; // 08:00
const VIGIA_COLAC_INI = 13 * 60; // 13:00
const VIGIA_COLAC_FIN = 14 * 60; // 14:00

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
      await new Promise(r => setTimeout(r, delay));
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

// ─── Tiempo ───────────────────────────────────────────────────────────────────
function hhmmToMin(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function minToHhmm(min) {
  const t = Math.max(0, Math.round(min));
  return `${String(Math.floor(t / 60) % 24).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}
function formatMin(min) {
  const v = Math.abs(min);
  const h = Math.floor(v / 60), m = Math.round(v % 60);
  if (h === 0) return `${m} min`;
  return `${h}h${m > 0 ? " " + m + "min" : ""}`;
}

// Dado un instante de llegada + duración de carga, retorna cuándo sale el camión
// considerando apertura 08:00 y colación 13:00-14:00
function calcularSalidaVigia(llegadaMin, durCargaMin) {
  let inicio = llegadaMin;
  if (inicio < VIGIA_ABRE) inicio = VIGIA_ABRE;
  if (inicio >= VIGIA_COLAC_INI && inicio < VIGIA_COLAC_FIN) inicio = VIGIA_COLAC_FIN;
  const espera = inicio - llegadaMin;
  const motivo = llegadaMin < VIGIA_ABRE
    ? "espera apertura 08:00"
    : (llegadaMin >= VIGIA_COLAC_INI && llegadaMin < VIGIA_COLAC_FIN)
      ? "colación 13:00–14:00" : null;
  return { espera, motivo, salida: inicio + durCargaMin };
}

// ─── Geo ──────────────────────────────────────────────────────────────────────
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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
      visited[best] = true; order.push(best);
      curLat = pts[best].latitud; curLon = pts[best].longitud;
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
  const lower = [], upper = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length-2], lower[lower.length-1], p) <= 0) lower.pop();
    lower.push(p);
  }
  for (const p of [...sorted].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length-2], upper[upper.length-1], p) <= 0) upper.pop();
    upper.push(p);
  }
  upper.pop(); lower.pop();
  return [...lower, ...upper].map(p => [p.latitud, p.longitud]);
}

// ─── Motor optimización: UN camión ───────────────────────────────────────────
// vigiaLibreMin: momento en que El Vigía queda libre para atender a este camión
function simularCamion(puntosDia, camion, params, vigiaLibreMin) {
  const { descProm, vel, cargaProm, horaFinMin } = params;

  const ruta = nearestNeighborDesdeVigia(puntosDia);
  const cronograma = [];
  const segmentos  = [];

  // Primera carga: el camión llega a VIGIA_ABRE pero espera si hay fila
  const llegadaInicial = Math.max(VIGIA_ABRE, vigiaLibreMin);
  const { espera: espIni, motivo: motIni, salida: sal0 } =
    calcularSalidaVigia(llegadaInicial, cargaProm);

  let now       = sal0;
  let agua      = CAPACIDAD_L;
  let nViajes   = 1;
  let tEspera   = espIni + (vigiaLibreMin > VIGIA_ABRE ? vigiaLibreMin - VIGIA_ABRE : 0);
  let distTotal = 0;
  let posLat    = VIGIA.lat, posLon = VIGIA.lng;
  let segActual = [[VIGIA.lat, VIGIA.lng]];
  // El Vigía queda libre cuando este camión termina su primera carga
  let vigiaOcupadoHasta = sal0;

  if (tEspera > 0) {
    cronograma.push({ hora: minToHhmm(llegadaInicial - (vigiaLibreMin > VIGIA_ABRE ? vigiaLibreMin - VIGIA_ABRE : 0)),
      tipo: "espera", txt: `Espera ${formatMin(tEspera)} en El Vigía (fila + ${motIni ?? "apertura"})` });
  }
  cronograma.push({ hora: minToHhmm(sal0 - cargaProm), tipo: "carga",
    txt: `Carga #1 · ${formatMin(cargaProm)} · ${CAPACIDAD_L.toLocaleString()} L` });
  cronograma.push({ hora: minToHhmm(sal0), tipo: "base", txt: "Salida desde El Vigía" });

  for (let i = 0; i < ruta.length; i++) {
    const p = ruta[i];
    const consumo = p.litros + MERMA_L;

    if (agua < consumo) {
      const dReg = haversineKm(posLat, posLon, VIGIA.lat, VIGIA.lng);
      const tReg = (dReg / vel) * 60;
      distTotal += dReg; now += tReg;
      segActual.push([VIGIA.lat, VIGIA.lng]);
      segmentos.push({ coords: [...segActual], tipo: "regreso" });
      segActual = [[VIGIA.lat, VIGIA.lng]];

      cronograma.push({ hora: minToHhmm(now), tipo: "regreso",
        txt: `Regreso El Vigía · sin agua (${dReg.toFixed(1)} km · ${formatMin(tReg)})` });

      // Esperar fila si hay otro camión cargando
      const llegadaRecarga = Math.max(now, vigiaOcupadoHasta);
      const { espera, motivo, salida } = calcularSalidaVigia(llegadaRecarga, cargaProm);
      if (espera > 0 || llegadaRecarga > now) {
        const espTotal = (llegadaRecarga - now) + espera;
        tEspera += espTotal;
        if (espTotal > 0) cronograma.push({ hora: minToHhmm(now), tipo: "espera",
          txt: `Espera ${formatMin(espTotal)} · ${motivo ?? "fila"}` });
      }
      now = salida;
      vigiaOcupadoHasta = salida;
      nViajes++; agua = CAPACIDAD_L;
      posLat = VIGIA.lat; posLon = VIGIA.lng;

      cronograma.push({ hora: minToHhmm(now - cargaProm), tipo: "carga",
        txt: `Carga #${nViajes} · ${formatMin(cargaProm)} · ${CAPACIDAD_L.toLocaleString()} L` });
      cronograma.push({ hora: minToHhmm(now), tipo: "base",
        txt: `Salida El Vigía · viaje #${nViajes}` });
    }

    const dP = haversineKm(posLat, posLon, p.latitud, p.longitud);
    distTotal += dP; now += (dP / vel) * 60; agua -= consumo;
    segActual.push([p.latitud, p.longitud]);

    cronograma.push({ hora: minToHhmm(now), tipo: "parada", paradaIdx: i,
      txt: `${i+1}. ${p.nombre} · ${p.litros}L + ${MERMA_L} merma · quedan ${Math.round(agua)}L` });
    now += descProm;
    posLat = p.latitud; posLon = p.longitud;
  }

  const dFin = haversineKm(posLat, posLon, VIGIA.lat, VIGIA.lng);
  distTotal += dFin; now += (dFin / vel) * 60;
  segActual.push([VIGIA.lat, VIGIA.lng]);
  segmentos.push({ coords: [...segActual], tipo: "viaje" });
  cronograma.push({ hora: minToHhmm(now), tipo: "base",
    txt: `Retorno final El Vigía · ${dFin.toFixed(1)} km` });

  const jornadaUsada = now - VIGIA_ABRE;
  const jornadaDisp  = horaFinMin - VIGIA_ABRE;
  const litrosNet    = ruta.reduce((s, p) => s + p.litros, 0);
  const litrosMerma  = ruta.length * MERMA_L;
  const uso          = Math.round((jornadaUsada / jornadaDisp) * 100);

  return {
    camion, ruta, cronograma, segmentos,
    distTotal: distTotal.toFixed(1),
    jornadaUsada, jornadaDisp, uso,
    nViajes, tEspera, litrosNet, litrosMerma,
    salidaFinal: now,        // cuándo termina este camión
    vigiaOcupadoHasta,       // hasta cuándo ocupó el Vigía en su última carga
  };
}

// ─── Motor optimización: FLOTA COMPLETA ──────────────────────────────────────
// Simula todos los camiones del día con cola compartida en El Vigía
function calcularFlota(puntos, dia, params) {
  const { descMin, descMax, vel, cargaMin, cargaMax, horaFin } = params;
  const horaFinMin = hhmmToMin(horaFin);
  const descProm   = (descMin + descMax) / 2;
  const cargaProm  = (cargaMin + cargaMax) / 2;
  const p = { descProm, vel, cargaProm, horaFinMin };

  // Agrupar puntos por camión para el día seleccionado
  const diaLow = dia.toLowerCase();
  const porCamion = {};
  for (const pt of puntos) {
    if ((pt.dia ?? "").trim().toLowerCase() !== diaLow) continue;
    const c = normalizeCamion(pt.camion);
    if (!c) continue;
    if (!porCamion[c]) porCamion[c] = [];
    porCamion[c].push(pt);
  }

  const camiones = Object.keys(porCamion).sort((a, b) =>
    a.localeCompare(b, "es", { numeric: true })
  );
  if (!camiones.length) return null;

  // Simular flota secuencialmente compartiendo la cola del Vigía
  // El Vigía atiende de a uno → vigiaLibre avanza con cada carga
  let vigiaLibre = VIGIA_ABRE; // el Vigía está libre desde que abre
  const resultados = {};

  for (const c of camiones) {
    const res = simularCamion(porCamion[c], c, p, vigiaLibre);
    resultados[c] = res;
    // El Vigía queda ocupado hasta que termina la primera carga de este camión
    // (las recargas intermedias también bloquean pero el motor las maneja internamente)
    vigiaLibre = res.vigiaOcupadoHasta;
  }

  // Totales flota
  const totalPuntos  = Object.values(resultados).reduce((s, r) => s + r.ruta.length, 0);
  const totalLitros  = Object.values(resultados).reduce((s, r) => s + r.litrosNet, 0);
  const totalMerma   = Object.values(resultados).reduce((s, r) => s + r.litrosMerma, 0);
  const totalViajes  = Object.values(resultados).reduce((s, r) => s + r.nViajes, 0);
  const totalDist    = Object.values(resultados).reduce((s, r) => s + parseFloat(r.distTotal), 0);
  const maxUso       = Math.max(...Object.values(resultados).map(r => r.uso));

  return { camiones, resultados, totalPuntos, totalLitros, totalMerma, totalViajes, totalDist: totalDist.toFixed(1), maxUso, dia };
}

// ─── Iconos ───────────────────────────────────────────────────────────────────
function iconoVigia() {
  return new L.DivIcon({
    className: "custom-marker",
    html: `<div style="width:18px;height:18px;background:#1e40af;border-radius:4px;border:3px solid #fff;transform:rotate(45deg);box-shadow:0 0 8px rgba(30,64,175,0.7);"></div>`,
    iconSize: [18, 18], iconAnchor: [9, 9], popupAnchor: [0, -12],
  });
}
function iconoNumero(color, num) {
  return new L.DivIcon({
    className: "custom-marker",
    html: `<div style="width:20px;height:20px;background:${color};border-radius:50%;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#fff;line-height:1;">${num}</div>`,
    iconSize: [20, 20], iconAnchor: [10, 10], popupAnchor: [0, -10],
  });
}
function crearIcono(color = "#007bff", size = 12) {
  const s = Math.max(8, Math.min(18, Number(size) || 12));
  return new L.DivIcon({
    className: "custom-marker",
    html: `<div style="width:${s}px;height:${s}px;background:${color};border-radius:50%;border:2px solid #fff;"></div>`,
    iconSize: [s, s], iconAnchor: [s/2, s/2], popupAnchor: [0, -s/2],
  });
}

// ─── Leyenda ──────────────────────────────────────────────────────────────────
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

// ─── Capa mapa flota ──────────────────────────────────────────────────────────
function CapaFlota({ flota, camionesVisibles }) {
  if (!flota) return null;
  return (
    <>
      {flota.camiones
        .filter(c => camionesVisibles.has(c))
        .map(c => {
          const res   = flota.resultados[c];
          const color = getCamionColor(c);
          return (
            <React.Fragment key={c}>
              {res.segmentos.map((seg, i) => (
                <Polyline key={i} positions={seg.coords}
                  pathOptions={{
                    color:     seg.tipo === "regreso" ? "#ef4444" : color,
                    weight:    seg.tipo === "regreso" ? 2 : 2.5,
                    opacity:   0.85,
                    dashArray: seg.tipo === "regreso" ? "5,5" : undefined,
                  }} />
              ))}
              {res.ruta.map((p, i) => (
                <Marker key={p.id ?? i} position={[p.latitud, p.longitud]}
                  icon={iconoNumero(color, i + 1)}>
                  <Popup>
                    <strong>#{i+1} · {p.nombre}</strong><br />
                    {c} · {flota.dia}<br />
                    {p.litros} L + {MERMA_L} merma = <strong>{p.litros + MERMA_L} L</strong><br />
                    Tel: {p.telefono ?? "—"}<br />
                    Hora: {res.cronograma.find(x => x.paradaIdx === i)?.hora ?? "—"}
                  </Popup>
                </Marker>
              ))}
            </React.Fragment>
          );
        })}
    </>
  );
}

// ─── Panel Optimizador Flota ──────────────────────────────────────────────────
function PanelOptimizador({ puntos, allCamiones, camionesVisibles, setCamionesVisibles, onClose }) {
  const [dia,      setDia]      = useState("Lunes");
  const [descMin,  setDescMin]  = useState(5);
  const [descMax,  setDescMax]  = useState(10);
  const [cargaMin, setCargaMin] = useState(30);
  const [cargaMax, setCargaMax] = useState(120);
  const [vel,      setVel]      = useState(25);
  const [horaFin,  setHoraFin]  = useState("17:00");
  const [expandido, setExpandido] = useState(null); // camión con cronograma abierto

  const flota = useMemo(() => {
    if (!puntos.length) return null;
    return calcularFlota(puntos, dia, { descMin, descMax, vel, cargaMin, cargaMax, horaFin });
  }, [puntos, dia, descMin, descMax, vel, cargaMin, cargaMax, horaFin]);

  const lbl = { fontSize: 10, color: "#475569", display: "block", marginBottom: 3,
                textTransform: "uppercase", letterSpacing: "0.06em" };
  const sel = { width: "100%", fontSize: 13, padding: "5px 7px",
                background: "rgba(15,25,50,0.9)", color: "#e2e8f0",
                border: "1px solid rgba(100,160,255,0.2)", borderRadius: 6, marginBottom: 10 };
  const slRow = { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 };
  const slVal = { fontSize: 12, fontWeight: 700, color: "#93c5fd", minWidth: 52, textAlign: "right" };
  const div1  = { height: 1, background: "rgba(100,160,255,0.08)", margin: "10px 0" };

  return (
    <div style={{
      position: "absolute", top: 0, right: 0, width: 330, height: "100%",
      background: "rgba(6,12,26,0.97)", backdropFilter: "blur(12px)",
      borderLeft: "1px solid rgba(100,160,255,0.15)", zIndex: 1000,
      overflowY: "auto", padding: "14px 14px 28px", boxSizing: "border-box",
      fontFamily: "sans-serif",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#93c5fd" }}>Optimización de flota</p>
          <p style={{ margin: "2px 0 0", fontSize: 10, color: "#334155" }}>
            Cola compartida · {CAPACIDAD_L.toLocaleString()} L · {MERMA_L} L merma/parada
          </p>
        </div>
        <button onClick={onClose}
          style={{ background: "transparent", border: "none", color: "#475569", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
      </div>

      {/* Filtro día */}
      <label style={lbl}>Día a optimizar</label>
      <select value={dia} onChange={e => setDia(e.target.value)} style={sel}>
        {DIAS_ORDEN.map(d => <option key={d}>{d}</option>)}
      </select>

      {/* Parámetros */}
      <label style={lbl}>Tiempo de carga en Vigía</label>
      <div style={slRow}>
        <span style={{ fontSize: 10, color: "#334155", minWidth: 26 }}>min</span>
        <input type="range" min={15} max={120} value={cargaMin} step={5} style={{ flex: 1 }}
          onChange={e => setCargaMin(+e.target.value)} />
        <span style={slVal}>{formatMin(cargaMin)}</span>
      </div>
      <div style={slRow}>
        <span style={{ fontSize: 10, color: "#334155", minWidth: 26 }}>max</span>
        <input type="range" min={15} max={120} value={cargaMax} step={5} style={{ flex: 1 }}
          onChange={e => setCargaMax(+e.target.value)} />
        <span style={slVal}>{formatMin(cargaMax)}</span>
      </div>

      <label style={lbl}>Descarga por cliente</label>
      <div style={slRow}>
        <span style={{ fontSize: 10, color: "#334155", minWidth: 26 }}>min</span>
        <input type="range" min={1} max={20} value={descMin} step={1} style={{ flex: 1 }}
          onChange={e => setDescMin(+e.target.value)} />
        <span style={slVal}>{descMin} min</span>
      </div>
      <div style={slRow}>
        <span style={{ fontSize: 10, color: "#334155", minWidth: 26 }}>max</span>
        <input type="range" min={1} max={20} value={descMax} step={1} style={{ flex: 1 }}
          onChange={e => setDescMax(+e.target.value)} />
        <span style={slVal}>{descMax} min</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <div>
          <label style={lbl}>Velocidad</label>
          <div style={{ ...slRow, marginBottom: 0 }}>
            <input type="range" min={10} max={60} value={vel} step={5} style={{ flex: 1 }}
              onChange={e => setVel(+e.target.value)} />
            <span style={slVal}>{vel} km/h</span>
          </div>
        </div>
        <div>
          <label style={lbl}>Fin jornada</label>
          <input type="time" value={horaFin} onChange={e => setHoraFin(e.target.value)}
            style={{ ...sel, marginBottom: 0 }} />
        </div>
      </div>

      {/* Info Vigía */}
      <div style={{ background: "rgba(24,95,165,0.1)", border: "1px solid rgba(24,95,165,0.2)",
                    borderRadius: 8, padding: "7px 10px", marginBottom: 10 }}>
        <p style={{ fontSize: 10, color: "#93c5fd", margin: "0 0 2px", fontWeight: 700 }}>El Vigía · horario</p>
        <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>
          Abre 08:00 · Colación 13:00–14:00 · Cola compartida entre camiones
        </p>
      </div>

      <div style={div1} />

      {!flota && (
        <p style={{ color: "#f87171", fontSize: 13, textAlign: "center", padding: "12px 0" }}>
          Sin datos para {dia}
        </p>
      )}

      {flota && (<>
        {/* Totales flota */}
        <p style={{ fontSize: 10, color: "#475569", textTransform: "uppercase",
                    letterSpacing: "0.06em", margin: "0 0 8px" }}>Resumen flota · {dia}</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
          {[
            { label: "Camiones",  val: flota.camiones.length,         sub: "activos" },
            { label: "Paradas",   val: flota.totalPuntos,             sub: "total día" },
            { label: "Viajes",    val: flota.totalViajes,             sub: "al Vigía" },
            { label: "Litros",    val: flota.totalLitros.toLocaleString() + " L", sub: "entregados" },
            { label: "Merma",     val: flota.totalMerma.toLocaleString() + " L", sub: "total flota" },
            { label: "Distancia", val: flota.totalDist + " km",       sub: "flota completa" },
          ].map(({ label, val, sub }) => (
            <div key={label} style={{ background: "rgba(15,28,55,0.8)", borderRadius: 8, padding: "7px 9px" }}>
              <p style={{ fontSize: 9, color: "#475569", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</p>
              <p style={{ fontSize: 13, fontWeight: 700, margin: "0 0 1px", color: "#e2e8f0" }}>{val}</p>
              <p style={{ fontSize: 9, color: "#334155", margin: 0 }}>{sub}</p>
            </div>
          ))}
        </div>

        <div style={div1} />

        {/* Filtro camiones visibles en mapa */}
        <p style={{ fontSize: 10, color: "#475569", textTransform: "uppercase",
                    letterSpacing: "0.06em", margin: "0 0 6px" }}>Mostrar en mapa</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {flota.camiones.map(c => {
            const on    = camionesVisibles.has(c);
            const color = getCamionColor(c);
            return (
              <button key={c} onClick={() => {
                setCamionesVisibles(prev => {
                  const n = new Set(prev); n.has(c) ? n.delete(c) : n.add(c); return n;
                });
              }} style={{
                padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, cursor: "pointer",
                background: on ? color : "rgba(15,28,55,0.8)",
                color: on ? "#fff" : "#475569",
                border: `1px solid ${on ? color : "rgba(100,160,255,0.15)"}`,
                transition: "all 0.15s",
              }}>{c}</button>
            );
          })}
        </div>

        <div style={div1} />

        {/* Tabla por camión */}
        <p style={{ fontSize: 10, color: "#475569", textTransform: "uppercase",
                    letterSpacing: "0.06em", margin: "0 0 8px" }}>Detalle por camión</p>
        {flota.camiones.map(c => {
          const res   = flota.resultados[c];
          const color = getCamionColor(c);
          const abierto = expandido === c;
          const usoColor = res.uso > 100 ? "#f87171" : res.uso > 90 ? "#fcd34d" : "#6ee7b7";
          return (
            <div key={c} style={{ marginBottom: 8, borderRadius: 8, overflow: "hidden",
                                  border: "1px solid rgba(100,160,255,0.12)" }}>
              {/* Cabecera camión */}
              <div onClick={() => setExpandido(abierto ? null : c)}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                         background: "rgba(15,28,55,0.9)", cursor: "pointer" }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", flex: 1 }}>{c}</span>
                <span style={{ fontSize: 10, color: "#475569" }}>{res.ruta.length} pts</span>
                <span style={{ fontSize: 10, color: usoColor, fontWeight: 700 }}>{res.uso}%</span>
                <span style={{ fontSize: 11, color: "#475569" }}>{abierto ? "▲" : "▼"}</span>
              </div>

              {/* Barra uso */}
              <div style={{ height: 3, background: "rgba(15,28,55,0.9)" }}>
                <div style={{
                  width: Math.min(res.uso, 100) + "%", height: "100%",
                  background: res.uso > 100 ? "#ef4444" : res.uso > 90 ? "#f59e0b" : "#10b981",
                }} />
              </div>

              {/* Métricas rápidas */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)",
                            background: "rgba(10,20,40,0.8)", padding: "6px 10px", gap: 4 }}>
                {[
                  { l: "Viajes", v: res.nViajes },
                  { l: "Dist",   v: res.distTotal + " km" },
                  { l: "Litros", v: res.litrosNet + " L" },
                  { l: "Merma",  v: res.litrosMerma + " L" },
                ].map(({ l, v }) => (
                  <div key={l}>
                    <p style={{ fontSize: 9, color: "#334155", margin: "0 0 1px", textTransform: "uppercase" }}>{l}</p>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", margin: 0 }}>{v}</p>
                  </div>
                ))}
              </div>

              {/* Cronograma expandible */}
              {abierto && (
                <div style={{ background: "rgba(8,16,32,0.95)", padding: "8px 10px 10px",
                              borderTop: "1px solid rgba(100,160,255,0.08)" }}>
                  <div style={{ borderLeft: "2px solid rgba(24,95,165,0.2)", paddingLeft: 10 }}>
                    {res.cronograma.map((item, i) => {
                      const dot =
                        item.tipo === "carga"   ? "#fcd34d" :
                        item.tipo === "espera"  ? "#f59e0b" :
                        item.tipo === "regreso" ? "#ef4444" :
                        item.tipo === "base"    ? "#185FA5" : color;
                      const txt =
                        item.tipo === "carga"   ? "#fcd34d" :
                        item.tipo === "espera"  ? "#f59e0b" :
                        item.tipo === "regreso" ? "#f87171" :
                        item.tipo === "base"    ? "#93c5fd" : "#cbd5e1";
                      return (
                        <div key={i} style={{ marginBottom: 6, position: "relative" }}>
                          <div style={{ position: "absolute", left: -15, top: 4,
                                        width: 7, height: 7, borderRadius: "50%",
                                        background: dot, border: "1.5px solid rgba(6,12,26,0.9)" }} />
                          <span style={{ fontSize: 9, color: "#475569", marginRight: 5, fontVariantNumeric: "tabular-nums" }}>
                            {item.hora}
                          </span>
                          <span style={{ fontSize: 10, color: txt }}>{item.txt}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </>)}
    </div>
  );
}

// ─── Panel Polígonos ──────────────────────────────────────────────────────────
function PanelPoligonos({ puntos, camionesDisponibles, onClose }) {
  const [camion,    setCamion]    = useState(camionesDisponibles[0] ?? "A1");
  const [diasOn,    setDiasOn]    = useState(new Set(DIAS_ORDEN));
  const [showTotal, setShowTotal] = useState(true);

  const toggle = d => setDiasOn(prev => {
    const n = new Set(prev); n.has(d) ? n.delete(d) : n.add(d); return n;
  });
  const pCamion     = useMemo(() => puntos.filter(p => normalizeCamion(p.camion) === camion), [puntos, camion]);
  const diasActivos = useMemo(() =>
    DIAS_ORDEN.filter(d => pCamion.some(p => (p.dia ?? "").trim().toLowerCase() === d.toLowerCase())),
    [pCamion]);
  const hullTotal   = useMemo(() => convexHull(pCamion), [pCamion]);
  const hullsPorDia = useMemo(() =>
    Object.fromEntries(diasActivos.map(d => {
      const pts = pCamion.filter(p => (p.dia ?? "").trim().toLowerCase() === d.toLowerCase());
      return [d, convexHull(pts)];
    })), [pCamion, diasActivos]);
  const stats = useMemo(() => ({
    total:  pCamion.length,
    litros: pCamion.reduce((s, p) => s + p.litros, 0),
    dias:   diasActivos.length,
  }), [pCamion, diasActivos]);

  const sel = { width: "100%", fontSize: 13, padding: "5px 7px",
                background: "rgba(15,25,50,0.9)", color: "#e2e8f0",
                border: "1px solid rgba(100,160,255,0.2)", borderRadius: 6, marginBottom: 10 };
  return (
    <>
      {showTotal && hullTotal.length >= 3 && (
        <Polygon positions={hullTotal}
          pathOptions={{ color: "#6a8c6a", fillColor: "rgba(100,140,100,0.07)", weight: 2, dashArray: "8,4" }}>
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
            <Tooltip sticky>
              {d} · {pCamion.filter(p => (p.dia ?? "").toLowerCase() === d.toLowerCase()).length} puntos
            </Tooltip>
          </Polygon>
        );
      })}
      <div style={{
        position: "absolute", top: 0, right: 0, width: 220, height: "100%",
        background: "rgba(6,12,26,0.97)", backdropFilter: "blur(12px)",
        borderLeft: "1px solid rgba(100,160,255,0.15)", zIndex: 1000,
        overflowY: "auto", padding: "14px 14px 24px", boxSizing: "border-box",
        fontFamily: "sans-serif",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#93c5fd" }}>Zonas de reparto</p>
          <button onClick={onClose}
            style={{ background: "transparent", border: "none", color: "#475569", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
        <label style={{ fontSize: 10, color: "#475569", display: "block", marginBottom: 3,
                        textTransform: "uppercase", letterSpacing: "0.06em" }}>Camión</label>
        <select value={camion} onChange={e => setCamion(e.target.value)} style={sel}>
          {camionesDisponibles.map(c => <option key={c}>{c}</option>)}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12,
                        color: "#64748b", marginBottom: 12, cursor: "pointer" }}>
          <input type="checkbox" checked={showTotal} onChange={e => setShowTotal(e.target.checked)} />
          Mostrar zona total semana
        </label>
        <p style={{ fontSize: 10, color: "#334155", textTransform: "uppercase",
                    letterSpacing: "0.05em", margin: "0 0 8px" }}>Días activos</p>
        {diasActivos.map(d => {
          const c   = COLORES_DIA[d] ?? { fill: "#ddd", stroke: "#999" };
          const nPts = pCamion.filter(p => (p.dia ?? "").toLowerCase() === d.toLowerCase()).length;
          return (
            <label key={d} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={diasOn.has(d)} onChange={() => toggle(d)} />
              <span style={{ width: 10, height: 10, borderRadius: 2, flexShrink: 0,
                             background: c.fill, border: "1.5px solid " + c.stroke, display: "inline-block" }} />
              <span style={{ fontSize: 12, color: "#cbd5e1", flex: 1 }}>{d}</span>
              <span style={{ fontSize: 11, color: "#475569" }}>{nPts}</span>
            </label>
          );
        })}
        <div style={{ height: 1, background: "rgba(100,160,255,0.08)", margin: "10px 0" }} />
        <p style={{ fontSize: 10, color: "#334155", textTransform: "uppercase",
                    letterSpacing: "0.05em", margin: "0 0 8px" }}>Resumen {camion}</p>
        {[
          { label: "Puntos totales",  val: stats.total },
          { label: "Días activos",    val: stats.dias },
          { label: "Litros / semana", val: stats.litros.toLocaleString() + " L" },
          { label: "Prom. por día",   val: stats.dias ? Math.round(stats.total / stats.dias) + " pts" : "—" },
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

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Mapa() {
  const [puntos,            setPuntos]            = useState([]);
  const [error,             setError]             = useState("");
  const [cargando,          setCargando]           = useState(true);
  const [selected,          setSelected]           = useState(new Set());
  const [query,             setQuery]              = useState("");
  const [panelAct,          setPanelAct]           = useState(null);
  const [camionesVisibles,  setCamionesVisibles]   = useState(new Set());

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
      if (selected.size === 0)         setSelected(new Set(allCamiones));
      if (camionesVisibles.size === 0) setCamionesVisibles(new Set(allCamiones));
    }
  }, [allCamiones.length]);

  const toggleCamion = c => setSelected(prev => {
    const n = new Set(prev); n.has(c) ? n.delete(c) : n.add(c); return n;
  });
  const selectAll  = () => setSelected(new Set(allCamiones));
  const selectNone = () => setSelected(new Set());
  const invert     = () => {
    const n = new Set(); allCamiones.forEach(c => { if (!selected.has(c)) n.add(c); }); setSelected(n);
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
    const a = document.createElement("a"); a.href = url; a.download = "rutas_activas.kml";
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const abrirPanel = nombre => setPanelAct(prev => prev === nombre ? null : nombre);

  // Calcular flota para capa mapa (parámetros por defecto, el panel los refina)
  const flotaMapa = useMemo(() => {
    if (panelAct !== "optimizador" || !puntos.length) return null;
    return calcularFlota(puntos, "Lunes", { descMin: 5, descMax: 10, vel: 25, cargaMin: 30, cargaMax: 120, horaFin: "17:00" });
  }, [puntos, panelAct]);

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
          <button onClick={() => abrirPanel("optimizador")} style={{
            background: panelAct === "optimizador" ? "#185FA5" : "transparent",
            color: panelAct === "optimizador" ? "#fff" : undefined,
            border: "1px solid #185FA5", borderRadius: 6, padding: "4px 10px",
            fontSize: 12, cursor: "pointer", fontWeight: 600,
          }}>🔀 Optimizar flota</button>
          <button onClick={() => abrirPanel("poligonos")} style={{
            background: panelAct === "poligonos" ? "#0F6E56" : "transparent",
            color: panelAct === "poligonos" ? "#fff" : undefined,
            border: "1px solid #0F6E56", borderRadius: 6, padding: "4px 10px",
            fontSize: 12, cursor: "pointer", fontWeight: 600,
          }}>🗺️ Zonas</button>
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

      <div style={{ position: "relative" }}>
        <MapContainer center={[VIGIA.lat, VIGIA.lng]} zoom={13}
          style={{ height: "65vh", width: "100%", borderRadius: 12 }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors" />
          <LegendControl items={legendItems} />

          {/* El Vigía */}
          <Marker position={[VIGIA.lat, VIGIA.lng]} icon={iconoVigia()}>
            <Popup>
              <strong>El Vigía · Base de operaciones</strong><br />
              Abre: 08:00 · Colación: 13:00–14:00<br />
              Capacidad: {CAPACIDAD_L.toLocaleString()} L · Merma: {MERMA_L} L/parada<br />
              Cola compartida entre todos los camiones
            </Popup>
          </Marker>

          {/* Puntos normales */}
          {panelAct !== "optimizador" && filteredMarcadores.map(m => (
            <Marker key={m.key} position={[m.lat, m.lon]} icon={crearIcono(getCamionColor(m.camion), 12)}>
              <Popup>
                <strong>{m.nombre ?? "Sin nombre"}</strong><br />
                {m.camion || "—"} · {m.dia ?? "—"}<br />
                {m.litros ?? 0} L + {MERMA_L} merma = {(m.litros ?? 0) + MERMA_L} L<br />
                Tel: {m.telefono ?? "—"}
              </Popup>
            </Marker>
          ))}

          {/* Capa flota optimizada */}
          {panelAct === "optimizador" && flotaMapa && (
            <CapaFlota flota={flotaMapa} camionesVisibles={camionesVisibles} />
          )}

          {/* Polígonos */}
          {panelAct === "poligonos" && allCamiones.length > 0 && (
            <PanelPoligonos
              puntos={puntos}
              camionesDisponibles={allCamiones}
              onClose={() => setPanelAct(null)}
            />
          )}
        </MapContainer>

        {/* Panel optimizador flota */}
        {panelAct === "optimizador" && (
          <PanelOptimizador
            puntos={puntos}
            allCamiones={allCamiones}
            camionesVisibles={camionesVisibles}
            setCamionesVisibles={setCamionesVisibles}
            onClose={() => setPanelAct(null)}
          />
        )}
      </div>
    </div>
  );
}
