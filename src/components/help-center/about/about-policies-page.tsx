import { Link } from "@tanstack/react-router";
import {
  ScrollText,
  Shield,
  FileText,
  Users,
  Lock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Leaf,
  Globe,
  Radio,
  MapPin,
  CloudSun,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function AboutPoliciesPage() {
  const platformModules = [
    {
      title: "Environmental Monitoring & AQI",
      description: "Real-time pollutant telemetry (PM2.5, PM10, SO2, NO2, CO, O3) and station tracking.",
      icon: Radio,
    },
    {
      title: "Weather & Forecast Engine",
      description: "Atmospheric synchronization providing predictive hourly and multi-day environmental forecasts.",
      icon: CloudSun,
    },
    {
      title: "Smart Maps & GIS Layers",
      description: "Interactive geographic visualization, sensor heatmaps, and spatial risk analysis.",
      icon: MapPin,
    },
    {
      title: "Citizen Hub & Complaints",
      description: "Public environmental reporting, evidence submission, and transparent resolution tracking.",
      icon: Users,
    },
    {
      title: "Intelligence Center & Copilot",
      description: "AI-assisted environmental analysis, contextual advisories, and district-level briefings.",
      icon: Sparkles,
    },
    {
      title: "Sustainability & Policy Simulator",
      description: "Green action tracking, carbon footprint modeling, and environmental policy scenario analysis.",
      icon: Leaf,
    },
  ];

  const policies = [
    {
      title: "Privacy Policy",
      description: "How GreenGuard AI collects, uses, and protects personal and environmental data.",
      link: "/privacy",
      isInternalRoute: true,
      badge: "Official Legal Policy",
      icon: Shield,
    },
    {
      title: "Terms of Service",
      description: "Terms governing access, acceptable use, and service commitments for users and organizations.",
      link: "/terms",
      isInternalRoute: true,
      badge: "Official Legal Policy",
      icon: FileText,
    },
    {
      title: "Community Guidelines",
      description: "Standards for submitting genuine citizen reports, constructive feedback, and respectful community discussions.",
      link: "#community-guidelines",
      badge: "Platform Standards",
      icon: Users,
    },
    {
      title: "Data Security & Compliance",
      description: "Encryption in transit and at rest, role-based access control, and audit logging standards.",
      link: "#security-compliance",
      badge: "Security Standard",
      icon: Lock,
    },
    {
      title: "Responsible AI Usage",
      description: "Guidelines on AI-generated insights, algorithmic transparency, and human-in-the-loop validation.",
      link: "#responsible-ai",
      badge: "AI Transparency",
      icon: Sparkles,
    },
  ];

  return (
    <div className="w-full">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-10 sm:space-y-12">
        {/* 1. Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
            <ScrollText className="size-3 text-primary" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-semibold">
              Platform & Legal
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            About GreenGuard AI
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl">
            Information about GreenGuard AI, the platform, and the policies that govern its use.
          </p>
        </div>

        {/* 2. Platform Overview */}
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-foreground">Platform Overview</h2>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              GreenGuard AI is an environmental intelligence platform designed to help citizens,
              authorities, and environmental coordinators understand environmental conditions,
              monitor air quality and weather, track alerts, access AI-powered insights, and
              participate in citizen environmental services.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5 p-4 rounded-xl border border-border/70 bg-muted/20">
              <h3 className="text-xs font-semibold text-foreground">Source over polish</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Every environmental metric and insight is traceable to verified sensors, official
                monitoring stations, or atmospheric feeds.
              </p>
            </div>
            <div className="space-y-1.5 p-4 rounded-xl border border-border/70 bg-muted/20">
              <h3 className="text-xs font-semibold text-foreground">Action over dashboards</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Software engineered to reduce response times, prevent incidents, and coordinate
                prompt mitigation rather than displaying idle data.
              </p>
            </div>
            <div className="space-y-1.5 p-4 rounded-xl border border-border/70 bg-muted/20">
              <h3 className="text-xs font-semibold text-foreground">Public-sector grade</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Security, role-based access, accessibility, and high platform availability are built
                as foundational requirements.
              </p>
            </div>
            <div className="space-y-1.5 p-4 rounded-xl border border-border/70 bg-muted/20">
              <h3 className="text-xs font-semibold text-foreground">Citizens as first-class participants</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The people experiencing the environment belong in the platform that monitors it,
                enabling collaborative reporting and community insights.
              </p>
            </div>
          </div>
        </div>

        {/* 3. Platform Capabilities */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Platform Capabilities
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Core modules and services comprising the GreenGuard AI ecosystem.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {platformModules.map((mod) => {
              const Icon = mod.icon;
              return (
                <div
                  key={mod.title}
                  className="p-5 rounded-xl border border-border/80 bg-card space-y-2.5 hover:border-primary/30 transition-colors"
                >
                  <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Icon className="size-4" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">{mod.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {mod.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. Policies & Legal */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Policies & Legal
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Official legal policies, compliance standards, and usage guidelines for GreenGuard AI.
            </p>
          </div>

          <div className="space-y-3">
            {policies.map((policy) => {
              const Icon = policy.icon;
              const content = (
                <div className="p-5 rounded-xl border border-border/80 bg-card hover:border-primary/40 transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div className="size-9 rounded-xl bg-muted text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 flex items-center justify-center shrink-0 transition-colors">
                      <Icon className="size-4" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                          {policy.title}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full border border-border/80 bg-muted/40 text-muted-foreground font-medium">
                          {policy.badge}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {policy.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground group-hover:text-primary transition-colors shrink-0 self-end sm:self-auto">
                    <span>View Policy</span>
                    <ChevronRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              );

              if (policy.isInternalRoute) {
                return (
                  <Link key={policy.title} to={policy.link} className="block">
                    {content}
                  </Link>
                );
              }

              return (
                <div key={policy.title} id={policy.link.replace("#", "")}>
                  {content}
                </div>
              );
            })}
          </div>
        </section>

        {/* 5. Legal & Privacy Inquiries Contact */}
        <div className="rounded-xl border border-border/60 bg-muted/20 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-foreground">
              Questions regarding policies or data privacy?
            </span>
            <p className="text-xs text-muted-foreground">
              Contact the GreenGuard AI team directly.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <a
              href="mailto:greengaurd.ai.in@gmail.com"
              className="text-xs font-semibold text-primary hover:underline"
            >
              greengaurd.ai.in@gmail.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
