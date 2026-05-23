// ─── CONFIG ───────────────────────────────────────────────────
// NO TOKEN HERE — lives safely in Vercel Environment Variables.
// This file only talks to /api/upload (our own serverless function).

const GITHUB_USER   = 'Nyuks-ctrl';
const GITHUB_REPO   = 'Rhandzu-s-Decor';
const GITHUB_BRANCH = 'main';
const POSTS_FILE    = 'data/posts.json';
const IMAGES_FOLDER = 'images/uploads';

// Admin password — change this to whatever Rhandzu prefers
const ADMIN_PASSWORD = 'Rhandzu2025!';

// ─── STATE ────────────────────────────────────────────────────
let selectedFiles = [];   // { compressed: base64 string }
let existingPosts = [];

// ─── INIT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', checkAuth);

// ─── AUTH ─────────────────────────────────────────────────────
function checkAuth() {
  if (sessionStorage.getItem('rhandzu_admin') === 'yes') {
    showPanel();
  } else {
    document.getElementById('loginOverlay').classList.add('visible');
    setTimeout(() => document.getElementById('loginPassword').focus(), 300);
  }
}

function attemptLogin() {
  const pw  = document.getElementById('loginPassword').value;
  const err = document.getElementById('loginError');
  if (pw === ADMIN_PASSWORD) {
    sessionStorage.setItem('rhandzu_admin', 'yes');
    document.getElementById('loginOverlay').classList.remove('visible');
    err.style.display = 'none';
    showPanel();
  } else {
    err.style.display = 'flex';
    document.getElementById('loginPassword').value = '';
    document.getElementById('loginPassword').focus();
    // Shake animation
    const box = document.querySelector('.modal-box');
    box.style.animation = 'shake 0.35s ease';
    setTimeout(() => { box.style.animation = ''; }, 400);
  }
}

function logout() {
  sessionStorage.removeItem('rhandzu_admin');
  window.location.href = 'index.html';
}

// ─── SHOW PANEL ───────────────────────────────────────────────
async function showPanel() {
  document.getElementById('adminPanel').style.display = 'block';
  setStatus('loading');
  await fetchExistingPosts();
  setStatus('idle');
  renderPostManager();
}

// ─── STATUS ───────────────────────────────────────────────────
function setStatus(state, msg = '') {
  const bar = document.getElementById('statusBar');
  const map = {
    loading: { text: 'Loading posts…',        cls: 'status-loading' },
    saving:  { text: msg || 'Saving…',         cls: 'status-saving'  },
    success: { text: msg || 'Done',            cls: 'status-success' },
    error:   { text: msg || 'Something went wrong', cls: 'status-error' },
    idle:    { text: '',                        cls: ''               },
  };
  const s = map[state] || map.idle;
  bar.textContent  = s.text;
  bar.className    = 'status-bar ' + s.cls;
  bar.style.display = state === 'idle' ? 'none' : 'flex';
}

// ─── FETCH POSTS ──────────────────────────────────────────────
async function fetchExistingPosts() {
  try {
    const res = await apiCall('get', POSTS_FILE);
    if (res.content) {
      const json = decodeBase64Unicode(res.content.replace(/\n/g, ''));
      existingPosts = JSON.parse(json);
    } else {
      existingPosts = [];
    }
  } catch (e) {
    console.warn('Could not load posts:', e);
    existingPosts = [];
  }
}

// ─── FILE HANDLING ────────────────────────────────────────────
function handleDragOver(e)  { e.preventDefault(); document.getElementById('uploadZone').classList.add('drag-over'); }
function handleDragLeave()  { document.getElementById('uploadZone').classList.remove('drag-over'); }
function handleDrop(e)      { e.preventDefault(); handleDragLeave(); handleFiles(e.dataTransfer.files); }
function triggerFileInput() { document.getElementById('fileInput').click(); }
function onFileChange(el)   { handleFiles(el.files); }

function handleFiles(files) {
  Array.from(files).forEach(file => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => compressImage(e.target.result, compressed => {
      selectedFiles.push({ compressed });
      renderPreview();
    });
    reader.readAsDataURL(file);
  });
}

function compressImage(dataUrl, cb) {
  const img = new Image();
  img.onload = () => {
    const MAX = 1200;
    let [w, h] = [img.width, img.height];
    if (w > MAX || h > MAX) {
      if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
      else        { w = Math.round(w * MAX / h); h = MAX; }
    }
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').drawImage(img, 0, 0, w, h);
    cb(c.toDataURL('image/jpeg', 0.82));
  };
  img.src = dataUrl;
}

function removeFile(i) {
  selectedFiles.splice(i, 1);
  renderPreview();
}

function renderPreview() {
  const grid = document.getElementById('previewGrid');
  if (!selectedFiles.length) { grid.innerHTML = ''; return; }
  grid.innerHTML = selectedFiles.map((f, i) => `
    <div class="preview-thumb">
      <img src="${f.compressed}" alt="preview ${i + 1}"/>
      <button class="remove-thumb" onclick="removeFile(${i})" aria-label="Remove photo">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  `).join('');
}

// ─── SUBMIT ───────────────────────────────────────────────────
async function submitPost() {
  const category = document.getElementById('postCategory').value;
  const title    = document.getElementById('postTitle').value.trim();
  const desc     = document.getElementById('postDesc').value.trim();

  if (!category) { showToast('Please select a category first.', 'error'); return; }

  const btn = document.getElementById('submitBtn');
  btn.disabled = true;

  try {
    const imagePaths = [];

    // Upload each image
    for (let i = 0; i < selectedFiles.length; i++) {
      const { compressed } = selectedFiles[i];
      const name = `${Date.now()}_${i}.jpg`;
      const path = `${IMAGES_FOLDER}/${name}`;
      const b64  = compressed.split(',')[1];

      setStatus('saving', `Uploading photo ${i + 1} of ${selectedFiles.length}…`);
      await apiCall('put', path, b64, `Upload: ${name}`);
      imagePaths.push(path);
    }

    // Build post object
    const post = {
      id:       'post_' + Date.now(),
      category,
      title:    title || category + ' Setup',
      desc,
      images:   imagePaths,
      date:     Date.now(),
    };

    // Prepend so newest is first
    existingPosts.unshift(post);

    setStatus('saving', 'Saving post…');
    await savePostsJson();

    // Reset form
    selectedFiles = [];
    renderPreview();
    ['postCategory', 'postTitle', 'postDesc'].forEach(id => {
      const el = document.getElementById(id);
      if (el.tagName === 'SELECT') el.value = '';
      else el.value = '';
    });
    document.getElementById('fileInput').value = '';

    renderPostManager();
    setStatus('success', 'Post published! Site updates in ~30 sec.');
    setTimeout(() => setStatus('idle'), 4000);
    showToast('Post published successfully.', 'success');

  } catch (err) {
    console.error('Submit error:', err);
    setStatus('error', err.message);
    showToast('Failed: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

// ─── DELETE ───────────────────────────────────────────────────
async function deletePost(id) {
  if (!confirm('Delete this post permanently?')) return;
  existingPosts = existingPosts.filter(p => p.id !== id);
  try {
    setStatus('saving', 'Deleting…');
    await savePostsJson();
    renderPostManager();
    setStatus('success', 'Post deleted. Site updates in ~30 sec.');
    setTimeout(() => setStatus('idle'), 3500);
  } catch (err) {
    setStatus('error', err.message);
    showToast('Delete failed: ' + err.message, 'error');
  }
}

// ─── RENDER POST MANAGER ──────────────────────────────────────
function renderPostManager() {
  const list = document.getElementById('adminPostList');
  if (!existingPosts.length) {
    list.innerHTML = `
      <div class="no-posts">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.3;margin-bottom:0.5rem"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
        <p>No posts yet — publish your first one above.</p>
      </div>`;
    return;
  }
  const sorted = [...existingPosts].sort((a, b) => b.date - a.date);
  list.innerHTML = sorted.map(post => {
    const thumb = post.images?.[0]
      ? `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${post.images[0]}`
      : null;
    return `
      <div class="post-item">
        ${thumb
          ? `<img class="post-thumb" src="${thumb}" alt=""/>`
          : `<div class="post-thumb-ph">${categoryIcon(post.category)}</div>`}
        <div class="post-info">
          <div class="post-info-title">${esc(post.title || post.category)}</div>
          <div class="post-info-meta">${esc(post.category)} · ${timeAgo(post.date)} · ${(post.images||[]).length} photo(s)</div>
        </div>
        <button class="delete-btn" onclick="deletePost('${post.id}')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6m4-6v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          Delete
        </button>
      </div>`;
  }).join('');
}

function categoryIcon(cat) {
  const m = {
    'Wedding': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="12" r="5"/><circle cx="16" cy="12" r="5"/></svg>`,
    'Kiddies Party': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    'Baby Shower': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
    'Party': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v3m0 12v3M3 12h3m12 0h3m-2.636-6.364-2.121 2.121M8.757 15.243l-2.121 2.121m0-12.728 2.121 2.121m6.364 6.364 2.121 2.121"/></svg>`,
  };
  return m[cat] || `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`;
}

// ─── API HELPER ───────────────────────────────────────────────
async function apiCall(action, path, content = null, message = null) {
  const body = { action, path };
  if (content) body.content = content;
  if (message) body.message = message;

  const res = await fetch('/api/upload', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    const hint = data.hint ? ` (${data.hint})` : '';
    throw new Error((data.error || `Request failed ${res.status}`) + hint);
  }
  return data;
}

async function savePostsJson() {
  const json   = JSON.stringify(existingPosts, null, 2);
  const base64 = encodeBase64Unicode(json);
  await apiCall('put', POSTS_FILE, base64, 'chore: update posts.json');
}

// ─── HELPERS ──────────────────────────────────────────────────
function encodeBase64Unicode(str) {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
    (_, p1) => String.fromCharCode('0x' + p1)));
}
function decodeBase64Unicode(str) {
  return decodeURIComponent(atob(str).split('').map(
    c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
}
function timeAgo(ts) {
  const d = Date.now() - ts;
  if (d < 60000)     return 'Just now';
  if (d < 3600000)   return Math.floor(d/60000) + 'm ago';
  if (d < 86400000)  return Math.floor(d/3600000) + 'h ago';
  if (d < 604800000) return Math.floor(d/86400000) + 'd ago';
  return new Date(ts).toLocaleDateString('en-ZA', {day:'numeric',month:'short',year:'numeric'});
}
function esc(s) {
  if (!s) return '';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (type ? ' ' + type : '');
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 4000);
}
