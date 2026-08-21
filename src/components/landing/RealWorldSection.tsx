import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { LANDING_CONTAINER } from "@/components/landing/shared";
import { REAL_WORLD_IMAGES } from "@/assets/landing/imagery";
import { cn } from "@/lib/utils";

const AUTOPLAY_MS = 5600;

/**
 * REAL WORLD — the opening beat of the Phase 3 storytelling arc (real world
 * → environmental signals → understanding → prediction → decision → action).
 *
 * A full-bleed carousel of real, unedited-content photography from cities
 * GreenGuard actually monitors (see `src/assets/landing/imagery.ts` for the
 * source). Built on the project's existing shadcn/embla `Carousel` primitive
 * rather than a new dependency — this component only adds autoplay (paused
 * on hover/focus, disabled under `prefers-reduced-motion`) and a custom
 * dark-glass control cluster suited to sitting on top of a photo, matching
 * the visual language already used for `FloatingInsightPanel` on the map.
 *
 * Per-slide copy (label, headline, description) comes from `REAL_WORLD_IMAGES`
 * so image and text are always in sync — driven by a single structured object
 * per slide, never hardcoded separately.
 */
export function RealWorldSection() {
  const reducedMotion = useReducedMotion();
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setSelected(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api]);

  // Autoplay — skipped entirely under prefers-reduced-motion, and paused
  // whenever the section has hover or keyboard focus.
  useEffect(() => {
    if (!api || reducedMotion || paused) return;
    const id = window.setInterval(() => api.scrollNext(), AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [api, reducedMotion, paused]);

  const active = REAL_WORLD_IMAGES[selected];

  return (
    <section
      aria-label="Real-world cities GreenGuard monitors"
      className="relative overflow-hidden border-y border-border/60 bg-background"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <Carousel setApi={setApi} opts={{ loop: true }}>
        <CarouselContent className="ml-0">
          {REAL_WORLD_IMAGES.map((img, i) => (
            <CarouselItem key={img.src} className="pl-0">
              <div className="relative aspect-[4/5] w-full sm:aspect-[16/10] lg:aspect-[21/9]">
                <img
                  src={img.src}
                  alt={img.alt}
                  style={{ objectPosition: img.position }}
                  className="absolute inset-0 h-full w-full object-cover"
                  loading={i === 0 ? "eager" : "lazy"}
                  decoding="async"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/25"
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>

        {/* Per-slide storytelling copy + controls, overlaid on the image */}
        <div
          className={cn(
            LANDING_CONTAINER,
            "pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-6 pb-8 sm:pb-10 lg:flex-row lg:items-end lg:justify-between lg:pb-14",
          )}
        >
          <motion.div
            key={selected}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto max-w-xl"
          >
            {/* City-specific label */}
            <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/70">
              {active?.label ?? "City Environment"}
            </div>
            {/* City-specific headline */}
            <h2 className="font-display mt-3 text-3xl font-semibold leading-[1.1] tracking-tight text-white lg:text-4xl">
              {active?.headline ?? active?.caption ?? ""}
            </h2>
            {/* City-specific description */}
            {active?.description && (
              <p className="mt-3 max-w-md text-sm leading-relaxed text-white/80 lg:text-base">
                {active.description}
              </p>
            )}
          </motion.div>

          <div className="pointer-events-auto flex flex-wrap items-center gap-3 self-start lg:self-auto">
            {/* Counter — dynamically matches the real slide count */}
            <span className="rounded-full border border-white/15 bg-black/50 px-3 py-1.5 text-[11px] font-medium text-white/85 backdrop-blur-md">
              {active?.caption} · {selected + 1}/{REAL_WORLD_IMAGES.length}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => api?.scrollPrev()}
                aria-label="Previous city"
                className="grid size-9 place-items-center rounded-full border border-white/15 bg-black/50 text-white backdrop-blur-md transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => api?.scrollNext()}
                aria-label="Next city"
                className="grid size-9 place-items-center rounded-full border border-white/15 bg-black/50 text-white backdrop-blur-md transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </Carousel>
    </section>
  );
}
