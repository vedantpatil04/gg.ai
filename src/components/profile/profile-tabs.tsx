import { useLayoutEffect, useRef, useState, useMemo } from "react";
import { Building2, History, LayoutGrid, UserCog, type LucideIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { EnterpriseProfile } from "./profile-utils";
import { ProfileOverview } from "./profile-overview";
import { PersonalInformationTab } from "./profile-personal-info-tab";
import { OrganizationTab } from "./profile-organization-tab";
import { ActivityTab } from "./profile-activity-tab";

interface TabItemDef {
  value: "overview" | "personal" | "organization" | "activity";
  label: string;
  icon: LucideIcon;
  roles?: Array<"citizen" | "authority" | "administrator">;
}

const ALL_TABS: TabItemDef[] = [
  { value: "overview", label: "Overview", icon: LayoutGrid },
  { value: "personal", label: "Personal Info", icon: UserCog },
  {
    value: "organization",
    label: "Organization",
    icon: Building2,
    roles: ["authority", "administrator"],
  },
  { value: "activity", label: "Activity", icon: History },
];

type TabValue = TabItemDef["value"];

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
  }, [activeValue]);

  return (
    <div
      className="absolute bottom-0 h-[2px] rounded-full bg-primary transition-all duration-300 ease-out"
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
  const isCitizen = profile.role === "citizen";

  // Filter tabs dynamically based on user role
  const tabItems = useMemo(() => {
    return ALL_TABS.filter((tab) => {
      if (!tab.roles) return true;
      return tab.roles.includes(profile.role);
    });
  }, [profile.role]);

  const [active, setActive] = useState<TabValue>("overview");
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef<Partial<Record<TabValue, HTMLButtonElement | null>>>({});

  return (
    <Tabs
      value={active}
      onValueChange={(v) => setActive(v as TabValue)}
      className="space-y-6"
    >
      {/* ── Tab Navigation Bar ────────────────────────────────────────────── */}
      <div className="relative border-b border-border/80 overflow-x-auto no-scrollbar">
        <TabsList
          ref={containerRef}
          className="h-auto p-0 gap-1 bg-transparent flex w-max min-w-full sm:min-w-0 sm:inline-flex"
          aria-label="Profile sections"
        >
          {tabItems.map(({ value, label, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              ref={(el) => {
                triggerRefs.current[value] = el;
              }}
              className="
                relative flex items-center justify-center gap-2
                px-4 sm:px-5 py-3 rounded-none
                text-xs sm:text-sm font-medium
                text-muted-foreground
                bg-transparent shadow-none
                transition-colors duration-200
                data-[state=active]:bg-transparent
                data-[state=active]:text-foreground
                data-[state=active]:font-semibold
                data-[state=active]:shadow-none
                hover:text-foreground
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-ring
                focus-visible:rounded-md
                cursor-pointer shrink-0
              "
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              <span>{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        <SlidingTabIndicator
          activeValue={active}
          triggerRefs={triggerRefs}
          containerRef={containerRef}
        />
      </div>

      {/* ── Tab Contents ─────────────────────────────────────────────────── */}
      <TabsContent
        value="overview"
        className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 mt-0 outline-none"
      >
        <ProfileOverview profile={profile} />
      </TabsContent>

      <TabsContent
        value="personal"
        className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 mt-0 outline-none"
      >
        <PersonalInformationTab profile={profile} onEditProfile={onEditProfile} />
      </TabsContent>

      {!isCitizen && (
        <TabsContent
          value="organization"
          className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 mt-0 outline-none"
        >
          <OrganizationTab />
        </TabsContent>
      )}

      <TabsContent
        value="activity"
        className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 mt-0 outline-none"
      >
        <ActivityTab />
      </TabsContent>
    </Tabs>
  );
}
