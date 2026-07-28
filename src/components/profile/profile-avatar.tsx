import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getInitials, resolveAssetUrl, type EnterpriseProfile } from "./profile-utils";

/**
 * Priority: uploaded photo, then initials — and Radix's Avatar primitive
 * already gives us the rest of Section 1 for free: `AvatarImage` only
 * swaps in once the image has actually finished loading, and quietly
 * falls back to `AvatarFallback` on any load error (broken URL, 404,
 * network failure) without ever showing a broken-image icon. Unique
 * per-upload filenames (see profilePhoto.service.ts) mean a fresh photo
 * always has a fresh URL, so there's nothing to cache-bust here.
 */
export function ProfileAvatar({
  profile,
  className,
  fallbackClassName,
}: {
  profile: Pick<EnterpriseProfile, "name" | "avatar">;
  className?: string;
  fallbackClassName?: string;
}) {
  const src = resolveAssetUrl(profile.avatar);
  return (
    <Avatar className={className}>
      {src && <AvatarImage src={src} alt={profile.name} />}
      <AvatarFallback
        className={cn("aurora text-primary-foreground font-semibold", fallbackClassName)}
      >
        {getInitials(profile.name)}
      </AvatarFallback>
    </Avatar>
  );
}
