import React, { useState } from "react";

// usuarios fijos
const usuariosFijos = [
  { usuario: "che.gustrago", password: "FAZO-LOGISTICA", rol: "dios" },
  { usuario: "laguna_verde", password: "delegacion", rol: "editor" },
  { usuario: "operaciones", password: "direccion", rol: "editor" },
];

const LoginApp = ({ onLogin }) => {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Login normal
  const handleLogin = (e) => {
    e.preventDefault();
    const encontrado = usuariosFijos.find(
      (u) =>
        u.usuario.toLowerCase() === usuario.toLowerCase().trim() &&
        u.password === password
    );
    if (encontrado) {
      localStorage.setItem("usuario", encontrado.usuario);
      localStorage.setItem("rol", encontrado.rol);
      setError("");
      onLogin(encontrado.usuario, encontrado.rol);
    } else {
      setError("Usuario o contraseña incorrectos.");
    }
  };

  // Login como invitado
  const loginInvitado = () => {
    localStorage.setItem("usuario", "invitado");
    localStorage.setItem("rol", "invitado");
    setError("");
    onLogin("invitado", "invitado");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f2f2fa",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: 32,
          borderRadius: 12,
          background: "white",
          boxShadow: "0 2px 18px #0002",
          minWidth: 340,
        }}
      >
        <h2 style={{ textAlign: "center", marginBottom: 24 }}>
          Iniciar Sesión
        </h2>
        <form onSubmit={handleLogin}>
          <div>
            <label>
              Usuario
              <input
                type="text"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                autoFocus
                required
                style={{
                  width: "100%",
                  marginBottom: 12,
                  padding: 8,
                  borderRadius: 5,
                  border: "1px solid #aaa",
                }}
              />
            </label>
          </div>
          <div>
            <label>
              Contraseña
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: "100%",
                  marginBottom: 12,
                  padding: 8,
                  borderRadius: 5,
                  border: "1px solid #aaa",
                }}
              />
            </label>
          </div>
          {error && (
            <div
              style={{
                color: "red",
                marginBottom: 12,
                textAlign: "center",
                fontWeight: "bold",
              }}
            >
              {error}
            </div>
          )}
          <button
            type="submit"
            style={{
              width: "100%",
              background: "#2563eb",
              color: "white",
              padding: 10,
              borderRadius: 5,
              fontWeight: "bold",
              border: "none",
              marginBottom: 8,
              fontSize: "1.1em",
              cursor: "pointer",
            }}
          >
            Ingresar
          </button>
        </form>
        <button
          onClick={loginInvitado}
          style={{
            width: "100%",
            background: "#b5b5b5",
            color: "#333",
            padding: 8,
            borderRadius: 5,
            fontWeight: "bold",
            border: "none",
            marginTop: 8,
            fontSize: "1em",
            cursor: "pointer",
          }}
        >
          Entrar como invitado
        </button>
      </div>
      <div style={{ marginTop: 22, fontSize: "0.9em", color: "#888" }}>
        <div>
          <b>Usuario dios:</b> che.gustrago / FAZO-LOGISTICA
        </div>
        <div>
          <b>Editor:</b> laguna_verde / delegacion
        </div>
        <div>
          <b>Editor:</b> operaciones / direccion
        </div>
      </div>
    </div>
  );
};

export default LoginApp;
