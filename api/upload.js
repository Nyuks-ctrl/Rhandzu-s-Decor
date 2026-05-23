// ─────────────────────────────────────────────────────────────
//  Vercel Serverless Function  —  /api/upload
//  Uses CommonJS (no "export default") — required for Vercel.
//  Token lives ONLY in Vercel Environment Variables.
// ─────────────────────────────────────────────────────────────

const GITHUB_USER   = 'Nyuks-ctrl';
const GITHUB_REPO   = 'Rhandzu-s-Decor';
const GITHUB_BRANCH = 'main';

module.exports = async function handler(req, res) {

  // CORS — allow the same origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  // ── Token from Vercel env — never exposed to browser ──
  const token = process.env.GITHUB_TOKEN;
  if (!token)
    return res.status(500).json({ error: 'GITHUB_TOKEN env variable not set on Vercel' });

  const { action, path, content, message } = req.body || {};

  if (!action || !path)
    return res.status(400).json({ error: 'Missing action or path' });

  // ── Strict path whitelist — only these two locations can be written ──
  const allowed =
    path === 'data/posts.json' ||
    path.startsWith('images/uploads/');

  if (!allowed)
    return res.status(403).json({ error: 'Path not permitted' });

  const apiBase = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`;

  // Use Bearer (works with both classic and fine-grained tokens)
  const ghHeaders = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  try {

    // ── GET: read a file's content + sha ──
    if (action === 'get') {
      const r = await fetch(`${apiBase}?ref=${GITHUB_BRANCH}`, { headers: ghHeaders });
      if (r.status === 404) return res.status(200).json({ content: null, sha: null });
      if (!r.ok) {
        const e = await r.json();
        return res.status(r.status).json({ error: e.message || 'GitHub GET failed' });
      }
      const data = await r.json();
      return res.status(200).json({ content: data.content, sha: data.sha });
    }

    // ── PUT: create or update a file ──
    if (action === 'put') {
      if (!content)
        return res.status(400).json({ error: 'Missing content for put' });

      // Fetch existing SHA (required to overwrite an existing file)
      let sha = null;
      const check = await fetch(`${apiBase}?ref=${GITHUB_BRANCH}`, { headers: ghHeaders });
      if (check.ok) {
        const existing = await check.json();
        sha = existing.sha || null;
      }

      const body = {
        message: message || `chore: update ${path}`,
        content,               // must be base64
        branch: GITHUB_BRANCH,
        ...(sha ? { sha } : {}),
      };

      const put = await fetch(apiBase, {
        method: 'PUT',
        headers: ghHeaders,
        body: JSON.stringify(body),
      });

      if (!put.ok) {
        const e = await put.json();
        console.error('GitHub PUT error:', e);
        return res.status(put.status).json({
          error: e.message || 'GitHub PUT failed',
          hint: e.message?.includes('resource not accessible')
            ? 'Token scope issue — regenerate as a Classic token with repo scope'
            : undefined,
        });
      }

      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });

  } catch (err) {
    console.error('upload handler error:', err);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
};
