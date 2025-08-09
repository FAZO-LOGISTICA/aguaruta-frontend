// src/Entregas.js
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import {
  FaTruck, FaTint, FaCheckCircle, FaTimesCircle, FaExclamationTriangle,
  FaPhone, FaMapMarkerAlt, FaImage
} from "react-icons/fa";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

// Códigos oficiales del sistema:
// 1 = Entregada
// 0 = No entrega (con foto)
// 2 = No entrega (con foto, sin ubicar)
// 3 = No se ubica domicilio (sin foto)
const ESTADOS = {
  1: { texto: "Entregada", colorText: "text-green-600", Icon: FaCheckCircle },
  0: { texto: "No entrega (con foto)", colorText: "text-red-600", Icon: FaTimesCircle },
  2: { texto: "No entrega (foto, sin ubicar)", colorText: "text-amber-600", Icon: FaExclamationTriangle },
  3: { texto: "No se ubica (sin foto)", colorText: "text-gray-600", Icon: FaExclamationTriangle },
};

function EstadoBadge({ estado }) {
  const cfg = ESTADOS[Number(estado)] || { texto: `Desconocido (${estado})`, colorText: "text-slate-600", Icon: FaExclamationTriangle };
  const Ico = cfg.Icon;
  return (
    <span className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-semibold ${cfg.colorText}`}>
      <Ico /> {cfg.texto}
    </span>
  );
}

export default function Entregas() {
  const [fondo, setFondo] = useState("");
  const [data, setData] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  // Filtros
  const hoy = new Date().toISOString().slice(0, 10);
  const [desde, setDesde] = useState(hoy);
  const [hasta, setHasta] = useState(hoy);
  const [camion, setCamion] = useState("");
  const [nombre, setNombre] = useState("");
  const [estado, setEstado] = useState("");

  useEffect(() => {
    const n = Math.floor(Math.random() * 9) + 1;
    setFondo(`/img/valparaiso/valparaiso${n}.jpg`);
  }, []);

  const fetchEntregas = async () => {
    try {
      setCargando(true);
      setError("");
      const params = {
        desde, hasta,
        camion: camion || undefined,
        nombre: nombre || undefined,
        estado: estado || undefined,
      };
      const res = await axios.get(`${API_URL}/entregas`, { params });
      setData(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      setError("No se pudieron cargar las entregas.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { fetchEntregas(); /* carga inicial */ }, []); // eslint-disable-line

  const totales = useMemo(() => {
    let entregas = 0, litros = 0;
    for (const r of data) {
      if (Number(r.estado) === 1) {
        entregas += 1;
        litros += Number(r.litros || 0);
      }
    }
    return { entregas, litros };
  }, [data]);

  const exportarExcel = () => {
    const hoja = XLSX.utils.json_to_sheet(data);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Entregas");
    XLSX.writeFile(libro, `entregas_${desde}_a_${hasta}.xlsx`);
  };

  const formateaLitros = (v) => {
    const n = Number(v || 0);
    return Number.isFinite(n) ? n.toLocaleString("es-CL") : "";
    };

  const fechaStr = (r) => (r.fecha ? String(r.fecha).slice(0,10) : (r.dia || "")); // fallback si backend aún devuelve "dia"

  return (
    <main className="vista-main min-h-screen" style={{ backgroundImage: `url(${fondo})` }}>
      <div className="overlay min-h-screen">
        <img
          src="/img/logos/logos-institucionales.png"
          alt="Logos institucionales"
          className="logo-fijo"
        />

        <section className="card glass max-w-[1400px] mx-auto mt-8">
          <header className="card-header mb-4">
            <h1 className="text-3xl font-bold">Historial de Entregas</h1>
            <p className="text-sm text-slate-700">
              Consulta unificada (web + app). Filtra por fecha, camión, nombre y estado. Exporta a Excel.
            </p>
          </header>

          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-4">
            <div>
              <label className="block text-xs mb-1">Desde</label>
              <input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="w-full border rounded px-2 py-2" />
            </div>
            <div>
              <label className="block text-xs mb-1">Hasta</label>
              <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="w-full border rounded px-2 py-2" />
            </div>
            <div>
              <label className="block text-xs mb-1">Camión</label>
              <select value={camion} onChange={e => setCamion(e.target.value)} className="w-full border rounded px-2 py-2">
                <option value="">Todos</option>
                <option>A1</option><option>A2</option><option>A3</option><option>A4</option><option>A5</option>
                <option>M1</option><option>M2</option><option>M3</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs mb-1">Nombre (jefe/a de hogar)</label>
              <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Rosa..." className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs mb-1">Estado</label>
              <select value={estado} onChange={e => setEstado(e.target.value)} className="w-full border rounded px-2 py-2">
                <option value="">Todos</option>
                <option value="1">Entregada</option>
                <option value="0">No entrega (con foto)</option>
                <option value="2">No entrega (foto, sin ubicar)</option>
                <option value="3">No se ubica (sin foto)</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 mb-4">
            <button onClick={fetchEntregas} disabled={cargando} className="btn primary">
              {cargando ? "Cargando..." : "Buscar"}
            </button>
            <button onClick={exportarExcel} disabled={!data.length} className="btn">
              Exportar Excel
            </button>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="p-4 rounded-2xl border shadow bg-white/70 backdrop-blur">
              <div className="text-xs text-slate-600">Entregas (estado=1)</div>
              <div className="text-2xl font-bold">{totales.entregas}</div>
            </div>
            <div className="p-4 rounded-2xl border shadow bg-white/70 backdrop-blur">
              <div className="text-xs text-slate-600">Litros entregados</div>
              <div className="text-2xl font-bold">{totales.litros.toLocaleString("es-CL")}</div>
            </div>
          </div>

          {error && <div className="alert mb-3">{error}</div>}

          {/* Tabla */}
          <div className="overflow-x-auto rounded-2xl shadow border border-gray-200 bg-white/80 backdrop-blur">
            <table className="table-auto w-full text-sm">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="p-3 text-left">Fecha</th>
                  <th className="p-3 text-left">Camión</th>
                  <th className="p-3 text-left">Nombre</th>
                  <th className="p-3 text-left">Litros</th>
                  <th className="p-3 text-left">Estado</th>
                  <th className="p-3 text-left">Motivo</th>
                  <th className="p-3 text-left">Teléfono</th>
                  <th className="p-3 text-left">GPS</th>
                  <th className="p-3 text-left">Foto</th>
                  <th className="p-3 text-left">Usuario</th>
                </tr>
              </thead>
              <tbody>
                {data.map((e, idx) => {
                  const estadoNum = Number(e.estado);
                  return (
                    <tr key={e.id ?? idx} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="p-3">{fechaStr(e)}</td>
                      <td className="p-3 flex items-center gap-2 text-gray-800">
                        <FaTruck className="text-blue-500" />
                        {e.camion}
                      </td>
                      <td className="p-3">{e.nombre}</td>
                      <td className="p-3 flex items-center gap-1">
                        <FaTint className="text-cyan-500" />
                        {formateaLitros(e.litros)}
                      </td>
                      <td className="p-3 font-medium">
                        <EstadoBadge estado={estadoNum} />
                      </td>
                      <td className="p-3">{e.motivo || ""}</td>
                      <td className="p-3">
                        {e.telefono ? (
                          <a href={`tel:${e.telefono}`} className="inline-flex items-center gap-2 text-blue-700 underline">
                            <FaPhone /> {e.telefono}
                          </a>
                        ) : ""}
                      </td>
                      <td className="p-3">
                        {e.latitud && e.longitud ? (
                          <a
                            href={`https://maps.google.com/?q=${e.latitud},${e.longitud}`}
                            target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-2 text-blue-700 underline"
                          >
                            <FaMapMarkerAlt />
                            {Number(e.latitud).toFixed(5)}, {Number(e.longitud).toFixed(5)}
                          </a>
                        ) : ""}
                      </td>
                      <td className="p-3">
                        {e.foto_url ? (
                          <a
                            href={e.foto_url}
                            target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-2 text-blue-700 underline"
                          >
                            <FaImage /> Ver foto
                          </a>
                        ) : ""}
                      </td>
                      <td className="p-3">{e.usuario || e.registrado_por || ""}</td>
                    </tr>
                  );
                })}
                {!data.length && !cargando && (
                  <tr><td colSpan="10" className="p-6 text-center text-slate-500">Sin resultados</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
