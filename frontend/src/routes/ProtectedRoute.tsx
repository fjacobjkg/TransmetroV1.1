import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../hooks/AuthContext";
import type { UserRole } from "../types/auth";

export function ProtectedRoute({ allowedRoles }: { allowedRoles?: UserRole[] }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <main className="auth-loading">Verificando sesión…</main>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
