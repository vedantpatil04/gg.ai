import { useState } from "react";
import { format } from "date-fns";
import {
  MapPin, Plus, Search, X, Loader2, Power, PowerOff, Edit2, RefreshCw,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SectionTitle, EmptyState, Pill } from "@/components/ui-bits";
import { cn } from "@/lib/utils";
import { adminCityApi } from "@/lib/api/environmental.api";
import { useCityDirectory, type DirectoryCityBase } from "@/components/admin/city-directory/city-directory-queries";
import { useQuery } from "@tanstack/react-query";
import { complaintApi, alertApi } from "@/lib/api/services.api";
import client from "@/lib/api/client";

// Enriched city with live counts
interface EnrichedCity extends DirectoryCityBase {
  complaintCount?: number;
  alertCount?: number;
  authorityCount?: number;
}

interface CityFormData {
  cityId: string; name: string; country: string;
  lat: string; lng: string; timezone: string;
}
const EMPTY: CityFormData = { cityId: "", name: "", country: "", lat: "", lng: "", timezone: "UTC" };

function CityForm({ initial, onSubmit, isSubmitting, submitLabel }: {
  initial: CityFormData; onSubmit: (d: CityFormData) => void;
  isSubmitting: boolean; submitLabel: string;
}) {
  const [form, setForm] = useState<CityFormData>(initial);
  const set = (k: keyof CityFormData) => (v: string) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="space-y-4 mt-4">
      {([
        { key: "cityId" as const, label: "City ID", placeholder: "e.g. belagavi", hint: "Lowercase slug — unique identifier" },
        { key: "name" as const, label: "City Name", placeholder: "e.g. Belagavi", hint: "" },
        { key: "country" as const, label: "Country", placeholder: "e.g. India", hint: "" },
        { key: "lat" as const, label: "Latitude", placeholder: "e.g. 15.8497", hint: "" },
        { key: "lng" as const, label: "Longitude", placeholder: "e.g. 74.4977", hint: "" },
        { key: "timezone" as const, label: "Timezone", placeholder: "e.g. Asia/Kolkata", hint: "" },
      ]).map(({ key, label, placeholder, hint }) => (
        <div key={key} className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">{label}</label>
          <Input value={form[key]} onChange={e => set(key)(e.target.value)} placeholder={placeholder} />
          {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
        </div>
      ))}
      <div className="flex justify-end pt-2">
        <Button disabled={isSubmitting || !form.cityId || !form.name || !form.country || !form.lat || !form.lng} onClick={() => onSubmit(form)}>
          {isSubmitting && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}{submitLabel}
        </Button>
      </div>
    </div>
  );
}

export function CityManagementPage() {
  const [search, setSearch] = useState("");
  const [editCity, setEditCity] = useState<EnrichedCity | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [pendingToggle, setPendingToggle] = useState<EnrichedCity | null>(null);

  const qc = useQueryClient();
  const { cities: baseCities, isLoading, isError } = useCityDirectory();

  const createCity = useMutation({
    mutationFn: (d: CityFormData) => adminCityApi.addCity({ cityId: d.cityId, name: d.name, country: d.country, lat: Number(d.lat), lng: Number(d.lng), timezone: d.timezone }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-city-directory-cities"] }); toast("City created."); setShowCreate(false); },
    onError: () => toast("Failed to create city."),
  });

  const updateCity = useMutation({
    mutationFn: ({ id, d }: { id: string; d: CityFormData }) => adminCityApi.updateCity(id, { name: d.name, country: d.country, lat: Number(d.lat), lng: Number(d.lng), timezone: d.timezone }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-city-directory-cities"] }); toast("City updated."); setEditCity(null); },
    onError: () => toast("Failed to update city."),
  });

  const toggleCity = useMutation({
    mutationFn: (id: string) => adminCityApi.toggleActive(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-city-directory-cities"] }); toast("City status updated."); setPendingToggle(null); },
    onError: () => toast("Failed to toggle city."),
  });

  const filtered = (baseCities ?? []).filter(c =>
    !search.trim() || c.name.toLowerCase().includes(search.toLowerCase()) || c.cityId.includes(search.toLowerCase()),
  );

  return (
    <div className="px-4 md:px-6 py-6 space-y-5">
      <SectionTitle
        eyebrow="Governance"
        title="City Management"
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ["admin-city-directory-cities"] })}>
              <RefreshCw className="size-3.5 mr-1.5" />Refresh
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
              <Plus className="size-3.5" />Add City
            </Button>
          </div>
        }
      />

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search city…" className="pl-8 h-9" />
          {search && <button className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setSearch("")}><X className="size-3.5" /></button>}
        </div>
      </div>

      <div className="glass rounded-2xl p-4 md:p-5">
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-muted/40 animate-pulse" />)}</div>
        ) : isError ? (
          <p className="text-sm text-destructive text-center py-10">Couldn't load cities.</p>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<MapPin className="size-4" />} title="No cities found."
            description={search ? "No city matched your search." : "Add the first city."}
            action={!search ? <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="size-3.5 mr-1.5" />Add City</Button> : undefined} />
        ) : (
          <div className="space-y-2">
            {filtered.map(c => (
              <div key={c.cityId} className="flex items-center gap-4 p-4 rounded-xl border border-border/60 bg-card hover:bg-muted/30 transition-colors">
                <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <MapPin className="size-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{c.name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{c.cityId}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {c.country}{c.timezone ? ` · ${c.timezone}` : ""} · {c.lat.toFixed(4)}, {c.lng.toFixed(4)}
                  </div>
                </div>
                <div className="hidden md:block text-xs text-muted-foreground shrink-0">
                  {format(new Date(c.createdAt), "MMM d, yyyy")}
                </div>
                <Pill tone={c.isActive ? "success" : "muted"}>{c.isActive ? "Active" : "Inactive"}</Pill>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" onClick={() => setEditCity(c as EnrichedCity)}><Edit2 className="size-3.5" /></Button>
                  <Button variant="ghost" size="sm" className={cn("h-7 w-7 p-0", c.isActive ? "text-muted-foreground hover:text-destructive" : "text-muted-foreground hover:text-success")} onClick={() => setPendingToggle(c as EnrichedCity)}>
                    {c.isActive ? <PowerOff className="size-3.5" /> : <Power className="size-3.5" />}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create sheet */}
      <Sheet open={showCreate} onOpenChange={o => !o && setShowCreate(false)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>Add New City</SheetTitle><SheetDescription>Register a new monitored city.</SheetDescription></SheetHeader>
          <CityForm initial={EMPTY} isSubmitting={createCity.isPending} submitLabel="Create City" onSubmit={d => createCity.mutate(d)} />
        </SheetContent>
      </Sheet>

      {/* Edit sheet */}
      <Sheet open={!!editCity} onOpenChange={o => !o && setEditCity(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          {editCity && (
            <>
              <SheetHeader><SheetTitle>Edit {editCity.name}</SheetTitle><SheetDescription>Update city details.</SheetDescription></SheetHeader>
              <CityForm
                initial={{ cityId: editCity.cityId, name: editCity.name, country: editCity.country, lat: String(editCity.lat), lng: String(editCity.lng), timezone: editCity.timezone ?? "UTC" }}
                isSubmitting={updateCity.isPending} submitLabel="Save Changes"
                onSubmit={d => updateCity.mutate({ id: (editCity as { _id?: string })._id ?? editCity.cityId, d })}
              />
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Toggle confirm */}
      <AlertDialog open={!!pendingToggle} onOpenChange={o => !o && setPendingToggle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingToggle?.isActive ? "Deactivate" : "Activate"} {pendingToggle?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingToggle?.isActive
                ? "This city will be hidden from monitoring. Existing data is preserved."
                : "This city will be available for monitoring and authority assignment."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={toggleCity.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={toggleCity.isPending} className={cn(pendingToggle?.isActive && "bg-destructive hover:bg-destructive/90 text-destructive-foreground")}
              onClick={e => { e.preventDefault(); if (pendingToggle) toggleCity.mutate((pendingToggle as { _id?: string })._id ?? pendingToggle.cityId); }}>
              {toggleCity.isPending && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
