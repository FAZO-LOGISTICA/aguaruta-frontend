// src/CamionEstadisticas.js
import React, { useState, useEffect } from 'react';   // ✅ ajusta los hooks que realmente uses
import axios from "axios";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { FaFileExcel, FaFilePdf } from "react-icons/fa";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import API_URL from "./config"; // requiere jsconfig.json con { "compilerOptions": { "baseUrl": "src" } }

const CamionEstadisticas = () => {
  const [datos, setDatos] = useState([]);
  const [camionSeleccionado, setCamionSeleccionado] = useState("Todos");

  const rol = localStorage.getItem("rol");

  useEffect(() => {
    axios
      .get(`${API_URL}/rutas-activas`)
      .then((res) => setDatos(Array.isArray(res.data) ? res.data : []))
      .catch((err) => console.error("Error al cargar datos:", err));
  }, []);

  const datosFiltrados = useMemo(
    () => (camionSeleccionado === "Todos" ? datos : datos.filter((d) => d.camion === camionSeleccionado)),
    [datos, camionSeleccionado]
  );

  const resumen = useMemo(() => {
    const acc = {};
    for (const item of datosFiltrados) {
      const camion = item.camion ?? "Sin Camión";
      const dia = item.dia ?? "Sin Día";
      const key = `${camion}||${dia}`;
      if (!acc[key]) acc[key] = { camion, dia, total_entregas: 0, total_litros: 0 };
      acc[key].total_entregas += 1;
      acc[key].total_litros += Number(item.litros || 0);
    }
    return Object.values(acc).sort((a, b) => (a.camion + a.dia).localeCompare(b.camion + b.dia));
  }, [datosFiltrados]);

  const exportarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(resumen);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Estadisticas");
    XLSX.writeFile(wb, "estadisticas_camion_dia.xlsx");
  };

  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.autoTable({
      head: [["Camión", "Día", "Total Entregas", "Total Litros"]],
      body: resumen.map((d) => [d.camion, d.dia, d.total_entregas, d.total_litros]),
    });
    doc.save("estadisticas_camion_dia.pdf");
  };

  const camiones = useMemo(
    () => [...new Set(datos.map((d) => d.camion).filter(Boolean))].sort(),
    [datos]
  );

  return (
    <div className="main-container fade-in">
      <h2 className="titulo">Estadísticas por Camión y Día</h2>

      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
        <label>
          <strong>Camión:</strong>
        </label>
        <select value={camionSeleccionado} onChange={(e) => setCamionSeleccionado(e.target.value)}>
          <option value="Todos">Todos</option>
          {camiones.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {rol !== "invitado" && (
          <>
            <button onClick={exportarExcel}>
              <FaFileExcel /> Exportar Excel
            </button>
            <button onClick={exportarPDF}>
              <FaFilePdf /> Exportar PDF
            </button>
          </>
        )}
      </div>

      <table className="tabla">
        <thead>
          <tr>
            <th>Camión</th>
            <th>Día</th>
            <th>Total Entregas</th>
            <th>Total Litros</th>
          </tr>
        </thead>
        <tbody>
          {resumen.map((item, index) => (
            <tr key={`${item.camion}-${item.dia}-${index}`}>
              <td>{item.camion}</td>
              <td>{item.dia}</td>
              <td>{item.total_entregas}</td>
              <td>{item.total_litros}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="subtitulo">Litros Entregados por Día</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={resumen}>
          <XAxis dataKey="dia" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="total_litros" name="Litros" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CamionEstadisticas;




