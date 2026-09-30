import type { RequestHandler } from "express";

export const notFoundHandler: RequestHandler = (request, response) => {
  response.status(404).json({
    status: "error",
    message: "Recurso no encontrado.",
    path: request.originalUrl,
  });
};

