import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../hooks/AuthContext";
import { BrandLogo } from "../components/BrandLogo";
import "../styles/login.css";

export function LoginPage() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <main className="auth-loading">Verificando sesión…</main>;
  if (user) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(username, password);
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
      navigate(from && from !== "/login" ? from : "/dashboard", { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible iniciar sesión.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-screen">
      <section className="login-brand-panel">
        <div className="login-brand"><BrandLogo /></div>
        <div className="login-panel-copy"><span className="eyebrow"><span /> PLATAFORMA OPERATIVA</span><h1>Una operación<br />mejor organizada.</h1><p>Información centralizada para apoyar el control interno de líneas, estaciones y unidades.</p></div>
        <div className="login-panel-footer">GUATEMALA <span>·</span> SISTEMA PARA USO INTERNO</div>
        <div className="login-map" aria-hidden="true"><i/><i/><i/><i/><b/><b/></div>
      </section>
      <section className="login-form-panel">
        <form className="login-card" onSubmit={handleSubmit}>
          <span className="form-eyebrow">BIENVENIDO</span>
          <h2>Iniciar sesión</h2>
          <p className="login-description">Ingresa con tu cuenta institucional para continuar.</p>
          <label htmlFor="username">Usuario</label>
          <input id="username" name="username" autoComplete="username" required minLength={3} maxLength={60} value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Tu nombre de usuario" />
          <label htmlFor="password">Contraseña</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Ingresa tu contraseña" />
          {error && <div className="login-error" role="alert">{error}</div>}
          <button className="login-submit" type="submit" disabled={submitting}>{submitting ? "Validando…" : "Entrar a la plataforma"}<span aria-hidden="true">→</span></button>
          <div className="login-security"><span>▣</span> Acceso institucional · Personal autorizado</div>
        </form>
      </section>
    </main>
  );
}

