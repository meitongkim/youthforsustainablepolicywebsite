// POST /api/portal-logout — signs out of the Global Chapters portal.
module.exports = (req, res) => {
  if (req.method !== 'POST') { res.statusCode = 405; res.setHeader('Allow', 'POST'); return res.end(); }
  res.statusCode = 303;
  res.setHeader('Set-Cookie', '__Host-ysp_chapters=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict');
  res.setHeader('Location', '/portal-login?signedout=1');
  res.setHeader('Cache-Control', 'no-store');
  res.end();
};
