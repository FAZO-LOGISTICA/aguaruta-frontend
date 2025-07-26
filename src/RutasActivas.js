import React, { useEffect, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import "./App.css";

const RutasActivas = () => {
  const [datos, setDatos] = useState([]);
  const [filtro, setFiltro] = useState({ camion: "", dia: "", nombre: "", litros: "" });
  const [editando, setEditando] = useState(null);
  const [cambios, setCambios] = useState({});

  useEffect(() => {
    axios.get("http://localhost:8000/rutas-activas")
      .then(res => {
        setDatos(Array.isArray(res.data) ? res.data : []);
      })
      .catch(err => console.error("Error al cargar datos:", err));
  }, []);

  const guardarCambios = (index) => {
    const actualizado = { ...datos[index], ...cambios };
    const confirmar = window.confirm("¿Guardar cambios en este registro?");
    if (!confirmar) return;

    axios.put("http://localhost:8000/actualizar-ruta", actualizado)
      .then(() => {
        const nuevosDatos = [...datos];
        nuevosDatos[index] = actualizado;
        setDatos(nuevosDatos);
        setEditando(null);
        setCambios({});
      })
      .catch(err => console.error("Error al guardar cambios:", err));
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
      body: datos.map(d => [
        d.camion, d.nombre, d.dia_asignado, d.litros, d.telefono, d.latitud, d.longitud
      ]),
    });
    doc.save("rutas_activas.pdf");
  };

  const datosFiltrados = datos.filter((d) =>
    String(d.camion || "").toLowerCase().includes(filtro.camion.toLowerCase()) &&
    String(d.dia_asignado || "").toLowerCase().includes(filtro.dia.toLowerCase()) &&
    String(d.nombre || "").toLowerCase().includes(filtro.nombre.toLowerCase()) &&
    String(d.litros || "").includes(filtro.litros)
  );

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
              <input value={filtro.camion} onChange={(e) => setFiltro({ ...filtro, camion: e.target.value })} />
            </th>
            <th>
              Nombre<br />
              <input value={filtro.nombre} onChange={(e) => setFiltro({ ...filtro, nombre: e.target.value })} />
            </th>
            <th>
              Día<br />
              <input value={filtro.dia} onChange={(e) => setFiltro({ ...filtro, dia: e.target.value })} />
            </th>
            <th>
              Litros<br />
              <input value={filtro.litros} onChange={(e) => setFiltro({ ...filtro, litros: e.target.value })} />
            </th>
            <th>Teléfono</th>
            <th>Latitud</th>
            <th>Longitud</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          {datosFiltrados.map((d, i) => (
            <tr key={i}>
              <td>{editando === i ? <input value={cambios.camion ?? d.camion} onChange={(e) => setCambios({ ...cambios, camion: e.target.value })} /> : d.camion}</td>
              <td>{editando === i ? <input value={cambios.nombre ?? d.nombre} onChange={(e) => setCambios({ ...cambios, nombre: e.target.value })} /> : d.nombre}</td>
              <td>{editando === i ? <input value={cambios.dia_asignado ?? d.dia_asignado} onChange={(e) => setCambios({ ...cambios, dia_asignado: e.target.value })} /> : d.dia_asignado}</td>
              <td>{editando === i ? <input value={cambios.litros ?? d.litros} onChange={(e) => setCambios({ ...cambios, litros: e.target.value })} /> : d.litros}</td>
              <td>{editando === i ? <input value={cambios.telefono ?? d.telefono} onChange={(e) => setCambios({ ...cambios, telefono: e.target.value })} /> : d.telefono}</td>
              <td>{editando === i ? <input value={cambios.latitud ?? d.latitud} onChange={(e) => setCambios({ ...cambios, latitud: e.target.value })} /> : d.latitud}</td>
              <td>{editando === i ? <input value={cambios.longitud ?? d.longitud} onChange={(e) => setCambios({ ...cambios, longitud: e.target.value })} /> : d.longitud}</td>
              <td>
                {editando === i ? (
                  <>
                    <button onClick={() => guardarCambios(i)}>💾 Guardar</button>
                    <button onClick={() => { setEditando(null); setCambios({}); }}>❌ Cancelar</button>
                  </>
                ) : (
                  <button onClick={() => setEditando(i)}>✏️ Editar</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RutasActivas;
