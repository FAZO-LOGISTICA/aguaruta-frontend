// src/RutasActivas.js
import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import API_URL from "./config";
import "./App.css";

/* -------------------- utils -------------------- */
// normaliza texto (quita tildes y pasa a minúsculas)
const normalizar = (str) =>
  String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

// a número (soporta comas); null si vacío o inválido
const toNumberOrNull = (v) => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function warmUp() {
  try {
    await axios.get(`${API_URL}/health`, { timeout: 8000 });
  } catch {}
}

// GET /rutas-activas con warm-up + reintentos exponenciales
async function fetchRutasActivasConReintentos(intentos = 3) {
  await warmUp();
  let delay = 1500;
  for (let i = 0; i < intentos; i++) {
    try {
      const { data } = await axios.get(`${API_URL}/rutas-activas`, { timeout: 15000 });
      return Array.isArray(data) ? data : [];
    } catch (e) {
      if (i === intentos - 1) throw e;
      await sleep(delay);
      delay *= 2;
    }
  }
}

// normalizar fila (incluye id_camion para compatibilidad)
const normalizaFila = (r, idx) => ({
  id: r.id ?? idx + 1,
  camion: r.camion ?? r.CAMION ?? r.camion_asignado ?? r.id_camion ?? "",
  nombre: r.nombre ?? r.NOMBRE ?? r.jefe_hogar ?? r.jefe ?? "",
  dia: r.dia ?? r.dia_asignado ?? r.DIA ?? "",
  litros: toNumberOrNull(r.litros ?? r.LITROS ?? r.litros_de_entrega),
  telefono: r.telefono ?? r.TELEFONO ?? r.phone ?? "",
  latitud: toNumberOrNull(r.latitud ?? r.lat ?? r.latitude ?? r.Latitud),
  longitud: toNumberOrNull(r.longitud ?? r.lon ?? r.lng ?? r.longitude ?? r.Longitud),
});

/* -------------------- componente -------------------- */
const RutasActivas = () => {
  const [datos, setDatos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [soloLectura, setSoloLectura] = useState(false); // true si usó fallback

  const [filtro, setFiltro] = useState({ camion: "", dia: "", nombre: "", litros: "" });
  const [editandoId, setEditandoId] = useState(null);
  const [cambios, setCambios] = useState({});

  useEffect(() => {
    let cancel = false;

    (async () => {
      setCargando(true);
      setError("");
      setWarning("");
      setSoloLectura(false);

      // 1) backend (con reintentos)
      try {
        const arr = await fetchRutasActivasConReintentos(3);
        if (!cancel) {
          setDatos(arr.map(normalizaFila));
          setCargando(false);
        }
        return;
      } catch (e) {
        console.warn("Backend /rutas-activas no disponible, uso fallback:", e?.message || e);
      }

      // 2) fallback JSON local (solo lectura)
      const fallbacks = [
        "/datos/RutasMapaFinal_con_telefono.json",
        "/data/RutasMapaFinal_con_telefono.json",
      ];
      for (const path of fallbacks) {
        try {
          const { data } = await axios.get(path, { timeout: 15000 });
          if (!cancel) {
            const arr = Array.isArray(data) ? data : [];
            setDatos(arr.map(normalizaFila));
            setWarning("Mostrando datos de respaldo (solo lectura) por indisponibilidad del backend.");
            setSoloLectura(true);
            setCargando(false);
          }
          return;
        } catch {}
      }

      if (!cancel) {
        setError("No se pudieron cargar las rutas.");
        setDatos([]);
        setCargando(false);
      }
    })();

    return () => {
      cancel = true;
    };
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

  const guardarCambios = async (row) => {
    if (soloLectura) {
      alert("Estás en modo solo lectura (fallback). Intenta de nuevo cuando el backend esté disponible.");
      return;
    }
    if (!window.confirm("¿Guardar cambios en este registro?")) return;

    // construir solo diffs
    const diff = {};
    if (cambios.camion !== row.camion) diff.camion = cambios.camion?.trim() || null;
    if (cambios.nombre !== row.nombre) diff.nombre = cambios.nombre?.trim() || null;
    if (cambios.dia !== row.dia) diff.dia = cambios.dia?.trim() || null;

    const litrosNum = toNumberOrNull(cambios.litros);
    if (litrosNum !== (row.litros ?? null)) diff.litros = litrosNum;

    if (cambios.telefono !== row.telefono) diff.telefono = cambios.telefono?.trim() || null;

    const latNum = toNumberOrNull(cambios.latitud);
    if (latNum !== (row.latitud ?? null)) diff.latitud = latNum;

    const lonNum = toNumberOrNull(cambios.longitud);
    if (lonNum !== (row.longitud ?? null)) diff.longitud = lonNum;

    if (Object.keys(diff).length === 0) {
      setEditandoId(null);
      setCambios({});
      return;
    }

    try {
      // ✅ endpoint correcto del backend: PUT /rutas-activas/{id}
      const { data } = await axios.put(`${API_URL}/rutas-activas/${row.id}`, diff, { timeout: 15000 });
      console.log("Actualizado:", data);

      // reflejar en memoria
      setDatos((prev) => prev.map((r0) => (r0.id === row.id ? { ...r0, ...diff } : r0)));
      setEditandoId(null);
      setCambios({});
    } catch (e) {
      console.error("Error al guardar cambios:", e);
      alert("No se pudo guardar. Revisa consola/logs.");
    }
  };

  /* -------- exportaciones -------- */
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

  /* -------- filtros -------- */
  const datosFiltrados = useMemo(() => {
    return datos.filter(
      (d) =>
        normalizar(d.camion).includes(normalizar(filtro.camion)) &&
        normalizar(d.dia).includes(normalizar(filtro.dia)) &&
        normalizar(d.nombre).includes(normalizar(filtro.nombre)) &&
        String(d.litros ?? "").includes(filtro.litros)
    );
  }, [datos, filtro]);

  /* -------- UI -------- */
  if (cargando) return <div className="main-container fade-in"><p>Cargando…</p></div>;
  if (error) return <div className="main-container fade-in"><p>{error}</p></div>;

  return (
    <div className="main-container fade-in">
      <h2 className="titulo">Rutas Activas por Camión</h2>

      {warning && (
        <div className="alert alert-warning" style={{ marginBottom: 10 }}>
          {warning}
        </div>
      )}

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
                    <button
                      onClick={() => onEditar(d)}
                      disabled={soloLectura}
                      title={soloLectura ? "Solo lectura por fallback" : "Editar"}
                    >
                      ✏️ Editar
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <style>{`
        .alert { padding: 8px 12px; border-radius: 6px; }
        .alert-warning { background: #fff6e5; }
      `}</style>
    </div>
  );
};

export default RutasActivas;
