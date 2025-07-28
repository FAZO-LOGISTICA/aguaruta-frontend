import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { FaFileExcel, FaFilePdf } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import './App.css';

const CamionEstadisticas = () => {
  const [datos, setDatos] = useState([]);
  const [camionSeleccionado, setCamionSeleccionado] = useState('Todos');

  // --- NUEVO: Obtener el rol desde localStorage ---
  const rol = localStorage.getItem("rol");

  useEffect(() => {
    axios.get('http://localhost:8000/rutas-activas')
      .then(res => {
        console.log('Datos recibidos:', res.data);
        setDatos(Array.isArray(res.data) ? res.data : []);
      })
      .catch(err => console.error('Error al cargar datos:', err));
  }, []);

  const datosFiltrados = camionSeleccionado === 'Todos'
    ? datos
    : datos.filter(d => d.camion === camionSeleccionado);

  const resumen = Object.values(
    datosFiltrados.reduce((acc, item) => {
      const key = `${item.camion}-${item.dia_asignado}`;
      if (!acc[key]) {
        acc[key] = {
          camion: item.camion,
          dia: item.dia_asignado,
          total_entregas: 0,
          total_litros: 0
        };
      }
      acc[key].total_entregas += 1;
      acc[key].total_litros += parseInt(item.litros || 0);
      return acc;
    }, {})
  );

  const exportarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(resumen);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Estadísticas');
    XLSX.writeFile(wb, 'estadisticas_camion_dia.xlsx');
  };

  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.autoTable({
      head: [['Camión', 'Día', 'Total Entregas', 'Total Litros']],
      body: resumen.map(d => [d.camion, d.dia, d.total_entregas, d.total_litros]),
    });
    doc.save('estadisticas_camion_dia.pdf');
  };

  const camiones = [...new Set(datos.map(d => d.camion).filter(c => c))];

  return (
    <div className="main-container fade-in">
      <h2 className="titulo">Estadísticas por Camión y Día</h2>

      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
        <label><strong>Camión:</strong></label>
        <select value={camionSeleccionado} onChange={(e) => setCamionSeleccionado(e.target.value)}>
          <option value="Todos">Todos</option>
          {camiones.map((c, i) => <option key={i} value={c}>{c}</option>)}
        </select>
        
        {/* --- SOLO PARA USUARIOS QUE NO SON INVITADO --- */}
        {rol !== "invitado" && (
          <>
            <button onClick={exportarExcel}><FaFileExcel /> Exportar Excel</button>
            <button onClick={exportarPDF}><FaFilePdf /> Exportar PDF</button>
          </>
        )}
      </div>

      <table className="tabla">
        <thead>
          <tr>
            <th>Camión</th>
            <th>Día</th>
            <th>Total Entregas</th>
            <th>Total Litros</th>
          </tr>
        </thead>
        <tbody>
          {resumen.map((item, index) => (
            <tr key={index}>
              <td>{item.camion}</td>
              <td>{item.dia}</td>
              <td>{item.total_entregas}</td>
              <td>{item.total_litros}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="subtitulo">Litros Entregados por Día</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={resumen}>
          <XAxis dataKey="dia" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="total_litros" fill="#2563eb" name="Litros" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CamionEstadisticas;
