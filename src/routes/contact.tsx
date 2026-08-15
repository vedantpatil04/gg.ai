import { createFileRoute } from "@tanstack/react-router";
import { InfoPageShell } from "@/components/landing/InfoPageShell";
import { Mail, MapPin, MessageSquare, Building2 } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — GreenGuard AI" },
      {
        name: "description",
        content:
          "Talk to the GreenGuard AI team about a deployment for your municipality, agency or research organisation.",
      },
      { property: "og:title", content: "Contact — GreenGuard AI" },
      { property: "og:description", content: "Talk to the GreenGuard AI team." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const channels = [
    {
      icon: Building2,
      t: "Deployments",
      d: "Pilot or production rollout for your city, agency or region.",
      v: "deployments@greenguard.ai",
    },
    {
      icon: MessageSquare,
      t: "Product",
      d: "Questions about modules, integrations or the GreenGuard Intelligence Center.",
      v: "hello@greenguard.ai",
    },
    {
      icon: Mail,
      t: "Press & research",
      d: "Editorial, academic and partnership enquiries.",
      v: "press@greenguard.ai",
    },
    {
      icon: MapPin,
      t: "Headquarters",
      d: "Belagavi, Karnataka — India. Remote-first team across 6 timezones.",
      v: "",
    },
  ];
  return (
    <InfoPageShell
      eyebrow="Contact"
      title="Talk to the team."
      lead="Whether you're a municipality evaluating a pilot, an agency planning a regional rollout, or a researcher exploring the platform — we'd like to hear from you."
    >
      <div className="grid gap-px bg-border/60 rounded-2xl overflow-hidden border border-border/60 sm:grid-cols-2">
        {channels.map((c) => (
          <div key={c.t} className="bg-card p-6">
            <div className="flex items-start gap-3">
              <div className="grid size-10 place-items-center rounded-lg bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)] shrink-0">
                <c.icon className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="font-medium tracking-tight">{c.t}</div>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{c.d}</p>
                {c.v && (
                  <a
                    href={`mailto:${c.v}`}
                    className="mt-2 inline-block text-sm font-mono text-[color:var(--color-primary)] hover:underline"
                  >
                    {c.v}
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-2xl border border-border/60 bg-card p-8">
        <div className="font-display text-xl font-semibold tracking-tight">Operations support</div>
        <p className="mt-2 text-sm text-muted-foreground max-w-xl">
          Existing customers can reach 24/7 platform support directly from their command center, or
          by emailing <span className="font-mono text-foreground">support@greenguard.ai</span>.
          Average response time is under 12 minutes for severity-1 incidents.
        </p>
      </div>
    </InfoPageShell>
  );
}
