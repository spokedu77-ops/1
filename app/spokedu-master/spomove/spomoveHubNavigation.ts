export type SpomoveHubViewMode = 'all' | 'favorites';

export type SpomoveHubUrlState = {
  view: SpomoveHubViewMode;
  family: string;
  group: string;
  difficulty: string;
  movement: string;
  q: string;
};

export const DEFAULT_SPOMOVE_HUB_URL_STATE: SpomoveHubUrlState = {
  view: 'all',
  family: 'all',
  group: 'all',
  difficulty: 'all',
  movement: 'all',
  q: '',
};

export function parseSpomoveHubView(value: string | null | undefined): SpomoveHubViewMode {
  return value === 'favorites' ? 'favorites' : 'all';
}

export function getSpomoveHubHref(view: SpomoveHubViewMode = 'all'): string {
  return view === 'favorites' ? '/spokedu-master/spomove?view=favorites' : '/spokedu-master/spomove';
}

export function parseSpomoveHubUrlState(
  params: Pick<URLSearchParams, 'get'>,
  allowed: { families?: readonly string[]; groups: readonly string[]; difficulties: readonly string[]; movements: readonly string[] },
): SpomoveHubUrlState {
  const valueOrAll = (key: string, values: readonly string[]) => {
    const value = params.get(key);
    return value && values.includes(value) ? value : 'all';
  };
  return {
    view: parseSpomoveHubView(params.get('view')),
    family: valueOrAll('family', allowed.families ?? ['all']),
    group: valueOrAll('group', allowed.groups),
    difficulty: valueOrAll('difficulty', allowed.difficulties),
    movement: valueOrAll('movement', allowed.movements),
    q: (params.get('q') ?? '').trim().slice(0, 80),
  };
}

export function serializeSpomoveHubUrlState(state: SpomoveHubUrlState): string {
  const params = new URLSearchParams();
  if (state.view === 'favorites') params.set('view', 'favorites');
  if (state.family !== 'all') params.set('family', state.family);
  if (state.group !== 'all') params.set('group', state.group);
  if (state.difficulty !== 'all') params.set('difficulty', state.difficulty);
  if (state.movement !== 'all') params.set('movement', state.movement);
  if (state.q.trim()) params.set('q', state.q.trim());
  const query = params.toString();
  return query ? `/spokedu-master/spomove?${query}` : '/spokedu-master/spomove';
}

export function getSpomoveHubReturnHref(hubView: string | null | undefined): string {
  return getSpomoveHubHref(parseSpomoveHubView(hubView));
}

export function parseSpomoveHubReturnHref(
  value: string | null | undefined,
  hubView?: string | null,
): string {
  if (value) {
    try {
      const decoded = decodeURIComponent(value);
      if (decoded === '/spokedu-master/spomove' || decoded.startsWith('/spokedu-master/spomove?')) return decoded;
    } catch {
      // Invalid external input falls back to the legacy view contract.
    }
  }
  return getSpomoveHubReturnHref(hubView);
}
