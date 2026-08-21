import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  let statusCode = 500;
  let message = "Internal server error";

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err.name === "ValidationError") {
    statusCode = 400;
    message = err.message;
  } else if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid ID format";
  } else if ((err as NodeJS.ErrnoException).code === "11000") {
    statusCode = 409;
    message = "Duplicate field value";
  } else if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  } else if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
  } else if (err.name === "MulterError") {
    // Phase 4 — profile photo upload. Multer throws these synchronously
    // from the upload middleware (before the controller ever runs), so
    // they land here rather than as an AppError.
    statusCode = 400;
    const code = (err as { code?: string }).code;
    message =
      code === "LIMIT_FILE_SIZE"
        ? "Image must be 5 MB or smaller"
        : code === "LIMIT_UNEXPECTED_FILE"
          ? "Upload one image at a time"
          : "Couldn't process the uploaded file";
  } else if ((err as NodeJS.ErrnoException & { type?: string }).type === "entity.too.large") {
    // Phase 8 — express.json() payload size exceeded
    statusCode = 413;
    message = "Request payload is too large";
  } else if ((err as AppError & { statusCode?: number }).statusCode === 429) {
    statusCode = 429;
    message = "Too many requests — please slow down and try again later";
  }

  const isExpectedTokenExpiry = err.name === "TokenExpiredError";

  if (isExpectedTokenExpiry) {
    // Expected access token expiration — log as debug diagnostics rather than an application error
    logger.debug("[auth] Access token expired — awaiting client token refresh");
  } else if (process.env.NODE_ENV !== "production") {
    if (statusCode >= 500) {
      logger.error(`${statusCode} — ${message}`, { stack: err.stack });
    } else if (statusCode === 401) {
      logger.warn(`[auth] Authentication failure: ${message}`);
    } else {
      logger.warn(`${statusCode} — ${message}`);
    }
  } else if (statusCode >= 500) {
    logger.error("Server Error:", err);
  } else if (statusCode === 401) {
    logger.warn(`[auth] Authentication failure: ${message}`);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== "production" && !isExpectedTokenExpiry && { stack: err.stack }),
  });
}
