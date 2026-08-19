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
 *  segment not (yet) present in ADMIN_LABEL_MAP. */
function humanize(segment: string): string {
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Derives the crumb trail from the current URL under /admin.
 * Automatically adapts on mobile to avoid horizontal overflow.
 */
export function AdminBreadcrumb() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const segments = pathname.split("/").filter(Boolean); // e.g. ["admin", "users"]

  const crumbs = segments.map((segment, i) => ({
    href: "/" + segments.slice(0, i + 1).join("/"),
    label: ADMIN_LABEL_MAP[segment] ?? humanize(segment),
    isLast: i === segments.length - 1,
    isFirst: i === 0,
  }));

  // If top-level /admin dashboard
  if (crumbs.length <= 1) {
    return null;
  }

  return (
    <Breadcrumb className="overflow-hidden">
      <BreadcrumbList className="flex-nowrap overflow-x-auto scrollbar-hide text-xs py-0.5 max-w-full">
        <BreadcrumbItem className="shrink-0">
          <BreadcrumbLink asChild>
            <Link to="/admin" className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
              <Home className="size-3.5" />
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {crumbs.map((crumb, idx) => {
          // Skip the root "admin" segment as the home icon represents it
          if (crumb.isFirst) return null;

          return (
            <span key={crumb.href} className="inline-flex items-center gap-1 sm:gap-1.5 shrink-0">
              <BreadcrumbSeparator className="text-muted-foreground/50 shrink-0" />
              <BreadcrumbItem className="truncate max-w-[140px] sm:max-w-[200px]">
                {crumb.isLast ? (
                  <BreadcrumbPage className="font-medium text-foreground truncate block">
                    {crumb.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <a href={crumb.href} className="text-muted-foreground hover:text-foreground truncate block">
                      {crumb.label}
                    </a>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </span>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
