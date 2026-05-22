// ─────────────────────────────────────────────────────────────
//  Vercel Serverless Function — /api/upload
//  Handles all GitHub API communication.
//  The GITHUB_TOKEN lives only in Vercel's environment variables
//  and is NEVER sent to the browser.
// ─────────────────────────────────────────────────────────────

const GITHUB_USER   = 'Nyuks-ctrl';
const GITHUB_REPO   = 'Rhandzu-s-Decor';
const GITHUB_BRANCH = 'main';

export default async function handler(req, res) {

  // ── Only allow POST ──
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Read token from Vercel environment (never from client) ──
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'Server misconfigured — token missing' });
  }

  const { action, path, content, message } = req.body;

  // ── Validate ──
  if (!action || !path) {
    return res.status(400).json({ error: 'Missing action or path' });
  }

  // ── Security: only allow writes inside safe folders ──
  const ALLOWED_PREFIXES = ['images/uploads/', 'data/posts.json'];
  const isAllowed = ALLOWED_PREFIXES.some(prefix => path.startsWith(prefix) || path === prefix);
  if (!isAllowed) {
    return res.status(403).json({ error: 'Path not permitted' });
  }

  const apiBase = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${path}`;
  const headers = {
    'Authorization': `token ${token}`,
    'Content-Type':  'application/json',
    'Accept':        'application/vnd.github.v3+json',
  };

  try {
    if (action === 'put') {
      // ── Get current SHA if file exists (required for updates) ──
      let sha = null;
      const check = await fetch(`${apiBase}?ref=${GITHUB_BRANCH}`, { headers });
      if (check.ok) {
        const data = await check.json();
        sha = data.sha;
      }

      // ── Write file ──
      const body = {
        message: message || `Update ${path}`,
        content,          // base64 string from client
        branch: GITHUB_BRANCH,
        ...(sha ? { sha } : {}),
      };

      const put = await fetch(apiBase, {
        method:  'PUT',
        headers,
        body:    JSON.stringify(body),
      });

      if (!put.ok) {
        const err = await put.json();
        return res.status(put.status).json({ error: err.message });
      }

      return res.status(200).json({ ok: true });
    }

    if (action === 'get') {
      // ── Read a file (e.g. posts.json) ──
      const get = await fetch(`${apiBase}?ref=${GITHUB_BRANCH}`, { headers });
      if (get.status === 404) return res.status(200).json({ content: null });
      if (!get.ok) return res.status(get.status).json({ error: 'GitHub read failed' });
      const data = await get.json();
      return res.status(200).json({ content: data.content, sha: data.sha });
    }

    return res.status(400).json({ error: 'Unknown action' });

  } catch (err) {
    console.error('upload.js error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
