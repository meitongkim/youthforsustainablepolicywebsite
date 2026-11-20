// POST /api/portal-login — Global Chapters portal sign-in.
// Accepts ONLY: POST, same-origin, application/x-www-form-urlencoded, a small body,
// the fields "code" (required) and "portal" (optional, must equal "chapters"),
// and a code made of 8–64 letters, numbers or hyphens. Anything else is rejected.
const crypto = require('crypto');

const CODE_RE = /^[A-Za-z0-9-]{8,64}$/;
const ALLOWED_FIELDS = new Set(['code', 'portal']);
const MAX_BODY = 512;
const SESSION_SECONDS = 60 * 60 * 24 * 14; // 14 days
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const attempts = new Map(); // best-effort, per server instance

function clientIp(req) {
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return (fwd || String(req.headers['x-real-ip'] || '') || 'unknown').slice(0, 64);
}
function limited(ip) {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || now - rec.start > WINDOW_MS) return false;
  return rec.count >= MAX_ATTEMPTS;
}
function recordFailure(ip) {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || now - rec.start > WINDOW_MS) attempts.set(ip, { start: now, count: 1 });
  else rec.count += 1;
  if (attempts.size > 5000) attempts.clear();
}
function sameOrigin(req) {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').toLowerCase();
  const origin = req.headers.origin;
  const referer = req.headers.referer;
  const src = origin || referer;
  if (!src || !host) return false;
  try { return new URL(src).host.toLowerCase() === host; } catch (e) { return false; }
}
function readRaw(req) {
  return new Promise((resolve) => {
    if (typeof req.body === 'string') return resolve(req.body.length > MAX_BODY ? null : req.body);
    if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
      try { const s = new URLSearchParams(req.body).toString(); return resolve(s.length > MAX_BODY ? null : s); } catch (e) { return resolve(null); }
    }
    if (Buffer.isBuffer(req.body)) return resolve(req.body.length > MAX_BODY ? null : req.body.toString('utf8'));
    let data = ''; let tooBig = false;
    req.on('data', (c) => { if (tooBig) return; data += c; if (data.length > MAX_BODY) { tooBig = true; resolve(null); req.destroy(); } });
    req.on('end', () => { if (!tooBig) resolve(data); });
    req.on('error', () => resolve(null));
  });
}
function codeMatches(code, expected) {
  const a = crypto.createHash('sha256').update(code).digest();
  const b = crypto.createHash('sha256').update(String(expected)).digest();
  return crypto.timingSafeEqual(a, b);
}
function send(res, status, location, cookie) {
  res.statusCode = status;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (location) res.setHeader('Location', location);
  if (cookie) res.setHeader('Set-Cookie', cookie);
  res.end();
}
const fail = async (res, ip, reason) => {
  if (ip) recordFailure(ip);
  await new Promise((r) => setTimeout(r, 900 + Math.floor(Math.random() * 400)));
  return send(res, 303, '/portal-login?error=' + reason);
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(res, 405); }
  const ip = clientIp(req);
  if (limited(ip)) return fail(res, null, 'locked');
  if (!sameOrigin(req)) return send(res, 403);
  const ctype = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  if (ctype !== 'application/x-www-form-urlencoded') return send(res, 415);
  const len = Number(req.headers['content-length'] || 0);
  if (len > MAX_BODY) return send(res, 413);

  const raw = await readRaw(req);
  if (raw === null) return send(res, 413);
  let params;
  try { params = new URLSearchParams(raw); } catch (e) { return fail(res, ip, 'invalid'); }
  const keys = [...params.keys()];
  if (keys.some((k) => !ALLOWED_FIELDS.has(k)) || params.getAll('code').length !== 1 || params.getAll('portal').length > 1) return fail(res, ip, 'invalid');
  if (params.has('portal') && params.get('portal') !== 'chapters') return fail(res, ip, 'invalid');

  const code = params.get('code').trim();
  if (!CODE_RE.test(code)) return fail(res, ip, 'invalid');

  const expected = process.env.CHAPTERS_PORTAL_CODE;
  const secret = process.env.PORTAL_SECRET;
  if (!expected || !CODE_RE.test(expected) || !secret || secret.length < 32) return fail(res, null, 'invalid');
  if (!codeMatches(code, expected)) return fail(res, ip, 'invalid');

  attempts.delete(ip);
  const exp = String(Math.floor(Date.now() / 1000) + SESSION_SECONDS);
  const codeHash = crypto.createHash('sha256').update(expected).digest('hex');
  const sig = crypto.createHmac('sha256', secret).update('ysp-chapters|' + exp + '|' + codeHash).digest('hex');
  const cookie = `__Host-ysp_chapters=v1.${exp}.${sig}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Strict`;
  return send(res, 303, '/chapter-portal', cookie);
};
