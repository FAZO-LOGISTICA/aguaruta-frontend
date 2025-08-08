import React, { useEffect, useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import API_URL from '../config'; // ✅ Usamos URL centralizada
import './App.css';

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
    (camion === 'Todos' || r.camion === camion) &&
    (dia === 'Todos' || r.dia === dia)
  );

  const camiones = [...new Set(datos.map(d => d.camion).filter(Boolean))];
  const dias = [...new Set(datos.map(d => d.dia).filter(Boolean))];

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
      r.camion,
      r.dia,
      r.nombre,
      r.estado_entrega,
      r.motivo || '',
      r.foto_url || ''
    ]);
    doc.autoTable({
      head: [['Camión', 'Día', 'Nombre', 'Estado', 'Motivo', 'Foto']],
      body: tabla,
      startY: 20,
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
              <td>{r.camion}</td>
              <td>{r.dia}</td>
              <td>{r.nombre}</td>
              <td>{r.estado_entrega}</td>
              <td>{r.motivo || '—'}</td>
              <td>
                {r.foto_url
                  ? <a href={`${API_URL}/${r.foto_url}`} target="_blank" rel="noopener noreferrer">Ver foto</a>
                  : '—'}
              </td>
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
