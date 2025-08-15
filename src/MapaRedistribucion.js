import React, { useState, useEffect } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { FaFilter } from "react-icons/fa";
import API_URL from "./config";

const coloresCamiones = {
  A1: "#007bff",
  A2: "#ff5733",
  A3: "#28a745",
  A4: "#8e44ad",
  A5: "#ffc107",
  M1: "#795548",
  M2: "#e91e63",
};

function crearIcono(color) {
  return new L.DivIcon({
    className: "custom-marker",
    html: `<div style="width: 12px; height: 12px; background-color: ${color}; border-radius: 50%; border: 2px solid white;"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 12],
    popupAnchor: [0, -12],
  });
}

// Normaliza posibles nombres de campos entre DB y JSON
function normaliza(r, idx) {
  const lat = r.latitud ?? r.lat ?? r.latitude ?? r.Latitud ?? null;
  const lon = r.longitud ?? r.lon ?? r.lng ?? r.longitude ?? r.Longitud ?? null;
  const dia = r.dia_asignado ?? r.dia ?? r.DIA ?? r.diaAsignado ?? null;

  return {
    id: r.id ?? idx + 1,
    camion: r.camion ?? r.CAMION ?? r.camion_asignado ?? null,
    nombre: r.nombre ?? r.NOMBRE ?? r.jefe_hogar ?? r.jefe ?? null,
    litros: r.litros ?? r.LITROS ?? r.litros_de_entrega ?? null,
    telefono: r.telefono ?? r.TELEFONO ?? r.phone ?? null,
    dia,
    dia_asignado: r.dia_asignado ?? null,
    latitud: lat != null ? Number(lat) : null,
    longitud: lon != null ? Number(lon) : null,
  };
}

function MapaRedistribucion() {
  const [puntos, setPuntos] = useState([]);
  const [filtroCamion, setFiltroCamion] = useState("Todos");
  const [filtroDia, setFiltroDia] = useState("Todos");
  const [camiones, setCamiones] = useState([]);
  const [dias, setDias] = useState([]);
  const [origen, setOrigen] = useState(null); // "db" | "json" | null

  async function cargarPuntos() {
    // 1) Intento: Base de datos
    try {
      const { data } = await axios.get(`${API_URL}/redistribucion`, { timeout: 15000 });
      const arr = Array.isArray(data) ? data : [];
      if (arr.length > 0) {
        const norm = arr.map(normaliza).filter(p => Number.isFinite(p.latitud) && Number.isFinite(p.longitud));
        setPuntos(norm);
        setCamiones([...new Set(norm.map(p => p.camion))].filter(Boolean));
        setDias([...new Set(norm.map(p => p.dia_asignado || p.dia))].filter(Boolean));
        setOrigen("db");
        return;
      }
    } catch (e) {
      console.warn("DB /redistribucion falló o vino vacía:", e?.message || e);
    }

    // 2) Fallback: JSON estático del frontend (NO toca la DB)
    // Probamos dos rutas por si el proyecto usa 'public/data' o 'público/datos'
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
          setCamiones([...new Set(norm.map(p => p.camion))].filter(Boolean));
          setDias([...new Set(norm.map(p => p.dia_asignado || p.dia))].filter(Boolean));
          setOrigen("json");
          return;
        }
      } catch {
        /* probamos siguiente ruta */
      }
    }

    // 3) Nada disponible
    setPuntos([]);
    setCamiones([]);
    setDias([]);
    setOrigen(null);
  }

  useEffect(() => {
    cargarPuntos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const puntosFiltrados = puntos.filter((p) => {
    const porCamion = filtroCamion === "Todos" || p.camion === filtroCamion;
    const porDia = filtroDia === "Todos" || (p.dia_asignado || p.dia) === filtroDia;
    return porCamion && porDia;
  });

  return (
    <main className="main-container fade-in">
      <h2 className="titulo">Mapa de Nueva Redistribución</h2>

      <div style={{ marginBottom: 8, fontSize: 12, opacity: 0.8 }}>
        Origen de datos: <b>{origen === "db" ? "Base de datos" : origen === "json" ? "Archivo JSON (solo lectura)" : "N/D"}</b>
      </div>

      <div style={{ marginBottom: "10px", display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <FaFilter style={{ marginRight: "8px" }} />
          <label htmlFor="camion">Camión:</label>
          <select
            id="camion"
            value={filtroCamion}
            onChange={(e) => setFiltroCamion(e.target.value)}
            style={{ marginLeft: "10px", padding: "5px" }}
          >
            <option value="Todos">Todos los camiones</option>
            {camiones.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center" }}>
          <label htmlFor="dia">Día:</label>
          <select
            id="dia"
            value={filtroDia}
            onChange={(e) => setFiltroDia(e.target.value)}
            style={{ marginLeft: "10px", padding: "5px" }}
          >
            <option value="Todos">Todos los días</option>
            {dias.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <button onClick={cargarPuntos} style={{ padding: "6px 12px", backgroundColor: "#2563eb", color: "white", borderRadius: "6px", border: "none" }}>
          🔄 Recargar puntos
        </button>
      </div>

      <MapContainer center={[-33.0701, -71.6296]} zoom={13} style={{ height: "70vh", width: "100%" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
        {puntosFiltrados.map((p, index) => (
          <Marker
            key={p.id ?? index}
            position={[p.latitud, p.longitud]}
            icon={crearIcono(coloresCamiones[p.camion] || "#007bff")}
          >
            <Popup>
              <strong>{p.nombre}</strong><br />
              {p.litros} litros<br />
              Camión: {p.camion}<br />
              Día: {p.dia_asignado || p.dia}
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <div style={{ marginTop: "20px" }}>
        <h4>Leyenda de colores por camión</h4>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "15px" }}>
          {Object.entries(coloresCamiones).map(([camion, color]) => (
            <div key={camion} style={{ display: "flex", alignItems: "center" }}>
              <div style={{ width: 12, height: 12, backgroundColor: color, borderRadius: "50%", marginRight: 6 }} />
              {camion}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

export default MapaRedistribucion;
