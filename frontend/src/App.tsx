import { Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./hooks/AuthContext";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/administrative/DashboardPage";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import "./styles/app.css";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard/*" element={<DashboardPage />} />
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return <AuthProvider><AppRoutes /></AuthProvider>;
}
