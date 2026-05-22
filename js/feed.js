// ─── CONFIG ───
const GITHUB_USER = 'Nyuks-ctrl';
const GITHUB_REPO = 'Rhandzu-s-Decor';
const GITHUB_BRANCH = 'main';
const POSTS_FILE = 'data/posts.json';

// ─── STATE ───
let posts = [];
let currentFilter = 'all';

// ─── INIT ───
document.addEventListener('DOMContentLoaded', () => {
  loadPosts();
  initLogoTap();
});

// ─── FETCH POSTS FROM GITHUB ───
async function loadPosts() {
  showSkeletons();
  try {
    // Add cache-busting so Vercel always gets fresh data
    const url = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${POSTS_FILE}?t=${Date.now()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('No posts file yet');
    posts = await res.json();
  } catch (e) {
    // Fall back to sample posts so the site never looks empty
    posts = getSamplePosts();
  }
  renderFeed();
}

// ─── RENDER FEED ───
function renderFeed() {
  const container = document.getElementById('feedContainer');
  const empty = document.getElementById('emptyState');

  let filtered = currentFilter === 'all'
    ? posts
    : posts.filter(p => p.category === currentFilter);

  // Newest first
  filtered = [...filtered].sort((a, b) => b.date - a.date);

  container.innerHTML = '';

  if (filtered.length === 0) {
    empty.classList.add('visible');
    return;
  }
  empty.classList.remove('visible');

  filtered.forEach((post, i) => {
    const card = buildCard(post, i);
    container.appendChild(card);
  });
}

function buildCard(post, index) {
  const card = document.createElement('div');
  card.className = 'feed-card';
  card.style.animationDelay = (index * 0.07) + 's';

  const badgeClass = ['Wedding', 'Baby Shower'].includes(post.category) ? 'gold' : '';
  const initials = post.category
    ? post.category.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'RD';

  // Build image section
  let imageHtml = '';
  if (post.images && post.images.length > 0) {
    // Resolve image paths — stored as relative paths in posts.json
    const srcs = post.images.map(p =>
      `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${p}`
    );
    if (srcs.length === 1) {
      imageHtml = `<div class="feed-images">
        <img src="${srcs[0]}" alt="${escHtml(post.title)}" loading="lazy"/>
      </div>`;
    } else {
      const shown = srcs.slice(0, 4);
      const extra = srcs.length - 4;
      imageHtml = `<div class="feed-images">
        <div class="feed-multi">
          ${shown.map((s, i) => `<img src="${s}" alt="photo ${i + 1}" loading="lazy"/>`).join('')}
        </div>
        ${extra > 0 ? `<div class="feed-img-count">+${extra} more</div>` : ''}
      </div>`;
    }
  } else {
    imageHtml = `<div class="feed-images">
      <div class="feed-placeholder">${post.emoji || '📸'}</div>
    </div>`;
  }

  const waMsg = encodeURIComponent(
    `Hi! I saw your "${post.title || post.category}" setup on your website and I'm interested. Can we discuss?`
  );

  card.innerHTML = `
    <div class="feed-card-header">
      <div class="feed-avatar">${initials}</div>
      <div class="feed-meta">
        <div class="feed-handle">Rhandzu's Decor &amp; Dine</div>
        <div class="feed-date">${timeAgo(post.date)}</div>
      </div>
      <div class="feed-badge ${badgeClass}">${escHtml(post.category)}</div>
    </div>
    ${imageHtml}
    <div class="feed-body">
      <div class="feed-title">${escHtml(post.title || post.category + ' Setup')}</div>
      ${post.desc ? `<div class="feed-desc">${escHtml(post.desc)}</div>` : ''}
    </div>
    <div class="feed-actions">
      <button class="action-btn whatsapp"
        onclick="window.open('https://wa.me/27786035507?text=${waMsg}','_blank')">
        💬 Enquire
      </button>
      <button class="action-btn call" onclick="window.open('tel:+27786035507')">
        📞 Call
      </button>
    </div>
  `;
  return card;
}

// ─── FILTER ───
function filterFeed(cat, el) {
  currentFilter = cat;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  renderFeed();
}

// ─── SKELETONS ───
function showSkeletons() {
  const container = document.getElementById('feedContainer');
  container.innerHTML = Array(3).fill(`
    <div class="feed-card" style="overflow:hidden">
      <div style="padding:0.85rem 1rem;display:flex;gap:0.75rem;border-bottom:1px solid var(--border)">
        <div style="width:38px;height:38px;border-radius:50%;background:#e8e0d0;animation:shimmer 1.4s infinite"></div>
        <div style="flex:1">
          <div style="height:12px;width:55%;border-radius:6px;background:#e8e0d0;animation:shimmer 1.4s infinite;margin-bottom:8px"></div>
          <div style="height:10px;width:35%;border-radius:6px;background:#e8e0d0;animation:shimmer 1.4s infinite"></div>
        </div>
      </div>
      <div style="height:180px;background:#e8e0d0;animation:shimmer 1.4s infinite"></div>
      <div style="padding:1rem">
        <div style="height:14px;width:70%;border-radius:6px;background:#e8e0d0;animation:shimmer 1.4s infinite;margin-bottom:10px"></div>
        <div style="height:11px;width:90%;border-radius:6px;background:#e8e0d0;animation:shimmer 1.4s infinite"></div>
      </div>
    </div>
  `).join('');
}

// ─── HIDDEN ADMIN: TAP LOGO 5× ───
function initLogoTap() {
  let count = 0;
  let timer = null;
  const logo = document.getElementById('logoTrigger');
  if (!logo) return;

  logo.addEventListener('click', () => {
    count++;
    // Subtle pulse — looks like normal interaction
    logo.style.transform = 'scale(0.88)';
    setTimeout(() => { logo.style.transform = 'scale(1)'; }, 150);

    if (count >= 5) {
      count = 0;
      clearTimeout(timer);
      window.location.href = 'admin.html';
      return;
    }
    clearTimeout(timer);
    timer = setTimeout(() => { count = 0; }, 3000);
  });
}

// ─── SAMPLE POSTS (fallback until real posts exist) ───
function getSamplePosts() {
  return [
    {
      id: 'sample1', category: 'Wedding',
      title: 'Elegant Emerald Green Wedding',
      desc: 'A breathtaking emerald green themed setup with gold accents — table arrangements, backdrop & floral.',
      images: [], emoji: '💚', date: Date.now() - 1000 * 60 * 60 * 3
    },
    {
      id: 'sample2', category: 'Kiddies Party',
      title: 'Bluey Themed Birthday Bash',
      desc: 'Complete Bluey setup with jumping castle included! Perfect for little ones aged 1–6.',
      images: [], emoji: '🎉', date: Date.now() - 1000 * 60 * 60 * 27
    },
    {
      id: 'sample3', category: 'Baby Shower',
      title: 'Crocs Themed Baby Shower',
      desc: 'Fun and vibrant Crocs themed decor — balloon arch, table setup & customised banner.',
      images: [], emoji: '🐊', date: Date.now() - 1000 * 60 * 60 * 52
    }
  ];
}

// ─── HELPERS ───
function timeAgo(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
  if (diff < 604800000) return Math.floor(diff / 86400000) + 'd ago';
  return new Date(ts).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (type ? ' ' + type : '');
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3500);
}
