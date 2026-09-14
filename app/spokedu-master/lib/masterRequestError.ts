import { getSafeMasterErrorMessage, isSafeValidationMessage, toMasterClientError, toNetworkMasterClientError, type MasterClientError } from './clientErrors';

export class MasterClientRequestError extends Error {
  readonly clientError: MasterClientError;

  constructor(clientError: MasterClientError) {
    super(clientError.message);
    this.name = 'MasterClientRequestError';
    this.clientError = clientError;
  }
}

export function getMasterRequestError(caught: unknown): MasterClientError | null {
  if (caught instanceof MasterClientRequestError) return caught.clientError;
  return null;
}

function isLikelyNetworkError(caught: unknown) {
  if (caught instanceof TypeError) return true;
  const message = caught instanceof Error ? caught.message : '';
  return /failed to fetch|networkerror|load failed/i.test(message);
}

export function getMasterRequestErrorMessage(caught: unknown, fallback?: string): string {
  const client = getMasterRequestError(caught);
  if (client) return client.message;
  if (isLikelyNetworkError(caught)) return toNetworkMasterClientError().message;
  if (caught instanceof Error && isSafeValidationMessage(caught.message)) return caught.message.trim();
  return fallback?.trim() || getSafeMasterErrorMessage('unexpected');
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new MasterClientRequestError(toMasterClientError(response.ok ? 500 : response.status));
  }
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
    throw new MasterClientRequestError(isLikelyNetworkError(caught) ? toNetworkMasterClientError() : toMasterClientError(500));
  }
}
