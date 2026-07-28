/** Matches the exact enum in backend/src/validators/complaint.validator.ts —
 *  keep in sync if that enum ever changes. */
const ISSUE_TYPE_LABELS: Record<string, string> = {
  air_pollution: "Air Pollution",
  water_contamination: "Water Contamination",
  open_burning: "Open Burning",
  noise: "Noise",
  waste_dumping: "Waste Dumping",
  chemical_spill: "Chemical Spill",
  other: "Other",
};

export function humanizeIssueType(issueType: string): string {
  return ISSUE_TYPE_LABELS[issueType] ?? issueType;
}
