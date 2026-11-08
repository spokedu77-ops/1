/** Compare the browser origin with the incoming Host, not Next's internal bind address. */
export function isFieldRecordSameOrigin(request: Request): boolean {
  if (request.headers.get('sec-fetch-site') === 'cross-site') return false;
  const value = request.headers.get('origin');
  if (!value) return true; // Authenticated non-browser clients do not always send Origin.
  try {
    const origin = new URL(value);
    if (origin.origin !== value || !['http:', 'https:'].includes(origin.protocol)) return false;
    const internal = new URL(request.url);
    const host = request.headers.get('host');
    const incoming = host ? new URL(`${internal.protocol}//${host}`) : internal;
    if (host && (incoming.host !== host.toLowerCase() || incoming.pathname !== '/' || incoming.username || incoming.password || incoming.search || incoming.hash)) return false;
    if (origin.origin === incoming.origin) return true;
    // next dev can normalize localhost / 127.0.0.1 to its bind host in Request.url.
    // This exception is loopback-only, same scheme/port, and never active in production.
    const loopback = new Set(['localhost', '127.0.0.1', '[::1]']);
    return process.env.NODE_ENV !== 'production'
      && loopback.has(origin.hostname) && loopback.has(incoming.hostname)
      && origin.protocol === incoming.protocol && origin.port === incoming.port;
  } catch { return false; }
}
