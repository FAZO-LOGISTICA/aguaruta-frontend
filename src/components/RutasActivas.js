import React, { useEffect, useState } from "react";
import { apiMethods } from "../services/api";

const RutasActivas = () => {
  const [rutas, setRutas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiMethods.getRutasActivas()
      .then(data => {
        setRutas(data);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Cargando rutas...</p>;

  return (
    <div>
      <h2>Rutas Activas</h2>
      <ul>
        {rutas.map((ruta, index) => (
          <li key={index}>
            {ruta.nombre} - {ruta.camion} - {ruta.litros} L
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RutasActivas;
