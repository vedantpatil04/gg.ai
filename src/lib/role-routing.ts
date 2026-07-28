// Centralized role-group + landing-page definitions, shared by AuthContext,
// ProtectedRoute, and the login/signup pages. Kept in its own
// dependency-free module (rather than living in auth-context.tsx or
// protected-route.tsx) so those two can both use it without importing
// each other.
import type { UserRole } from "./auth-context";

/**
 * Route files should import this rather than redeclaring their own role
 * lists, so "who counts as authority-tier" is defined in exactly one
 * place. Administrator is included here, i.e. Administrator inherits all
 * Authority-level access.
 */
export const AUTHORITY_ROLES: UserRole[] = ["authority", "administrator"];

/**
 * Centralized "where does this role belong" helper — the single source of
 * truth for a role's default landing page. Used right after login/signup,
 * as ProtectedRoute's fallback when an authenticated user hits a page
 * outside their role's permissions, and when recovering from a 403 —
 * so none of those can drift out of sync and no `if (role === "citizen")
 * ...` checks need to be scattered elsewhere.
 *
 * Administrator has its own dedicated Administrator Portal (/admin);
 * Authority still lands on the Command Center.
 */
export function getRoleLandingPage(role: UserRole): string {
  if (role === "citizen") return "/dashboard";
  if (role === "administrator") return "/admin";
  return "/command-center";
}
