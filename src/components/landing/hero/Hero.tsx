import { useRef, type MouseEvent } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, ShieldCheck, Lock, Database, Zap } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { STAGGER, FADE_UP } from "@/lib/motion";
import { LANDING_CONTAINER, CTA_PRIMARY_CLASS, CTA_SECONDARY_CLASS } from "@/components/landing/shared";
import { LAUNCH_LINK } from "@/components/landing/nav/nav-data";
import { HeroBackground } from "./HeroBackground";
import { HeroPreviewFrame } from "./HeroPreviewFrame";
import { CITIES } from "@/lib/mock-data";

const TRUST_INDICATORS = [
  { Icon: ShieldCheck, label: "SOC 2 ready" },
  { Icon: Lock, label: "End-to-end encrypted" },
  { Icon: Database, label: "OpenData compatible" },
  { Icon: Zap, label: "Sub-second alerting" },
] as const;

function scrollToPlatformOverview(event: MouseEvent<HTMLAnchorElement>, instant: boolean) {
  const target = document.getElementById("platform-overview");
  if (!target) return;
  event.preventDefault();
  target.scrollIntoView({ behavior: instant ? "auto" : "smooth", block: "start" });
}

export function Hero() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const yRaw = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const opacityRaw = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  // A very small, controlled scale-up on the product preview as the hero
  // scrolls past — reinforces that the surface is alive without faking any
  // data. Deliberately subtle (max +3.5%) per the "restrained motion" brief.
  const previewScale = useTransform(scrollYProgress, [0, 1], [1, 1.035]);

  return (
    <section ref={sectionRef} className="relative overflow-hidden">
      <HeroBackground />

      <motion.div
        style={{ y: reducedMotion ? 0 : yRaw, opacity: reducedMotion ? 1 : opacityRaw }}
        className={`${LANDING_CONTAINER} flex min-h-[560px] items-center pb-12 pt-8 lg:min-h-[640px] lg:pb-14 lg:pt-10`}
      >
        <motion.div
          initial="hidden"
          animate="show"
          variants={STAGGER(0.09, 0.05)}
          className="grid w-full items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16"
        >
          {/* Left: copy */}
          <div className="max-w-2xl">
            <motion.div
              variants={FADE_UP}
              className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-1 text-xs backdrop-blur"
            >
              <span className="relative inline-flex size-1.5 rounded-full bg-[color:var(--color-primary)] pulse-dot" />
              <span className="text-muted-foreground">Live</span>
              <span className="text-foreground/80">
                Monitoring {CITIES.length} cities · live environmental data
              </span>
            </motion.div>

            <motion.h1
              variants={FADE_UP}
              className="font-display mt-6 text-[44px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-5xl lg:text-[64px] lg:leading-[1.04]"
            >
              Environmental <span className="text-aurora">intelligence</span> for the cities of
              tomorrow.
            </motion.h1>

            <motion.p
              variants={FADE_UP}
              className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground"
            >
              GreenGuard AI unifies environmental data, forecasting, citizen reports and AI
              insight into a single operating picture — so authorities can monitor, predict and
              act on environmental risk before it becomes a crisis.
            </motion.p>

            <motion.div variants={FADE_UP} className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3">
              <Link to={LAUNCH_LINK.to} className={CTA_PRIMARY_CLASS}>
                {LAUNCH_LINK.label}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#platform-overview"
                onClick={(event: MouseEvent<HTMLAnchorElement>) =>
                  scrollToPlatformOverview(event, !!reducedMotion)
                }
                className={CTA_SECONDARY_CLASS}
              >
                Explore Platform
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </a>
            </motion.div>

            <motion.div
              variants={FADE_UP}
              className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-muted-foreground"
            >
              {TRUST_INDICATORS.map(({ Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <Icon className="size-3.5" />
                  {label}
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right: platform preview */}
          <div className="lg:pl-4">
            <HeroPreviewFrame scrollScale={previewScale} />
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
