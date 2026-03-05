// src/Mapa.js — AguaRuta
// ✅ v2 — usa apiMethods centralizado (fix mapa vacío)

import React, { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { getCamionColor, normalizeCamion } from "./config/camionColors";
import { apiMethods } from "./services/api";
import "./App.css";

/* ================= Fetch centralizado ================= */
async function fetchRutasActivas(intentos = 3) {
  let delay = 1500;
  for (let i = 0; i < intentos; i++) {
    try {
      // apiMethods.getRutasActivas() ya maneja [] y {data:[]}
      return await apiMethods.getRutasActivas();
    } catch (e) {
      if (i === intentos - 1) throw e;
      await new Promise((r) => setTimeout(r, delay));
      delay *= 2;
    }
  }
}

/* ================= Utils ================= */
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
    latitud: isNaN(lat) || lat === 0 ? null : lat,
    longitud: isNaN(lon) || lon === 0 ? null : lon,
  };
}

function crearIcono(color = "#007bff", size = 12) {
  const s = Math.max(8, Math.min(18, Number(size) || 12));
  return new L.DivIcon({
    className: "custom-marker",
    html: `<div style="
      width:${s}px;height:${s}px;background:${color};
      border-radius:50%;border:2px solid #fff;
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
        .map(({ camion, color }) => `<span class="leg-item"><i style="background:${color}"></i>${camion}</span>`)
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
  const [puntos, setPuntos]     = useState([]);
  const [error, setError]       = useState("");
  const [cargando, setCargando] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [query, setQuery]       = useState("");

  useEffect(() => {
    (async () => {
      setCargando(true);
      setError("");
      try {
        const arr = await fetchRutasActivas(3);
        console.log(`[Mapa] Recibidos ${arr?.length ?? 0} registros del backend`);

        if (!Array.isArray(arr) || arr.length === 0) {
          setError("⚠️ El backend no devolvió puntos. Verifica /rutas-activas.");
          setCargando(false);
          return;
        }

        const norm = arr
          .map(normaliza)
          .filter((p) => p.latitud !== null && p.longitud !== null);

        console.log(`[Mapa] ${norm.length} puntos con coordenadas válidas (de ${arr.length} totales)`);
        setPuntos(norm);
        window.__PUNTOS = norm;
      } catch (e) {
        console.error("[Mapa] Error cargando rutas:", e?.message || e);
        setError("⚠️ No se pudieron cargar los puntos del backend.");
      } finally {
        setCargando(false);
      }
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

  const toggleCamion = (c) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c); else next.add(c);
      return next;
    });
  const selectAll  = () => setSelected(new Set(allCamiones));
  const selectNone = () => setSelected(new Set());
  const invert     = () => {
    const next = new Set();
    allCamiones.forEach((c) => { if (!selected.has(c)) next.add(c); });
    setSelected(next);
  };

  const filteredMarcadores = useMemo(() => {
    const q = query.toLowerCase().trim();
    return marcadores.filter(
      (m) =>
        selected.has(m.camion) &&
        (!q ||
          m.nombre?.toLowerCase().includes(q) ||
          m.camion?.toLowerCase().includes(q) ||
          m.dia?.toLowerCase().includes(q))
    );
  }, [marcadores, selected, query]);

  const legendItems = useMemo(
    () =>
      (selected.size ? allCamiones.filter((c) => selected.has(c)) : allCamiones)
        .map((c) => ({ camion: c, color: getCamionColor(c) })),
    [allCamiones, selected]
  );

  const exportarKML = () => {
    if (!filteredMarcadores.length) { alert("No hay puntos visibles para exportar."); return; }
    const placemarks = filteredMarcadores.map((m) => `
      <Placemark>
        <name>${m.nombre || "Sin nombre"}</name>
        <description><![CDATA[
          Camión: ${m.camion}<br/>
          Día: ${m.dia}<br/>
          Litros: ${m.litros}<br/>
          Teléfono: ${m.telefono}
        ]]></description>
        <Point><coordinates>${m.lon},${m.lat},0</coordinates></Point>
      </Placemark>`).join("\n");
    const kml = `<?xml version="1.0" encoding="UTF-8"?>
      <kml xmlns="http://www.opengis.net/kml/2.2">
        <Document><name>Rutas Activas AguaRuta</name>${placemarks}</Document>
      </kml>`;
    const blob = new Blob([kml], { type: "application/vnd.google-earth.kml+xml" });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = "rutas_activas.kml";
    document.body.appendChild(link); link.click();
    document.body.removeChild(link); URL.revokeObjectURL(url);
  };

  const center = [-33.07, -71.63];

  return (
    <main
      className="main-container fade-in"
      style={{
        padding: 20,
        backgroundImage: `url(/img/valparaiso/valparaiso${Math.floor(Math.random() * 9) + 1}.jpg)`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <img
        src="/img/logos/logos-institucionales.png"
        alt="Logo Institucional"
        style={{ display: "block", margin: "0 auto 10px auto", maxWidth: 300 }}
      />

      <h2 className="titulo">Mapa de Rutas Activas</h2>

      {cargando && <p style={{ color: "#6b7280" }}>⏳ Cargando puntos del mapa...</p>}
      {error    && <p style={{ color: "crimson" }}>{error}</p>}
      {!cargando && !error && (
        <p style={{ color: "#16a34a", fontWeight: 600, marginBottom: 8 }}>
          ✅ {puntos.length} beneficiarios cargados · {filteredMarcadores.length} visibles
        </p>
      )}

      {/* Filtros */}
      <div className="filtros-camion">
        <div className="fila-1">
          <strong>Buscar / Filtrar:</strong>
          <div className="acciones">
            <button onClick={selectAll}>Todos</button>
            <button onClick={selectNone}>Ninguno</button>
            <button onClick={invert}>Invertir</button>
          </div>
          <input
            className="buscador"
            placeholder="Buscar por nombre, camión o día"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button onClick={exportarKML}>🌍 Exportar KML</button>
          <span className="contador">
            Mostrando {filteredMarcadores.length} / {marcadores.length} puntos
          </span>
        </div>
        <div className="chips">
          {allCamiones.map((c) => {
            const on    = selected.has(c);
            const color = getCamionColor(c);
            return (
              <button key={c} className={`chip ${on ? "on" : ""}`} title={`Camión ${c}`} onClick={() => toggleCamion(c)}>
                <i style={{ background: color }} /> {c}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mapa */}
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: "65vh", width: "100%", borderRadius: "10px", boxShadow: "0 0 10px rgba(0,0,0,0.2)" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <LegendControl items={legendItems} />
        {filteredMarcadores.map((m) => (
          <Marker key={m.key} position={[m.lat, m.lon]} icon={crearIcono(getCamionColor(m.camion), 12)}>
            <Popup>
              <strong>{m.nombre ?? "Sin nombre"}</strong><br />
              Camión: {m.camion || "-"}<br />
              Día: {m.dia ?? "-"}<br />
              Litros: {m.litros ?? 0}<br />
              Tel: {m.telefono ?? "-"}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </main>
  );
}
