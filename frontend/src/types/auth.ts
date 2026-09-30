export type UserRole = "ADMIN" | "OPERADOR_ESTACION" | "ADMINISTRATIVO";

export interface AuthUser {
  id: number;
  name: string;
  username: string;
  role: UserRole;
  stationIds: number[];
}
