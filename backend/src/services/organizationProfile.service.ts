import { City } from "../models/City";
import type { IUser } from "../models/User";

/**
 * Role-aware Organization tab data.
 *
 * The spec's per-role field lists (Department, Division, Office, Region,
 * Designation, Assigned Region/District, Jurisdiction, Created By...) name
 * several concepts. Every row below maps onto something real:
 *   - "Authority ID" / "Employee ID": derived from the account's own
 *     MongoDB _id (real, unique, stable — not a stored field, same
 *     approach as the Personal Information tab's derived "Username").
 *   - "Employment Status" (Authority): the real `approvalStatus` field.
 *   - "Department" / "Designation" (Authority): the real `User.department`
 *     / `User.designation` fields — department is a required field at
 *     Authority signup (see auth.controller.ts registration) but was never
 *     surfaced anywhere in the profile UI until now.
 *   - "Assigned Jurisdiction" (Authority): the real `User.assignedCities`
 *     array (the same field Smart Routing/Automation 2 uses for eligibility
 *     — see smartRouting.service.ts), resolved to city names. This
 *     replaces an earlier version of this row that read the legacy
 *     single-value `User.city` field instead — that field is actually the
 *     account's freely-editable home-address city (shared with
 *     Citizen/Administrator via the Personal Information tab), not the
 *     authority's operational jurisdiction, so showing it here was
 *     mislabeling an editable, unrelated field as read-only governance
 *     data. `assignedCities` itself is administrator-controlled and has no
 *     edit affordance anywhere in this profile/organization surface.
 *   - "Specializations" (Authority): the real `User.specializations` array.
 *   - "Managed Cities" (Administrator): a real query against the City
 *     collection — administrators aren't tied to a subset of cities in
 *     this schema (see Phase 2's platform statistics for the same note),
 *     so this is platform-wide, same as "Authorities Managed" etc.
 *   - "Created Date" (Administrator): the real `createdAt`.
 * Division/Office/Region/Assigned Region-District/Created By have nothing
 * to back them and are simply never added to the row list — which is what
 * makes them "hide automatically" per the spec, rather than a frontend
 * check on an always-empty field.
 */

export interface OrganizationInfoRow {
  key: string;
  label: string;
  value?: string;
  /** For multi-value rows (Managed Cities) rendered as a pill list. */
  items?: string[];
}

export interface OrganizationProfileData {
  role: IUser["role"];
  organizationName?: string;
  hasOrganization: boolean;
  employment: OrganizationInfoRow[];
  assignment: OrganizationInfoRow[];
}

function shortId(id: string, prefix: string): string {
  return `${prefix}-${id.slice(-8).toUpperCase()}`;
}

function formatApprovalStatus(status?: string): string | undefined {
  if (!status) return undefined;
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatDate(date?: Date): string | undefined {
  if (!date) return undefined;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

type OrgSource = Pick<
  IUser,
  | "_id"
  | "role"
  | "organization"
  | "approvalStatus"
  | "city"
  | "createdAt"
  | "department"
  | "designation"
  | "assignedCities"
  | "specializations"
>;

export async function getOrganizationProfile(user: OrgSource): Promise<OrganizationProfileData> {
  const organizationName = user.organization?.trim() || undefined;

  if (user.role === "citizen") {
    return {
      role: "citizen",
      organizationName,
      hasOrganization: Boolean(organizationName),
      employment: [{ key: "accountType", label: "Account Type", value: "Citizen" }],
      assignment: [],
    };
  }

  if (user.role === "authority") {
    const employment: OrganizationInfoRow[] = [
      { key: "authorityId", label: "Authority ID", value: shortId(user._id.toString(), "AUTH") },
    ];
    const employmentStatus = formatApprovalStatus(user.approvalStatus);
    if (employmentStatus)
      employment.push({
        key: "employmentStatus",
        label: "Employment Status",
        value: employmentStatus,
      });
    if (user.designation?.trim())
      employment.push({ key: "designation", label: "Designation", value: user.designation.trim() });
    if (user.department?.trim())
      employment.push({ key: "department", label: "Department", value: user.department.trim() });

    const assignment: OrganizationInfoRow[] = [];
    const assignedCityIds = Array.isArray(user.assignedCities) ? user.assignedCities : [];
    if (assignedCityIds.length > 0) {
      // Real Smart Routing jurisdiction (Automation 2), resolved to display
      // names. Read-only here — assignment is administrator-controlled and
      // has no edit affordance anywhere in the profile/organization surface.
      const cities = await City.find({ cityId: { $in: assignedCityIds } })
        .select("cityId name")
        .lean();
      const nameByCityId = new Map(cities.map((c) => [c.cityId, c.name]));
      const jurisdictionNames = assignedCityIds.map((id) => nameByCityId.get(id) ?? capitalize(id));
      assignment.push({
        key: "assignedJurisdiction",
        label: jurisdictionNames.length > 1 ? "Assigned Jurisdictions" : "Assigned Jurisdiction",
        items: jurisdictionNames,
      });
    }
    if (user.specializations && user.specializations.length > 0)
      assignment.push({
        key: "specializations",
        label: "Specializations",
        items: user.specializations.map(capitalize),
      });

    return {
      role: "authority",
      organizationName,
      hasOrganization: Boolean(organizationName),
      employment,
      assignment,
    };
  }

  // Administrator
  const employment: OrganizationInfoRow[] = [
    { key: "employeeId", label: "Employee ID", value: shortId(user._id.toString(), "EMP") },
    { key: "role", label: "Role", value: "Administrator" },
  ];
  const createdDate = formatDate(user.createdAt);
  if (createdDate)
    employment.push({ key: "createdDate", label: "Created Date", value: createdDate });

  const managedCities = await City.find({ isActive: true }).select("name").sort({ name: 1 }).lean();
  const assignment: OrganizationInfoRow[] =
    managedCities.length > 0
      ? [{ key: "managedCities", label: "Managed Cities", items: managedCities.map((c) => c.name) }]
      : [];

  return {
    role: "administrator",
    organizationName,
    hasOrganization: Boolean(organizationName),
    employment,
    assignment,
  };
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
