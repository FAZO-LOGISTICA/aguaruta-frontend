import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import API_URL from '../config'; // ✅ Importa desde config central
import './App.css';

function EntregasApp() {
  const [entregas, setEntregas] = useState([]);
  const [filtroCamion, setFiltroCamion] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  useEffect(() => {
    axios.get(`${API_URL}/entregas-app`)
      .then(res => setEntregas(res.data))
      .catch(err => console.error('Error al cargar entregas:', err));
  }, []);

  const estadosTexto = {
    1: 'Entregado',
    0: 'No entregado (con foto)',
    2: 'No entregado (sin foto)',
    3: 'Domicilio no ubicado'
  };

  const entregasFiltradas = entregas.filter(e => {
    return (!filtroCamion || e.camion === filtroCamion) &&
           (!filtroFecha || e.fecha === filtroFecha) &&
           (!filtroEstado || String(e.estado) === filtroEstado);
  });

  const exportarExcel = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(entregasFiltradas);
    XLSX.utils.book_append_sheet(wb, ws, "EntregasApp");
    XLSX.writeFile(wb, "EntregasApp.xlsx");
  };

  const exportarPDF = () => {
    const doc = new jsPDF();
    const tableColumn = ["Fecha", "Nombre", "Camión", "Litros", "Estado", "Foto", "Latitud", "Longitud"];
    const tableRows = entregasFiltradas.map(e => [
      e.fecha,
      e.nombre,
      e.camion,
      e.litros,
      estadosTexto[e.estado],
      e.foto_url ? "✅" : "❌",
      e.latitud,
      e.longitud
    ]);
    doc.autoTable(tableColumn, tableRows, { startY: 20 });
    doc.text("Entregas registradas desde App", 14, 15);
    doc.save("EntregasApp.pdf");
  };

  return (
    <main className="main-content">
      <div className="filtros">
        <h2>📱 Entregas desde App Móvil</h2>
        <label>Filtrar por camión:</label>
        <select onChange={e => setFiltroCamion(e.target.value)} value={filtroCamion}>
          <option value="">Todos</option>
          <option value="A1">A1</option>
          <option value="A2">A2</option>
          <option value="A3">A3</option>
          <option value="A4">A4</option>
          <option value="A5">A5</option>
          <option value="M1">M1</option>
          <option value="M2">M2</option>
          <option value="M3">M3</option>
        </select>

        <label>Filtrar por fecha:</label>
        <input type="date" onChange={e => setFiltroFecha(e.target.value)} value={filtroFecha} />

        <label>Filtrar por estado:</label>
        <select onChange={e => setFiltroEstado(e.target.value)} value={filtroEstado}>
          <option value="">Todos</option>
          <option value="1">Entregado</option>
          <option value="0">No entregado (con foto)</option>
          <option value="2">No entregado (sin foto)</option>
          <option value="3">Domicilio no ubicado</option>
        </select>

        <div className="botones-exportar">
          <button onClick={exportarExcel}>📊 Exportar Excel</button>
          <button onClick={exportarPDF}>📄 Exportar PDF</button>
        </div>
      </div>

      <div className="tabla-container">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Nombre</th>
              <th>Camión</th>
              <th>Litros</th>
              <th>Estado</th>
              <th>Foto</th>
              <th>GPS</th>
            </tr>
          </thead>
          <tbody>
            {entregasFiltradas.map((e, idx) => (
              <tr key={idx}>
                <td>{e.fecha}</td>
                <td>{e.nombre}</td>
                <td>{e.camion}</td>
                <td>{e.litros}</td>
                <td>{estadosTexto[e.estado]}</td>
                <td>
                  {e.foto_url ? (
                    <a href={`${API_URL}/${e.foto_url}`} target="_blank" rel="noreferrer">📷 Ver</a>
                  ) : '—'}
                </td>
                <td>
                  {e.latitud && e.longitud ? (
                    <a
                      href={`https://www.google.com/maps?q=${e.latitud},${e.longitud}`}
                      target="_blank"
                      rel="noreferrer"
                    >📍 Ver</a>
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

export default EntregasApp;
