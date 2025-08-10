// src/EditarRedistribucion.js
import React, { useState, useEffect } from 'react';   // ✅ ajusta los hooks que realmente uses
import axios from "axios";
import * as XLSX from "xlsx";
import "./App.css";
import API_URL from "./config";

function EditarRedistribucion() {
  const [puntos, setPuntos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [editIndex, setEditIndex] = useState(null);
  const [editData, setEditData] = useState({});
  const [camionFiltro, setCamionFiltro] = useState("");
  const [diaFiltro, setDiaFiltro] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setCargando(true);
        const { data } = await axios.get(`${API_URL}/redistribucion`);
        setPuntos(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
        setError("No se pudo cargar la redistribución.");
      } finally {
        setCargando(false);
      }
    };
    load();
  }, []);

  const camiones = useMemo(
    () => [...new Set(puntos.map((p) => p.camion).filter(Boolean))].sort(),
    [puntos]
  );
  const dias = useMemo(
    () => [...new Set(puntos.map((p) => p.dia).filter(Boolean))].sort(),
    [puntos]
  );

  const puntosFiltrados = useMemo(
    () =>
      puntos.filter(
        (p) =>
          (!camionFiltro || p.camion === camionFiltro) &&
          (!diaFiltro || p.dia === diaFiltro)
      ),
    [puntos, camionFiltro, diaFiltro]
  );

  const handleEdit = (index) => {
    const item = puntosFiltrados[index];
    setEditIndex(index);
    setEditData({ ...item }); // incluye id
  };

  const handleChange = (e, campo) => {
    let v = e.target.value;
    if (["litros", "latitud", "longitud"].includes(campo)) {
      v = v === "" ? "" : v; // mantener como string, casteamos al guardar
    }
    setEditData((prev) => ({ ...prev, [campo]: v }));
  };

  const handleSave = async () => {
    if (!editData?.id) {
      alert("Falta ID del registro a editar.");
      return;
    }
    if (!window.confirm("¿Deseas guardar los cambios permanentemente?")) return;

    // prepara payload según backend /editar-redistribucion
    const payload = {
      id: editData.id,
      camion: editData.camion ?? null,
      litros: editData.litros === "" ? null : Number(editData.litros),
      dia: editData.dia ?? null,
      telefono: editData.telefono ?? null,
      latitud: editData.latitud === "" ? null : Number(editData.latitud),
      longitud: editData.longitud === "" ? null : Number(editData.longitud),
      nombre: editData.nombre ?? null,
    };

    try {
      await axios.put(`${API_URL}/editar-redistribucion`, payload);
      // actualiza localmente por id
      setPuntos((prev) =>
        prev.map((p) => (p.id === editData.id ? { ...p, ...editData } : p))
      );
      setEditIndex(null);
      alert("✅ Cambios guardados correctamente");
    } catch (e) {
      console.error(e);
      alert("❌ Error al guardar cambios");
    }
  };

  const exportarExcel = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(puntosFiltrados);
    XLSX.utils.book_append_sheet(wb, ws, "Redistribucion");
    XLSX.writeFile(wb, "Redistribucion.xlsx");
  };

  return (
    <div className="main-container fade-in">
      <h2 className="titulo">Editar Nueva Redistribución</h2>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <select value={camionFiltro} onChange={(e) => setCamionFiltro(e.target.value)}>
          <option value="">Todos los camiones</option>
          {camiones.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select value={diaFiltro} onChange={(e) => setDiaFiltro(e.target.value)}>
          <option value="">Todos los días</option>
          {dias.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <button onClick={exportarExcel}>📊 Exportar Excel</button>
      </div>

      {error && <div className="alert" style={{ marginBottom: 12 }}>{error}</div>}
      {cargando && <div className="alert" style={{ marginBottom: 12 }}>Cargando...</div>}

      <div style={{ overflowX: "auto" }}>
        <table className="tabla">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Teléfono</th>
              <th>Litros</th>
              <th>Camión</th>
              <th>Día</th>
              <th>Latitud</th>
              <th>Longitud</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {puntosFiltrados.map((p, index) => {
              const editando = editIndex === index;
              return (
                <tr key={p.id ?? `${p.nombre}-${index}`}>
                  <td>
                    {editando ? (
                      <input
                        value={editData.nombre ?? ""}
                        onChange={(e) => handleChange(e, "nombre")}
                      />
                    ) : (
                      p.nombre
                    )}
                  </td>
                  <td>
                    {editando ? (
                      <input
                        value={editData.telefono ?? ""}
                        onChange={(e) => handleChange(e, "telefono")}
                      />
                    ) : (
                      p.telefono
                    )}
                  </td>
                  <td>
                    {editando ? (
                      <input
                        type="number"
                        step="1"
                        value={editData.litros ?? ""}
                        onChange={(e) => handleChange(e, "litros")}
                      />
                    ) : (
                      p.litros
                    )}
                  </td>
                  <td>
                    {editando ? (
                      <input
                        value={editData.camion ?? ""}
                        onChange={(e) => handleChange(e, "camion")}
                      />
                    ) : (
                      p.camion
                    )}
                  </td>
                  <td>
                    {editando ? (
                      <input
                        value={editData.dia ?? ""}
                        onChange={(e) => handleChange(e, "dia")}
                      />
                    ) : (
                      p.dia
                    )}
                  </td>
                  <td>
                    {editando ? (
                      <input
                        type="number"
                        step="0.000001"
                        value={editData.latitud ?? ""}
                        onChange={(e) => handleChange(e, "latitud")}
                      />
                    ) : (
                      p.latitud
                    )}
                  </td>
                  <td>
                    {editando ? (
                      <input
                        type="number"
                        step="0.000001"
                        value={editData.longitud ?? ""}
                        onChange={(e) => handleChange(e, "longitud")}
                      />
                    ) : (
                      p.longitud
                    )}
                  </td>
                  <td>
                    {editando ? (
                      <>
                        <button onClick={handleSave}>Guardar</button>
                        <button onClick={() => setEditIndex(null)} style={{ marginLeft: 8 }}>
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <button onClick={() => handleEdit(index)}>Editar</button>
                    )}
                  </td>
                </tr>
              );
            })}
            {!puntosFiltrados.length && !cargando && (
              <tr>
                <td colSpan="8" style={{ padding: 16, color: "#64748b" }}>
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

export default EditarRedistribucion;

