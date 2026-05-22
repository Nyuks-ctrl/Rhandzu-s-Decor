// ─── CONFIG ───
// NO TOKEN HERE — it lives safely in Vercel environment variables.
// This file talks to /api/upload which handles GitHub communication.

const GITHUB_USER   = 'Nyuks-ctrl';
const GITHUB_REPO   = 'Rhandzu-s-Decor';
const GITHUB_BRANCH = 'main';
const POSTS_FILE    = 'data/posts.json';
const IMAGES_FOLDER = 'images/uploads';

// ─── STATE ───
let selectedFiles  = [];
let existingPosts  = [];

// ─── INIT ───
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
});

// ─── AUTH ───
function checkAuth() {
  const ok = sessionStorage.getItem('rhandzu_admin');
  if (ok === 'yes') {
    showPanel();
  } else {
    document.getElementById('loginOverlay').classList.add('visible');
  }
}

function attemptLogin() {
  const pw = document.getElementById('loginPassword').value;
  // Change this password to whatever Rhandzu prefers
  if (pw === 'Rhandzu2025!') {
    sessionStorage.setItem('rhandzu_admin', 'yes');
    document.getElementById('loginOverlay').classList.remove('visible');
    document.getElementById('loginError').style.display = 'none';
    showPanel();
  } else {
    document.getElementById('loginError').style.display = 'block';
    document.getElementById('loginPassword').value = '';
    document.getElementById('loginPassword').focus();
  }
}

function logout() {
  sessionStorage.removeItem('rhandzu_admin');
  window.location.href = 'index.html';
}

// ─── SHOW PANEL ───
async function showPanel() {
  document.getElementById('adminPanel').style.display = 'block';
  await fetchExistingPosts();
  renderPostManager();
}

// ─── FETCH POSTS via /api/upload ───
async function fetchExistingPosts() {
  try {
    const res = await apiCall('get', POSTS_FILE);
    if (res.content) {
      // GitHub returns base64 — decode it
      const json = decodeBase64Unicode(res.content.replace(/\n/g, ''));
      existingPosts = JSON.parse(json);
    } else {
      existingPosts = [];
    }
  } catch {
    existingPosts = [];
  }
}

// ─── FILE HANDLING ───
function handleDragOver(e) {
  e.preventDefault();
  document.getElementById('uploadZone').classList.add('drag-over');
}
function handleDragLeave() {
  document.getElementById('uploadZone').classList.remove('drag-over');
}
function handleDrop(e) {
  e.preventDefault();
  document.getElementById('uploadZone').classList.remove('drag-over');
  handleFiles(e.dataTransfer.files);
}
function triggerFileInput() {
  document.getElementById('fileInput').click();
}
function onFileChange(input) {
  handleFiles(input.files);
}

function handleFiles(files) {
  Array.from(files).forEach(file => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => {
      compressImage(e.target.result, compressed => {
        selectedFiles.push({ file, compressed });
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
      else        { w = Math.round(w * MAX / h); h = MAX; }
    }
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    callback(canvas.toDataURL('image/jpeg', 0.80));
  };
  img.src = dataUrl;
}

function removeFile(i) {
  selectedFiles.splice(i, 1);
  renderPreview();
}

function renderPreview() {
  const grid = document.getElementById('previewGrid');
  if (selectedFiles.length === 0) { grid.innerHTML = ''; return; }
  grid.innerHTML = selectedFiles.map((f, i) => `
    <div class="preview-thumb">
      <img src="${f.compressed}" alt="preview"/>
      <button class="remove-thumb" onclick="removeFile(${i})">✕</button>
    </div>
  `).join('');
}

// ─── SUBMIT POST ───
async function submitPost() {
  const category = document.getElementById('postCategory').value;
  const title    = document.getElementById('postTitle').value.trim();
  const desc     = document.getElementById('postDesc').value.trim();

  if (!category) { showToast('⚠️ Please select a category.', 'error'); return; }

  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Publishing…';

  try {
    // 1. Upload each image via /api/upload
    const imagePaths = [];
    for (let i = 0; i < selectedFiles.length; i++) {
      const { compressed } = selectedFiles[i];
      const name = `${Date.now()}_${i}.jpg`;
      const path = `${IMAGES_FOLDER}/${name}`;
      const b64  = compressed.split(',')[1]; // strip data:...;base64,

      btn.innerHTML = `<span class="spinner"></span> Uploading photo ${i + 1} of ${selectedFiles.length}…`;

      await apiCall('put', path, b64, `Upload image: ${name}`);
      imagePaths.push(path);
    }

    // 2. Build new post
    const newPost = {
      id:       'post_' + Date.now(),
      category,
      title:    title || (category + ' Setup'),
      desc,
      images:   imagePaths,
      emoji:    categoryEmoji(category),
      date:     Date.now()
    };

    // 3. Prepend — newest first
    existingPosts.unshift(newPost);

    // 4. Save posts.json via /api/upload
    btn.innerHTML = '<span class="spinner"></span> Saving post…';
    await savePostsJson();

    // Reset form
    selectedFiles = [];
    renderPreview();
    document.getElementById('postCategory').value = '';
    document.getElementById('postTitle').value    = '';
    document.getElementById('postDesc').value     = '';
    document.getElementById('fileInput').value    = '';

    renderPostManager();
    showToast('✅ Post published! Site updates in ~30 seconds.', 'success');

  } catch (err) {
    console.error(err);
    showToast('❌ Failed: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '✦ Publish Post';
  }
}

// ─── DELETE POST ───
async function deletePost(id) {
  if (!confirm('Delete this post? This cannot be undone.')) return;
  existingPosts = existingPosts.filter(p => p.id !== id);
  try {
    await savePostsJson();
    renderPostManager();
    showToast('🗑️ Post deleted. Site updates in ~30 seconds.', 'success');
  } catch (err) {
    showToast('❌ Delete failed: ' + err.message, 'error');
  }
}

// ─── API HELPER — talks to /api/upload (never GitHub directly) ───
async function apiCall(action, path, content = null, message = null) {
  const body = { action, path };
  if (content) body.content = content;
  if (message) body.message = message;

  const res = await fetch('/api/upload', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  return res.json();
}

async function savePostsJson() {
  const json   = JSON.stringify(existingPosts, null, 2);
  const base64 = encodeBase64Unicode(json);
  await apiCall('put', POSTS_FILE, base64, 'Update posts.json');
}

// ─── RENDER POST MANAGER ───
function renderPostManager() {
  const list = document.getElementById('adminPostList');
  if (existingPosts.length === 0) {
    list.innerHTML = '<p style="color:rgba(255,255,255,0.35);font-size:0.82rem;">No posts yet — publish your first one above!</p>';
    return;
  }
  const sorted = [...existingPosts].sort((a, b) => b.date - a.date);
  list.innerHTML = sorted.map(post => {
    const imgSrc = post.images && post.images[0]
      ? `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${post.images[0]}`
      : null;
    return `
      <div class="post-item">
        ${imgSrc
          ? `<img class="post-thumb" src="${imgSrc}" alt=""/>`
          : `<div class="post-thumb-placeholder">${post.emoji || '📸'}</div>`}
        <div class="post-info">
          <div class="post-info-title">${escHtml(post.title || post.category)}</div>
          <div class="post-info-meta">${escHtml(post.category)} · ${timeAgo(post.date)} · ${(post.images||[]).length} photo(s)</div>
        </div>
        <button class="delete-btn" onclick="deletePost('${post.id}')">Delete</button>
      </div>
    `;
  }).join('');
}

// ─── HELPERS ───
function categoryEmoji(cat) {
  const map = { 'Wedding':'💍','Kiddies Party':'🎉','Baby Shower':'🍼','Party':'🥳','Other':'✨' };
  return map[cat] || '📸';
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000)     return 'Just now';
  if (diff < 3600000)   return Math.floor(diff / 60000) + 'm ago';
  if (diff < 86400000)  return Math.floor(diff / 3600000) + 'h ago';
  if (diff < 604800000) return Math.floor(diff / 86400000) + 'd ago';
  return new Date(ts).toLocaleDateString('en-ZA', { day:'numeric', month:'short', year:'numeric' });
}

function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Unicode-safe base64 encode/decode
function encodeBase64Unicode(str) {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
    (_, p1) => String.fromCharCode('0x' + p1)));
}
function decodeBase64Unicode(str) {
  return decodeURIComponent(atob(str).split('').map(
    c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
}

function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (type ? ' ' + type : '');
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 4000);
}
