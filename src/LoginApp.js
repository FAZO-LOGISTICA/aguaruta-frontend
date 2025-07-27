import React, { useState } from "react";

const USUARIOS = [
  { usuario: "dios", password: "dios123", rol: "dios" },
  { usuario: "editor", password: "editor123", rol: "editor" }
  // Ya NO está el invitado aquí
];

export default function LoginApp() {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");

  function handleLogin(e) {
    e.preventDefault();
    setError("");
    const u = USUARIOS.find(u => u.usuario === user && u.password === pass);
    if (u) {
      localStorage.setItem("rol", u.rol);
      localStorage.setItem("usuario", u.usuario);
      window.location.reload();
    } else {
      setError("Usuario o contraseña incorrectos");
    }
  }

  function entrarComoInvitado() {
    localStorage.setItem("rol", "invitado");
    localStorage.setItem("usuario", "invitado");
    window.location.reload();
  }

  return (
    <div style={{ maxWidth: 350, margin: "100px auto", padding: 20, border: "1px solid #ccc", borderRadius: 8 }}>
      <h2>Iniciar Sesión</h2>
      <form onSubmit={handleLogin}>
        <input
          value={user}
          onChange={e => setUser(e.target.value)}
          placeholder="Usuario"
          style={{ width: "100%", marginBottom: 10 }}
        /><br />
        <input
          type="password"
          value={pass}
          onChange={e => setPass(e.target.value)}
          placeholder="Contraseña"
          style={{ width: "100%", marginBottom: 10 }}
        /><br />
        <button style={{ width: "100%" }}>Entrar</button>
      </form>
      {error && <div style={{ color: "red" }}>{error}</div>}
      <hr />
      <button style={{ width: "100%", background: "#ccc", marginTop: 8 }} onClick={entrarComoInvitado}>
        Entrar como INVITADO
      </button>
      <div style={{ marginTop: 10, fontSize: 13, color: "#888" }}>
        Usuarios de prueba:<br />
        <b>dios/dios123</b>, <b>editor/editor123</b>
      </div>
    </div>
  );
}
