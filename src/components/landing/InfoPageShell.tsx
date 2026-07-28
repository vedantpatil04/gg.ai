import { Link } from "@tanstack/react-router";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

export function InfoPageShell({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingHeader />
      <section className="border-b border-border/60">
        <div className="mx-auto max-w-[1100px] px-6 lg:px-10 py-20 lg:py-28">
          <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-primary)] font-medium">
            {eyebrow}
          </div>
          <h1 className="font-display mt-3 text-4xl lg:text-6xl font-semibold tracking-tight leading-[1.05]">
            {title}
          </h1>
          {lead && (
            <p className="mt-6 text-lg lg:text-xl text-muted-foreground max-w-3xl leading-relaxed">
              {lead}
            </p>
          )}
        </div>
      </section>
      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-[1100px] px-6 lg:px-10">{children}</div>
      </section>
      <LandingFooter />
    </div>
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return (
    <div className="prose-custom max-w-3xl text-[15px] leading-relaxed text-foreground/85 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:mt-12 [&_h2]:mb-3 [&_h2]:text-foreground [&_h3]:text-lg [&_h3]:font-medium [&_h3]:mt-8 [&_h3]:mb-2 [&_h3]:text-foreground [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_ul_li]:mb-1.5 [&_a]:text-[color:var(--color-primary)] [&_a:hover]:underline">
      {children}
    </div>
  );
}

export function CTABlock() {
  return (
    <div className="mt-16 rounded-2xl border border-border/60 bg-card p-8 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
      <div>
        <div className="font-display text-xl font-semibold tracking-tight">
          See the platform live
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          Launch GreenGuard AI and explore every module.
        </div>
      </div>
      <Link
        to="/dashboard"
        className="inline-flex h-11 items-center gap-2 rounded-md bg-foreground px-5 text-sm font-medium text-background hover:opacity-90"
      >
        Launch Platform <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}
