/** One center-list record represents one project; IDs, not display names, identify records. */
export function centerDisplayName(center: {
  name: string;
  project_name?: string | null;
  settlement_defaults?: { projectName?: string };
}): string {
  const project = (center.project_name ?? center.settlement_defaults?.projectName ?? '').trim();
  return project ? `${center.name} (${project})` : center.name;
}
