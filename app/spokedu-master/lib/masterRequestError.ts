import { toMasterClientError, toNetworkMasterClientError, type MasterClientError } from './clientErrors';

export class MasterClientRequestError extends Error {
  readonly clientError: MasterClientError;

  constructor(clientError: MasterClientError) {
    super(clientError.kind);
    this.name = 'MasterClientRequestError';
    this.clientError = clientError;
  }
}

export function getMasterRequestError(caught: unknown): MasterClientError | null {
  if (caught instanceof MasterClientRequestError) return caught.clientError;
  return null;
}

export function getMasterRequestErrorMessage(caught: unknown): string {
  return getMasterRequestError(caught)?.message ?? toNetworkMasterClientError().message;
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  return text ? (JSON.parse(text) as T) : ({} as T);
}

export async function masterFetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  try {
    const response = await fetch(url, {
      cache: init?.method ? undefined : 'no-store',
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
    const json = await readJson<T & { error?: string }>(response);
    if (!response.ok) {
      throw new MasterClientRequestError(toMasterClientError(response.status, json.error));
    }
    return json;
  } catch (caught) {
    if (caught instanceof MasterClientRequestError) throw caught;
    throw new MasterClientRequestError(toNetworkMasterClientError());
  }
}
