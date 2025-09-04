// src/Header.js
import React from "react";
import "./App.css";

export default function Header() {
  // Si la imagen falla, mostramos un fallback de texto
  const [ok, setOk] = React.useState(true);

  // Rutas desde /public (Netlify): coloca ahí tus archivos
  const src1x = "/img/logos/logos-institucionales.png";
  const src2x = "/img/logos/logos-institucionales@2x.png"; // opcional

  return (
    <header className="header" role="banner" aria-label="Encabezado">
      {ok ? (
        <a href="/" title="Ir al inicio" style={{ display: "inline-block" }}>
          <img
            src={src1x}
            srcSet={`${src1x} 1x, ${src2x} 2x`}
            alt="Logos institucionales"
            className="header-logo"
            loading="eager"
            onError={() => setOk(false)}
          />
        </a>
      ) : (
        <h1 className="titulo" style={{ margin: "0.6rem 0" }}>AguaRuta</h1>
      )}
    </header>
  );
}
