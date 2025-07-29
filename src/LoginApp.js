import React, { useState } from "react";

const LoginApp = ({ onLogin, onInvitado }) => {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    // Delega la validación a App.js
    const result = onLogin(usuario, password);
    // App.js retorna true si login correcto, false si error.
    if (result === false) setError("Usuario o contraseña incorrectos.");
    else setError("");
  };

  // Invitado (sin contraseña)
  const loginInvitado = () => {
    onInvitado();
    setError("");
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
    </div>
  );
};

export default LoginApp;
