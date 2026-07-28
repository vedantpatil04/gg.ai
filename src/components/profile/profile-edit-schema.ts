import { z } from "zod";

/**
 * Frontend validation is for UX only — every rule here has an authoritative
 * twin in backend/src/validators/profile.validator.ts. Keeping both in sync
 * by hand (rather than sharing one module across the frontend/backend
 * boundary) matches how the rest of this codebase already separates
 * frontend and backend validation, and avoids taking on a shared-package
 * build step for one form.
 */

function isValidPhone(value: string): boolean {
  if (value === "") return true;
  const digitCount = value.replace(/\D/g, "").length;
  return digitCount >= 7 && digitCount <= 15 && /^[+\d][\d\s\-().]*$/.test(value);
}

function isValidDateOfBirth(value: string): boolean {
  if (value === "") return true;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  if (date > now) return false;
  const ageYears = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  return ageYears >= 13 && ageYears <= 120;
}

function isValidPinCode(value: string, country: string): boolean {
  if (value === "") return true;
  const normalizedCountry = country.trim().toLowerCase();
  const isIndia =
    normalizedCountry === "" || normalizedCountry === "india" || normalizedCountry === "in";
  return isIndia ? /^[1-9]\d{5}$/.test(value) : /^[A-Za-z0-9\s-]{3,10}$/.test(value);
}

export const profileEditSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(2, "First name must be 2–50 characters")
      .max(50, "First name must be 2–50 characters"),
    lastName: z
      .string()
      .trim()
      .max(50, "Last name must be 2–50 characters")
      .refine((v) => v === "" || v.length >= 2, "Last name must be 2–50 characters"),
    displayName: z
      .string()
      .trim()
      .min(3, "Display name must be 3–60 characters")
      .max(60, "Display name must be 3–60 characters"),
    phone: z.string().trim().refine(isValidPhone, "Enter a valid phone number"),
    dateOfBirth: z.string().refine(isValidDateOfBirth, "Enter a valid date of birth"),
    gender: z.string(),
    addressLine: z.string().trim().max(200, "Address must be under 200 characters"),
    city: z.string().trim().max(100, "City must be under 100 characters"),
    state: z.string().trim().max(100, "State must be under 100 characters"),
    country: z.string().trim().max(100, "Country must be under 100 characters"),
    pinCode: z.string().trim(),
  })
  .superRefine((data, ctx) => {
    if (!isValidPinCode(data.pinCode, data.country)) {
      ctx.addIssue({
        path: ["pinCode"],
        code: z.ZodIssueCode.custom,
        message: "Enter a valid PIN/postal code",
      });
    }
  });

export type ProfileEditFormValues = z.infer<typeof profileEditSchema>;
