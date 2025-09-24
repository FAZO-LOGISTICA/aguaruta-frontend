// src/RegistrarEntrega.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import API_URL from "./config"; // ✅ asegúrate que apunte al backend Render
import "./App.css";

const RegistrarEntrega = () => {
  const [puntos, setPuntos] = useState([]);
  const [nombre, setNombre] = useState("");
  const [litros, setLitros] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [camion, setCamion] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);

  // 🚚 Cargar beneficiarios
  useEffect(() => {
    axios
      .get(`${API_URL}/rutas-activas`)
      .then((res) => setPuntos(Array.isArray(res.data) ? res.data : []))
      .catch((err) => {
        console.error("Error al cargar puntos:", err);
        setMensaje("❌ No se pudieron cargar los beneficiarios.");
      });
  }, []);

  // 📝 Autocompletar litros y camión al seleccionar nombre
  useEffect(() => {
    const p = puntos.find((x) => x.nombre === nombre);
    if (p) {
      if (!litros) setLitros(String(p.litros ?? ""));
      if (!camion) setCamion(p.camion ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nombre]);

  const registrarEntrega = async () => {
    setMensaje("");
    if (!nombre || !litros || !camion || !fecha) {
      setMensaje("⚠️ Todos los campos son obligatorios.");
      return;
    }

    const punto = puntos.find((p) => p.nombre === nombre);
    if (!punto) {
      setMensaje("❌ Nombre no encontrado en la base de datos.");
      return;
    }

    if (punto.latitud == null || punto.longitud == null) {
      setMensaje("❌ Ese beneficiario no tiene coordenadas registradas.");
      return;
    }

    const litrosNum = parseInt(litros, 10);
    if (!Number.isFinite(litrosNum) || litrosNum <= 0) {
      setMensaje("⚠️ Litros debe ser un número mayor que 0.");
      return;
    }

    try {
      setCargando(true);

      // ✅ Ahora usamos el endpoint correcto /registrar-entregas
      await axios.post(`${API_URL}/registrar-entregas`, {
        nombre,
        camion,
        litros: litrosNum,
        estado: 1, // entregada manual
        fecha, // YYYY-MM-DD
        latitud: punto.latitud,
        longitud: punto.longitud,
      });

      setMensaje("✅ Entrega registrada correctamente.");
      setLitros("");
    } catch (err) {
      console.error("Error al registrar entrega:", err);
      const det =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        err.message ||
        "Error al registrar entrega.";
      setMensaje(`❌ ${det}`);
    } finally {
      setCargando(false);
    }
  };

  const camiones = ["A1", "A2", "A3", "A4", "A5", "M1", "M2", "M3"];
  const nombres = [...new Set(puntos.map((p) => p.nombre).filter(Boolean))].sort();

  return (
    <div className="main-container fade-in">
      <h2 className="titulo">Registrar Entrega Manual</h2>

      <div style={{ display: "flex", flexDirection: "column", maxWidth: 420, margin: "0 auto" }}>
        <label>Nombre del jefe de hogar:</label>
        <select value={nombre} onChange={(e) => setNombre(e.target.value)}>
          <option value="">Seleccionar</option>
          {nombres.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>

        <label style={{ marginTop: 10 }}>Litros entregados:</label>
        <input
          type="number"
          min="1"
          step="1"
          value={litros}
          onChange={(e) => setLitros(e.target.value)}
        />

        <label style={{ marginTop: 10 }}>Fecha:</label>
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />

        <label style={{ marginTop: 10 }}>Camión:</label>
        <select value={camion} onChange={(e) => setCamion(e.target.value)}>
          <option value="">Seleccionar</option>
          {camiones.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <button onClick={registrarEntrega} disabled={cargando} style={{ marginTop: "1rem" }}>
          {cargando ? "Registrando..." : "Registrar Entrega"}
        </button>

        {mensaje && (
          <p style={{ marginTop: "1rem", textAlign: "center" }}>
            {mensaje}
          </p>
        )}
      </div>
    </div>
  );
};

export default RegistrarEntrega;
