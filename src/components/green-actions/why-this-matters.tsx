import { getEnvCategory, type EnvCategoryId } from "./green-actions-data";

/**
 * WhyThisMatters — Green Actions, Section 4.
 *
 * Short, factual explanations behind the recommendations for whichever
 * category is currently selected in Section 3. Presented as a compact,
 * editorial question/answer list rather than a grid of cards, so it reads
 * more like reference content than another dashboard panel. Plain
 * language, no fear-based messaging, no fabricated statistics.
 */
export function WhyThisMatters({ category }: { category: EnvCategoryId }) {
  const cat = getEnvCategory(category);

  return (
    <div className="divide-y divide-border/60 border-t border-border/60">
      {cat.whyItMatters.map((entry) => (
        <div
          key={entry.question}
          className="py-4 sm:grid sm:grid-cols-[minmax(0,15rem)_1fr] sm:gap-6"
        >
          <h4 className="text-sm font-semibold tracking-tight">{entry.question}</h4>
          <p className="text-sm text-muted-foreground leading-relaxed mt-1.5 sm:mt-0">
            {entry.answer}
          </p>
        </div>
      ))}
    </div>
  );
}
