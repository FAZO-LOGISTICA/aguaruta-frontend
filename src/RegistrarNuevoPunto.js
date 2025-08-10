// src/RegistrarNuevoPunto.js
import React, { useState } from "react";
import axios from "axios";
import API_URL from "./config"; // ✅ usa la config centralizada
import "./App.css";

const RegistrarNuevoPunto = () => {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [litros, setLitros] = useState("");
  const [sector, setSector] = useState("");
  const [latitud, setLatitud] = useState("");
  const [longitud, setLongitud] = useState("");
  const [destino, setDestino] = useState("actual"); // "actual" | "septiembre"
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);

  const registrar = async () => {
    setMensaje("");

    if (!nombre || !telefono || !litros || !sector || !latitud || !longitud) {
      setMensaje("⚠️ Todos los campos son obligatorios.");
      return;
    }

    const litrosNum = Number(litros);
    const latNum = Number(latitud);
    const lonNum = Number(longitud);

    if (!Number.isFinite(litrosNum) || litrosNum <= 0) {
      setMensaje("⚠️ Litros debe ser un número > 0.");
      return;
    }
    if (!Number.isFinite(latNum) || latNum < -90 || latNum > 90) {
      setMensaje("⚠️ Latitud inválida (-90 a 90).");
      return;
    }
    if (!Number.isFinite(lonNum) || lonNum < -180 || lonNum > 180) {
      setMensaje("⚠️ Longitud inválida (-180 a 180).");
      return;
    }

    const payload = {
      nombre: nombre.trim(),
      telefono: telefono.trim(),
      litros: litrosNum,
      sector: sector.trim(),
      latitud: latNum,
      longitud: lonNum,
      destino,
    };

    try {
      setCargando(true);
      const res = await axios.post(`${API_URL}/registrar-nuevo-punto`, payload);
      const asignado = res?.data?.camion_asignado;

      setMensaje(
        asignado
          ? `✅ Punto registrado y asignado a ${asignado} (${destino === "actual" ? "ruta actual" : "septiembre"})`
          : "✅ Punto registrado."
      );

      // limpiar
      setNombre("");
      setTelefono("");
      setLitros("");
      setSector("");
      setLatitud("");
      setLongitud("");
    } catch (err) {
      console.error(err);
      const det =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        err.message ||
        "Error en el servidor.";
      setMensaje(`❌ ${det}`);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="main-container fade-in">
      <h2 className="titulo">Registrar Nuevo Punto de Entrega</h2>

      <div style={{ maxWidth: 420, margin: "0 auto", display: "flex", flexDirection: "column", gap: 8 }}>
        <label>Nombre del jefe de hogar:</label>
        <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} />

        <label>Teléfono:</label>
        <input type="text" value={telefono} onChange={(e) => setTelefono(e.target.value)} />

        <label>Litros a entregar:</label>
        <input type="number" min="1" step="1" value={litros} onChange={(e) => setLitros(e.target.value)} />

        <label>Sector:</label>
        <input type="text" value={sector} onChange={(e) => setSector(e.target.value)} />

        <label>Latitud:</label>
        <input type="number" step="0.000001" value={latitud} onChange={(e) => setLatitud(e.target.value)} />

        <label>Longitud:</label>
        <input type="number" step="0.000001" value={longitud} onChange={(e) => setLongitud(e.target.value)} />

        <label>¿Dónde registrar este punto?</label>
        <select value={destino} onChange={(e) => setDestino(e.target.value)}>
          <option value="actual">Ruta actual</option>
          <option value="septiembre">Ruta de septiembre</option>
        </select>

        <button onClick={registrar} disabled={cargando} style={{ marginTop: 12 }}>
          {cargando ? "Registrando..." : "Registrar y Distribuir"}
        </button>

        {mensaje && <p style={{ marginTop: 12, textAlign: "center" }}>{mensaje}</p>}
      </div>
    </div>
  );
};

export default RegistrarNuevoPunto;
