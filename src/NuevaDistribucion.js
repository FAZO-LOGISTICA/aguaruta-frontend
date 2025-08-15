import React, { useState } from "react";
import axios from "axios";
import API_URL from "./config";
import "./App.css";

const NuevaDistribucion = () => {
  const [estado, setEstado] = useState(null);
  const [cargando, setCargando] = useState(false);

  const activarRedistribucion = async () => {
    if (!window.confirm("¿Estás seguro que deseas activar la redistribución?")) return;
    setCargando(true);
    try {
      // Plan A: endpoint principal
      const res = await axios.post(`${API_URL}/activar-redistribucion`);
      setEstado({ tipo: "exito", mensaje: res.data?.mensaje || "Redistribución activada" });
    } catch (e1) {
      try {
        // Plan B: router alterno con prefijo (si lo tienes)
        const res2 = await axios.post(`${API_URL}/nueva-distribucion/activar`);
        setEstado({ tipo: "exito", mensaje: res2.data?.mensaje || "Redistribución activada" });
      } catch (e2) {
        const msg =
          e2?.response?.data?.detail ||
          e2?.response?.data?.error ||
          e1?.response?.data?.detail ||
          e1?.message ||
          "Error al activar redistribución";
        setEstado({ tipo: "error", mensaje: msg });
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="main-container fade-in">
      <h2 className="titulo">Activar Redistribución Semanal</h2>

      <p style={{ fontSize: "1rem", marginBottom: "1.5rem", textAlign: "center" }}>
        Esta acción reemplazará la base actual con la redistribución planificada.
      </p>

      <div style={{ display: "flex", justifyContent: "center" }}>
        <button
          onClick={activarRedistribucion}
          disabled={cargando}
          style={{
            padding: "0.8rem 2rem",
            fontSize: "1rem",
            backgroundColor: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          {cargando ? "Activando..." : "✅ Activar Redistribución"}
        </button>
      </div>

      {estado && (
        <div
          style={{
            marginTop: "2rem",
            textAlign: "center",
            color: estado.tipo === "exito" ? "green" : "red",
            fontWeight: "bold",
          }}
        >
          {estado.mensaje}
        </div>
      )}
    </div>
  );
};

export default NuevaDistribucion;
