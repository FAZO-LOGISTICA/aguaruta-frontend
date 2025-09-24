// src/Graficos.js
import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  PieChart, Pie, ResponsiveContainer, CartesianGrid, Cell
} from "recharts";
import API_URL from "./config";
import "./App.css";

const DIAS_ORDEN = ["LUNES","MARTES","MIERCOLES","MIÉRCOLES","JUEVES","VIERNES","SABADO","SÁBADO","DOMINGO"];
const normalizaDia = (d) =>
  String(d || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const Graficos = () => {
  const [datos, setDatos] = useState([]);
  const [camion, setCamion] = useState("Todos");
  const [dia, setDia] = useState("Todos");

  // 🔄 Ahora cargamos de /entregas-todas
  useEffect(() => {
    axios
      .get(`${API_URL}/entregas-todas`)
      .then((res) => setDatos(Array.isArray(res.data) ? res.data : []))
      .catch((err) => console.error("Error al cargar datos:", err));
  }, []);

  const camiones = useMemo(
    () => [...new Set(datos.map((d) => d.camion).filter(Boolean))].sort(),
    [datos]
  );

  const dias = useMemo(
    () => [...new Set(datos.map((d) => d.dia).filter(Boolean))].sort(),
    [datos]
  );

  const datosFiltrados = useMemo(
    () =>
      datos.filter(
        (d) =>
          (camion === "Todos" || d.camion === camion) &&
          (dia === "Todos" || d.dia === dia)
      ),
    [datos, camion, dia]
  );

  // 1) Resumen: Litros por camión
  const resumenLitrosPorCamion = useMemo(() => {
    const acc = {};
    for (const r of datosFiltrados) {
      const c = r.camion || "Sin Camión";
      if (!acc[c]) acc[c] = { camion: c, total_litros: 0, total_entregas: 0 };
      acc[c].total_litros += Number(r.litros || 0);
      acc[c].total_entregas += 1;
    }
    return Object.values(acc).sort((a, b) => a.camion.localeCompare(b.camion));
  }, [datosFiltrados]);

  // 2) Resumen: Entregas por día
  const resumenPuntosPorDia = useMemo(() => {
    const acc = {};
    for (const r of datosFiltrados) {
      const nd = normalizaDia(r.dia);
      const key = DIAS_ORDEN.includes(nd) ? nd : nd || "SIN_DIA";
      if (!acc[key]) acc[key] = { dia: key, total_entregas: 0 };
      acc[key].total_entregas += 1;
    }
    const ordenado = Object.values(acc).sort((a, b) => {
      const ia = DIAS_ORDEN.indexOf(a.dia);
      const ib = DIAS_ORDEN.indexOf(b.dia);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
    return ordenado.map((x) => ({
      ...x,
      dia: x.dia.replace("MIERCOLES", "MIÉRCOLES").replace("SABADO", "SÁBADO"),
    }));
  }, [datosFiltrados]);

  const COLORS = ["#2563eb", "#f87171", "#facc15", "#6b7280", "#10b981", "#a78bfa", "#fb7185"];

  return (
    <div className="main-container fade-in">
      <h2 className="titulo">Gráficos Generales</h2>

      <div style={{ display: "flex", justifyContent: "center", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <select value={camion} onChange={(e) => setCamion(e.target.value)}>
          <option value="Todos">Todos los camiones</option>
          {camiones.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select value={dia} onChange={(e) => setDia(e.target.value)}>
          <option value="Todos">Todos los días</option>
          {dias.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      <h3 className="subtitulo">Litros totales por camión</h3>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={resumenLitrosPorCamion} margin={{ top: 12, right: 24, left: 12, bottom: 12 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="camion" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="total_litros" name="Litros" fill="#2563eb" />
        </BarChart>
      </ResponsiveContainer>

      <h3 className="subtitulo" style={{ marginTop: 24 }}>Proporción de entregas por día</h3>
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie
            data={resumenPuntosPorDia}
            dataKey="total_entregas"
            nameKey="dia"
            cx="50%"
            cy="50%"
            outerRadius={110}
            label
          >
            {resumenPuntosPorDia.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Legend />
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default Graficos;
