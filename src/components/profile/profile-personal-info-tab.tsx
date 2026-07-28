import { type ReactNode } from "react";
import { Calendar, Home, MapPin, Pencil, Phone, User } from "lucide-react";
import { Panel } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { InfoRow, InfoList } from "./profile-info-row";
import {
  type EnterpriseProfile,
  formatDate,
  formatGender,
  getUsername,
  hasValue,
} from "./profile-utils";

/** Staggered card entrance — each panel fades + slides up with a small delay. */
function StaggerCard({ children, index = 0 }: { children: ReactNode; index?: number }) {
  return (
    <div
      className="animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-both"
      style={{ animationDelay: `${index * 55}ms`, animationDuration: "280ms" }}
    >
      {children}
    </div>
  );
}

export function PersonalInformationTab({
  profile,
  onEditProfile,
}: {
  profile: EnterpriseProfile;
  onEditProfile: () => void;
}) {
  const hasAddress =
    hasValue(profile.addressLine) ||
    hasValue(profile.city) ||
    hasValue(profile.state) ||
    hasValue(profile.country) ||
    hasValue(profile.pinCode);

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-250">
      {/* Header row */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Your identity, contact, and address details. Use the Edit button to make changes.
        </p>
        <Button
          size="sm"
          onClick={onEditProfile}
          aria-label="Open edit profile drawer"
          className="shrink-0 transition-all duration-150 hover:scale-[1.03] hover:shadow-sm active:scale-[0.97]"
        >
          <Pencil className="size-3.5" aria-hidden="true" />
          Edit
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <StaggerCard index={0}>
          <Panel
            eyebrow="Basic Information"
            title={<h3 className="text-base font-semibold tracking-tight">Basic information</h3>}
            className="hover:shadow-md transition-shadow duration-200"
          >
            <InfoList>
              <InfoRow
                icon={<User className="size-3.5" aria-hidden="true" />}
                label="First name"
                value={profile.firstName}
              />
              <InfoRow
                icon={<User className="size-3.5" aria-hidden="true" />}
                label="Last name"
                value={profile.lastName}
              />
              <InfoRow label="Display name" value={profile.name} />
              <InfoRow label="Username" value={getUsername(profile.email)} />
            </InfoList>
          </Panel>
        </StaggerCard>

        <StaggerCard index={1}>
          <Panel
            eyebrow="Contact Information"
            title={<h3 className="text-base font-semibold tracking-tight">Contact information</h3>}
            className="hover:shadow-md transition-shadow duration-200"
          >
            <InfoList>
              <InfoRow
                icon={<Phone className="size-3.5" aria-hidden="true" />}
                label="Phone"
                value={profile.phone}
              />
              <InfoRow label="Email" value={profile.email} />
            </InfoList>
          </Panel>
        </StaggerCard>

        <StaggerCard index={2}>
          <Panel
            eyebrow="Personal Details"
            title={<h3 className="text-base font-semibold tracking-tight">Personal details</h3>}
            className="hover:shadow-md transition-shadow duration-200"
          >
            {hasValue(profile.dateOfBirth) || formatGender(profile.gender) ? (
              <InfoList>
                <InfoRow
                  icon={<Calendar className="size-3.5" aria-hidden="true" />}
                  label="Date of birth"
                  value={formatDate(profile.dateOfBirth)}
                />
                <InfoRow label="Gender" value={formatGender(profile.gender)} />
              </InfoList>
            ) : (
              <p className="text-sm text-muted-foreground py-1">No personal details on file yet.</p>
            )}
          </Panel>
        </StaggerCard>

        <StaggerCard index={3}>
          <Panel
            eyebrow="Address"
            title={<h3 className="text-base font-semibold tracking-tight">Address</h3>}
            className="hover:shadow-md transition-shadow duration-200"
          >
            {hasAddress ? (
              <InfoList>
                <InfoRow
                  icon={<Home className="size-3.5" aria-hidden="true" />}
                  label="Address line"
                  value={profile.addressLine}
                />
                <InfoRow
                  icon={<MapPin className="size-3.5" aria-hidden="true" />}
                  label="City"
                  value={
                    hasValue(profile.city)
                      ? profile.city[0].toUpperCase() + profile.city.slice(1)
                      : undefined
                  }
                />
                <InfoRow label="State" value={profile.state} />
                <InfoRow label="Country" value={profile.country} />
                <InfoRow label="PIN code" value={profile.pinCode} />
              </InfoList>
            ) : (
              <p className="text-sm text-muted-foreground py-1">No address on file yet.</p>
            )}
          </Panel>
        </StaggerCard>
      </div>
    </div>
  );
}
