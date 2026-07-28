import { useLayoutEffect, useRef, useState } from "react";
import { Building2, History, LayoutGrid, UserCog } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { EnterpriseProfile } from "./profile-utils";
import { ProfileOverview } from "./profile-overview";
import { PersonalInformationTab } from "./profile-personal-info-tab";
import { OrganizationTab } from "./profile-organization-tab";
import { ActivityTab } from "./profile-activity-tab";

const TAB_ITEMS = [
  { value: "overview", label: "Overview", icon: LayoutGrid },
  { value: "personal", label: "Personal Info", icon: UserCog },
  { value: "organization", label: "Organization", icon: Building2 },
  { value: "activity", label: "Activity", icon: History },
] as const;

type TabValue = (typeof TAB_ITEMS)[number]["value"];

/**
 * Enterprise tab navigation with an animated sliding underline indicator —
 * the indicator's position and width are measured against the active
 * trigger's actual DOM rect and animated with a CSS transition, rather
 * than relying on per-tab border classes (which can't slide smoothly
 * between arbitrary tab widths).
 */
function SlidingTabIndicator({
  activeValue,
  triggerRefs,
  containerRef,
}: {
  activeValue: TabValue;
  triggerRefs: React.MutableRefObject<Partial<Record<TabValue, HTMLButtonElement | null>>>;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [style, setStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  useLayoutEffect(() => {
    function measure() {
      const el = triggerRefs.current[activeValue];
      const container = containerRef.current;
      if (!el || !container) return;
      const elRect = el.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      setStyle({ left: elRect.left - containerRect.left, width: elRect.width });
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeValue]);

  return (
    <div
      className="absolute bottom-0 h-[2.5px] rounded-full bg-primary transition-all duration-300 ease-out"
      style={{ left: style.left, width: style.width }}
      aria-hidden="true"
    />
  );
}

export function ProfileTabs({
  profile,
  onEditProfile,
}: {
  profile: EnterpriseProfile;
  onEditProfile: () => void;
}) {
  const [active, setActive] = useState<TabValue>("overview");
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef<Partial<Record<TabValue, HTMLButtonElement | null>>>({});

  return (
    <Tabs value={active} onValueChange={(v) => setActive(v as TabValue)} className="space-y-7">
      {/* ── Tab bar — enterprise underline navigation ──────────────── */}
      <div className="relative">
        <TabsList
          ref={containerRef}
          className="
            sticky top-16 z-20
            h-auto p-0 gap-1 bg-transparent
            grid grid-cols-4 w-full
            md:inline-flex md:w-auto
            border-b border-border
          "
          aria-label="Profile sections"
        >
          {TAB_ITEMS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              ref={(el) => {
                triggerRefs.current[value] = el;
              }}
              className="
                relative flex items-center justify-center gap-2
                px-5 py-3.5 rounded-none
                text-sm font-medium
                text-muted-foreground
                bg-transparent shadow-none
                transition-colors duration-200
                data-[state=active]:bg-transparent
                data-[state=active]:text-foreground
                data-[state=active]:shadow-none
                hover:text-foreground
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-ring
                focus-visible:ring-offset-1
                focus-visible:rounded-md
              "
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline truncate">{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        <SlidingTabIndicator
          activeValue={active}
          triggerRefs={triggerRefs}
          containerRef={containerRef}
        />
      </div>

      {/* ── Tab panels — entrance animation ──────────────────────── */}
      <TabsContent
        value="overview"
        className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 mt-0"
      >
        <ProfileOverview profile={profile} />
      </TabsContent>

      <TabsContent
        value="personal"
        className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 mt-0"
      >
        <PersonalInformationTab profile={profile} onEditProfile={onEditProfile} />
      </TabsContent>

      <TabsContent
        value="organization"
        className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 mt-0"
      >
        <OrganizationTab />
      </TabsContent>

      <TabsContent
        value="activity"
        className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 mt-0"
      >
        <ActivityTab />
      </TabsContent>
    </Tabs>
  );
}
