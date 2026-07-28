/** Formats an ISO timestamp as a short relative string, e.g. "3 mins ago". */
export function formatRelativeTime(iso?: string | null): string {
  if (!iso) return "Just now";

  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "Just now";

  const diffMs = Date.now() - then;
  const mins = Math.floor(diffMs / 60_000);

  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/** Shared time-of-day greeting text, used by WelcomeHero and the AI Daily
 *  Brief so both stay in sync instead of each keeping its own copy. */
export function getGreetingText(
  hour: number = new Date().getHours(),
): "Good night" | "Good morning" | "Good afternoon" | "Good evening" {
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
