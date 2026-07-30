/**
 * Phase 4 — Backward-compatibility shim.
 *
 * The old AuthorityDetailPanel (Sheet-based) is replaced by the new
 * AuthorityProfileDrawer. This file re-exports the drawer under the old
 * name so any existing code that imported AuthorityDetailPanel continues
 * to compile without changes.
 */
export { AuthorityProfileDrawer as AuthorityDetailPanel } from "./authority-profile-drawer";
