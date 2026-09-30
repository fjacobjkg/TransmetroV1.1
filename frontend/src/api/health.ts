export interface ApiHealth {
  status: "ok" | "degraded";
  database: "connected" | "unavailable";
  service: string;
}

export async function fetchApiHealth(): Promise<ApiHealth> {
  const response = await fetch("/api/health", {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error("La API o la base de datos no están disponibles.");
  }

  return response.json() as Promise<ApiHealth>;
}
