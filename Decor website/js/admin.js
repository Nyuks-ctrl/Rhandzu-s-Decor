/* ═══════════════════════════════════════════
   admin.js — Upload manager
   Pushes images + posts.json to GitHub
   ═══════════════════════════════════════════ */

// ─────────────────────────────────────────────
//  ⚠️  PASTE YOUR GITHUB PERSONAL ACCESS TOKEN BELOW
//  Keep this file private — never share it publicly
//  Token needs: repo scope (full)
// ─────────────────────────────────────────────
const GITHUB_TOKEN  = 'PASTE_YOUR_TOKEN_HERE';

// ─── REPO CONFIG ───
const GITHUB_USER   = 'Nyuks-ctrl';
const GITHUB_REPO   = 'Rhandzu-s-Decor';
const GITHUB_BRANCH = 'main';
const API_BASE      = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}`;

// ─── STATE ───
let selectedFiles = [];   // { name, base64, preview }
let existingPosts = [];

// ─── INIT ───
document.addEventListener('DOMContentLoaded', () => {
  checkToken();
  loadExistingPosts();
  setupDropzone();
});

function checkToken() {
  if (GITHUB_TOKEN === 'PASTE_YOUR_TOKEN_HERE') {
    showBanner(
      '⚠️ Token not set — add your GitHub Personal Access Token in js/admin.js before uploading.',
      'warn'
    );
  }
}

// ─── DROPZONE ───
function setupDropzone() {
  const zone = document.getElementById('uploadZone');
  zone.addEventListener('dragover',  e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    handleFiles(e.dataTransfer.files);
  });
  zone.addEventListener('click', () => document.getElementById('fileInput').click());
  document.getElementById('fileInput').addEventListener('change', e => handleFiles(e.target.files));
}

function handleFiles(fileList) {
  Array.from(fileList).forEach(file => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => {
      compressImage(e.target.result, (preview, base64) => {
        const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        selectedFiles.push({ name: safeName, base64, preview });
        renderPreview();
      });
    };
    reader.readAsDataURL(file);
  });
}

function compressImage(dataUrl, callback) {
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    const MAX = 1200;
    let w = img.width, h = img.height;
    if (w > MAX || h > MAX) {
      if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
      else       { w = Math.round(w * MAX / h); h = MAX; }
    }
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    const preview = canvas.toDataURL('image/jpeg', 0.80);
    const base64  = preview.split(',')[1];
    callback(preview, base64);
  };
  img.src = dataUrl;
}

function renderPreview() {
  const grid = document.getElementById('previewGrid');
  grid.innerHTML = selectedFiles.map((f, i) => `
    <div class="preview-thumb">
      <img src="${f.preview}" alt="preview ${i+1}"/>
      <button class="remove-btn" onclick="removeFile(${i})" aria-label="Remove photo">✕</button>
    </div>
  `).join('');
}

function removeFile(i) {
  selectedFiles.splice(i, 1);
  renderPreview();
}

// ─── SUBMIT POST ───
async function submitPost() {
  const category = document.getElementById('postCategory').value;
  const title    = document.getElementById('postTitle').value.trim();
  const desc     = document.getElementById('postDesc').value.trim();

  if (!category)              return showToast('⚠️ Please select a category.');
  if (GITHUB_TOKEN === 'PASTE_YOUR_TOKEN_HERE')
                              return showToast('⚠️ GitHub token not set in admin.js.');
  if (selectedFiles.length === 0 && !title)
                              return showToast('⚠️ Please add at least one photo or a title.');

  setLoading(true);

  try {
    // 1. Upload each image to GitHub
    const imagePaths = [];
    for (const file of selectedFiles) {
      const path = `uploads/${file.name}`;
      await githubPutFile(path, file.base64, `Upload image: ${file.name}`);
      imagePaths.push(path);
      showProgress(`Uploading ${imagePaths.length}/${selectedFiles.length} photos...`);
    }

    // 2. Build new post object
    const newPost = {
      id:       `post_${Date.now()}`,
      category,
      title:    title || `${category} Setup`,
      desc,
      images:   imagePaths,
      date:     Date.now()
    };

    // 3. Prepend to posts list and save posts.json
    existingPosts.unshift(newPost);
    await savePostsJson();

    // 4. Reset form
    selectedFiles = [];
    document.getElementById('previewGrid').innerHTML  = '';
    document.getElementById('postCategory').value     = '';
    document.getElementById('postTitle').value        = '';
    document.getElementById('postDesc').value         = '';
    document.getElementById('fileInput').value        = '';

    renderAdminList();
    showToast('✅ Post published! Vercel will redeploy in ~30 seconds.', 'success');

  } catch (err) {
    console.error(err);
    showToast(`❌ Error: ${err.message}`, 'error');
  } finally {
    setLoading(false);
    showProgress('');
  }
}

// ─── GITHUB API HELPERS ───

async function githubPutFile(path, base64Content, message) {
  // Check if file already exists (to get its SHA for updates)
  let sha = undefined;
  try {
    const check = await ghFetch(`contents/${path}`);
    if (check.sha) sha = check.sha;
  } catch { /* new file */ }

  const body = { message, content: base64Content, branch: GITHUB_BRANCH };
  if (sha) body.sha = sha;

  await ghFetch(`contents/${path}`, 'PUT', body);
}

async function savePostsJson() {
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(existingPosts, null, 2))));
  await githubPutFile('data/posts.json', content, 'Update posts.json');
}

async function ghFetch(endpoint, method = 'GET', body = null) {
  const res = await fetch(`${API_BASE}/${endpoint}`, {
    method,
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github.v3+json'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub API error ${res.status}`);
  }
  return res.json();
}

// ─── LOAD EXISTING POSTS ───
async function loadExistingPosts() {
  try {
    const url = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/data/posts.json?nocache=${Date.now()}`;
    const res = await fetch(url);
    if (res.ok) existingPosts = await res.json();
  } catch { existingPosts = []; }
  renderAdminList();
}

// ─── ADMIN POST LIST ───
function renderAdminList() {
  const list = document.getElementById('adminPostList');
  if (existingPosts.length === 0) {
    list.innerHTML = '<p class="no-posts">No posts yet — publish your first one above!</p>';
    return;
  }

  const sorted = [...existingPosts].sort((a, b) => b.date - a.date);
  const base   = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/`;

  list.innerHTML = sorted.map(post => `
    <div class="post-item" id="item_${post.id}">
      ${post.images && post.images[0]
        ? `<img class="post-thumb" src="${base}${post.images[0]}" alt="" loading="lazy"/>`
        : `<div class="post-thumb-placeholder">${post.placeholder || '📸'}</div>`
      }
      <div class="post-info">
        <div class="post-info-title">${post.title || post.category}</div>
        <div class="post-info-meta">
          ${post.category} &middot; ${formatDate(post.date)} &middot; ${(post.images || []).length} photo${(post.images || []).length !== 1 ? 's' : ''}
        </div>
      </div>
      <button class="delete-btn" onclick="deletePost('${post.id}')">Delete</button>
    </div>
  `).join('');
}

async function deletePost(id) {
  if (!confirm('Delete this post? This cannot be undone.')) return;
  existingPosts = existingPosts.filter(p => p.id !== id);
  try {
    setLoading(true);
    await savePostsJson();
    renderAdminList();
    showToast('🗑️ Post deleted.', 'success');
  } catch (err) {
    showToast(`❌ Could not delete: ${err.message}`, 'error');
  } finally {
    setLoading(false);
  }
}

// ─── UI HELPERS ───
function setLoading(on) {
  const btn = document.getElementById('submitBtn');
  btn.disabled    = on;
  btn.textContent = on ? 'Publishing...' : '✦ Publish Post';
}

function showProgress(msg) {
  const el = document.getElementById('progressMsg');
  el.textContent = msg;
  el.style.display = msg ? 'block' : 'none';
}

function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className   = `toast ${type}`;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3800);
}

function showBanner(msg, type = '') {
  const b = document.getElementById('tokenBanner');
  b.textContent  = msg;
  b.style.display = 'block';
  if (type === 'warn') b.classList.add('warn');
}

function formatDate(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  if (diff < 60000)     return 'Just now';
  if (diff < 3600000)   return `${Math.floor(diff/60000)}m ago`;
  if (diff < 86400000)  return `${Math.floor(diff/3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff/86400000)}d ago`;
  return new Date(ts).toLocaleDateString('en-ZA', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}