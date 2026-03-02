// Worker 2: tiktok-proxy (deploy separately from your general proxy)
// Sends browser-like headers so TikTok returns the video page instead of a login/WAF page.
// See docs/tiktok-lib.md for CLOUDFLARE_TIKTOK_URL and usage.

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

export default {
  async fetch(request, env, ctx) {
    try {
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': '*',
          },
        });
      }

      const incoming = new URL(request.url);
      const targetUrl = incoming.searchParams.get('url');

      if (!targetUrl) {
        return jsonResponse({ error: 'Missing ?url= parameter' }, 400);
      }
      // Health check: ?url=health returns 200 so you can confirm the worker runs.
      if (targetUrl === 'health') {
        return jsonResponse({ ok: true, worker: 'tiktok-proxy' });
      }

      const browserHeaders = {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Referer: 'https://www.tiktok.com/',
        'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Accept':
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(targetUrl, {
        headers: browserHeaders,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const body = await response.text();
      const contentType = response.headers.get('Content-Type') || 'text/html; charset=utf-8';

      return new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (err) {
      const message = err && err.message ? err.message : String(err);
      const payload = {
        error: 'Proxy fetch failed',
        detail: message,
        hint: message.includes('abort') ? 'Request timed out (15s). Try again.' : undefined,
      };
      try {
        const url = new URL(request.url);
        if (url.searchParams.get('debug') === '1') {
          return jsonResponse({ ...payload, status: 'proxy_failed' }, 200);
        }
      } catch (_) {}
      return jsonResponse(payload, 502);
    }
  },
};
