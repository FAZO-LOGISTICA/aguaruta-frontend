// src/LoginApp.js
import React, { useState } from 'react';

const LoginApp = ({ onLogin, onInvitado }) => {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPass, setMostrarPass] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    const user = usuario.trim();
    const ok = onLogin(user, password);
    setError(ok ? "" : "Usuario o contraseña incorrectos.");
  };

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
        padding: 16
      }}
    >
      <div
        style={{
          padding: 32,
          borderRadius: 12,
          background: "white",
          boxShadow: "0 2px 18px #0002",
          minWidth: 340,
          maxWidth: 420,
          width: "100%"
        }}
      >
        <h2 style={{ textAlign: "center", marginBottom: 24 }}>Iniciar Sesión</h2>

        <form onSubmit={handleLogin} autoComplete="on">
          <div style={{ marginBottom: 12 }}>
            <label htmlFor="login-usuario" style={{ display: "block", marginBottom: 6 }}>
              Usuario
            </label>
            <input
              id="login-usuario"
              name="username"
              type="text"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              autoFocus
              required
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              style={{
                width: "100%",
                padding: 8,
                borderRadius: 5,
                border: "1px solid #aaa"
              }}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label htmlFor="login-password" style={{ display: "block", marginBottom: 6 }}>
              Contraseña
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="login-password"
                name="current-password"
                type={mostrarPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{
                  width: "100%",
                  padding: "8px 38px 8px 8px",
                  borderRadius: 5,
                  border: "1px solid #aaa"
                }}
              />
              <button
                type="button"
                onClick={() => setMostrarPass((v) => !v)}
                aria-label={mostrarPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                title={mostrarPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                style={{
                  position: "absolute",
                  right: 6,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "#eee",
                  border: "1px solid #ccc",
                  borderRadius: 6,
                  padding: "4px 8px",
                  cursor: "pointer",
                  fontSize: 12
                }}
              >
                {mostrarPass ? "Ocultar" : "Ver"}
              </button>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              style={{ color: "red", marginBottom: 12, textAlign: "center", fontWeight: "bold" }}
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
              fontSize: "1.05em",
              cursor: "pointer"
            }}
          >
            Ingresar
          </button>
        </form>

        <button
          type="button"
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
            cursor: "pointer"
          }}
        >
          Entrar como invitado
        </button>
      </div>
    </div>
  );
};

export default LoginApp;
