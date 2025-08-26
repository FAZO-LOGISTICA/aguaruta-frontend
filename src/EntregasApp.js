// src/EntregasApp.js
import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import API_URL from "./config";
import "./App.css";

const ESTADOS_TXT = {
  1: "Entregado",
  2: "No entregado - No hay moradores (con foto)",
  3: "No entregado - Dirección no existe (sin foto)",
  4: "No entregado - Camino malo (con foto)",
};

function EntregasApp() {
  const [entregas, setEntregas] = useState([]);
  const [cargando, setCargando] = useState(false);

  const [filtroCamion, setFiltroCamion] = useState("");
  const [filtroFecha, setFiltroFecha] = useState(""); // YYYY-MM-DD
  const [filtroEstado, setFiltroEstado] = useState(""); // "1".."4"

  // ---- fetch con filtros en el backend ----
  const cargar = async () => {
    try {
      setCargando(true);
      const params = {
        camion: filtroCamion || undefined,
        fecha: filtroFecha || undefined,
        estado: filtroEstado ? Number(filtroEstado) : undefined,
      };
      const { data } = await axios.get(`${API_URL}/entregas-app`, { params });
      setEntregas(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error al cargar entregas:", e);
      setEntregas([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroCamion, filtroFecha, filtroEstado]);

  // lista de camiones para el select
  const camiones = useMemo(
    () => [...new Set(entregas.map((e) => e.camion).filter(Boolean))].sort(),
    [entregas]
  );

  // también dejamos filtro local por seguridad (si cambian los selects sin refetch)
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

  // arma URL absoluta para la foto (acepta foto_url o foto)
  const buildFotoURL = (e) => {
    const path = e.foto_url || e.foto;
    if (!path) return null;
    if (typeof path !== "string") return null;
    if (path.startsWith("http")) return path;
    // si ya viene con /uploads/... lo respetamos
    if (path.startsWith("/uploads/")) return `${API_URL}${path}`;
    // backend guarda 'entregas/<id>.jpg'
    return `${API_URL}/uploads/${path}`;
  };

  const exportarExcel = () => {
    const wb = XLSX.utils.book_new();
    const data = entregasFiltradas.map((e) => ({
      Fecha: String(e.fecha).slice(0, 10),
      Nombre: e.nombre,
      Camión: e.camion,
      Litros: e.litros,
      Estado: ESTADOS_TXT[e.estado] ?? e.estado,
      Foto: buildFotoURL(e) ? "Sí" : "No",
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
      buildFotoURL(e) ? "✅" : "—",
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
          <option value="1">1 — Entregado</option>
          <option value="2">2 — No hay moradores (con foto)</option>
          <option value="3">3 — Dirección no existe (sin foto)</option>
          <option value="4">4 — Camino malo (con foto)</option>
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
              const fotoURL = buildFotoURL(e);
              const key = `${String(e.fecha).slice(0, 10)}_${e.camion}_${e.nombre}_${idx}`;
              return (
                <tr key={key}>
                  <td>{String(e.fecha).slice(0, 10)}</td>
                  <td>{e.nombre}</td>
                  <td>{e.camion}</td>
                  <td>{Number(e.litros || 0).toLocaleString("es-CL")}</td>
                  <td>{ESTADOS_TXT[e.estado] ?? e.estado}</td>
                  <td>
                    {fotoURL ? (
                      <a href={fotoURL} target="_blank" rel="noreferrer">
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
                  {cargando ? "Cargando..." : "Sin resultados"}
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
