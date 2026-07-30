/**
 * Phase 4 — Backward-compatibility shim.
 *
 * The old AuthorityDirectoryList (Table-based) is replaced by the new
 * AuthorityEnterpriseList. This file re-exports the enterprise list under
 * the old name so any existing code that imported AuthorityDirectoryList
 * continues to compile without changes.
 *
 * NOTE: The old ApprovalFilter type is also re-exported for consumers
 * that reference it directly.
 */
export { AuthorityEnterpriseList as AuthorityDirectoryList } from "./authority-enterprise-list";
export type { StatusFilter as ApprovalFilter } from "./authority-enterprise-list";
