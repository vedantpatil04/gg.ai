import { City } from "../models/City";
import type { IUser } from "../models/User";

/**
 * Role-aware Organization tab data.
 *
 * The spec's per-role field lists (Department, Division, Office, Region,
 * Designation, Assigned Region/District, Jurisdiction, Created By...) name
 * several concepts the schema has no column for. Rather than fabricate
 * values for them, every row below maps onto something real:
 *   - "Authority ID" / "Employee ID": derived from the account's own
 *     MongoDB _id (real, unique, stable — not a stored field, same
 *     approach as the Personal Information tab's derived "Username").
 *   - "Employment Status" (Authority): the real `approvalStatus` field.
 *   - "Managed Cities" (Administrator): a real query against the City
 *     collection — administrators aren't tied to a subset of cities in
 *     this schema (see Phase 2's platform statistics for the same note),
 *     so this is platform-wide, same as "Authorities Managed" etc.
 *   - "Created Date" (Administrator): the real `createdAt`.
 * Department/Division/Office/Region/Designation/Assigned Region-District/
 * Jurisdiction/Created By have nothing to back them and are simply never
 * added to the row list — which is what makes them "hide automatically"
 * per the spec, rather than a frontend check on an always-empty field.
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
  "_id" | "role" | "organization" | "approvalStatus" | "city" | "createdAt"
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

    const assignment: OrganizationInfoRow[] = [];
    if (user.city)
      assignment.push({
        key: "assignedCity",
        label: "Assigned City",
        value: capitalize(user.city),
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
