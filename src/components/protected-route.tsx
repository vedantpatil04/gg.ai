import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useAuth, type UserRole } from "@/lib/auth-context";
import { AUTHORITY_ROLES, getRoleLandingPage } from "@/lib/role-routing";

// Re-exported so every existing `import { AUTHORITY_ROLES } from
// "@/components/protected-route"` (and getRoleLandingPage) across the app
// keeps working unchanged — the actual definitions now live in
// role-routing.ts to avoid a circular import with auth-context.tsx, which
// also needs getRoleLandingPage for its 403 handling.
export { AUTHORITY_ROLES, getRoleLandingPage };

interface ProtectedRouteProps {
  children: ReactNode;
  /** Restrict access to these roles. Omit to allow any authenticated user. */
  roles?: UserRole[];
  /** Alias for roles */
  allowedRoles?: UserRole[];
  /** Where to send an authenticated user whose role isn't allowed. Omit to
   *  use that user's own role-appropriate landing page (getRoleLandingPage). */
  unauthorizedRedirect?: string;
}

/**
 * Gates a page behind a valid, authenticated session.
 *
 * Crucially, this waits for `isLoading` (the initial session-restoration
 * check) to finish before making any redirect decision — otherwise a
 * still-valid session would get bounced to /login on every page refresh,
 * during the brief window before the stored token has been verified.
 *
 * If the session is (or becomes, e.g. via token expiry) unauthenticated,
 * the user is redirected to /login. Protected content is never rendered
 * for an unauthenticated or unauthorized visitor.
 */
export function ProtectedRoute({ children, roles, allowedRoles, unauthorizedRedirect }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  const activeRoles = roles || allowedRoles;
  const authorized = isAuthenticated && (!activeRoles || (!!user && activeRoles.includes(user.role)));

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      navigate({ to: "/login" });
      return;
    }
    if (roles && user && !roles.includes(user.role)) {
      navigate({ to: unauthorizedRedirect ?? getRoleLandingPage(user.role) });
    }
  }, [isLoading, isAuthenticated, user, roles, unauthorizedRedirect, navigate]);

  if (isLoading || !authorized) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}
