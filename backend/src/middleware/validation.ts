/**
 * Phase 8 — Input validation helpers
 *
 * Centralised validation utilities reused by controllers.
 * Prevents privilege escalation, XSS via stored text, and oversized payloads.
 *
 * Usage:
 *   import { validatePagination, sanitiseText, assertRole } from '../middleware/validation';
 */

import { Request, Response, NextFunction } from "express";
import { AppError } from "./errorHandler";
import { AuthRequest } from "./auth";

// ─── Text sanitisation ────────────────────────────────────────────────────────

/** Strip null bytes and trim whitespace. Does NOT HTML-encode — the frontend does that. */
export function sanitiseText(value: unknown, maxLength = 2000): string {
  if (typeof value !== "string") return "";
  return value.replace(/\0/g, "").trim().slice(0, maxLength);
}

/** Validate and normalise a MongoDB ObjectId string. */
export function isValidObjectId(value: unknown): value is string {
  return typeof value === "string" && /^[a-f\d]{24}$/i.test(value);
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export function validatePagination(
  query: Request["query"],
  maxLimit = 100,
): PaginationParams {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number(query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

// ─── Role assertion middleware ────────────────────────────────────────────────

type Role = "citizen" | "authority" | "administrator";

/**
 * Returns Express middleware that rejects requests from users whose role is
 * not in the allowed list. Attach after `authenticate`.
 */
export function requireRole(...roles: Role[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError("Not authenticated", 401));
    if (!roles.includes(req.user.role as Role)) {
      return next(
        new AppError(
          `This action requires one of the following roles: ${roles.join(", ")}`,
          403,
        ),
      );
    }
    next();
  };
}

// ─── Prevent self-targeting ───────────────────────────────────────────────────

/**
 * Ensures the authenticated user is not targeting themselves in
 * administrative actions (e.g. locking their own account).
 */
export function preventSelfTarget(
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
) {
  if (!req.user) return next(new AppError("Not authenticated", 401));
  if (req.params.id && req.params.id === String(req.user._id)) {
    return next(new AppError("You cannot perform this action on your own account", 400));
  }
  next();
}

// ─── Field allow-list middleware ──────────────────────────────────────────────

/**
 * Strips any body fields not in the allowed list to prevent mass-assignment.
 * Call this BEFORE the controller in sensitive routes.
 */
export function allowFields(...fields: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const allowed = new Set(fields);
    for (const key of Object.keys(req.body)) {
      if (!allowed.has(key)) delete req.body[key];
    }
    next();
  };
}

// ─── Complaint body validator ─────────────────────────────────────────────────

const VALID_ISSUE_TYPES = new Set([
  "air_pollution",
  "water_contamination",
  "open_burning",
  "noise",
  "waste_dumping",
  "chemical_spill",
  "other",
]);

const VALID_SEVERITIES = new Set(["low", "medium", "high", "critical"]);

export function validateComplaintBody(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const { title, description, issueType, severity } = req.body as Record<string, unknown>;

  if (!title || typeof title !== "string" || title.trim().length < 5) {
    return next(new AppError("Title must be at least 5 characters", 400));
  }
  if (!description || typeof description !== "string" || description.trim().length < 10) {
    return next(new AppError("Description must be at least 10 characters", 400));
  }
  if (!issueType || !VALID_ISSUE_TYPES.has(String(issueType))) {
    return next(new AppError(`Invalid issueType. Must be one of: ${[...VALID_ISSUE_TYPES].join(", ")}`, 400));
  }
  if (severity && !VALID_SEVERITIES.has(String(severity))) {
    return next(new AppError(`Invalid severity. Must be one of: ${[...VALID_SEVERITIES].join(", ")}`, 400));
  }

  // Sanitise free-text fields in place
  req.body.title = sanitiseText(title, 200);
  req.body.description = sanitiseText(description, 3000);
  if (req.body.address) req.body.address = sanitiseText(req.body.address, 300);

  next();
}
