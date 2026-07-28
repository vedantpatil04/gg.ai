import client from "./client";

export interface ProfileCompletionField {
  key: string;
  label: string;
  weight: number;
  completed: boolean;
}

export type CompletionStatus = "complete" | "nearly_complete" | "good_progress" | "needs_attention";

// Phase 7 — enriched completion result shape.
export interface ProfileCompletionData {
  completion: number;
  status: CompletionStatus;
  statusLabel: string;
  completedFields: string[];
  missingFields: string[];
  suggestedActions: string[];
  totalFields: number;
  completedCount: number;
  fields: ProfileCompletionField[];
}

export interface ProfileStatistic {
  key: string;
  label: string;
  value: number;
}

export interface ProfileStatisticsData {
  role: "citizen" | "authority" | "administrator";
  stats: ProfileStatistic[];
}

// Phase 3 — Personal Information / Edit Profile. Every key is optional:
// only fields the person actually changed should be included (partial
// PATCH — see profile-edit-drawer.tsx, which builds this from react-hook-
// form's dirtyFields rather than the whole form).
export interface ProfileUpdatePayload {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  addressLine?: string;
  city?: string;
  state?: string;
  country?: string;
  pinCode?: string;
}

// Organization tab — Phase 5. Only fetched when the tab is opened (enabled flag in useQuery).
export interface OrgInfoRow {
  key: string;
  label: string;
  value?: string;
  items?: string[];
}

export interface OrganizationProfileData {
  role: "citizen" | "authority" | "administrator";
  organizationName?: string;
  hasOrganization: boolean;
  employment: OrgInfoRow[];
  assignment: OrgInfoRow[];
}

// Activity tab — Phase 6
export type ActivityCategory = "authentication" | "profile" | "security";

export interface ActivityItem {
  _id: string;
  activityType: string;
  title: string;
  description: string;
  category: ActivityCategory;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface PaginatedActivities {
  activities: ActivityItem[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export const profileApi = {
  // Overview tab — Phase 2/7: backend-calculated completion (never derived on the client)
  getCompletion: () =>
    client
      .get("/profile/completion")
      .then((r) => r.data as { success: boolean; data: ProfileCompletionData }),

  // Overview tab — Phase 2: role-aware statistics
  getStatistics: () =>
    client
      .get("/profile/statistics")
      .then((r) => r.data as { success: boolean; data: ProfileStatisticsData }),

  // Personal Information / Edit Profile — Phase 3
  updateProfile: (data: ProfileUpdatePayload) =>
    client
      .patch("/profile", data)
      .then((r) => r.data as { success: boolean; data: { user: Record<string, unknown> } }),

  // Profile Picture Management — Phase 4. `blob` is the already-cropped,
  // already-compressed square image (see profile-photo-cropper.tsx) — the
  // original, uncropped file is never sent. No explicit Content-Type here:
  // axios detects the FormData body and lets the browser set the
  // multipart boundary itself; forcing a header here is what causes the
  // classic "upload sent as application/json" bug.
  uploadPhoto: (blob: Blob, filename = "avatar.jpg") => {
    const formData = new FormData();
    formData.append("photo", blob, filename);
    return client
      .post("/profile/photo", formData)
      .then((r) => r.data as { success: boolean; data: { user: Record<string, unknown> } });
  },

  removePhoto: () =>
    client
      .delete("/profile/photo")
      .then((r) => r.data as { success: boolean; data: { user: Record<string, unknown> } }),

  // Organization tab — Phase 5
  getOrganization: () =>
    client
      .get("/profile/organization")
      .then((r) => r.data as { success: boolean; data: OrganizationProfileData }),

  // Activity tab — Phase 6. Paginated, newest-first.
  getActivity: (page: number, limit = 20) =>
    client
      .get("/profile/activity", { params: { page, limit } })
      .then((r) => r.data as { success: boolean; data: PaginatedActivities }),
};
