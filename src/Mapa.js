import React, { useEffect, useState } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

function crearIcono(color = "#007bff") {
  return new L.DivIcon({
    className: "custom-marker",
    html: `<div style="width: 12px; height: 12px; background-color: ${color}; border-radius: 50%; border: 2px solid white;"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 12],
    popupAnchor: [0, -12],
  });
}

function Mapa() {
  const [puntos, setPuntos] = useState([]);

  useEffect(() => {
    axios.get("https://aguaruta-backend.onrender.com/rutas-activas")
      .then((res) => {
        setPuntos(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err) => console.error("Error cargando puntos:", err));
  }, []);

  return (
    <main style={{ padding: "20px" }}>
      <h2 style={{ fontWeight: "bold", marginBottom: "10px" }}>
        Mapa de Rutas Activas
      </h2>
      <MapContainer center={[-33.0701, -71.6296]} zoom={13} style={{ height: "70vh", width: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        {puntos.map((p, index) => (
          p.latitud && p.longitud && (
            <Marker
              key={index}
              position={[p.latitud, p.longitud]}
              icon={crearIcono()}
            >
              <Popup>
                <strong>{p.nombre}</strong><br />
                {p.litros} litros<br />
                Camión: {p.camion}<br />
                Día: {p.dia}
              </Popup>
            </Marker>
          )
        ))}
      </MapContainer>
    </main>
  );
}

export default Mapa;

