// src/pages/RutasPorCamion.js   (si está en src/, cambia a: import API_URL from "./config")
import React, { useEffect, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import API_URL from "../config";
import "./App.css";

const RutasPorCamion = () => {
  const [rutas, setRutas] = useState([]);
  const [resumen, setResumen] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // Rol (para ocultar export a invitados)
  const rol = localStorage.getItem("rol");

  useEffect(() => {
    const cargar = async () => {
      try {
        setCargando(true);
        const res = await axios.get(`${API_URL}/rutas-activas`);
        const data = Array.isArray(res.data) ? res.data : [];
        setRutas(data);
        agruparPorCamion(data);
        setError(null);
      } catch (e) {
        console.error("Error al cargar datos:", e);
        setError("No se pudieron cargar las rutas.");
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, []);

  const agruparPorCamion = (data) => {
    const acc = {};
    for (const r of data) {
      const camion = r.camion ?? "Sin Camión";
      if (!acc[camion]) {
        acc[camion] = {
          camion,
          totalEntregas: 0,
          totalLitros: 0,
          diasSet: new Set(),
          sectoresSet: new Set(),
        };
      }
      acc[camion].totalEntregas += 1;
      acc[camion].totalLitros += Number(r.litros || 0);
      if (r.dia) acc[camion].diasSet.add(r.dia);
      // 'sector' puede no existir; lo agregamos si viene
      if (r.sector) acc[camion].sectoresSet.add(r.sector);
    }

    const resumenFinal = Object.values(acc)
      .map((x) => ({
        camion: x.camion,
        totalEntregas: x.totalEntregas,
        totalLitros: x.totalLitros,
        dias: Array.from(x.diasSet).join(", "),
        sectores: x.sectoresSet.size ? Array.from(x.sectoresSet).join(", ") : "-",
      }))
      .sort((a, b) => String(a.camion).localeCompare(String(b.camion)));

    setResumen(resumenFinal);
  };

  const exportarExcel = () => {
    const hoja = XLSX.utils.json_to_sheet(resumen);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "ResumenCamion");
    XLSX.writeFile(libro, "resumen_por_camion.xlsx");
  };

  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.autoTable({
      head: [["Camión", "Total Entregas", "Total Litros", "Días", "Sectores"]],
      body: resumen.map((r) => [
        r.camion,
        r.totalEntregas,
        r.totalLitros,
        r.dias,
        r.sectores,
      ]),
    });
    doc.save("resumen_por_camion.pdf");
  };

  if (cargando) return <div className="main-container"><p>Cargando…</p></div>;
  if (error) return <div className="main-container"><p>{error}</p></div>;

  return (
    <div className="main-container fade-in">
      <h2 className="titulo">Resumen de Rutas por Camión</h2>

      {/* SOLO PARA USUARIOS QUE NO SON INVITADO */}
      {rol !== "invitado" && (
        <div className="botones-exportar">
          <button onClick={exportarExcel}>📤 Excel</button>
          <button onClick={exportarPDF}>📄 PDF</button>
        </div>
      )}

      <table className="tabla">
        <thead>
          <tr>
            <th>Camión</th>
            <th>Total Entregas</th>
            <th>Total Litros</th>
            <th>Días</th>
            <th>Sectores</th>
          </tr>
        </thead>
        <tbody>
          {resumen.map((r, i) => (
            <tr key={`${r.camion}-${i}`}>
              <td>{r.camion}</td>
              <td>{r.totalEntregas}</td>
              <td>{r.totalLitros}</td>
              <td>{r.dias}</td>
              <td style={{ textAlign: "justify", maxWidth: "600px" }}>{r.sectores}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RutasPorCamion;
