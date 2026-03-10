// src/NoEntregadas.js
import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import API_URL from "./config";
import "./App.css";

// ── Estados no-entrega (todo menos 1, 5, 6, 7) ──
const ESTADOS = {
  0: { texto: "No entrega",                emoji: "🚫" },
  2: { texto: "No encontrado",             emoji: "🚪" },
  3: { texto: "Camino malo",               emoji: "🚧" },
  4: { texto: "Falta al protocolo",        emoji: "⚠️" },
  8: { texto: "No quiere recibir x motivo",emoji: "🙅" },
};

// Todos los estados para el select de filtro
const TODOS_ESTADOS = {
  0: "🚫 No entrega",
  2: "🚪 No encontrado",
  3: "🚧 Camino malo",
  4: "⚠️ Falta al protocolo",
  8: "🙅 No quiere recibir x motivo",
};

export default function NoEntregadas() {
  const hoy = new Date();
  const hace7 = new Date(hoy);
  hace7.setDate(hoy.getDate() - 7);

  const [desde, setDesde] = useState(hace7.toISOString().slice(0, 10));
  const [hasta, setHasta] = useState(hoy.toISOString().slice(0, 10));
  const [camion, setCamion] = useState("");
  const [estado, setEstado] = useState("");
  const [rows, setRows] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async () => {
    try {
      setCargando(true);
      setError("");
      const params = { desde, hasta };
      if (camion) params.camion = camion;
      if (estado !== "") params.estado = Number(estado);

      const res = await axios.get(`${API_URL}/no-entregadas`, { params });
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      setError("No se pudieron cargar los datos.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filtro local por estado si no se mandó al backend
  const filas = useMemo(() => {
    const base = estado === ""
      ? rows.filter((r) => ![1, 5, 6, 7].includes(Number(r.estado)))
      : rows;
    return base.sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
  }, [rows, estado]);

  // KPIs por estado
  const kpis = useMemo(() => {
    const acc = {};
    for (const r of filas) {
      const est = Number(r.estado);
      const label = ESTADOS[est]?.texto || `Estado ${est}`;
      if (!acc[est]) acc[est] = { label, emoji: ESTADOS[est]?.emoji || "", count: 0 };
      acc[est].count++;
    }
    return Object.values(acc).sort((a, b) => b.count - a.count);
  }, [filas]);

  const camiones = useMemo(
    () => [...new Set(rows.map((r) => r.camion).filter(Boolean))].sort(),
    [rows]
  );

  const exportarExcel = () => {
    const datos = filas.map((r) => ({
      Fecha: String(r.fecha).slice(0, 10),
      Camion: r.camion,
      Nombre: r.nombre,
      Estado: `${ESTADOS[r.estado]?.emoji || ""} ${ESTADOS[r.estado]?.texto || r.estado}`,
      Motivo: r.motivo ?? "",
      Telefono: r.telefono ?? "",
      Latitud: r.latitud ?? "",
      Longitud: r.longitud ?? "",
      Foto: r.foto_url ? "Sí" : "No",
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(datos);
    XLSX.utils.book_append_sheet(wb, ws, "No_Entregadas");
    XLSX.writeFile(wb, `no_entregadas_${desde}_a_${hasta}.xlsx`);
  };

  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.text("Entregas No Realizadas", 14, 15);
    doc.autoTable({
      head: [["Fecha", "Camión", "Nombre", "Estado", "Motivo", "Teléfono"]],
      body: filas.map((r) => [
        String(r.fecha).slice(0, 10),
        r.camion,
        r.nombre,
        `${ESTADOS[r.estado]?.emoji || ""} ${ESTADOS[r.estado]?.texto || r.estado}`,
        r.motivo ?? "",
        r.telefono ?? "",
      ]),
      startY: 20,
    });
    doc.save(`no_entregadas_${desde}_a_${hasta}.pdf`);
  };

  const fotoHref = (url) =>
    !url ? null : url.startsWith("http") ? url : `${API_URL}${url}`;

  return (
    <div className="main-container fade-in">
      <h2 className="titulo">❌ Entregas No Realizadas</h2>

      {/* KPIs por estado */}
      {kpis.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
          <div style={sKpi("#f1f5f9", "#1e293b")}>
            <div style={{ fontSize: 11, color: "#64748b" }}>Total no realizadas</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{filas.length}</div>
          </div>
          {kpis.map((k, i) => (
            <div key={i} style={sKpi("#fff", "#1e293b")}>
              <div style={{ fontSize: 11, color: "#64748b" }}>{k.emoji} {k.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#dc2626" }}>{k.count}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, marginBottom: 12 }}>
        <div>
          <label className="block text-xs mb-1">Desde</label>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="w-full" />
        </div>
        <div>
          <label className="block text-xs mb-1">Hasta</label>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="w-full" />
        </div>
        <div>
          <label className="block text-xs mb-1">Camión</label>
          <select value={camion} onChange={(e) => setCamion(e.target.value)} className="w-full">
            <option value="">Todos</option>
            {camiones.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs mb-1">Estado</label>
          <select value={estado} onChange={(e) => setEstado(e.target.value)} className="w-full">
            <option value="">Todos (no-entrega)</option>
            {Object.entries(TODOS_ESTADOS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "end", gap: 8 }}>
          <button onClick={fetchData} disabled={cargando}>
            {cargando ? "Cargando..." : "Buscar"}
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "end", gap: 8 }}>
          <button onClick={exportarExcel} disabled={!filas.length}>Excel</button>
          <button onClick={exportarPDF} disabled={!filas.length}>PDF</button>
        </div>
      </div>

      {error && <div className="alert" style={{ marginBottom: 12 }}>{error}</div>}

      {/* Tabla */}
      <div style={{ overflowX: "auto" }}>
        <table className="tabla">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Camión</th>
              <th>Nombre</th>
              <th>Estado</th>
              <th>Motivo</th>
              <th>Teléfono</th>
              <th>GPS</th>
              <th>Foto</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((r, i) => {
              const href = fotoHref(r.foto_url);
              const est = ESTADOS[Number(r.estado)];
              return (
                <tr key={r.id ?? `${r.camion}-${r.nombre}-${i}`}>
                  <td>{String(r.fecha).slice(0, 10)}</td>
                  <td>{r.camion}</td>
                  <td>{r.nombre}</td>
                  <td style={{ fontWeight: 600 }}>
                    {est ? `${est.emoji} ${est.texto}` : `Estado ${r.estado}`}
                  </td>
                  <td>{r.motivo ?? "—"}</td>
                  <td>{r.telefono ?? "—"}</td>
                  <td>
                    {r.latitud && r.longitud ? (
                      <a href={`https://maps.google.com/?q=${r.latitud},${r.longitud}`} target="_blank" rel="noreferrer">
                        📍 Ver
                      </a>
                    ) : "—"}
                  </td>
                  <td>
                    {href ? (
                      <a href={href} target="_blank" rel="noreferrer">📷 Ver</a>
                    ) : "—"}
                  </td>
                </tr>
              );
            })}
            {!filas.length && !cargando && (
              <tr>
                <td colSpan="8" style={{ padding: 16, color: "#64748b", textAlign: "center" }}>
                  Sin resultados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function sKpi(bg, color) {
  return {
    background: bg, borderRadius: 12, padding: "12px 16px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)", minWidth: 120, color
  };
}
