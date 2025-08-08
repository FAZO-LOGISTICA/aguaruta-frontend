// src/Mapa.js  (si está en src/pages usa: import API_URL from "../config")
import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import API_URL from "./config"; // <-- ajusta a "../config" si corresponde
import "./App.css";

function crearIcono(color = "#007bff") {
  return new L.DivIcon({
    className: "custom-marker",
    html: `<div style="width:12px;height:12px;background:${color};border-radius:50%;border:2px solid #fff;"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 12],
    popupAnchor: [0, -12],
  });
}

const toNum = (v) => (v === null || v === undefined || v === "" ? null : Number(v));

export default function Mapa() {
  const [puntos, setPuntos] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios
      .get(`${API_URL}/rutas-activas`)
      .then((res) => setPuntos(Array.isArray(res.data) ? res.data : []))
      .catch((err) => {
        console.error("Error cargando puntos:", err);
        setError("No se pudieron cargar las rutas.");
      });
  }, []);

  const marcadores = useMemo(
    () =>
      puntos
        .map((p) => ({
          ...p,
          lat: toNum(p.latitud),
          lon: toNum(p.longitud),
        }))
        .filter((p) => p.lat !== null && p.lon !== null),
    [puntos]
  );

  // Centro aprox. Laguna Verde / Valpo
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

        {marcadores.map((p, i) => (
          <Marker key={p.id ?? i} position={[p.lat, p.lon]} icon={crearIcono()}>
            <Popup>
              <strong>{p.nombre ?? "Sin nombre"}</strong>
              <br />
              Camión: {p.camion ?? "-"}
              <br />
              Día: {p.dia ?? "-"}
              <br />
              Litros: {p.litros ?? 0}
              <br />
              Tel: {p.telefono ?? "-"}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </main>
  );
}
