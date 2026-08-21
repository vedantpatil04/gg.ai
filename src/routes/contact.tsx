import { createFileRoute } from "@tanstack/react-router";
import { InfoPageShell } from "@/components/landing/InfoPageShell";
import { Mail, MapPin, MessageSquare, Building2, Code2 } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — GreenGuard AI" },
      {
        name: "description",
        content:
          "Connect with the GreenGuard AI team regarding platform inquiries, collaboration, and technical integration.",
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
      t: "Deployments & Collaboration",
      d: "Discussions regarding platform integration, civic pilots, and municipal collaboration.",
      v: "greengaurd.ai.in@gmail.com",
    },
    {
      icon: MessageSquare,
      t: "Product & Inquiries",
      d: "Questions about modules, environmental data models, and GreenGuard AI features.",
      v: "greengaurd.ai.in@gmail.com",
    },
    {
      icon: Mail,
      t: "Press & Research",
      d: "Academic research, publications, and collaborative partnerships.",
      v: "greengaurd.ai.in@gmail.com",
    },
    {
      icon: Code2,
      t: "Technical & Project Lead",
      d: "Direct architecture, technical integration, and project queries.",
      v: "vedantpatilbca@gmail.com",
    },
  ];

  return (
    <InfoPageShell
      eyebrow="Contact"
      title="Talk to the team."
      lead="Whether you're exploring the platform, discussing a deployment, or have technical questions — we'd like to hear from you."
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

      <div className="mt-12 rounded-2xl border border-border/60 bg-card p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <div className="font-display text-xl font-semibold tracking-tight">
            Project & Technical Support
          </div>
          <p className="mt-2 text-sm text-muted-foreground max-w-xl leading-relaxed">
            For project enquiries, technical questions, or collaboration, contact the GreenGuard AI
            team at{" "}
            <a
              href="mailto:greengaurd.ai.in@gmail.com"
              className="font-mono text-[color:var(--color-primary)] hover:underline"
            >
              greengaurd.ai.in@gmail.com
            </a>
            .
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
          <MapPin className="size-4 text-[color:var(--color-primary)]" />
          <span>Belagavi, Karnataka — India</span>
        </div>
      </div>
    </InfoPageShell>
  );
}
