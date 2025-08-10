// src/NoEntregadas.js
import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import API_URL from "./config";
import "./App.css";

const ESTADOS = {
  0: "No entrega (con foto)",
  2: "No entrega (foto, sin ubicar)",
  3: "No se ubica (sin foto)",
};

export default function NoEntregadas() {
  const hoy = new Date();
  const hace7 = new Date(hoy);
  hace7.setDate(hoy.getDate() - 7);

  const [desde, setDesde] = useState(hace7.toISOString().slice(0, 10));
  const [hasta, setHasta] = useState(hoy.toISOString().slice(0, 10));
  const [camion, setCamion] = useState("");
  const [estado, setEstado] = useState(""); // vacío = 0,2,3
  const [rows, setRows] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async () => {
    try {
      setCargando(true);
      setError("");
      const params = { desde, hasta };
      if (camion) params.camion = camion;
      if (estado !== "") params.estado = Number(estado); // 0/2/3
      const res = await axios.get(`${API_URL}/entregas`, { params });
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      setError("No se pudieron cargar los datos.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    fetchData(); // carga inicial
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Si no se selecciona estado, filtramos 0,2,3 en el front
  const filas = useMemo(() => {
    const base =
      estado === ""
        ? rows.filter((r) => [0, 2, 3].includes(Number(r.estado)))
        : rows;
    return base.sort((a, b) =>
      String(b.fecha).localeCompare(String(a.fecha))
    );
  }, [rows, estado]);

  const camiones = useMemo(
    () => [...new Set(rows.map((r) => r.camion).filter(Boolean))].sort(),
    [rows]
  );

  const exportarExcel = () => {
    const datos = filas.map((r) => ({
      Fecha: String(r.fecha).slice(0, 10),
      Camion: r.camion,
      Nombre: r.nombre,
      Litros: r.litros ?? "",
      Estado: ESTADOS[r.estado] ?? r.estado,
      Motivo: r.motivo ?? "",
      Telefono: r.telefono ?? "",
      Latitud: r.latitud ?? "",
      Longitud: r.longitud ?? "",
      Foto: r.foto_url ? "Sí" : "No",
      Usuario: r.usuario ?? "",
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
        ESTADOS[r.estado] ?? r.estado,
        r.motivo ?? "",
        r.telefono ?? "",
      ]),
      startY: 20,
    });
    doc.save(`no_entregadas_${desde}_a_${hasta}.pdf`);
  };

  const fotoHref = (url) =>
    !url ? null : url.startsWith("http") ? url : `${API_URL}/${url}`;

  return (
    <div className="main-container fade-in">
      <h2 className="titulo">Entregas No Realizadas</h2>

      {/* Filtros */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div>
          <label className="block text-xs mb-1">Desde</label>
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-xs mb-1">Hasta</label>
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-xs mb-1">Camión</label>
          <select
            value={camion}
            onChange={(e) => setCamion(e.target.value)}
            className="w-full"
          >
            <option value="">Todos</option>
            {camiones.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs mb-1">Estado</label>
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className="w-full"
          >
            <option value="">0, 2 y 3</option>
            <option value="0">No entrega (con foto)</option>
            <option value="2">No entrega (foto, sin ubicar)</option>
            <option value="3">No se ubica (sin foto)</option>
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "end", gap: 8 }}>
          <button onClick={fetchData} disabled={cargando}>
            {cargando ? "Cargando..." : "Buscar"}
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "end", gap: 8 }}>
          <button onClick={exportarExcel} disabled={!filas.length}>
            Exportar Excel
          </button>
          <button onClick={exportarPDF} disabled={!filas.length}>
            Exportar PDF
          </button>
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
              <th>Litros</th>
              <th>Estado</th>
              <th>Motivo</th>
              <th>Teléfono</th>
              <th>GPS</th>
              <th>Foto</th>
              <th>Usuario</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((r, i) => {
              const href = fotoHref(r.foto_url);
              return (
                <tr key={r.id ?? `${r.camion}-${r.nombre}-${i}`}>
                  <td>{String(r.fecha).slice(0, 10)}</td>
                  <td>{r.camion}</td>
                  <td>{r.nombre}</td>
                  <td>{Number(r.litros || 0).toLocaleString("es-CL")}</td>
                  <td>{ESTADOS[r.estado] ?? r.estado}</td>
                  <td>{r.motivo ?? "—"}</td>
                  <td>{r.telefono ?? "—"}</td>
                  <td>
                    {r.latitud && r.longitud ? (
                      <a
                        href={`https://maps.google.com/?q=${r.latitud},${r.longitud}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Ver
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {href ? (
                      <a href={href} target="_blank" rel="noreferrer">
                        Ver
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{r.usuario ?? "—"}</td>
                </tr>
              );
            })}
            {!filas.length && !cargando && (
              <tr>
                <td
                  colSpan="10"
                  style={{ padding: 16, color: "#64748b", textAlign: "center" }}
                >
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
