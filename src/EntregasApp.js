// src/EntregasApp.js
import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import API_URL from "./config";
import "./App.css";

// ── 9 estados reales ──
const ESTADOS_TXT = {
  0: "No entrega",
  1: "Entrega",
  2: "No encontrado",
  3: "Camino malo",
  4: "Falta al protocolo",
  5: "Menor cantidad entregada",
  6: "Mayor cantidad entregada",
  7: "Apoyo municipal",
  8: "No quiere recibir x motivo",
};

const ESTADOS_EMOJI = {
  0: "🚫", 1: "✅", 2: "🚪", 3: "🚧", 4: "⚠️",
  5: "📉", 6: "📈", 7: "🏛️", 8: "🙅",
};

function EntregasApp() {
  const [entregas, setEntregas] = useState([]);
  const [cargando, setCargando] = useState(false);

  const [filtroCamion, setFiltroCamion] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");

  const cargar = async () => {
    try {
      setCargando(true);
      const params = {
        camion: filtroCamion || undefined,
        fecha: filtroFecha || undefined,
        estado: filtroEstado !== "" ? Number(filtroEstado) : undefined,
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
          (filtroEstado === "" || String(e.estado) === filtroEstado)
      ),
    [entregas, filtroCamion, filtroFecha, filtroEstado]
  );

  // KPIs
  const kpis = useMemo(() => {
    let realizadas = 0, litros = 0, noRealizadas = 0;
    for (const e of entregasFiltradas) {
      const est = Number(e.estado);
      if ([1, 5, 6, 7].includes(est)) {
        realizadas++;
        litros += Number(e.litros || 0);
      } else {
        noRealizadas++;
      }
    }
    return { realizadas, litros, noRealizadas, total: entregasFiltradas.length };
  }, [entregasFiltradas]);

  const buildFotoURL = (e) => {
    const path = e.foto_url || e.foto;
    if (!path || typeof path !== "string") return null;
    if (path.startsWith("http")) return path;
    if (path.startsWith("/fotos/")) return `${API_URL}${path}`;
    if (path.startsWith("/uploads/")) return `${API_URL}${path}`;
    return `${API_URL}/uploads/${path}`;
  };

  const exportarExcel = () => {
    const wb = XLSX.utils.book_new();
    const data = entregasFiltradas.map((e) => ({
      Fecha: String(e.fecha).slice(0, 10),
      Nombre: e.nombre,
      Camión: e.camion,
      Litros: e.litros,
      Estado: `${ESTADOS_EMOJI[e.estado] || ""} ${ESTADOS_TXT[e.estado] ?? e.estado}`,
      Motivo: e.motivo || "",
      Foto: buildFotoURL(e) ? "Sí" : "No",
      Latitud: e.latitud,
      Longitud: e.longitud,
      Fuente: e.fuente || "",
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
      e.motivo || "",
      buildFotoURL(e) ? "✅" : "—",
    ]);
    doc.autoTable({
      head: [["Fecha", "Nombre", "Camión", "Litros", "Estado", "Motivo", "Foto"]],
      body: rows,
      startY: 20,
    });
    doc.save("EntregasApp.pdf");
  };

  return (
    <main className="main-container fade-in">
      <h2 className="titulo">📱 Entregas desde App Móvil</h2>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
        {[
          { label: "Total registros", value: kpis.total, color: "#1e293b" },
          { label: "✅ Realizadas", value: kpis.realizadas, color: "#16a34a" },
          { label: "💧 Litros entregados", value: kpis.litros.toLocaleString("es-CL"), color: "#0369a1" },
          { label: "❌ No realizadas", value: kpis.noRealizadas, color: "#dc2626" },
        ].map((k, i) => (
          <div key={i} style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="botones-exportar" style={{ alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <label>Camión:&nbsp;</label>
        <select value={filtroCamion} onChange={(e) => setFiltroCamion(e.target.value)}>
          <option value="">Todos</option>
          {camiones.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <label style={{ marginLeft: 8 }}>Fecha:&nbsp;</label>
        <input type="date" value={filtroFecha} onChange={(e) => setFiltroFecha(e.target.value)} />

        <label style={{ marginLeft: 8 }}>Estado:&nbsp;</label>
        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
          <option value="">Todos</option>
          <option value="0">🚫 No entrega</option>
          <option value="1">✅ Entrega</option>
          <option value="2">🚪 No encontrado</option>
          <option value="3">🚧 Camino malo</option>
          <option value="4">⚠️ Falta al protocolo</option>
          <option value="5">📉 Menor cantidad entregada</option>
          <option value="6">📈 Mayor cantidad entregada</option>
          <option value="7">🏛️ Apoyo municipal</option>
          <option value="8">🙅 No quiere recibir x motivo</option>
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
              <th>Motivo</th>
              <th>Foto</th>
              <th>GPS</th>
              <th>Fuente</th>
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
                  <td>
                    <span style={{ fontWeight: 600 }}>
                      {ESTADOS_EMOJI[e.estado] || ""} {ESTADOS_TXT[e.estado] ?? e.estado}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: "#64748b" }}>{e.motivo || "—"}</td>
                  <td>
                    {fotoURL ? (
                      <a href={fotoURL} target="_blank" rel="noreferrer">📷 Ver</a>
                    ) : "—"}
                  </td>
                  <td>
                    {e.latitud && e.longitud ? (
                      <a href={`https://www.google.com/maps?q=${e.latitud},${e.longitud}`} target="_blank" rel="noreferrer">
                        📍 Ver
                      </a>
                    ) : "—"}
                  </td>
                  <td>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6,
                      background: e.fuente === "movil" ? "#dbeafe" : "#f3f4f6",
                      color: e.fuente === "movil" ? "#1d4ed8" : "#374151"
                    }}>
                      {e.fuente === "movil" ? "📱 App" : "🖥️ Web"}
                    </span>
                  </td>
                </tr>
              );
            })}
            {!entregasFiltradas.length && (
              <tr>
                <td colSpan="9" style={{ padding: 16, color: "#64748b", textAlign: "center" }}>
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
