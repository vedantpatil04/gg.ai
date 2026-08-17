import { getEnvCategory, type EnvCategoryId } from "./green-actions-data";

/**
 * WhyThisMatters — Green Actions, Section 4.
 *
 * Short, factual explanations behind the recommendations for whichever
 * category is currently selected in Section 3. Presented as a compact,
 * editorial question/answer list rather than a grid of cards. At desktop
 * widths the entries lay out as columns instead of one long stacked list,
 * so the section makes real use of the wider page rather than just
 * stretching a single-column row. `contextNote`, when present, is a short
 * factual line (see whyThisMattersContextNote in green-actions-data.ts)
 * shown only when the category being viewed is the one today's conditions
 * actually flagged as relevant.
 */
export function WhyThisMatters({
  category,
  contextNote,
}: {
  category: EnvCategoryId;
  contextNote?: string;
}) {
  const cat = getEnvCategory(category);

  return (
    <div>
      {contextNote && <p className="text-sm text-muted-foreground mb-4">{contextNote}</p>}
      <div className="border-t border-border/60 divide-y divide-border/60 lg:divide-y-0 lg:border-t-0 lg:grid lg:grid-cols-2 lg:gap-x-12 lg:gap-y-6">
        {cat.whyItMatters.map((entry) => (
          <div key={entry.question} className="py-4 lg:py-0">
            <h4 className="text-sm font-semibold tracking-tight">{entry.question}</h4>
            <p className="text-sm text-muted-foreground leading-relaxed mt-1.5">{entry.answer}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
