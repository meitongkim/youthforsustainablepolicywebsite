// YSP Global Chapters portal — Vercel Routing Middleware.
// Every request to the portal must carry a valid, unexpired, signed session cookie.
// Required Vercel environment variables (Project Settings → Environment Variables):
//   PORTAL_SECRET          long random string (40+ characters) used to sign sessions
//   CHAPTERS_PORTAL_CODE   the portal access code (8–64 letters, numbers or hyphens)
export const config = {
  matcher: ['/chapter-portal', '/chapter-portal.html', '/chapter-portal/:path*'],
};

const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

async function sessionSig(secret, code, exp) {
  const codeHash = hex(await crypto.subtle.digest('SHA-256', enc.encode(code)));
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode('ysp-chapters|' + exp + '|' + codeHash)));
}
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
function deny(url) {
  const res = Response.redirect(new URL('/portal-login', url.origin).toString(), 307);
  return res;
}

export default async function middleware(request) {
  const url = new URL(request.url);
  const secret = process.env.PORTAL_SECRET;
  const code = process.env.CHAPTERS_PORTAL_CODE;
  if (!secret || secret.length < 32 || !code) return deny(url); // misconfigured → stay locked

  const cookies = request.headers.get('cookie') || '';
  const m = cookies.match(/(?:^|;\s*)__Host-ysp_chapters=v1\.(\d{10})\.([a-f0-9]{64})(?:;|$)/);
  if (!m) return deny(url);
  const exp = Number(m[1]);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return deny(url);
  const expected = await sessionSig(secret, code, m[1]);
  if (!safeEqual(m[2], expected)) return deny(url);

  // Valid session: continue to the page, never cached by shared caches.
  return new Response(null, {
    headers: {
      'x-middleware-next': '1',
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
