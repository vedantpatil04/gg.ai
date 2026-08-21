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
export interface ProfileAvatarProps {
  profile?: { name?: string; avatar?: string | null } | null;
  name?: string;
  avatar?: string | null;
  className?: string;
  fallbackClassName?: string;
}

export function ProfileAvatar({
  profile,
  name,
  avatar,
  className,
  fallbackClassName,
}: ProfileAvatarProps) {
  const resolvedName = name ?? profile?.name ?? "User";
  const resolvedAvatar = avatar !== undefined ? avatar : profile?.avatar;
  const src = resolveAssetUrl(resolvedAvatar);

  return (
    <Avatar className={cn("shrink-0 overflow-hidden", className)}>
      {src && <AvatarImage src={src} alt={resolvedName} className="object-cover size-full" />}
      <AvatarFallback
        className={cn("aurora text-primary-foreground font-semibold select-none", fallbackClassName)}
      >
        {getInitials(resolvedName)}
      </AvatarFallback>
    </Avatar>
  );
}
