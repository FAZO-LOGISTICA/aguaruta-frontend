import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaTruck, FaTint, FaCheckCircle, FaTimesCircle, FaExclamationTriangle } from 'react-icons/fa';

const estadoColores = {
  1: { texto: 'Entregado', color: 'text-green-600', icono: <FaCheckCircle /> },
  0: { texto: 'No entregado', color: 'text-red-600', icono: <FaTimesCircle /> },
  2: { texto: 'No encontrado', color: 'text-yellow-600', icono: <FaExclamationTriangle /> },
  3: { texto: 'No cumple protocolo', color: 'text-gray-600', icono: <FaExclamationTriangle /> },
};

const Entregas = () => {
  const [entregas, setEntregas] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:8000/entregas')
      .then(response => setEntregas(response.data))
      .catch(error => console.error('Error al cargar entregas:', error));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Historial de Entregas</h1>

      <div className="overflow-x-auto rounded-2xl shadow border border-gray-200">
        <table className="table-auto w-full text-sm">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="p-3 text-left">Camión</th>
              <th className="p-3 text-left">Nombre</th>
              <th className="p-3 text-left">Litros</th>
              <th className="p-3 text-left">Día</th>
              <th className="p-3 text-left">Estado</th>
            </tr>
          </thead>
          <tbody>
            {entregas.map((e, index) => {
              const estado = estadoColores[e.estado] || {};
              return (
                <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="p-3 flex items-center gap-2 text-gray-800">
                    <FaTruck className="text-blue-500" />
                    {e.camion}
                  </td>
                  <td className="p-3">{e.nombre}</td>
                  <td className="p-3 flex items-center gap-1">
                    <FaTint className="text-cyan-500" />
                    {e.litros}
                  </td>
                  <td className="p-3">{e.dia}</td>
                  <td className={`p-3 font-medium flex items-center gap-2 ${estado.color}`}>
                    {estado.icono} {estado.texto}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Entregas;
