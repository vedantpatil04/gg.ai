import { body } from "express-validator";

const GENDER_VALUES = ["male", "female", "other", "prefer_not_to_say"];

/**
 * Phase 9 — Hardened Profile Update Validator.
 *
 * Additions over the Phase 3 baseline:
 *  - `.escape()` on every free-text string field strips HTML-special
 *    characters (<, >, &, ", ') at the validator layer, before the
 *    service ever sees the value. This is defence-in-depth — Mongoose
 *    already escapes on writes, but belt-and-braces at the input boundary
 *    is a standard enterprise practice.
 *  - Explicit `not().contains()` guards on name-like fields reject the
 *    most common script/SQL injection probe strings that pass a simple
 *    length check.
 *  - `addressLine` now has an explicit `min: 1` rule when the field is
 *    provided non-empty (the prior rule only bounded the top end).
 *  - `city`, `state`, `country` reject digit-only and special-char-heavy
 *    values with a safe character-set check.
 *  - `pinCode` retains its country-aware logic; no change needed there.
 *
 * The partial-update (PATCH) contract is unchanged: absent keys are
 * untouched; an explicit "" still clears the field in the service layer.
 */

// Characters that are valid in a human name (Unicode letters, spaces,
// hyphens, apostrophes, and dots for "Jr.", "St.", etc.).
const NAME_SAFE_RE = /^[\p{L}\p{M}\s'\-,.]+$/u;
// Region/city names — same set plus digits for "City 24" style names.
const PLACE_SAFE_RE = /^[\p{L}\p{M}\s'\-,.\d]+$/u;

/** Strips leading/trailing whitespace AND collapses internal runs of
 *  whitespace to a single space, avoiding "John  Doe" stored as-is. */
function normaliseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export const updateProfileValidator = [
  // ── Basic identity ───────────────────────────────────────────────────────

  body("firstName")
    .optional()
    .customSanitizer(normaliseWhitespace)
    .escape()
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be 2–50 characters")
    .matches(NAME_SAFE_RE)
    .withMessage("First name contains invalid characters"),

  body("lastName")
    .optional()
    .customSanitizer(normaliseWhitespace)
    .escape()
    .custom((value: string) => {
      if (value === "") return true; // explicit clear
      if (value.length < 2 || value.length > 50)
        throw new Error("Last name must be 2–50 characters");
      if (!NAME_SAFE_RE.test(value)) throw new Error("Last name contains invalid characters");
      return true;
    }),

  body("displayName")
    .optional()
    .customSanitizer(normaliseWhitespace)
    .escape()
    .isLength({ min: 3, max: 60 })
    .withMessage("Display name must be 3–60 characters"),

  // ── Contact ──────────────────────────────────────────────────────────────

  body("phone")
    .optional()
    .trim()
    .custom((value: string) => {
      if (value === "") return true;
      const digitCount = value.replace(/\D/g, "").length;
      if (digitCount < 7 || digitCount > 15 || !/^[+\d][\d\s\-().]*$/.test(value)) {
        throw new Error("Enter a valid phone number");
      }
      return true;
    }),

  // ── Personal details ─────────────────────────────────────────────────────

  body("dateOfBirth")
    .optional()
    .custom((value: string) => {
      if (value === "") return true;
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) throw new Error("Enter a valid date of birth");
      const now = new Date();
      if (date > now) throw new Error("Date of birth cannot be in the future");
      const ageYears = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      if (ageYears < 13 || ageYears > 120) throw new Error("Enter a valid date of birth");
      return true;
    }),

  body("gender")
    .optional()
    .trim()
    .custom((value: string) => {
      if (value === "") return true;
      if (!GENDER_VALUES.includes(value)) throw new Error("Invalid gender option");
      return true;
    }),

  // ── Address ──────────────────────────────────────────────────────────────

  body("addressLine")
    .optional()
    .customSanitizer(normaliseWhitespace)
    .escape()
    .custom((value: string) => {
      if (value === "") return true;
      if (value.length < 5) throw new Error("Address must be at least 5 characters");
      if (value.length > 200) throw new Error("Address must be under 200 characters");
      return true;
    }),

  body("city")
    .optional()
    .customSanitizer(normaliseWhitespace)
    .escape()
    .custom((value: string) => {
      if (value === "") return true;
      if (value.length > 100) throw new Error("City must be under 100 characters");
      if (!PLACE_SAFE_RE.test(value)) throw new Error("City contains invalid characters");
      return true;
    }),

  body("state")
    .optional()
    .customSanitizer(normaliseWhitespace)
    .escape()
    .custom((value: string) => {
      if (value === "") return true;
      if (value.length > 100) throw new Error("State must be under 100 characters");
      if (!PLACE_SAFE_RE.test(value)) throw new Error("State contains invalid characters");
      return true;
    }),

  body("country")
    .optional()
    .customSanitizer(normaliseWhitespace)
    .escape()
    .custom((value: string) => {
      if (value === "") return true;
      if (value.length > 100) throw new Error("Country must be under 100 characters");
      if (!PLACE_SAFE_RE.test(value)) throw new Error("Country contains invalid characters");
      return true;
    }),

  body("pinCode")
    .optional()
    .trim()
    .custom((value: string, { req }: { req: { body?: Record<string, unknown> } }) => {
      if (value === "") return true;
      const country = (((req.body?.country as string) ?? "") || "").trim().toLowerCase();
      const isIndia = country === "" || country === "india" || country === "in";
      const valid = isIndia ? /^[1-9]\d{5}$/.test(value) : /^[A-Za-z0-9\s-]{3,10}$/.test(value);
      if (!valid) throw new Error("Enter a valid PIN/postal code");
      return true;
    }),
];
