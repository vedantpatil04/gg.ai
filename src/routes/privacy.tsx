import { createFileRoute } from "@tanstack/react-router";
import { InfoPageShell, Prose, CTABlock } from "@/components/landing/InfoPageShell";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — GreenGuard AI" },
      {
        name: "description",
        content: "How GreenGuard AI handles personal data, environmental data and citizen reports.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <InfoPageShell
      eyebrow="Legal"
      title="Privacy Policy"
      lead="GreenGuard AI is built for the public sector. We take the responsibility of handling environmental data and citizen reports seriously."
    >
      <Prose>
        <p className="text-sm text-muted-foreground">Last updated: June 28, 2026</p>

        <h2>1. Scope</h2>
        <p>
          This policy describes how GreenGuard AI ("we", "us", "the platform") collects, uses,
          stores and shares information when you use our environmental intelligence platform,
          including the dashboard, AI Copilot, Forecast, Citizen Hub, Reports, Sustainability,
          Policy Simulator and Smart Map modules.
        </p>

        <h2>2. Data we collect</h2>
        <h3>Account data</h3>
        <p>Name, email, role and the organisation you act on behalf of.</p>
        <h3>Environmental data</h3>
        <p>
          Sensor readings, satellite and weather feeds, and any data your organisation chooses to
          ingest. Environmental data is treated as your organisation's data unless explicitly
          published as open data.
        </p>
        <h3>Citizen reports</h3>
        <p>
          Reports submitted through Citizen Hub may include location, time, free-text and optional
          photo evidence. Personal identifiers are pseudonymised by default.
        </p>
        <h3>Telemetry</h3>
        <p>
          We collect minimal product analytics to keep the platform reliable. We do not sell or
          share telemetry with advertising networks.
        </p>

        <h2>3. How we use data</h2>
        <ul>
          <li>To operate, secure and improve the platform.</li>
          <li>To provide forecasts, alerts and AI-generated insights to authorised users.</li>
          <li>To meet legal obligations in the jurisdictions we operate in.</li>
        </ul>

        <h2>4. Your rights</h2>
        <p>
          Depending on your jurisdiction, you may have the right to access, correct, export or
          delete personal data we hold about you. Contact{" "}
          <span className="font-mono">privacy@greenguard.ai</span>
          to exercise these rights.
        </p>

        <h2>5. Security</h2>
        <p>
          Data is encrypted in transit and at rest. Access is role-based and audited. We operate
          under a SOC 2 control framework.
        </p>

        <h2>6. Contact</h2>
        <p>
          Questions? Reach our Data Protection team at{" "}
          <span className="font-mono">privacy@greenguard.ai</span>.
        </p>
      </Prose>
      <CTABlock />
    </InfoPageShell>
  );
}
