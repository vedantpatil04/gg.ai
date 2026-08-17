import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { Users, ArrowUpRight } from "lucide-react";
import { LANDING_CONTAINER } from "@/components/landing/shared";
import { CITIZEN_IMPACT_IMAGE } from "@/assets/landing/imagery";

/**
 * ACTION — the closing beat of the Phase 3 storytelling arc, right after
 * the Intelligence Center's reasoning/decision section.
 *
 * A real, image-led editorial split (Pattern A: image, then content — the
 * image leads on every breakpoint, sitting left on desktop via the grid and
 * on top on mobile via source order, so nothing awkward has to reflow).
 * One CTA, to the real Citizen Hub route — this is the only place on the
 * page that promotes it, since it no longer appears in the module grid
 * below (see `Modules` in `src/routes/index.tsx`).
 */
export function CitizenImpactSection() {
  const reducedMotion = useReducedMotion();

  return (
    <section className="border-t border-border/60 py-20 lg:py-24">
      <div className={LANDING_CONTAINER}>
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
          <motion.div
            initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.6 }}
            className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-border/60 shadow-xl lg:aspect-[5/4]"
          >
            <img
              src={CITIZEN_IMPACT_IMAGE.src}
              alt={CITIZEN_IMPACT_IMAGE.alt}
              style={{ objectPosition: CITIZEN_IMPACT_IMAGE.position }}
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--color-primary)]">
              Citizen Impact
            </div>
            <h2 className="font-display mt-3 text-3xl font-semibold leading-[1.1] tracking-tight lg:text-4xl">
              The people closest to the problem are part of the solution.
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground lg:text-lg">
              Residents contribute localized reports and observations that complement
              environmental data — the Citizen Hub verifies and triages each one alongside the
              same data authorities already act on, so nothing gets lost between a street-level
              report and a real response.
            </p>
            <Link
              to="/citizen"
              className="group mt-7 inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-5 py-2.5 text-sm font-medium backdrop-blur transition-all hover:bg-card"
            >
              <Users className="size-4" />
              Open Citizen Hub
              <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
