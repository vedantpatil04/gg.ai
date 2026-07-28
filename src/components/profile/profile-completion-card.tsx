/**
 * ProfileCompletionCard — Phase 10 redesign.
 *
 * The completion ring and percentage are now embedded directly in
 * ProfileHero (HeroCompletion). This standalone card is kept for
 * backward-compatibility with any consumer that imports it, but in the
 * new layout it is no longer rendered in ProfileOverview — that tab now
 * uses the inline RecommendationsSection instead.
 *
 * If a future page needs a self-contained completion widget it can still
 * import this component; it is NOT deleted.
 */
export { ProfileCompletionCardLegacy as ProfileCompletionCard } from "./profile-completion-card-legacy";
