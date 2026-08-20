import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("profile");
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
          <h2 className="text-sm font-semibold text-foreground">{t("personalRecords", "Personal Records")}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("personalRecordsDesc", "Your personal identity, contact, and jurisdiction address records.")}
          </p>
        </div>

        <Button
          size="sm"
          onClick={onEditProfile}
          aria-label={t("editDetails", "Edit Details")}
          className="h-8.5 px-3 rounded-xl text-xs font-medium gap-1.5 cursor-pointer shadow-2xs transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Pencil className="size-3" aria-hidden="true" />
          {t("editDetails", "Edit Details")}
        </Button>
      </div>

      {/* ── 2-Column Responsive Information Grid ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* Card 1: Basic Information */}
        <Panel
          eyebrow={t("identity", "Identity")}
          title={<h3 className="text-sm font-semibold tracking-tight">{t("basicInfo", "Basic Information")}</h3>}
          className="p-4.5 sm:p-5"
        >
          <InfoList>
            <InfoRow
              icon={<User className="size-3.5" aria-hidden="true" />}
              label={t("firstName", "First name")}
              value={profile.firstName}
            />
            <InfoRow
              icon={<User className="size-3.5" aria-hidden="true" />}
              label={t("lastName", "Last name")}
              value={profile.lastName}
            />
            <InfoRow label={t("displayName", "Display name")} value={profile.name} />
            <InfoRow label={t("username", "Username")} value={getUsername(profile.email)} />
          </InfoList>
        </Panel>

        {/* Card 2: Contact Information */}
        <Panel
          eyebrow={t("contact", "Contact")}
          title={<h3 className="text-sm font-semibold tracking-tight">{t("contactChannels", "Contact Channels")}</h3>}
          className="p-4.5 sm:p-5"
        >
          <InfoList>
            <InfoRow
              icon={<Mail className="size-3.5" aria-hidden="true" />}
              label={t("email", "Email address")}
              value={profile.email}
            />
            <InfoRow
              icon={<Phone className="size-3.5" aria-hidden="true" />}
              label={t("phone", "Phone number")}
              value={profile.phone}
            />
          </InfoList>
        </Panel>

        {/* Card 3: Personal Details */}
        <Panel
          eyebrow={t("personal", "Personal")}
          title={<h3 className="text-sm font-semibold tracking-tight">{t("demographicDetails", "Demographic Details")}</h3>}
          className="p-4.5 sm:p-5"
        >
          {hasValue(profile.dateOfBirth) || formatGender(profile.gender) ? (
            <InfoList>
              <InfoRow
                icon={<Calendar className="size-3.5" aria-hidden="true" />}
                label={t("dateOfBirth", "Date of birth")}
                value={formatDate(profile.dateOfBirth)}
              />
              <InfoRow label={t("gender", "Gender")} value={formatGender(profile.gender)} />
            </InfoList>
          ) : (
            <p className="text-xs text-muted-foreground py-2">{t("noPersonalDetails", "No personal details on file yet.")}</p>
          )}
        </Panel>

        {/* Card 4: Address */}
        <Panel
          eyebrow={t("location", "Location")}
          title={<h3 className="text-sm font-semibold tracking-tight">{t("addressRegion", "Address & Region")}</h3>}
          className="p-4.5 sm:p-5"
        >
          {hasAddress ? (
            <InfoList>
              <InfoRow
                icon={<Home className="size-3.5" aria-hidden="true" />}
                label={t("addressLine", "Address line")}
                value={profile.addressLine}
              />
              <InfoRow
                icon={<MapPin className="size-3.5" aria-hidden="true" />}
                label={t("city", "City")}
                value={
                  hasValue(profile.city)
                    ? profile.city[0].toUpperCase() + profile.city.slice(1)
                    : undefined
                }
              />
              <InfoRow label={t("state", "State")} value={profile.state} />
              <InfoRow label={t("country", "Country")} value={profile.country} />
              <InfoRow label={t("pinCode", "PIN code")} value={profile.pinCode} />
            </InfoList>
          ) : (
            <p className="text-xs text-muted-foreground py-2">{t("noAddress", "No address on file yet.")}</p>
          )}
        </Panel>
      </div>
    </div>
  );
}
