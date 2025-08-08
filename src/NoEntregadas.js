import React, { useEffect, useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import './App.css';

const API_URL = "https://tu-backend.render.com"; // ← Cambia esta URL por tu backend real

const NoEntregadas = () => {
  const [datos, setDatos] = useState([]);
  const [camion, setCamion] = useState('Todos');
  const [dia, setDia] = useState('Todos');

  useEffect(() => {
    axios.get(`${API_URL}/rutas-activas`)
      .then(res => setDatos(res.data))
      .catch(err => console.error('Error al cargar datos:', err));
  }, []);

  const filtradas = datos.filter(r =>
    [0, 2, 3].includes(r.estado_entrega) &&
    (camion === 'Todos' || r.id_camión === camion) &&
    (dia === 'Todos' || r.dia === dia)
  );

  const camiones = [...new Set(datos.map(d => d.id_camión).filter(c => c && c !== 0))];
  const dias = [...new Set(datos.map(d => d.dia).filter(d => d))];

  const exportarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtradas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'No Entregadas');
    XLSX.writeFile(wb, 'no_entregadas.xlsx');
  };

  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.text('Entregas No Realizadas', 14, 15);
    const tabla = filtradas.map(r => [
      r.id_camión,
      r.dia,
      r["nombre_(jefe_de_hogar)"],
      r.estado_entrega,
      r.motivo || '',
      r.foto || ''
    ]);
    doc.autoTable({
      head: [['Camión', 'Día', 'Nombre', 'Estado', 'Motivo', 'Foto']],
      body: tabla,
    });
    doc.save('no_entregadas.pdf');
  };

  return (
    <div className="main-container fade-in">
      <h2 className="titulo">Entregas No Realizadas</h2>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <select value={camion} onChange={(e) => setCamion(e.target.value)}>
          <option value="Todos">Todos los camiones</option>
          {camiones.map((c, i) => <option key={i} value={c}>{c}</option>)}
        </select>
        <select value={dia} onChange={(e) => setDia(e.target.value)}>
          <option value="Todos">Todos los días</option>
          {dias.map((d, i) => <option key={i} value={d}>{d}</option>)}
        </select>
      </div>

      <table className="tabla">
        <thead>
          <tr>
            <th>Camión</th>
            <th>Día</th>
            <th>Nombre</th>
            <th>Estado</th>
            <th>Motivo</th>
            <th>Foto</th>
          </tr>
        </thead>
        <tbody>
          {filtradas.map((r, i) => (
            <tr key={i}>
              <td>{r.id_camión}</td>
              <td>{r.dia}</td>
              <td>{r["nombre_(jefe_de_hogar)"]}</td>
              <td>{r.estado_entrega}</td>
              <td>{r.motivo || '—'}</td>
              <td>{r.foto ? <a href={r.foto} target="_blank" rel="noopener noreferrer">Ver foto</a> : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="botones-exportar">
        <button onClick={exportarExcel}>Exportar Excel</button>
        <button onClick={exportarPDF}>Exportar PDF</button>
      </div>
    </div>
  );
};

export default NoEntregadas;
