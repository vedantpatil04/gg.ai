/**
 * GreenGuard Brand Identity Constants
 *
 * Single source of truth for all branding, naming, and identity strings.
 * Import from this file instead of hardcoding strings throughout the app.
 *
 * Phase 0 – Rename & Brand Identity
 */

// ─── Application ───────────────────────────────────────────────────────────────

/** Top-level product name */
export const APP_NAME = "GreenGuard" as const;

// ─── Intelligence Center Module ────────────────────────────────────────────────

/** Full official module name */
export const INTELLIGENCE_MODULE_NAME = "GreenGuard Intelligence Center" as const;

/** Short label used in navigation and compact UI contexts */
export const INTELLIGENCE_NAV_LABEL = "🌍 Intelligence Center" as const;

/** Tagline displayed on the module hero */
export const INTELLIGENCE_TAGLINE = "The AI Brain of GreenGuard" as const;

/** One-line description used in metadata, cards, and tooltips */
export const INTELLIGENCE_DESCRIPTION =
  "AI-Powered Environmental Intelligence & Decision Support" as const;

/** Browser <title> for the Intelligence Center page */
export const INTELLIGENCE_PAGE_TITLE = `${INTELLIGENCE_MODULE_NAME} | ${APP_NAME}` as const;

// ─── Routes ────────────────────────────────────────────────────────────────────

/** Primary route — canonical URL going forward */
export const INTELLIGENCE_ROUTE = "/intelligence" as const;

/**
 * Legacy route — kept for backward compatibility.
 * `/copilot` redirects to `/intelligence`.
 */
export const COPILOT_LEGACY_ROUTE = "/copilot" as const;

// ─── Chat / Interaction Labels ─────────────────────────────────────────────────

/** Label for the chat input / send action */
export const INTELLIGENCE_ASK_LABEL = "Ask GreenGuard Intelligence" as const;

/** Label for the conversation panel header */
export const INTELLIGENCE_CHAT_LABEL = "Intelligence Assistant" as const;

/** Label for the conversation history section */
export const INTELLIGENCE_HISTORY_LABEL = "Conversation History" as const;
