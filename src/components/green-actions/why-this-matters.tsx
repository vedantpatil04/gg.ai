import { HelpCircle } from "lucide-react";
import { getEnvCategory, type EnvCategoryId } from "./green-actions-data";

/**
 * WhyThisMatters — Green Actions, Section 4.
 *
 * Short, factual explanations behind the recommendations for whichever
 * category is currently selected in Section 3. Plain language, no
 * fear-based messaging, no fabricated statistics.
 */
export function WhyThisMatters({ category }: { category: EnvCategoryId }) {
  const cat = getEnvCategory(category);

  return (
    <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
      {cat.whyItMatters.map((entry) => (
        <div key={entry.question} className="glass-card rounded-2xl p-4">
          <div className="flex items-start gap-2.5">
            <HelpCircle className="size-4 text-[var(--color-primary)] shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <h4 className="text-sm font-semibold tracking-tight">{entry.question}</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{entry.answer}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
