import type { ErrorRequestHandler } from "express";
import { DomainError } from "../lib/domain-error.js";

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof DomainError) {
    response.status(error.statusCode).json({ status: "error", message: error.message });
    return;
  }
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (code === "P2002" || code === "P2034") {
      response.status(409).json({
        status: "error",
        message: code === "P2034"
          ? "La operación entró en conflicto con otra actualización. Inténtalo de nuevo."
          : "El registro ya existe o entra en conflicto con otro registro.",
      });
      return;
    }
  }

  console.error("Error no controlado:", error);

  response.status(500).json({
    status: "error",
    message: "Ocurrió un error interno.",
  });
};
