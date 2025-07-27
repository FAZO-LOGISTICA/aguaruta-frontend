import React, { useEffect, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import "./App.css";

const RutasPorCamion = () => {
  const [rutas, setRutas] = useState([]);
  const [resumen, setResumen] = useState([]);

  useEffect(() => {
    axios.get("https://aguaruta-backend.onrender.com/rutas-activas").then((res) => {
      setRutas(res.data);
      agruparPorCamion(res.data);
    });
  }, []);

  const agruparPorCamion = (data) => {
    const resumen = {};

    data.forEach((r) => {
      const camion = r.camion;
      if (!resumen[camion]) {
        resumen[camion] = {
          camion,
          totalEntregas: 0,
          totalLitros: 0,
          dias: new Set(),
          sectores: new Set(),
        };
      }
      resumen[camion].totalEntregas += 1;
      resumen[camion].totalLitros += Number(r.litros || 0);
      resumen[camion].dias.add(r.dia_asignado);
      resumen[camion].sectores.add(r.sector);
    });

    const resumenFinal = Object.values(resumen).map((r) => ({
      camion: r.camion,
      totalEntregas: r.totalEntregas,
      totalLitros: r.totalLitros,
      dias: Array.from(r.dias).join(", "),
      sectores: Array.from(r.sectores).join(", "),
    }));

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

  return (
    <div className="main-container fade-in">
      <h2 className="titulo">Resumen de Rutas por Camión</h2>

      <div className="botones-exportar">
        <button onClick={exportarExcel}>📤 Excel</button>
        <button onClick={exportarPDF}>📄 PDF</button>
      </div>

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
            <tr key={i}>
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
