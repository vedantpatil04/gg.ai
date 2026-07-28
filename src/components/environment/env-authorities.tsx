import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Phone, Mail, Globe, Copy, MapPin, Clock, Search } from "lucide-react";
import { useCity } from "@/lib/city-context";
import {
  AUTHORITY_TYPE_LABEL,
  getAuthoritiesForCity,
  type Authority,
  type AuthorityType,
} from "@/lib/authorities-data";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EnvAuthoritiesSkeleton } from "@/components/environment/env-authorities-skeleton";
import { EnvEmptyState, EnvErrorState } from "@/components/environment/env-state-views";
import { cn } from "@/lib/utils";

const NOT_AVAILABLE = "Not Available";

function Field({ icon: Icon, value }: { icon: typeof Phone; value?: string }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <Icon className="size-3.5 text-muted-foreground shrink-0 mt-0.5" aria-hidden="true" />
      <span className={cn(!value && "text-muted-foreground italic")}>{value ?? NOT_AVAILABLE}</span>
    </div>
  );
}

function AuthorityCard({ authority }: { authority: Authority }) {
  const handleCopy = async () => {
    const parts = [
      authority.name,
      authority.phone && `Phone: ${authority.phone}`,
      authority.email && `Email: ${authority.email}`,
      authority.website && `Website: ${authority.website}`,
      authority.address && `Address: ${authority.address}`,
    ].filter(Boolean);
    try {
      await navigator.clipboard.writeText(parts.join("\n"));
      toast("Contact details copied");
    } catch {
      toast("Couldn't copy — please copy manually");
    }
  };

  const canCopy = !!(authority.phone || authority.email);

  return (
    <div
      className="rounded-xl border border-border p-4 space-y-3 glass hover:border-primary/40 transition-colors focus-within:ring-1 focus-within:ring-ring"
      aria-label={`${authority.name}, ${AUTHORITY_TYPE_LABEL[authority.type]}`}
    >
      <div>
        <div className="text-sm font-medium">{authority.name}</div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
          {AUTHORITY_TYPE_LABEL[authority.type]}
        </div>
      </div>

      <div className="space-y-1.5">
        <Field icon={Phone} value={authority.phone} />
        <Field icon={Mail} value={authority.email} />
        <Field icon={Globe} value={authority.website} />
        <Field icon={MapPin} value={authority.address} />
        <Field icon={Clock} value={authority.hours} />
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button variant="outline" size="sm" disabled={!authority.phone} asChild={!!authority.phone}>
          {authority.phone ? (
            <a
              href={`tel:${authority.phone.replace(/[^\d+]/g, "")}`}
              aria-label={`Call ${authority.name}`}
            >
              <Phone className="size-3.5" aria-hidden="true" /> Call
            </a>
          ) : (
            <span>
              <Phone className="size-3.5" aria-hidden="true" /> Call
            </span>
          )}
        </Button>
        <Button variant="outline" size="sm" disabled={!authority.email} asChild={!!authority.email}>
          {authority.email ? (
            <a href={`mailto:${authority.email}`} aria-label={`Email ${authority.name}`}>
              <Mail className="size-3.5" aria-hidden="true" /> Email
            </a>
          ) : (
            <span>
              <Mail className="size-3.5" aria-hidden="true" /> Email
            </span>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!authority.website}
          asChild={!!authority.website}
        >
          {authority.website ? (
            <a
              href={authority.website}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Visit ${authority.name} website`}
            >
              <Globe className="size-3.5" aria-hidden="true" /> Website
            </a>
          ) : (
            <span>
              <Globe className="size-3.5" aria-hidden="true" /> Website
            </span>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!canCopy}
          onClick={handleCopy}
          aria-label={`Copy contact details for ${authority.name}`}
        >
          <Copy className="size-3.5" aria-hidden="true" /> Copy
        </Button>
      </div>
    </div>
  );
}

export function EnvAuthorities({ className }: { className?: string }) {
  const { city, isCityListLoading, isCityError, refreshCity } = useCity();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<AuthorityType | "all">("all");

  const authorities = useMemo(
    () => getAuthoritiesForCity(city.id, city.country),
    [city.id, city.country],
  );

  const availableTypes = useMemo(
    () => Array.from(new Set(authorities.map((a) => a.type))),
    [authorities],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return authorities.filter((a) => {
      if (typeFilter !== "all" && a.type !== typeFilter) return false;
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        AUTHORITY_TYPE_LABEL[a.type].toLowerCase().includes(q) ||
        (a.address ?? "").toLowerCase().includes(q)
      );
    });
  }, [authorities, query, typeFilter]);

  if (isCityListLoading) {
    return <EnvAuthoritiesSkeleton className={className} />;
  }

  if (isCityError) {
    return (
      <EnvErrorState
        className={className}
        onRetry={refreshCity}
        retryDisabled={false}
        message="Unable to load authority information."
      />
    );
  }

  if (authorities.length === 0) {
    return (
      <EnvEmptyState
        className={className}
        title="No authority information is available for this location yet."
        description="Verified contact details for this city haven't been added yet."
      />
    );
  }

  return (
    <div className={cn("glass rounded-2xl p-6 md:p-8 space-y-4", className)}>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 sm:max-w-64">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search authorities..."
            aria-label="Search authorities"
            className="pl-8"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setTypeFilter("all")}
            aria-pressed={typeFilter === "all"}
            className={cn(
              "text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors",
              typeFilter === "all"
                ? "bg-primary/10 border-primary/40 text-primary"
                : "border-border text-muted-foreground hover:border-primary/30",
            )}
          >
            All
          </button>
          {availableTypes.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              aria-pressed={typeFilter === t}
              className={cn(
                "text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors whitespace-nowrap",
                typeFilter === t
                  ? "bg-primary/10 border-primary/40 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/30",
              )}
            >
              {AUTHORITY_TYPE_LABEL[t]}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          No authorities match your search.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((a) => (
            <AuthorityCard key={a.id} authority={a} />
          ))}
        </div>
      )}
    </div>
  );
}
