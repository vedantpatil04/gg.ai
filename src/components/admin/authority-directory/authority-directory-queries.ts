import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCity } from "@/lib/city-context";
import { adminApi } from "@/lib/api/services.api";
import type { AuthorityRequest } from "@/components/admin/authority-requests/authority-request-queries";

// Reuses the exact same shape Phase 2.3 already defined for an authority
// user document — /admin/users and /admin/authority-requests both return
// the same underlying User documents, just through different endpoints.
export type DirectoryAuthority = AuthorityRequest;

interface AuthorityDirectoryPage {
  users: DirectoryAuthority[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export interface AuthorityDirectoryParams {
  isActive?: boolean;
  page: number;
  limit: number;
}

/**
 * Own query key ("admin-authority-directory") distinct from Phase 2.3's
 * "admin-authority-requests" — this calls a different endpoint
 * (/admin/users?role=authority, which supports isActive filtering that
 * /admin/authority-requests doesn't) with a different params shape, so it
 * can't share a cache entry. The two pages' mutations cross-invalidate each
 * other's keys instead (see useActivateAuthority/useDeactivateAuthority
 * below, and the page component's handling of the reused approve/reject
 * mutations) so both stay in sync regardless of which page an action was
 * taken from.
 */
export function useAuthorityDirectory(params: AuthorityDirectoryParams) {
  const { isApiConnected } = useCity();
  return useQuery({
    queryKey: ["admin-authority-directory", params.isActive ?? "any", params.page, params.limit],
    queryFn: () =>
      adminApi
        .getUsers({
          role: "authority",
          isActive: params.isActive,
          page: params.page,
          limit: params.limit,
        })
        .then((r) => r.data as AuthorityDirectoryPage),
    staleTime: 30_000,
    enabled: isApiConnected,
    throwOnError: false,
  });
}

function invalidateAuthorityQueries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["admin-authority-directory"] });
  qc.invalidateQueries({ queryKey: ["admin-authority-requests"] }); // Phase 2.3 page + dashboard's Pending Assignments
  qc.invalidateQueries({ queryKey: ["admin-active-authorities"] }); // dashboard's Active Authorities count
  qc.invalidateQueries({ queryKey: ["admin-stats"] });
}

function mutationErrorMessage(err: unknown): string | undefined {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
}

/** Reuses the existing /admin/users/:id endpoint's isActive field — already
 *  fully supported, no backend change needed for Activate/Deactivate. */
export function useActivateAuthority() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.updateUser(id, { isActive: true }),
    onSuccess: () => {
      invalidateAuthorityQueries(qc);
      toast("Authority account activated.");
    },
    onError: (err) =>
      toast(mutationErrorMessage(err) ?? "Couldn't activate this account. Try again."),
  });
}

export function useDeactivateAuthority() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.updateUser(id, { isActive: false }),
    onSuccess: () => {
      invalidateAuthorityQueries(qc);
      toast("Authority account deactivated.");
    },
    onError: (err) =>
      toast(mutationErrorMessage(err) ?? "Couldn't deactivate this account. Try again."),
  });
}
