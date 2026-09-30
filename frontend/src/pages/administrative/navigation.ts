import type { UserRole } from "../../types/auth";

export type Panel = { id: string; title: string; icon: string; section?: string };

export const panelsByRole: Record<UserRole, Panel[]> = {
  ADMIN: [
    { id: "home", title: "Inicio", icon: "⌂" },
    { id: "users", title: "Cuentas y roles", icon: "◎", section: "users" },
    { id: "transport", title: "Estructura de transporte", icon: "↗", section: "transport" },
    { id: "personnel", title: "Personal y seguridad", icon: "⌑", section: "personnel" },
    { id: "fleet", title: "Flota y parqueos", icon: "▰", section: "fleet" },
    { id: "operations", title: "Operación", icon: "◷", section: "operations" },
    { id: "reports", title: "Reportes", icon: "▤", section: "reports" },
    { id: "audit", title: "Bitácora", icon: "≋", section: "audit" },
  ],
  ADMINISTRATIVO: [
    { id: "home", title: "Inicio", icon: "⌂" },
    { id: "transport", title: "Estructura", icon: "↗", section: "transport" },
    { id: "personnel", title: "Personal y seguridad", icon: "⌑", section: "personnel" },
    { id: "fleet", title: "Flota", icon: "▰", section: "fleet" },
    { id: "reports", title: "Consultas y reportes", icon: "▤", section: "reports" },
  ],
  OPERADOR_ESTACION: [
    { id: "home", title: "Inicio", icon: "⌂" },
    { id: "operations", title: "Operación de estación", icon: "◷", section: "operations" },
  ],
};

export function roleLabel(role?: UserRole): string {
  if (!role) return "Usuario";
  return ({
    ADMIN: "Administrador",
    OPERADOR_ESTACION: "Operador de estación",
    ADMINISTRATIVO: "Administrativo",
  } satisfies Record<UserRole, string>)[role];
}
