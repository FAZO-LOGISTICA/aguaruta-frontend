// src/origen/RutasActivas.js
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import "./Aplicación.css"; // si usas App.css cámbialo
import { API_URL } from "./config"; // <- está en la misma carpeta

// normaliza texto (quita acentos y minúsculas)
const normalizar = (str) =>
  String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const RutasActivas = () => {
  const [datos, setDatos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [filtro, setFiltro] = useState({
    camion: "",
    dia: "",
    nombre: "",
    litros: "",
  });
  const [editandoId, setEditandoId] = useState(null);
  const [cambios, setCambios] = useState({});

  const cargar = async () => {
    try {
      setCargando(true);
      const res = await axios.get(`${API_URL}/rutas-activas`);
      setDatos(Array.isArray(res.data) ? res.data : []);
      setError(null);
    } catch (e) {
      console.error("Error al cargar datos:", e);
      setError("No se pudieron cargar las rutas.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    console.log("API_URL =", API_URL);
    cargar();
  }, []);

  const onEditar = (row) => {
    setEditandoId(row.id);
    setCambios({
      camion: row.camion ?? "",
      nombre: row.nombre ?? "",
      dia: row.dia ?? "",
      litros: row.litros ?? "",
      telefono: row.telefono ?? "",
      latitud: row.latitud ?? "",
      longitud: row.longitud ?? "",
    });
  };

  const toNumberOrNull = (v) => {
    if (v === "" || v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  };

  const guardarCambios = async (row) => {
    const confirmar = window.confirm("¿Guardar cambios en este registro?");
    if (!confirmar) return;

    const diff = {};
    if (cambios.camion !== row.camion) diff.camion = cambios.camion;
    if (cambios.dia !== row.dia) diff.dia = cambios.dia;

    const litrosNum = toNumberOrNull(cambios.litros);
    if (litrosNum !== (row.litros ?? null)) diff.litros = litrosNum;

    if (cambios.telefono !== row.telefono) diff.telefono = cambios.telefono;

    const latNum = toNumberOrNull(cambios.latitud);
    if (latNum !== (row.latitud ?? null)) diff.latitud = latNum;

    const lonNum = toNumberOrNull(cambios.longitud);
    if (lonNum !== (row.longitud ?? null)) diff.longitud = lonNum;

    const payload = { id: row.id, ...diff };
    console.log("PUT /editar-ruta payload:", payload);

    try {
      const r = await axios.put(`${API_URL}/editar-ruta`, payload);
      console.log("Respuesta backend:", r.data);
      setDatos((prev) => prev.map((r0) => (r0.id === row.id ? { ...r0, ...diff } : r0)));
      setEditandoId(null);
      setCambios({});
    } catch (e) {
      console.error("Error al guardar cambios:", e);
      alert("No se pudo guardar. Revisa consola/logs.");
    }
  };

  const exportarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "RutasActivas");
    XLSX.writeFile(wb, "rutas_activas.xlsx");
  };

  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.autoTable({
      head: [["Camión", "Nombre", "Día", "Litros", "Teléfono", "Latitud", "Longitud"]],
      body: datos.map((d) => [
        d.camion ?? "",
        d.nombre ?? "",
        d.dia ?? "",
        d.litros ?? "",
        d.telefono ?? "",
        d.latitud ?? "",
        d.longitud ?? "",
      ]),
    });
    doc.save("rutas_activas.pdf");
  };

  const datosFiltrados = useMemo(() => {
    return datos.filter(
      (d) =>
        normalizar(d.camion).includes(normalizar(filtro.camion)) &&
        normalizar(d.dia).includes(normalizar(filtro.dia)) &&
        normalizar(d.nombre).includes(normalizar(filtro.nombre)) &&
        String(d.litros ?? "").includes(filtro.litros)
    );
  }, [datos, filtro]);

  if (cargando) return <div className="main-container fade-in"><p>Cargando…</p></div>;
  if (error) return <div className="main-container fade-in"><p>{error}</p></div>;

  return (
    <div className="main-container fade-in">
      <h2 className="titulo">Rutas Activas por Camión</h2>

      <div className="botones-exportar">
        <button onClick={exportarExcel}>📊 Exportar Excel</button>
        <button onClick={exportarPDF}>🧾 Exportar PDF</button>
      </div>

      <table className="tabla">
        <thead>
          <tr>
            <th>
              Camión<br />
              <input
                value={filtro.camion}
                onChange={(e) => setFiltro({ ...filtro, camion: e.target.value })}
              />
            </th>
            <th>
              Nombre<br />
              <input
                value={filtro.nombre}
                onChange={(e) => setFiltro({ ...filtro, nombre: e.target.value })}
              />
            </th>
            <th>
              Día<br />
              <input
                value={filtro.dia}
                onChange={(e) => setFiltro({ ...filtro, dia: e.target.value })}
              />
            </th>
            <th>
              Litros<br />
              <input
                value={filtro.litros}
                onChange={(e) => setFiltro({ ...filtro, litros: e.target.value })}
              />
            </th>
            <th>Teléfono</th>
            <th>Latitud</th>
            <th>Longitud</th>
            <th>Acción</th>
          </tr>
        </thead>

        <tbody>
          {datosFiltrados.map((d) => {
            const enEdicion = editandoId === d.id;
            return (
              <tr key={d.id}>
                <td>
                  {enEdicion ? (
                    <input
                      value={cambios.camion}
                      onChange={(e) => setCambios({ ...cambios, camion: e.target.value })}
                    />
                  ) : (
                    d.camion
                  )}
                </td>
                <td>
                  {enEdicion ? (
                    <input
                      value={cambios.nombre}
                      onChange={(e) => setCambios({ ...cambios, nombre: e.target.value })}
                    />
                  ) : (
                    d.nombre
                  )}
                </td>
                <td>
                  {enEdicion ? (
                    <input
                      value={cambios.dia}
                      onChange={(e) => setCambios({ ...cambios, dia: e.target.value })}
                    />
                  ) : (
                    d.dia
                  )}
                </td>
                <td>
                  {enEdicion ? (
                    <input
                      value={cambios.litros}
                      onChange={(e) => setCambios({ ...cambios, litros: e.target.value })}
                    />
                  ) : (
                    d.litros
                  )}
                </td>
                <td>
                  {enEdicion ? (
                    <input
                      value={cambios.telefono}
                      onChange={(e) => setCambios({ ...cambios, telefono: e.target.value })}
                    />
                  ) : (
                    d.telefono
                  )}
                </td>
                <td>
                  {enEdicion ? (
                    <input
                      value={cambios.latitud}
                      onChange={(e) => setCambios({ ...cambios, latitud: e.target.value })}
                    />
                  ) : (
                    d.latitud
                  )}
                </td>
                <td>
                  {enEdicion ? (
                    <input
                      value={cambios.longitud}
                      onChange={(e) => setCambios({ ...cambios, longitud: e.target.value })}
                    />
                  ) : (
                    d.longitud
                  )}
                </td>
                <td>
                  {enEdicion ? (
                    <>
                      <button onClick={() => guardarCambios(d)}>💾 Guardar</button>
                      <button onClick={() => { setEditandoId(null); setCambios({}); }}>❌ Cancelar</button>
                    </>
                  ) : (
                    <button onClick={() => onEditar(d)}>✏️ Editar</button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default RutasActivas;
