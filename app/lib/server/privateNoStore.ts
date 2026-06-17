import { NextResponse } from 'next/server';

export const PRIVATE_NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  Pragma: 'no-cache',
  Vary: 'Cookie, Authorization',
} as const;

export function privateNoStoreJson(
  body: unknown,
  init: ResponseInit = {},
): NextResponse {
  const headers = new Headers(init.headers);
  for (const [key, value] of Object.entries(PRIVATE_NO_STORE_HEADERS)) {
    headers.set(key, value);
  }

  return NextResponse.json(body, {
    ...init,
    headers,
  });
}

export function withPrivateNoStore<T extends Response>(response: T): T {
  for (const [key, value] of Object.entries(PRIVATE_NO_STORE_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}
