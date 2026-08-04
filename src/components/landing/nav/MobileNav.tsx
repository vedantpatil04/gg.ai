import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, Shield } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CTA_PRIMARY_CLASS } from "@/components/landing/shared";
import { PLATFORM_ITEMS, PRIMARY_LINKS, SIGN_IN_LINK, LAUNCH_LINK } from "./nav-data";

/**
 * Fullscreen nav drawer for < lg viewports. Intentionally not a shrunk-down
 * copy of the desktop bar — grouped sections, a collapsible Platform list,
 * and large (48px+) touch targets throughout, with safe-area padding for
 * notched devices.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Open menu"
          className="grid size-10 place-items-center rounded-full border border-border/60 text-foreground transition-colors hover:bg-foreground/[0.06] lg:hidden"
        >
          <Menu className="size-4.5" />
        </button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="inset-0 flex h-full w-full max-w-full flex-col gap-0 rounded-none border-0 bg-background/98 p-0 backdrop-blur-2xl sm:max-w-full"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Navigation menu</SheetTitle>
          <SheetDescription>Browse GreenGuard AI platform modules and pages.</SheetDescription>
        </SheetHeader>

        <div className="safe-top flex shrink-0 items-center gap-2.5 border-b border-border/60 px-5 pb-4 pt-6">
          <div className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-[color:var(--color-primary)] to-[color:var(--color-info)] text-primary-foreground">
            <Shield className="size-4" />
          </div>
          <span className="font-display text-[15px] font-semibold tracking-tight">
            GreenGuard <span className="font-normal text-muted-foreground">AI</span>
          </span>
        </div>

        <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-3 py-2">
          <Accordion type="single" collapsible defaultValue="platform">
            <AccordionItem value="platform" className="border-none">
              <AccordionTrigger className="min-h-12 rounded-xl px-3 text-[15px] font-medium hover:no-underline hover:bg-foreground/[0.06]">
                Platform
              </AccordionTrigger>
              <AccordionContent className="pb-1">
                <div className="grid gap-1">
                  {PLATFORM_ITEMS.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={close}
                      className="flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-foreground/[0.06] active:bg-foreground/[0.08]"
                    >
                      <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)]">
                        <item.icon className="size-4.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground">{item.label}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {item.description}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="mt-2 flex flex-col gap-1 border-t border-border/60 pt-2">
            {PRIMARY_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={close}
                className="flex min-h-12 items-center rounded-xl px-3 text-[15px] font-medium text-foreground/85 transition-colors hover:bg-foreground/[0.06] active:bg-foreground/[0.08]"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>

        <div className="safe-bottom flex shrink-0 flex-col gap-2.5 border-t border-border/60 px-5 py-5">
          <Link
            to={SIGN_IN_LINK.to}
            onClick={close}
            className="flex min-h-12 items-center justify-center rounded-full border border-border/70 text-sm font-medium transition-colors hover:bg-foreground/[0.06]"
          >
            {SIGN_IN_LINK.label}
          </Link>
          <Link to={LAUNCH_LINK.to} onClick={close} className={`${CTA_PRIMARY_CLASS} min-h-12 w-full justify-center`}>
            {LAUNCH_LINK.label}
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
