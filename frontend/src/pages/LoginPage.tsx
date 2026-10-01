import {
  useState,
  type FormEvent,
} from "react";

import {
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../hooks/AuthContext";

import logoIcon from "../assets/logo-transmetro.png";

import { LockKeyhole } from "lucide-react";

import "../styles/login.css";


export function LoginPage() {
  const {
    user,
    loading,
    login,
  } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);


  if (loading) {
    return (
      <main className="auth-loading">
        Verificando sesión…
      </main>
    );
  }


  if (user) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }


  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setSubmitting(true);

    try {
      await login(
        username,
        password,
      );

      const from = (
        location.state as {
          from?: {
            pathname?: string;
          };
        } | null
      )?.from?.pathname;

      navigate(
        from && from !== "/login"
          ? from
          : "/dashboard",
        {
          replace: true,
        },
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible iniciar sesión.",
      );
    } finally {
      setSubmitting(false);
    }
  }


  return (
    <main className="login-screen">

      {/* PANEL IZQUIERDO */}
      <section className="login-brand-panel">

        <div className="login-brand">

          <div className="login-brand-mark">
            <img
              src={logoIcon}
              alt="Logo Transmetro"
              className="login-brand-mark-image"
            />
          </div>

          <div className="login-brand-copy">
            <p className="login-brand-name">
              transmetro
            </p>

            <p className="login-brand-subtitle">
              CONTROL INTERNO
            </p>
          </div>

        </div>


        <div className="login-panel-copy">

          <p className="login-eyebrow">
            <span aria-hidden="true" />

            PLATAFORMA OPERATIVA
          </p>

          <h1>
            Una operación

            <span>
              mejor organizada.
            </span>
          </h1>

          <p className="login-panel-description">
            Información centralizada para apoyar
            el control interno de líneas,
            estaciones y unidades.
          </p>

        </div>


        <p className="login-panel-footer">
          GUATEMALA

          <span aria-hidden="true">
            ·
          </span>

          SISTEMA PARA USO INTERNO
        </p>

      </section>


      {/* PANEL DERECHO */}
      <section className="login-form-panel">

        <div className="login-form-wrapper">

          <form
            className="login-card"
            onSubmit={handleSubmit}
          >

            <p className="login-form-eyebrow">
              BIENVENIDO
            </p>

            <h2>
              Iniciar sesión
            </h2>

            <p className="login-description">
              Ingresa con tu cuenta institucional
              para continuar.
            </p>


            <div className="login-fields">

              {/* USUARIO */}
              <div className="login-field">

                <label htmlFor="username">
                  Usuario
                </label>

                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  minLength={3}
                  maxLength={60}
                  value={username}
                  placeholder="Tu nombre de usuario"
                  disabled={submitting}
                  onChange={(event) => {
                    setUsername(
                      event.target.value,
                    );

                    setError("");
                  }}
                />

              </div>


              {/* CONTRASEÑA */}
              <div className="login-field">

                <label htmlFor="password">
                  Contraseña
                </label>

                <div className="login-input-shell">

                  <input
                    id="password"
                    name="password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    autoComplete="current-password"
                    required
                    value={password}
                    placeholder="Ingresa tu contraseña"
                    disabled={submitting}
                    onChange={(event) => {
                      setPassword(
                        event.target.value,
                      );

                      setError("");
                    }}
                  />

                  <button
                    className="login-password-toggle"
                    type="button"
                    onClick={() => {
                      setShowPassword(
                        (current) => !current,
                      );
                    }}
                    aria-label={
                      showPassword
                        ? "Ocultar contraseña"
                        : "Mostrar contraseña"
                    }
                  >
                    {showPassword
                      ? "Ocultar"
                      : "Mostrar"}
                  </button>

                </div>

              </div>

            </div>


            {error && (
              <div
                className="login-error"
                role="alert"
              >
                {error}
              </div>
            )}


            <button
              className="login-submit"
              type="submit"
              disabled={submitting}
            >
              <span>
                {submitting
                  ? "Validando…"
                  : "Entrar a la plataforma"}
              </span>

              {!submitting && (
                <span
                  className="login-submit-arrow"
                  aria-hidden="true"
                >
                  →
                </span>
              )}
            </button>


            <p className="login-security">
              <LockKeyhole
                className="login-security-icon"
                aria-hidden="true"
              />

              Acceso institucional · Personal autorizado
            </p>

          </form>

        </div>

      </section>

    </main>
  );
}