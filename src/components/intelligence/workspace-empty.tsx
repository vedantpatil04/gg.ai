/**
 * WorkspaceEmpty — idle/empty state shown before a file is selected.
 * Used by document-workspace, image-workspace, and data-workspace.
 */
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface WorkspaceEmptyProps {
  icon: string;
  title: string;
  subtitle: string;
  accent: string;
}

export function WorkspaceEmpty({ icon, title, subtitle, accent }: WorkspaceEmptyProps) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center py-14 text-center px-6"
    >
      <motion.div
        className="size-16 rounded-2xl grid place-items-center text-3xl mb-4 relative"
        style={{ background: `color-mix(in oklab, ${accent} 14%, transparent)` }}
        animate={reduced ? {} : { scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Animated glow ring */}
        {!reduced && (
          <motion.div
            className="absolute inset-0 rounded-2xl"
            style={{ boxShadow: `0 0 0 0 ${accent}` }}
            animate={{ boxShadow: [`0 0 0 0 ${accent}40`, `0 0 0 8px ${accent}00`] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
          />
        )}
        {icon}
      </motion.div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="text-xs text-muted-foreground mt-1.5 max-w-[220px] leading-relaxed">{subtitle}</p>
    </motion.div>
  );
}
