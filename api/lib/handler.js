// Small helpers shared by every endpoint.
//   - readJson(req)        : parse JSON body safely
//   - method(req, res, ...) : route by HTTP method, send 405 otherwise
//   - send400/401/403/404/500 helpers

export async function readJson(req) {
  // Vercel populates req.body automatically when content-type is JSON,
  // but we also handle the raw-stream case (some runtimes / fetch clients).
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body.length) {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

export function method(req, res, handlers) {
  const fn = handlers[req.method];
  if (!fn) {
    res.setHeader('Allow', Object.keys(handlers).join(', '));
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  return fn();
}

export function send400(res, error = 'bad_request', extra) {
  return res.status(400).json({ ok: false, error, ...(extra || {}) });
}
export function send500(res, err) {
  // eslint-disable-next-line no-console
  console.error('[api error]', err);
  return res.status(500).json({ ok: false, error: 'server_error' });
}

// Email + password validation that mirrors the existing client checks
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function isValidEmail(s) { return EMAIL_RE.test(String(s || '').trim()); }
export function clean(s, max = 200) { return String(s ?? '').trim().slice(0, max); }
