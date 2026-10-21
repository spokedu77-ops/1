/**
 * Guard for automated screenshot/layout QA. Never run bulk visual QA against
 * production or Vercel Preview. Use a local Next.js production build instead.
 */
export function assertLocalQaTarget(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('[QA NETWORK BLOCK] QA target must be an absolute loopback URL, e.g. http://127.0.0.1:3117');
  }
  if (url.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.username || url.password) {
    throw new Error(`[QA NETWORK BLOCK] Remote QA target is forbidden: ${url.origin}. Run npm run build and npm run start locally, then run the visual QA script against http://127.0.0.1:3000.`);
  }
  return url;
}

export function isForbiddenQaRequest(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return true;
  }
  const host = url.hostname.toLowerCase();
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(host);
  if (loopback) return false;
  // The project uses these deployment hosts. Never generate optimizations on them.
  if (host === 'spokedu.kr' || host.endsWith('.spokedu.kr') || host === 'vercel.app' || host.endsWith('.vercel.app')) return true;
  // Other Vercel/custom optimizer endpoints may be referenced through absolute URLs.
  if (url.pathname === '/_next/image' || url.pathname.startsWith('/_next/image/')) return true;
  return false;
}

/** Call before the first page.goto(). Returns blocked-request diagnostics. */
export async function installLocalQaRouteGuard(context) {
  const blocked = [];
  await context.route('**/*', async (route) => {
    const request = route.request();
    const url = request.url();
    if (isForbiddenQaRequest(url) || (request.isNavigationRequest() && (() => {
      try {
        const u = new URL(url);
        // Any cross-origin document (including redirects/iframes) is out of scope.
        return !['localhost', '127.0.0.1', '[::1]'].includes(u.hostname);
      } catch {
        return true;
      }
    })())) {
      blocked.push({ url: url.split('?')[0], resourceType: request.resourceType() });
      await route.abort('blockedbyclient');
      return;
    }
    await route.continue();
  });
  return blocked;
}
