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
    <div className="px-4 md:px-6 py-6 space-y-5">
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
          >
            <RefreshCw className="size-3.5 mr-1.5" />
            Refresh
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl w-fit border border-border">
          {HEALTH_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setHealthFilter(f.value)}
              className={cn(
                "px-3.5 py-2 rounded-lg text-sm font-medium transition-all",
                healthFilter === f.value
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search city name..."
            className="pl-8 h-9 w-56"
          />
        </div>
      </div>

      <div className="glass rounded-2xl p-4 md:p-5">
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
