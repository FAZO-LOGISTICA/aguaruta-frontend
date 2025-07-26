import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import './App.css';

const ComparacionSemanal = () => {
  const [datos, setDatos] = useState([]);
  const [camion, setCamion] = useState('Todos');

  useEffect(() => {
    axios.get('http://localhost:8000/rutas-activas')
      .then(res => setDatos(res.data))
      .catch(err => console.error('Error al cargar datos:', err));
  }, []);

  const obtenerSemana = (fecha) => {
    const d = new Date(fecha);
    const oneJan = new Date(d.getFullYear(), 0, 1);
    return Math.ceil((((d - oneJan) / 86400000) + oneJan.getDay() + 1) / 7);
  };

  const datosFiltrados = datos.filter(r => r.estado_entrega === 1 && (!camion || camion === 'Todos' || r.id_camión === camion));

  const agrupados = {};
  datosFiltrados.forEach(r => {
    if (!r.fecha) return;
    const semana = obtenerSemana(r.fecha);
    const clave = `Semana ${semana}`;
    if (!agrupados[clave]) agrupados[clave] = 0;
    agrupados[clave] += r.litros_de_entrega || 0;
  });

  const data = Object.entries(agrupados).map(([semana, litros]) => ({ semana, litros }));

  const exportarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Comparación Semanal');
    XLSX.writeFile(wb, 'comparacion_semanal.xlsx');
  };

  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.text('Comparación Semanal de Litros Entregados', 14, 15);
    const tabla = data.map(r => [r.semana, r.litros]);
    doc.autoTable({ head: [['Semana', 'Litros']], body: tabla });
    doc.save('comparacion_semanal.pdf');
  };

  const camiones = [...new Set(datos.map(d => d.id_camión).filter(c => c && c !== 0))];

  return (
    <div className="main-container fade-in">
      <h2 className="titulo">Comparación Semanal por Camión</h2>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <select value={camion} onChange={(e) => setCamion(e.target.value)}>
          <option value="Todos">Todos los camiones</option>
          {camiones.map((c, i) => <option key={i} value={c}>{c}</option>)}
        </select>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="semana" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="litros" fill="#2563eb" name="Litros Entregados" />
        </BarChart>
      </ResponsiveContainer>

      <div className="botones-exportar">
        <button onClick={exportarExcel}>Exportar Excel</button>
        <button onClick={exportarPDF}>Exportar PDF</button>
      </div>
    </div>
  );
};

export default ComparacionSemanal;
