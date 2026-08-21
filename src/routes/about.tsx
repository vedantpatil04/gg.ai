import { createFileRoute } from "@tanstack/react-router";
import { InfoPageShell, Prose, CTABlock } from "@/components/landing/InfoPageShell";
import { Code2, Server, Layout, Palette, type LucideIcon } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — GreenGuard AI" },
      {
        name: "description",
        content:
          "GreenGuard AI builds environmental intelligence software for cities, authorities and citizens.",
      },
      { property: "og:title", content: "About — GreenGuard AI" },
      {
        property: "og:description",
        content: "Environmental intelligence software for the cities of tomorrow.",
      },
    ],
  }),
  component: AboutPage,
});

interface TeamMember {
  name: string;
  role: string;
  description: string;
  badge: string;
  icon: LucideIcon;
  initials: string;
}

const TEAM_MEMBERS: readonly TeamMember[] = [
  {
    name: "Vedant Patil",
    role: "Full-Stack Developer & Tech Lead",
    description:
      "Leads system architecture, full-stack development, technical integration, and overall platform direction.",
    badge: "Tech Lead",
    icon: Code2,
    initials: "VP",
  },
  {
    name: "Om Mohite",
    role: "Backend Developer",
    description:
      "Responsible for APIs, database integration, server-side logic, authentication, and backend services.",
    badge: "Backend",
    icon: Server,
    initials: "OM",
  },
  {
    name: "Sudarshan Gidganti",
    role: "Frontend Developer",
    description:
      "Builds the user-facing application, responsive interfaces, component integration, and frontend functionality.",
    badge: "Frontend",
    icon: Layout,
    initials: "SG",
  },
  {
    name: "Ishita Sambhaji",
    role: "UI/UX Designer",
    description:
      "Designs user experiences, interface systems, visual consistency, accessibility, and interaction flows.",
    badge: "UI/UX",
    icon: Palette,
    initials: "IS",
  },
] as const;

function AboutPage() {
  return (
    <InfoPageShell
      eyebrow="About"
      title="We're building the operating system for the urban environment."
      lead="GreenGuard AI is an environmental intelligence platform that helps the people responsible for a city — and the people who live in it — understand, predict and act on environmental risk."
    >
      <Prose>
        <h2>Our mission</h2>
        <p>
          Cities generate an extraordinary amount of environmental signal. Air quality monitors,
          water sensors, satellites, weather feeds, citizen reports — each one a fragment of a story
          about the place we live. Almost none of that signal currently makes it to the people who
          could act on it.
        </p>
        <p>
          GreenGuard AI exists to close that loop. We unify environmental data into a single,
          queryable layer, and surface it through software that operations teams, policymakers and
          citizens can actually use — together.
        </p>

        <h2>How we work</h2>
        <p>
          We build with the agencies that use us, not for them. Every module in GreenGuard AI —
          monitoring, forecast, intelligence center, citizen hub, reports, sustainability, simulator and map —
          ships because a real city operator asked for it. We measure success in outcomes: incidents
          prevented, response times reduced, advisories issued before the air got bad.
        </p>
      </Prose>

      <section aria-labelledby="team-heading" className="mt-14 lg:mt-18">
        <div className="max-w-2xl">
          <h2
            id="team-heading"
            className="font-display text-2xl font-semibold tracking-tight text-foreground"
          >
            Meet the GreenGuard AI Team
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
            A multidisciplinary team building environmental intelligence for citizens, authorities,
            and the cities they serve.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          {TEAM_MEMBERS.map((member) => {
            const Icon = member.icon;
            return (
              <div
                key={member.name}
                className="group relative flex flex-col justify-between rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:var(--color-primary)]/40 hover:bg-card hover:shadow-md motion-reduce:transform-none"
              >
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="relative flex size-11 items-center justify-center rounded-xl border border-border/60 bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)] transition-colors group-hover:border-[color:var(--color-primary)]/30 group-hover:bg-[color:var(--color-primary)]/15">
                      <span className="font-display text-xs font-semibold tracking-wider">
                        {member.initials}
                      </span>
                      <span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-md border border-border/60 bg-background text-muted-foreground transition-colors group-hover:text-[color:var(--color-primary)]">
                        <Icon className="size-3" />
                      </span>
                    </div>
                    <span className="inline-flex items-center rounded-full border border-border/60 bg-secondary/60 px-2.5 py-0.5 text-[11px] font-medium tracking-tight text-muted-foreground transition-colors group-hover:text-foreground">
                      {member.badge}
                    </span>
                  </div>

                  <div className="mt-5">
                    <h3 className="font-display text-base font-semibold tracking-tight text-foreground">
                      {member.name}
                    </h3>
                    <div className="mt-1 text-xs font-medium text-[color:var(--color-primary)] tracking-tight">
                      {member.role}
                    </div>
                  </div>

                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    {member.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <Prose>
        <h2>Principles</h2>
        <ul>
          <li>
            <strong>Source over polish.</strong> Every insight is auditable and cited.
          </li>
          <li>
            <strong>Action over dashboards.</strong> Software should reduce work, not display it.
          </li>
          <li>
            <strong>Public-sector grade.</strong> Security, accessibility and reliability are not
            features — they are the floor.
          </li>
          <li>
            <strong>Citizens are first-class users.</strong> The people experiencing the environment
            belong in the platform that monitors it.
          </li>
        </ul>
      </Prose>
      <CTABlock />
    </InfoPageShell>
  );
}
