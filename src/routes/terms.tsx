import { createFileRoute } from "@tanstack/react-router";
import { InfoPageShell, Prose, CTABlock } from "@/components/landing/InfoPageShell";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — GreenGuard AI" },
      {
        name: "description",
        content:
          "Terms governing your use of the GreenGuard AI environmental intelligence platform.",
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <InfoPageShell
      eyebrow="Legal"
      title="Terms of Service"
      lead="These terms govern access to and use of the GreenGuard AI platform by your organisation and its authorised users."
    >
      <Prose>
        <p className="text-sm text-muted-foreground">Last updated: June 28, 2026</p>

        <h2>1. Agreement</h2>
        <p>
          By accessing the GreenGuard AI platform you agree to these terms on behalf of your
          organisation. If you do not have authority to bind your organisation, do not use the
          platform.
        </p>

        <h2>2. Acceptable use</h2>
        <ul>
          <li>Do not attempt to access data outside your organisation's scope.</li>
          <li>Do not interfere with monitoring, alerting or forecast pipelines.</li>
          <li>Do not use the AI Copilot to generate content that violates applicable law.</li>
          <li>Citizen reports must be made in good faith and reflect genuine observations.</li>
        </ul>

        <h2>3. Service level</h2>
        <p>
          Production deployments target 99.9% monthly uptime for the dashboard, alerting and API
          surfaces. Forecast and reporting modules target 99.5%. Specific SLAs may be defined in
          your deployment agreement.
        </p>

        <h2>4. Intellectual property</h2>
        <p>
          GreenGuard AI retains all rights to the platform, its modules and underlying models. Your
          organisation retains all rights to data you ingest. AI-generated insights derived from
          your data are licensed to you for operational use.
        </p>

        <h2>5. Liability</h2>
        <p>
          GreenGuard AI provides decision-support, not decisions. Final responsibility for
          environmental actions, advisories and policy decisions rests with the operating
          organisation. We disclaim liability to the maximum extent permitted by law.
        </p>

        <h2>6. Changes</h2>
        <p>
          We may update these terms. Material changes will be notified to administrators at least 30
          days in advance.
        </p>

        <h2>7. Contact</h2>
        <p>
          Legal questions: <span className="font-mono">legal@greenguard.ai</span>.
        </p>
      </Prose>
      <CTABlock />
    </InfoPageShell>
  );
}
