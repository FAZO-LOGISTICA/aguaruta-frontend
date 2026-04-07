// src/LoginApp.js
import React, { useEffect, useState } from "react";

const LS_LAST_USER = "lastUser";

export default function LoginApp({ onLogin, onInvitado }) {
  const [usuario, setUsuario]         = useState("");
  const [password, setPassword]       = useState("");
  const [mostrarPass, setMostrarPass] = useState(false);
  const [capsOn, setCapsOn]           = useState(false);
  const [recordar, setRecordar]       = useState(true);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");

  useEffect(() => {
    try {
      const u = localStorage.getItem(LS_LAST_USER);
      if (u) setUsuario(u);
    } catch {}
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    if (loading) return;
    try {
      setLoading(true);
      const ok = await onLogin(String(usuario).trim(), password);
      if (ok) {
        if (recordar) {
          try { localStorage.setItem(LS_LAST_USER, String(usuario).trim()); } catch {}
        } else {
          try { localStorage.removeItem(LS_LAST_USER); } catch {}
        }
      } else {
        setError("Usuario o contraseña incorrectos.");
      }
    } finally {
      setLoading(false);
    }
  };

  const loginInvitado = () => {
    if (loading) return;
    onInvitado();
    setError("");
  };

  return (
    <div style={s.page}>
      {/* Fondo decorativo */}
      <div style={s.bgCircle1} />
      <div style={s.bgCircle2} />

      <div style={s.card}>
        {/* Logo / marca */}
        <div style={s.brand}>
          <span style={s.brandIcon}>💧</span>
          <span style={s.brandName}>AguaRuta</span>
        </div>

        <h2 style={s.title}>Bienvenido</h2>
        <p style={s.subtitle}>Ingresa tus credenciales para continuar</p>

        <form onSubmit={handleLogin} autoComplete="on">
          {/* Usuario */}
          <div style={s.field}>
            <label style={s.label} htmlFor="login-usuario">Usuario</label>
            <input
              id="login-usuario"
              name="username"
              type="text"
              value={usuario}
              onChange={e => setUsuario(e.target.value)}
              autoFocus
              required
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              placeholder="Tu nombre de usuario"
              style={s.input}
              onFocus={e => e.target.style.borderColor = "#38bdf8"}
              onBlur={e  => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
            />
          </div>

          {/* Contraseña */}
          <div style={s.field}>
            <label style={s.label} htmlFor="login-password">Contraseña</label>
            <div style={{ position: "relative" }}>
              <input
                id="login-password"
                name="current-password"
                type={mostrarPass ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyUp={e => setCapsOn(e.getModifierState && e.getModifierState("CapsLock"))}
                required
                autoComplete="current-password"
                placeholder="Tu contraseña"
                style={{ ...s.input, paddingRight: 72 }}
                onFocus={e => e.target.style.borderColor = "#38bdf8"}
                onBlur={e  => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
              />
              <button
                type="button"
                onClick={() => setMostrarPass(v => !v)}
                style={s.togglePass}
              >
                {mostrarPass ? "Ocultar" : "Ver"}
              </button>
            </div>
          </div>

          {capsOn && (
            <div style={s.capsWarn}>⚠️ Bloq Mayús activado</div>
          )}

          {/* Recordarme */}
          <label style={s.checkLabel}>
            <input
              type="checkbox"
              checked={recordar}
              onChange={e => setRecordar(e.target.checked)}
              style={{ accentColor: "#38bdf8", width: 15, height: 15 }}
            />
            Recordarme
          </label>

          {/* Error */}
          {error && (
            <div style={s.errorMsg} role="alert">{error}</div>
          )}

          {/* Botón ingresar */}
          <button
            type="submit"
            disabled={loading}
            style={{ ...s.btnPrimary, opacity: loading ? 0.75 : 1 }}
          >
            {loading ? "⏳ Ingresando..." : "Ingresar"}
          </button>
        </form>

        {/* Separador */}
        <div style={s.divider}>
          <div style={s.dividerLine} />
          <span style={s.dividerText}>o</span>
          <div style={s.dividerLine} />
        </div>

        {/* Invitado */}
        <button
          type="button"
          onClick={loginInvitado}
          disabled={loading}
          style={{ ...s.btnSecondary, opacity: loading ? 0.75 : 1 }}
        >
          Entrar como invitado
        </button>

        <p style={s.footer}>
          Plataforma de gestión — Gran Valparaíso
        </p>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    background: "#0a1628",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    position: "relative",
    overflow: "hidden",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  bgCircle1: {
    position: "absolute",
    width: 500,
    height: 500,
    borderRadius: "50%",
    background: "rgba(56,189,248,0.05)",
    top: -150,
    right: -150,
    pointerEvents: "none",
  },
  bgCircle2: {
    position: "absolute",
    width: 400,
    height: 400,
    borderRadius: "50%",
    background: "rgba(56,189,248,0.04)",
    bottom: -120,
    left: -120,
    pointerEvents: "none",
  },
  card: {
    background: "rgba(15, 28, 50, 0.95)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: "40px 36px",
    width: "100%",
    maxWidth: 400,
    position: "relative",
    zIndex: 2,
  },
  brand: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 28,
  },
  brandIcon: { fontSize: 28 },
  brandName: {
    fontSize: 24,
    fontWeight: 700,
    color: "#38bdf8",
    letterSpacing: "-0.5px",
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: "#fff",
    textAlign: "center",
    margin: "0 0 6px",
  },
  subtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.45)",
    textAlign: "center",
    margin: "0 0 28px",
  },
  field: { marginBottom: 16 },
  label: {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "rgba(255,255,255,0.6)",
    marginBottom: 6,
    letterSpacing: "0.3px",
    textTransform: "uppercase",
  },
  input: {
    width: "100%",
    padding: "11px 14px",
    background: "rgba(255,255,255,0.06)",
    border: "1.5px solid rgba(255,255,255,0.12)",
    borderRadius: 10,
    fontSize: 14,
    color: "#fff",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
    transition: "border-color 0.15s",
  },
  togglePass: {
    position: "absolute",
    right: 10,
    top: "50%",
    transform: "translateY(-50%)",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 6,
    padding: "4px 10px",
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 600,
    color: "rgba(255,255,255,0.6)",
    fontFamily: "inherit",
  },
  capsWarn: {
    color: "#fbbf24",
    fontSize: 12,
    marginBottom: 10,
    background: "rgba(251,191,36,0.1)",
    padding: "6px 10px",
    borderRadius: 6,
    borderLeft: "3px solid #fbbf24",
  },
  checkLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    marginBottom: 16,
    cursor: "pointer",
  },
  errorMsg: {
    background: "rgba(239,68,68,0.12)",
    border: "1px solid rgba(239,68,68,0.3)",
    borderRadius: 8,
    color: "#fca5a5",
    fontSize: 13,
    padding: "10px 14px",
    marginBottom: 14,
    textAlign: "center",
  },
  btnPrimary: {
    width: "100%",
    padding: "13px 0",
    background: "#0369a1",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
    letterSpacing: "0.2px",
    transition: "background 0.15s",
    marginBottom: 0,
  },
  divider: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    margin: "20px 0",
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: "rgba(255,255,255,0.08)",
  },
  dividerText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.3)",
  },
  btnSecondary: {
    width: "100%",
    padding: "11px 0",
    background: "rgba(255,255,255,0.05)",
    color: "rgba(255,255,255,0.55)",
    border: "1.5px solid rgba(255,255,255,0.1)",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "all 0.15s",
  },
  footer: {
    textAlign: "center",
    fontSize: 11,
    color: "rgba(255,255,255,0.18)",
    marginTop: 20,
    letterSpacing: "0.5px",
  },
};
