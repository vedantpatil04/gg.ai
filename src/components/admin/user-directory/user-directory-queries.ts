import { useQuery } from "@tanstack/react-query";
import { useCity } from "@/lib/city-context";
import { adminApi } from "@/lib/api/services.api";

export type DirectoryRole = "citizen" | "authority" | "administrator";

export interface DirectoryUser {
  _id: string;
  name: string;
  email: string;
  role: DirectoryRole;
  approvalStatus: "approved" | "pending" | "rejected";
  organization?: string;
  phone?: string;
  city?: string;
  isVerified: boolean;
  isActive: boolean;
  avatar?: string;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

interface UserDirectoryPage {
  users: DirectoryUser[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export interface UserDirectoryParams {
  role?: DirectoryRole;
  isActive?: boolean;
  page: number;
  limit: number;
}

/**
 * /admin/users has no search parameter (backend/src/controllers/
 * admin.controller.ts getUsers only filters on role + isActive) — that's
 * why `limit` is a caller-controlled param here rather than fixed: the page
 * component requests a bigger page (up to the backend's own max of 100)
 * while a search term is active, then filters name/email client-side. No
 * backend change; this only exercises a parameter the endpoint already
 * accepts.
 */
export function useUserDirectory(params: UserDirectoryParams) {
  const { isApiConnected } = useCity();
  return useQuery({
    queryKey: [
      "admin-users-directory",
      params.role ?? "all",
      params.isActive ?? "any",
      params.page,
      params.limit,
    ],
    queryFn: () =>
      adminApi
        .getUsers({
          role: params.role,
          isActive: params.isActive,
          page: params.page,
          limit: params.limit,
        })
        .then((r) => r.data as UserDirectoryPage),
    staleTime: 30_000,
    enabled: isApiConnected,
    throwOnError: false,
  });
}
