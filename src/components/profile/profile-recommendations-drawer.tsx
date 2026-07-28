import type { ReactNode } from "react";
import {
  Calendar,
  Camera,
  ChevronRight,
  Home,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  UserCog,
  Building2,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

/**
 * Maps a suggested-action string (e.g. "Add a phone number") to a
 * representative icon via keyword matching against the backend's known
 * action phrasing (see profileCompletion.service.ts FIELD_RULES). Falls
 * back to a generic sparkle icon for any future action text this doesn't
 * recognize, so a new completion rule never breaks the drawer.
 */
function iconForAction(action: string): ReactNode {
  const a = action.toLowerCase();
  if (a.includes("picture") || a.includes("photo"))
    return <Camera className="size-4" aria-hidden="true" />;
  if (a.includes("phone")) return <Phone className="size-4" aria-hidden="true" />;
  if (a.includes("email")) return <Mail className="size-4" aria-hidden="true" />;
  if (a.includes("birth")) return <Calendar className="size-4" aria-hidden="true" />;
  if (
    a.includes("address") ||
    a.includes("city") ||
    a.includes("state") ||
    a.includes("country") ||
    a.includes("pin")
  ) {
    return a.includes("address") ? (
      <Home className="size-4" aria-hidden="true" />
    ) : (
      <MapPin className="size-4" aria-hidden="true" />
    );
  }
  if (a.includes("organization") || a.includes("department"))
    return <Building2 className="size-4" aria-hidden="true" />;
  if (a.includes("gender") || a.includes("name"))
    return <UserCog className="size-4" aria-hidden="true" />;
  return <Sparkles className="size-4" aria-hidden="true" />;
}

function RecommendationRow({
  action,
  index,
  onSelect,
}: {
  action: string;
  index: number;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className="
          w-full flex items-center gap-3.5 rounded-xl px-4 py-3.5 text-left
          bg-muted/30 border border-border/60
          hover:bg-muted/60 hover:border-border hover:shadow-sm hover:-translate-y-px
          active:scale-[0.99] active:translate-y-0
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1
          transition-all duration-150 group
          animate-in fade-in-0 slide-in-from-right-2 fill-mode-both
        "
        style={{ animationDelay: `${index * 45}ms`, animationDuration: "260ms" }}
      >
        <span
          className="size-8 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0 transition-transform duration-150 group-hover:scale-110"
          aria-hidden="true"
        >
          {iconForAction(action)}
        </span>
        <span className="flex-1 text-sm text-foreground/85 font-medium">{action}</span>
        <ChevronRight
          className="size-4 text-muted-foreground shrink-0 transition-transform duration-150 group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </button>
    </li>
  );
}

/**
 * "View All" drawer for profile-completion recommendations.
 *
 * Opened from the Hero's Profile Completion section. Every item is
 * clickable and opens the existing Edit Profile drawer (the single place
 * all of these fields are actually editable) — this component never
 * introduces a new editing surface, only a better way to browse what's
 * still missing per the "Do NOT permanently show every recommendation [in
 * the compact view]" requirement.
 */
export function RecommendationsDrawer({
  open,
  onOpenChange,
  actions,
  completedCount,
  totalFields,
  onEditProfile,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actions: string[];
  completedCount: number;
  totalFields: number;
  onEditProfile: () => void;
}) {
  function handleSelect() {
    onOpenChange(false);
    onEditProfile();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border text-left">
          <SheetTitle>Complete your profile</SheetTitle>
          <SheetDescription>
            {completedCount} of {totalFields} fields complete — {actions.length} remaining.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {actions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nothing left — your profile is fully complete.
            </p>
          ) : (
            <ul className="space-y-2" role="list" aria-label="Remaining profile fields">
              {actions.map((action, i) => (
                <RecommendationRow key={action} action={action} index={i} onSelect={handleSelect} />
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
