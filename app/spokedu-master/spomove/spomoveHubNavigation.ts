export type SpomoveHubViewMode = 'all' | 'favorites';

export function parseSpomoveHubView(value: string | null | undefined): SpomoveHubViewMode {
  return value === 'favorites' ? 'favorites' : 'all';
}

export function getSpomoveHubHref(view: SpomoveHubViewMode = 'all'): string {
  return view === 'favorites' ? '/spokedu-master/spomove?view=favorites' : '/spokedu-master/spomove';
}

export function getSpomoveHubReturnHref(hubView: string | null | undefined): string {
  return getSpomoveHubHref(parseSpomoveHubView(hubView));
}
