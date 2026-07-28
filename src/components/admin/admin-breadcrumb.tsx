import { Link, useRouterState } from "@tanstack/react-router";
import { Home } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ADMIN_LABEL_MAP } from "./admin-nav";

/** "authority-management" → "Authority Management" — fallback for any
 *  segment not (yet) present in ADMIN_LABEL_MAP, so a route added in a
 *  future phase gets a readable crumb automatically, with no extra wiring. */
function humanize(segment: string): string {
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Derives the crumb trail from the current URL under /admin — no per-page
 * configuration required. A future page at, say, /admin/users/42 will
 * automatically produce Administration / User Management / 42.
 */
export function AdminBreadcrumb() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const segments = pathname.split("/").filter(Boolean); // e.g. ["admin", "users"]

  const crumbs = segments.map((segment, i) => ({
    href: "/" + segments.slice(0, i + 1).join("/"),
    label: ADMIN_LABEL_MAP[segment] ?? humanize(segment),
    isLast: i === segments.length - 1,
  }));

  return (
    <Breadcrumb>
      <BreadcrumbList className="flex-nowrap">
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/admin" className="flex items-center gap-1">
              <Home className="size-3.5" />
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {crumbs.map((crumb) => (
          <span key={crumb.href} className="flex items-center gap-1.5 sm:gap-2.5">
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {crumb.isLast ? (
                <BreadcrumbPage className="font-medium text-foreground">
                  {crumb.label}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  {/* Future segments (e.g. /admin/users) may not have a real
                      route yet — plain <a> avoids TanStack Router's typed
                      <Link> rejecting an unregistered path at compile time. */}
                  <a href={crumb.href}>{crumb.label}</a>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </span>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
