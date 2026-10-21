/** Local-only guard for automated screenshot and image-related visual QA. */
export function assertLocalQaTarget(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('[QA NETWORK BLOCK] QA target must be an absolute loopback URL.');
  }

  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'http:' || !loopback || url.username || url.password) {
    throw new Error(`[QA NETWORK BLOCK] Remote QA target is forbidden: ${url.origin}. Use a local server.`);
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
  if (['localhost', '127.0.0.1', '[::1]'].includes(host)) return false;
  if (host === 'spokedu.kr' || host.endsWith('.spokedu.kr')) return true;
  if (host === 'vercel.app' || host.endsWith('.vercel.app')) return true;
  return url.pathname === '/_next/image' || url.pathname.startsWith('/_next/image/');
}

function isLoopbackRequest(value) {
  try {
    return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(value).hostname);
  } catch {
    return false;
  }
}

/** Install before the first navigation. Remote image optimizers and documents are aborted. */
export async function installLocalQaRouteGuard(context) {
  const blocked = [];
  await context.route('**/*', async (route) => {
    const request = route.request();
    const requestUrl = request.url();
    let remoteDocument = false;
    if (request.isNavigationRequest()) {
      try {
        remoteDocument = !['localhost', '127.0.0.1', '[::1]'].includes(new URL(requestUrl).hostname);
      } catch {
        remoteDocument = true;
      }
    }
    const remoteImage = request.resourceType() === 'image' && !isLoopbackRequest(requestUrl);
    if (isForbiddenQaRequest(requestUrl) || remoteDocument || remoteImage) {
      blocked.push({ url: requestUrl.split('?')[0], resourceType: request.resourceType() });
      await route.abort('blockedbyclient');
      return;
    }
    await route.continue();
  });
  return blocked;
}
