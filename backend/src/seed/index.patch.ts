/**
 * PATCH INSTRUCTIONS — backend/src/seed/index.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Apply the two changes below to your existing seed/index.ts.
 * Everything else in the file stays exactly the same.
 *
 * CHANGE 1 — Add import at the top of the file (after existing imports):
 */

// ADD this import line after the other imports:
import { seedMapData } from "./mapLocations.seed";

/**
 * CHANGE 2 — Call seedMapData() inside the main() async function.
 *
 * Your current main() function looks roughly like:
 *
 *   async function main() {
 *     await mongoose.connect(MONGODB_URI);
 *     // ... wipes collections ...
 *     await EnvironmentalData.insertMany(allReadings);
 *     // ... other seeding ...
 *     await mongoose.disconnect();
 *   }
 *
 * ADD the seedMapData() call just before the mongoose.disconnect() line:
 */

// ── Example of the relevant section AFTER patching ────────────────────────────
async function main_EXAMPLE_DO_NOT_COPY_PASTE() {
  // ... existing seed logic stays here unchanged ...

  // ── NEW: seed city map locations + configs ──────────────────────────────────
  await seedMapData();
  // ── end of new code ──────────────────────────────────────────────────────────

  // await mongoose.disconnect();  ← this line already exists; keep it after seedMapData
}

/**
 * That's the entire change required in seed/index.ts.
 *
 * Run the seed:
 *   cd backend
 *   npx ts-node -r tsconfig-paths/register src/seed/index.ts
 *
 * Or to seed only the map data (without re-seeding environmental readings):
 *   npx ts-node -r tsconfig-paths/register src/seed/mapLocations.seed.ts
 */
