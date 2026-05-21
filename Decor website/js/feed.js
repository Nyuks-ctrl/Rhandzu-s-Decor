/* ═══════════════════════════════════════════
   feed.js — Gallery feed logic
   Reads posts.json from GitHub repo
   ═══════════════════════════════════════════ */

// ─── CONFIG (edit these to match your repo) ───
const GITHUB_USER   = 'Nyuks-ctrl';
const GITHUB_REPO   = 'Rhandzu-s-Decor';
const GITHUB_BRANCH = 'main';

// ─── POSTS JSON URL (raw GitHub) ───
const POSTS_JSON_URL =
  `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/data/posts.json?nocache=${Date.now()}`;

// ─── STATE ───
let allPosts       = [];
let currentFilter  = 'all';

// ─── HIDDEN ADMIN TRIGGER (tap logo 5× within 3s) ───
let logoTapCount = 0;
let logoTapTimer = null;

function handleLogoTap() {
  logoTapCount++;
  const logo = document.getElementById('logoTrigger');
  logo.style.transform = 'scale(0.86)';
  setTimeout(() => (logo.style.transform = 'scale(1)'), 150);

  if (logoTapCount >= 5) {
    logoTapCount = 0;
    clearTimeout(logoTapTimer);
    window.location.href = 'admin.html';
    return;
  }
  clearTimeout(logoTapTimer);
  logoTapTimer = setTimeout(() => { logoTapCount = 0; }, 3000);
}

// ─── INIT ───
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('logoTrigger')
    .addEventListener('click', handleLogoTap);

  loadPosts();

  document.getElementById('scrollBtn')
    .addEventListener('click', () => {
      document.getElementById('gallery').scrollIntoView({ behavior: 'smooth' });
    });
});

// ─── LOAD POSTS FROM GITHUB ───
async function loadPosts() {
  showSkeleton();
  try {
    const res = await fetch(POSTS_JSON_URL);
    if (!res.ok) throw new Error('no posts file yet');
    allPosts = await res.json();
  } catch {
    // Repo has no posts yet — show sample placeholders
    allPosts = getSamplePosts();
  }
  renderFeed();
}

// ─── FILTER ───
function filterFeed(cat, el) {
  currentFilter = cat;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  renderFeed();
}

// ─── RENDER ───
function renderFeed() {
  const container = document.getElementById('feedContainer');
  const empty     = document.getElementById('emptyState');
  container.innerHTML = '';

  let list = currentFilter === 'all'
    ? allPosts
    : allPosts.filter(p => p.category === currentFilter);

  // Newest first
  list = [...list].sort((a, b) => b.date - a.date);

  if (list.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  list.forEach((post, i) => {
    const card = buildCard(post, i);
    container.appendChild(card);
  });
}

function buildCard(post, index) {
  const card = document.createElement('div');
  card.className = 'feed-card';
  card.style.animationDelay = `${index * 0.055}s`;

  const initials = (post.category || 'RD')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const badgeClass = ['Wedding', 'Baby Shower'].includes(post.category) ? 'gold' : '';

  // Build image section
  let imageHtml = '';
  if (post.images && post.images.length > 0) {
    const base = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/`;
    if (post.images.length === 1) {
      imageHtml = `<div class="feed-images">
        <img src="${base}${post.images[0]}" alt="${post.title}" loading="lazy"/>
      </div>`;
    } else {
      const shown  = post.images.slice(0, 4);
      const extras = post.images.length - 4;
      imageHtml = `<div class="feed-images">
        <div class="feed-multi">
          ${shown.map((src, i) => `<img src="${base}${src}" alt="photo ${i+1}" loading="lazy"/>`).join('')}
        </div>
        ${extras > 0 ? `<div class="feed-img-count">+${extras} more</div>` : ''}
      </div>`;
    }
  } else if (post.placeholder) {
    imageHtml = `<div class="feed-placeholder">${post.placeholder}</div>`;
  }

  const waMsg = encodeURIComponent(
    `Hi! I saw your ${post.title || post.category} setup and I'm interested. Can we discuss?`
  );

  card.innerHTML = `
    <div class="feed-card-header">
      <div class="feed-avatar">${initials}</div>
      <div class="feed-meta">
        <div class="feed-handle">Rhandzu's Decor &amp; Dine</div>
        <div class="feed-date">${formatDate(post.date)}</div>
      </div>
      <div class="feed-badge ${badgeClass}">${post.category || 'Event'}</div>
    </div>
    ${imageHtml}
    <div class="feed-body">
      <div class="feed-title">${post.title || post.category + ' Setup'}</div>
      ${post.desc ? `<div class="feed-desc">${post.desc}</div>` : ''}
    </div>
    <div class="feed-actions">
      <button class="action-btn whatsapp"
        onclick="window.open('https://wa.me/27786035507?text=${waMsg}','_blank')">
        💬 Enquire
      </button>
      <button class="action-btn call"
        onclick="window.open('tel:+27786035507')">
        📞 Call
      </button>
    </div>
  `;
  return card;
}

// ─── SKELETON LOADER ───
function showSkeleton() {
  const container = document.getElementById('feedContainer');
  container.innerHTML = [1,2,3].map(() => `
    <div class="feed-card" style="overflow:hidden">
      <div style="padding:0.85rem 1rem;display:flex;gap:0.75rem;border-bottom:1px solid var(--border)">
        <div style="width:36px;height:36px;border-radius:50%;background:#e8e0d0;animation:shimmer 1.5s infinite"></div>
        <div style="flex:1">
          <div style="height:12px;width:55%;background:#e8e0d0;border-radius:6px;margin-bottom:6px;animation:shimmer 1.5s infinite"></div>
          <div style="height:10px;width:35%;background:#e8e0d0;border-radius:6px;animation:shimmer 1.5s infinite"></div>
        </div>
      </div>
      <div style="height:200px;background:#e8e0d0;animation:shimmer 1.5s infinite"></div>
      <div style="padding:0.9rem 1rem">
        <div style="height:14px;width:70%;background:#e8e0d0;border-radius:6px;margin-bottom:8px;animation:shimmer 1.5s infinite"></div>
        <div style="height:11px;width:90%;background:#e8e0d0;border-radius:6px;animation:shimmer 1.5s infinite"></div>
      </div>
    </div>
  `).join('');
}

// ─── HELPERS ───
function formatDate(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  if (diff < 60000)       return 'Just now';
  if (diff < 3600000)     return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000)    return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000)   return `${Math.floor(diff / 86400000)}d ago`;
  return new Date(ts).toLocaleDateString('en-ZA', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}

function getSamplePosts() {
  return [
    {
      id: 'sample1', category: 'Wedding',
      title: 'Elegant Emerald Green Wedding',
      desc: 'A breathtaking emerald green themed setup with gold accents. Table arrangements, backdrop & full decor.',
      images: [], placeholder: '💚', date: Date.now() - 1000*60*60*2
    },
    {
      id: 'sample2', category: 'Kiddies Party',
      title: 'Bluey Themed Birthday Bash',
      desc: 'Complete Bluey setup with jumping castle included! Perfect for little ones aged 1–6.',
      images: [], placeholder: '🎉', date: Date.now() - 1000*60*60*26
    },
    {
      id: 'sample3', category: 'Baby Shower',
      title: 'Crocs Themed Baby Shower',
      desc: 'Fun and vibrant Crocs themed decor. Balloon arch, table setup & customised banner.',
      images: [], placeholder: '🐊', date: Date.now() - 1000*60*60*50
    }
  ];
}