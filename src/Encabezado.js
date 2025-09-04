// src/Encabezado.js
import React from "react";
import { Link } from "react-router-dom";

export default function Encabezado() {
  // Si la imagen no carga, mostramos un fallback de texto
  const [ok, setOk] = React.useState(true);

  // Archivos en /public (Netlify sirve desde ahí)
  const src1x = "/img/logos/logos-institucionales.png";
  const src2x = "/img/logos/logos-institucionales@2x.png"; // opcional

  return (
    <header className="header" role="banner" aria-label="Encabezado">
      {ok ? (
        <Link to="/" title="Ir al inicio" style={{ display: "inline-block" }}>
          <img
            src={src1x}
            srcSet={`${src1x} 1x, ${src2x} 2x`}
            alt="Logos institucionales"
            className="header-logo"
            loading="eager"
            onError={() => setOk(false)}
          />
        </Link>
      ) : (
        <Link to="/" title="Ir al inicio" style={{ textDecoration: "none" }}>
          <h1 className="titulo" style={{ margin: "0.6rem 0" }}>AguaRuta</h1>
        </Link>
      )}
    </header>
  );
}
