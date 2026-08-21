/**
 * GreenGuard AI — Settings & Preferences Resilience Test Suite
 *
 * Validates:
 * 1. Complete preference object initialization and validation.
 * 2. Missing `notifications` section normalizes safely without CastError.
 * 3. Missing `languageRegion` section normalizes safely without CastError.
 * 4. Missing `dashboard` section normalizes safely without CastError.
 * 5. Missing `maps` section normalizes safely without CastError.
 * 6. Missing `accessibility` section normalizes safely without CastError.
 * 7. Missing `privacy` section normalizes safely without CastError.
 * 8. Multiple missing sections / sparse preferences normalizes safely.
 * 9. Existing Light theme remains Light after retrieval and normalization.
 * 10. Existing Dark theme remains Dark after retrieval and normalization.
 * 11. Existing System theme remains System after retrieval and normalization.
 * 12. Updating Appearance does not overwrite unrelated preferences (e.g., custom notifications).
 * 13. Updating other preferences does not overwrite Appearance theme.
 * 14. Direct document validation (`user.validate()`) on sparse preferences passes without errors.
 * 15. No undefined object casting errors occur on any preference schema path.
 */

import { User, normalizeUserPreferences, IUser } from "../models/User";
import { defaultNotificationPreferences } from "../constants/notifications";
import { defaultLanguageRegionPreferences } from "../constants/languageRegion";
import { defaultDashboardPreferences } from "../constants/dashboard";
import { defaultMapPreferences } from "../constants/maps";
import { defaultAccessibilityPreferences } from "../constants/accessibility";
import { defaultPrivacyPreferences } from "../constants/privacy";

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passCount++;
  } else {
    console.error(`❌ [FAIL] ${testName}${detail ? ` — ${detail}` : ""}`);
    failCount++;
  }
}

async function runTests() {
  console.log("\n=== Starting Settings & Preferences Resilience Test Suite ===\n");

  // ─── Test 1: Complete Preference Object ─────────────────────────────────────
  console.log("--- Test 1: Complete Preference Object Validation ---");
  const fullPrefs = {
    appearance: { theme: "light" as const },
    notifications: defaultNotificationPreferences(),
    languageRegion: defaultLanguageRegionPreferences(),
    dashboard: defaultDashboardPreferences(),
    maps: defaultMapPreferences(),
    accessibility: defaultAccessibilityPreferences(),
    privacy: defaultPrivacyPreferences(),
  };

  const norm1 = normalizeUserPreferences(fullPrefs);
  assert(norm1.appearance.theme === "light", "Complete preferences preserved appearance.theme = light");
  assert(norm1.notifications.environment.inApp === true, "Complete preferences preserved notifications");
  assert(norm1.languageRegion.language === "en", "Complete preferences preserved languageRegion");

  // ─── Test 2: Missing Notifications ──────────────────────────────────────────
  console.log("\n--- Test 2: Missing Notifications Normalization ---");
  const missingNotifications = {
    appearance: { theme: "light" as const },
  };
  const norm2 = normalizeUserPreferences(missingNotifications);
  assert(norm2.notifications !== undefined, "Missing notifications filled with defaults");
  assert(norm2.notifications.environment.inApp === true, "Notifications defaults have valid channels");
  assert(norm2.appearance.theme === "light", "Appearance preserved when notifications was missing");

  // ─── Test 3: Missing LanguageRegion ─────────────────────────────────────────
  console.log("\n--- Test 3: Missing LanguageRegion Normalization ---");
  const missingLang = {
    appearance: { theme: "dark" as const },
  };
  const norm3 = normalizeUserPreferences(missingLang);
  assert(norm3.languageRegion !== undefined, "Missing languageRegion filled with defaults");
  assert(norm3.languageRegion.language === "en", "Language defaults to 'en'");
  assert(norm3.appearance.theme === "dark", "Appearance preserved when languageRegion was missing");

  // ─── Test 4: Missing Dashboard ──────────────────────────────────────────────
  console.log("\n--- Test 4: Missing Dashboard Normalization ---");
  const missingDashboard = {
    appearance: { theme: "system" as const },
  };
  const norm4 = normalizeUserPreferences(missingDashboard);
  assert(norm4.dashboard !== undefined, "Missing dashboard filled with defaults");
  assert(norm4.dashboard.defaultLandingPage === "dashboard", "Dashboard default landing page is 'dashboard'");

  // ─── Test 5: Missing Maps ───────────────────────────────────────────────────
  console.log("\n--- Test 5: Missing Maps Normalization ---");
  const missingMaps = {
    appearance: { theme: "light" as const },
  };
  const norm5 = normalizeUserPreferences(missingMaps);
  assert(norm5.maps !== undefined, "Missing maps filled with defaults");
  assert(norm5.maps.mapType === "street", "Map default type is 'street'");

  // ─── Test 6: Missing Accessibility ──────────────────────────────────────────
  console.log("\n--- Test 6: Missing Accessibility Normalization ---");
  const missingAccessibility = {
    appearance: { theme: "light" as const },
  };
  const norm6 = normalizeUserPreferences(missingAccessibility);
  assert(norm6.accessibility !== undefined, "Missing accessibility filled with defaults");
  assert(norm6.accessibility.highContrast === false, "Accessibility highContrast defaults to false");

  // ─── Test 7: Missing Privacy ────────────────────────────────────────────────
  console.log("\n--- Test 7: Missing Privacy Normalization ---");
  const missingPrivacy = {
    appearance: { theme: "light" as const },
  };
  const norm7 = normalizeUserPreferences(missingPrivacy);
  assert(norm7.privacy !== undefined, "Missing privacy filled with defaults");
  assert(norm7.privacy.anonymousAnalytics === true, "Privacy anonymousAnalytics defaults to true");

  // ─── Test 8: Completely Sparse Preferences Object ───────────────────────────
  console.log("\n--- Test 8: Completely Sparse / Undefined Preferences Normalization ---");
  const normNull = normalizeUserPreferences(null);
  assert(normNull.appearance.theme === "system", "Null preferences defaults theme to system");
  assert(normNull.notifications.complaints.email === true, "Null preferences has valid notifications");
  assert(normNull.languageRegion.timeFormat === "24h", "Null preferences has valid languageRegion");

  const normEmpty = normalizeUserPreferences({});
  assert(normEmpty.appearance.theme === "system", "Empty preferences defaults theme to system");
  assert(normEmpty.dashboard.visibleWidgets.length > 0, "Empty preferences has valid dashboard widgets");

  // ─── Test 9: Existing Light Theme Remains Light ─────────────────────────────
  console.log("\n--- Test 9: Existing Light Theme Remains Light ---");
  const lightUserPrefs = {
    appearance: { theme: "light" as const },
  };
  const normLight = normalizeUserPreferences(lightUserPrefs);
  assert(normLight.appearance.theme === "light", "Light theme is preserved exactly as 'light'");

  // ─── Test 10: Existing Dark Theme Remains Dark ──────────────────────────────
  console.log("\n--- Test 10: Existing Dark Theme Remains Dark ---");
  const darkUserPrefs = {
    appearance: { theme: "dark" as const },
  };
  const normDark = normalizeUserPreferences(darkUserPrefs);
  assert(normDark.appearance.theme === "dark", "Dark theme is preserved exactly as 'dark'");

  // ─── Test 11: Existing System Theme Remains System ──────────────────────────
  console.log("\n--- Test 11: Existing System Theme Remains System ---");
  const systemUserPrefs = {
    appearance: { theme: "system" as const },
  };
  const normSystem = normalizeUserPreferences(systemUserPrefs);
  assert(normSystem.appearance.theme === "system", "System theme is preserved exactly as 'system'");

  // ─── Test 12: Updating Appearance Does Not Overwrite Unrelated Preferences ─
  console.log("\n--- Test 12: Unrelated Preferences Preserved on Appearance Update ---");
  const existingUserCustomPrefs = {
    appearance: { theme: "dark" as const },
    notifications: {
      ...defaultNotificationPreferences(),
      environment: { inApp: false, email: false, push: false },
    },
    languageRegion: {
      ...defaultLanguageRegionPreferences(),
      language: "hi" as const,
    },
    dashboard: defaultDashboardPreferences(),
    maps: defaultMapPreferences(),
    accessibility: {
      ...defaultAccessibilityPreferences(),
      highContrast: true,
    },
    privacy: defaultPrivacyPreferences(),
  };

  // Simulate updating appearance to "light"
  const updatedAppearance = {
    ...existingUserCustomPrefs,
    appearance: { theme: "light" as const },
  };
  const normUpdated = normalizeUserPreferences(updatedAppearance);

  assert(normUpdated.appearance.theme === "light", "Appearance updated to light");
  assert(normUpdated.notifications.environment.inApp === false, "Custom notification preference preserved");
  assert(normUpdated.languageRegion.language === "hi", "Custom language preference preserved");
  assert(normUpdated.accessibility.highContrast === true, "Custom accessibility preference preserved");

  // ─── Test 13: Updating Other Preferences Does Not Overwrite Appearance ─────
  console.log("\n--- Test 13: Appearance Preserved on Other Preference Updates ---");
  const lightUser = {
    appearance: { theme: "light" as const },
  };
  // Simulate patching notifications
  const withUpdatedNotifs = {
    ...normalizeUserPreferences(lightUser),
    notifications: {
      ...defaultNotificationPreferences(),
      security: { inApp: true, email: true, push: false },
    },
  };
  const normNotifUpdate = normalizeUserPreferences(withUpdatedNotifs);
  assert(normNotifUpdate.appearance.theme === "light", "Appearance remains light after updating notifications");
  assert(normNotifUpdate.notifications.security.push === false, "Notification update reflected accurately");

  // ─── Test 14: User Document Validation on Sparse Preferences ────────────────
  console.log("\n--- Test 14: User Schema Pre-Validate Hook with Sparse Preferences ---");
  const testUserDoc = new User({
    name: "Test User",
    email: "test.preferences@example.com",
    password: "Password123!",
    role: "citizen",
    preferences: {
      appearance: { theme: "light" },
      // notifications, languageRegion, etc. intentionally omitted to test sparse doc
    },
  });

  try {
    const valError = testUserDoc.validateSync();
    assert(valError === undefined, "User document with sparse preferences validates with 0 errors");
    assert(testUserDoc.preferences?.appearance?.theme === "light", "User document preferences theme is light");
    assert(testUserDoc.preferences?.notifications !== undefined, "User document preferences notifications auto-defaulted");
    assert(testUserDoc.preferences?.languageRegion !== undefined, "User document preferences languageRegion auto-defaulted");
    assert(testUserDoc.preferences?.dashboard !== undefined, "User document preferences dashboard auto-defaulted");
    assert(testUserDoc.preferences?.maps !== undefined, "User document preferences maps auto-defaulted");
    assert(testUserDoc.preferences?.accessibility !== undefined, "User document preferences accessibility auto-defaulted");
    assert(testUserDoc.preferences?.privacy !== undefined, "User document preferences privacy auto-defaulted");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    assert(false, "User document validation threw unexpected error", msg);
  }

  // ─── Test 15: User Document Validation on Empty Preferences ────────────────
  console.log("\n--- Test 15: User Schema Pre-Validate Hook with Empty Preferences ---");
  const emptyUserDoc = new User({
    name: "Empty Prefs User",
    email: "empty.preferences@example.com",
    password: "Password123!",
    role: "citizen",
  });

  try {
    const valError = emptyUserDoc.validateSync();
    assert(valError === undefined, "Empty preferences user validates cleanly");
    assert(emptyUserDoc.preferences?.appearance?.theme === "system", "Empty preferences defaults to system theme");
    assert(emptyUserDoc.preferences?.notifications?.environment?.inApp === true, "Notifications valid on empty preferences");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    assert(false, "Empty preferences user validation threw error", msg);
  }

  // ─── Summary ───────────────────────────────────────────────────────────────
  console.log(`\n=== Preferences Resilience Test Summary: ${passCount} passed, ${failCount} failed ===\n`);
  if (failCount > 0) {
    process.exit(1);
  }
}

void runTests();
