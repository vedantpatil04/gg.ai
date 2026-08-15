import { createFileRoute } from "@tanstack/react-router";
import { InfoPageShell, Prose, CTABlock } from "@/components/landing/InfoPageShell";

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
