// src/EntregasApp.js
import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import API_URL from "./config";
import "./App.css";

const ESTADOS_TXT = {
  1: "Entregada",
  0: "No entrega (con foto)",
  2: "No entrega (foto, sin ubicar)",
  3: "No se ubica (sin foto)",
};

function EntregasApp() {
  const [entregas, setEntregas] = useState([]);
  const [filtroCamion, setFiltroCamion] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");

  useEffect(() => {
    axios
      .get(`${API_URL}/entregas-app`)
      .then((res) => setEntregas(Array.isArray(res.data) ? res.data : []))
      .catch((err) => console.error("Error al cargar entregas:", err));
  }, []);

  const camiones = useMemo(
    () => [...new Set(entregas.map((e) => e.camion).filter(Boolean))].sort(),
    [entregas]
  );

  const entregasFiltradas = useMemo(
    () =>
      entregas.filter(
        (e) =>
          (!filtroCamion || e.camion === filtroCamion) &&
          (!filtroFecha || String(e.fecha).slice(0, 10) === filtroFecha) &&
          (!filtroEstado || String(e.estado) === filtroEstado)
      ),
    [entregas, filtroCamion, filtroFecha, filtroEstado]
  );

  const exportarExcel = () => {
    const wb = XLSX.utils.book_new();
    const data = entregasFiltradas.map((e) => ({
      Fecha: String(e.fecha).slice(0, 10),
      Nombre: e.nombre,
      Camion: e.camion,
      Litros: e.litros,
      Estado: ESTADOS_TXT[e.estado] ?? e.estado,
      Foto: e.foto_url ? "Sí" : "No",
      Latitud: e.latitud,
      Longitud: e.longitud,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "EntregasApp");
    XLSX.writeFile(wb, "EntregasApp.xlsx");
  };

  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.text("Entregas registradas desde App", 14, 15);
    const rows = entregasFiltradas.map((e) => [
      String(e.fecha).slice(0, 10),
      e.nombre,
      e.camion,
      e.litros,
      ESTADOS_TXT[e.estado] ?? e.estado,
      e.foto_url ? "✅" : "—",
      e.latitud ?? "",
      e.longitud ?? "",
    ]);
    doc.autoTable({
      head: [["Fecha", "Nombre", "Camión", "Litros", "Estado", "Foto", "Latitud", "Longitud"]],
      body: rows,
      startY: 20,
    });
    doc.save("EntregasApp.pdf");
  };

  const fotoHref = (url) =>
    !url ? null : url.startsWith("http") ? url : `${API_URL}/${url}`;

  return (
    <main className="main-container fade-in">
      <h2 className="titulo">📱 Entregas desde App Móvil</h2>

      <div className="botones-exportar" style={{ alignItems: "center" }}>
        <label>Camión:&nbsp;</label>
        <select value={filtroCamion} onChange={(e) => setFiltroCamion(e.target.value)}>
          <option value="">Todos</option>
          {camiones.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <label style={{ marginLeft: 12 }}>Fecha:&nbsp;</label>
        <input
          type="date"
          value={filtroFecha}
          onChange={(e) => setFiltroFecha(e.target.value)}
        />

        <label style={{ marginLeft: 12 }}>Estado:&nbsp;</label>
        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
          <option value="">Todos</option>
          <option value="1">Entregada</option>
          <option value="0">No entrega (con foto)</option>
          <option value="2">No entrega (foto, sin ubicar)</option>
          <option value="3">No se ubica (sin foto)</option>
        </select>

        <button onClick={exportarExcel}>📊 Exportar Excel</button>
        <button onClick={exportarPDF}>📄 Exportar PDF</button>
      </div>

      <div className="tabla-container" style={{ overflowX: "auto" }}>
        <table className="tabla">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Nombre</th>
              <th>Camión</th>
              <th>Litros</th>
              <th>Estado</th>
              <th>Foto</th>
              <th>GPS</th>
            </tr>
          </thead>
          <tbody>
            {entregasFiltradas.map((e, idx) => {
              const href = fotoHref(e.foto_url);
              return (
                <tr key={`${e.nombre}-${e.camion}-${e.fecha}-${idx}`}>
                  <td>{String(e.fecha).slice(0, 10)}</td>
                  <td>{e.nombre}</td>
                  <td>{e.camion}</td>
                  <td>{Number(e.litros || 0).toLocaleString("es-CL")}</td>
                  <td>{ESTADOS_TXT[e.estado] ?? e.estado}</td>
                  <td>
                    {href ? (
                      <a href={href} target="_blank" rel="noreferrer">
                        📷 Ver
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {e.latitud && e.longitud ? (
                      <a
                        href={`https://www.google.com/maps?q=${e.latitud},${e.longitud}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        📍 Ver
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
            {!entregasFiltradas.length && (
              <tr>
                <td colSpan="7" style={{ padding: 16, color: "#64748b", textAlign: "center" }}>
                  Sin resultados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

export default EntregasApp;
