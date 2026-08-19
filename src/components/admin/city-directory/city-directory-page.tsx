import { useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { SectionTitle } from "@/components/ui-bits";
import { CityDirectoryList, type HealthFilter } from "./city-directory-list";
import { CityDetailPanel } from "./city-detail-panel";
import type { DirectoryCity } from "./city-directory-queries";

const HEALTH_FILTERS: { value: HealthFilter; label: string }[] = [
  { value: "all", label: "All Cities" },
  { value: "healthy", label: "Healthy" },
  { value: "moderate", label: "Moderate" },
  { value: "unhealthy", label: "Unhealthy" },
];

export function CityDirectoryPage() {
  const [healthFilter, setHealthFilter] = useState<HealthFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selected, setSelected] = useState<DirectoryCity | null>(null);

  const qc = useQueryClient();

  return (
    <div className="px-3.5 sm:px-4 md:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5 max-w-full overflow-hidden">
      <SectionTitle
        eyebrow="Administration"
        title="City Directory"
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              qc.invalidateQueries({ queryKey: ["admin-city-directory-cities"] });
              qc.invalidateQueries({ queryKey: ["admin-city-directory-env"] });
            }}
            className="h-8 text-xs"
          >
            <RefreshCw className="size-3.5 mr-1.5" />
            Refresh
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="overflow-x-auto scrollbar-hide pb-0.5 -mx-1 px-1 sm:mx-0 sm:px-0">
          <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl w-max border border-border">
            {HEALTH_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setHealthFilter(f.value)}
                className={cn(
                  "px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap",
                  healthFilter === f.value
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative w-full sm:w-56">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search city name..."
            className="pl-8 h-9 text-xs sm:text-sm w-full"
          />
        </div>
      </div>

      <div className="glass rounded-2xl p-3 sm:p-4 md:p-5 overflow-hidden">
        <CityDirectoryList
          healthFilter={healthFilter}
          searchTerm={searchTerm}
          onSelect={setSelected}
        />
      </div>

      <CityDetailPanel city={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </div>
  );
}
