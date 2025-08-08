import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = "https://tu-backend.render.com"; // Cambia por tu URL real

const RegistrarNuevoPunto = () => {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [litros, setLitros] = useState('');
  const [sector, setSector] = useState('');
  const [latitud, setLatitud] = useState('');
  const [longitud, setLongitud] = useState('');
  const [destino, setDestino] = useState('actual'); // "actual" o "septiembre"
  const [mensaje, setMensaje] = useState('');

  const registrar = () => {
    if (!nombre || !telefono || !litros || !sector || !latitud || !longitud) {
      setMensaje('⚠️ Todos los campos son obligatorios.');
      return;
    }

    const nuevoPunto = {
      nombre,
      telefono,
      litros: parseInt(litros),
      sector,
      latitud: parseFloat(latitud),
      longitud: parseFloat(longitud),
      destino
    };

    axios.post(`${API_URL}/registrar-nuevo-punto`, nuevoPunto)
      .then(res => {
        if (res.data && res.data.camion_asignado) {
          setMensaje(`✅ Punto registrado y asignado a ${res.data.camion_asignado} (${destino === 'actual' ? 'ruta actual' : 'septiembre'})`);
          setNombre('');
          setTelefono('');
          setLitros('');
          setSector('');
          setLatitud('');
          setLongitud('');
        } else {
          setMensaje('❌ Error al asignar punto.');
        }
      })
      .catch(err => {
        console.error(err);
        setMensaje('❌ Error en el servidor.');
      });
  };

  return (
    <div className="main-container fade-in">
      <h2 className="titulo">Registrar Nuevo Punto de Entrega</h2>

      <div style={{ maxWidth: 400, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
        <label>Nombre del jefe de hogar:</label>
        <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} />

        <label>Teléfono:</label>
        <input type="text" value={telefono} onChange={(e) => setTelefono(e.target.value)} />

        <label>Litros a entregar:</label>
        <input type="number" value={litros} onChange={(e) => setLitros(e.target.value)} />

        <label>Sector:</label>
        <input type="text" value={sector} onChange={(e) => setSector(e.target.value)} />

        <label>Latitud:</label>
        <input type="text" value={latitud} onChange={(e) => setLatitud(e.target.value)} />

        <label>Longitud:</label>
        <input type="text" value={longitud} onChange={(e) => setLongitud(e.target.value)} />

        <label>¿Dónde registrar este punto?</label>
        <select value={destino} onChange={(e) => setDestino(e.target.value)}>
          <option value="actual">Ruta actual</option>
          <option value="septiembre">Ruta de septiembre</option>
        </select>

        <button onClick={registrar} style={{ marginTop: '1rem' }}>Registrar y Distribuir</button>
        {mensaje && <p style={{ marginTop: '1rem' }}>{mensaje}</p>}
      </div>
    </div>
  );
};

export default RegistrarNuevoPunto;
