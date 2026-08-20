import { Calendar, Home, MapPin, Pencil, Phone, User, Mail } from "lucide-react";
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
    <div className="space-y-6">
      {/* ── Subtitle & Edit Button Header ─────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Personal Records</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your personal identity, contact, and jurisdiction address records.
          </p>
        </div>

        <Button
          size="sm"
          onClick={onEditProfile}
          aria-label="Open edit profile drawer"
          className="h-8.5 px-3 rounded-xl text-xs font-medium gap-1.5 cursor-pointer shadow-2xs transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Pencil className="size-3" aria-hidden="true" />
          Edit Details
        </Button>
      </div>

      {/* ── 2-Column Responsive Information Grid ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* Card 1: Basic Information */}
        <Panel
          eyebrow="Identity"
          title={<h3 className="text-sm font-semibold tracking-tight">Basic Information</h3>}
          className="p-4.5 sm:p-5"
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

        {/* Card 2: Contact Information */}
        <Panel
          eyebrow="Contact"
          title={<h3 className="text-sm font-semibold tracking-tight">Contact Channels</h3>}
          className="p-4.5 sm:p-5"
        >
          <InfoList>
            <InfoRow
              icon={<Mail className="size-3.5" aria-hidden="true" />}
              label="Email address"
              value={profile.email}
            />
            <InfoRow
              icon={<Phone className="size-3.5" aria-hidden="true" />}
              label="Phone number"
              value={profile.phone}
            />
          </InfoList>
        </Panel>

        {/* Card 3: Personal Details */}
        <Panel
          eyebrow="Personal"
          title={<h3 className="text-sm font-semibold tracking-tight">Demographic Details</h3>}
          className="p-4.5 sm:p-5"
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
            <p className="text-xs text-muted-foreground py-2">No personal details on file yet.</p>
          )}
        </Panel>

        {/* Card 4: Address */}
        <Panel
          eyebrow="Location"
          title={<h3 className="text-sm font-semibold tracking-tight">Address & Region</h3>}
          className="p-4.5 sm:p-5"
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
            <p className="text-xs text-muted-foreground py-2">No address on file yet.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}
