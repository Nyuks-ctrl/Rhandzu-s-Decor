// ─── CONFIG ───────────────────────────────────────────────────
const GITHUB_USER   = 'Nyuks-ctrl';
const GITHUB_REPO   = 'Rhandzu-s-Decor';
const GITHUB_BRANCH = 'main';
const POSTS_FILE    = 'data/posts.json';

// ─── STATE ────────────────────────────────────────────────────
let posts         = [];
let currentFilter = 'all';

// ─── INIT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadPosts();
});

// ─── LOAD ─────────────────────────────────────────────────────
async function loadPosts() {
  showSkeletons();
  try {
    const url = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${POSTS_FILE}?t=${Date.now()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('not found');
    posts = await res.json();
  } catch {
    posts = samplePosts();
  }
  renderFeed();
}

// ─── RENDER ───────────────────────────────────────────────────
function renderFeed() {
  const container = document.getElementById('feedContainer');
  const empty     = document.getElementById('emptyState');

  let list = currentFilter === 'all'
    ? [...posts]
    : posts.filter(p => p.category === currentFilter);

  list.sort((a, b) => b.date - a.date);   // newest first

  container.innerHTML = '';

  if (!list.length) { empty.classList.add('visible'); return; }
  empty.classList.remove('visible');

  list.forEach((post, i) => {
    const card = buildCard(post, i);
    container.appendChild(card);
  });
}

function buildCard(post, index) {
  const card = document.createElement('div');
  card.className = 'feed-card';
  card.style.animationDelay = (index * 0.06) + 's';

  const badgeMap = { Wedding:'wedding', 'Kiddies Party':'kiddies', 'Baby Shower':'babyshower' };
  const badgeCls = badgeMap[post.category] || '';

  const initials = post.category
    ? post.category.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'RD';

  // ── Images ──
  let imageHtml = '';
  if (post.images && post.images.length > 0) {
    const srcs = post.images.map(p =>
      `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${p}`
    );
    if (srcs.length === 1) {
      imageHtml = `<div class="feed-images">
        <img src="${srcs[0]}" alt="${esc(post.title)}" loading="lazy"/>
      </div>`;
    } else {
      const shown = srcs.slice(0, 4);
      const extra = srcs.length - 4;
      imageHtml = `<div class="feed-images"><div class="feed-multi">
        ${shown.map((s, i) => `<img src="${s}" alt="photo ${i+1}" loading="lazy"/>`).join('')}
      </div>${extra > 0 ? `<div class="feed-img-count">+${extra}</div>` : ''}</div>`;
    }
  } else {
    // Clean SVG placeholder — no emoji
    imageHtml = `<div class="feed-images">
      <div class="feed-placeholder">${categoryPlaceholder(post.category)}</div>
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
      <div class="feed-badge ${badgeCls}">${esc(post.category)}</div>
    </div>
    ${imageHtml}
    <div class="feed-body">
      <div class="feed-title">${esc(post.title || post.category + ' Setup')}</div>
      ${post.desc ? `<div class="feed-desc">${esc(post.desc)}</div>` : ''}
    </div>
    <div class="feed-actions">
      <button class="action-btn whatsapp"
        onclick="window.open('https://wa.me/27786035507?text=${waMsg}','_blank')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
        Enquire
      </button>
      <button class="action-btn call" onclick="window.open('tel:+27786035507')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.06 6.06l.9-.9a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.03z"/></svg>
        Call
      </button>
    </div>
  `;
  return card;
}

// ─── CATEGORY PLACEHOLDERS (SVG, no emoji) ────────────────────
function categoryPlaceholder(cat) {
  const icons = {
    'Wedding': `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.25"><circle cx="8" cy="12" r="5"/><circle cx="16" cy="12" r="5"/></svg>`,
    'Kiddies Party': `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.25"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    'Baby Shower': `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.25"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
    'Party': `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.25"><path d="M12 3v3m0 12v3M3 12h3m12 0h3m-2.636-6.364-2.121 2.121M8.757 15.243l-2.121 2.121m0-12.728 2.121 2.121m6.364 6.364 2.121 2.121"/></svg>`,
  };
  return icons[cat] || `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.25"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`;
}

// ─── FILTER (called from index.html strip) ────────────────────
window.applyFilter = function(cat) {
  currentFilter = cat;
  renderFeed();
};

// ─── SKELETONS ────────────────────────────────────────────────
function showSkeletons() {
  const c = document.getElementById('feedContainer');
  c.innerHTML = Array(3).fill(`
    <div class="feed-card">
      <div style="display:flex;gap:0.75rem;padding:0.9rem 1.2rem;border-bottom:1px solid var(--border)">
        <div style="width:36px;height:36px;border-radius:50%;" class="shimmer"></div>
        <div style="flex:1;display:flex;flex-direction:column;gap:6px;justify-content:center">
          <div style="height:11px;width:50%;border-radius:4px;" class="shimmer"></div>
          <div style="height:9px;width:30%;border-radius:4px;" class="shimmer"></div>
        </div>
      </div>
      <div style="height:190px;" class="shimmer"></div>
      <div style="padding:0.9rem 1.2rem;display:flex;flex-direction:column;gap:8px">
        <div style="height:13px;width:65%;border-radius:4px;" class="shimmer"></div>
        <div style="height:10px;width:85%;border-radius:4px;" class="shimmer"></div>
      </div>
    </div>
  `).join('');
}

// ─── SAMPLE POSTS (shown until real posts exist) ──────────────
function samplePosts() {
  return [
    {
      id: 's1', category: 'Wedding',
      title: 'Emerald Green Wedding Setup',
      desc: 'Lush emerald green with gold accents — table arrangements, balloon arch & backdrop included.',
      images: [], date: Date.now() - 1000*60*60*3,
    },
    {
      id: 's2', category: 'Kiddies Party',
      title: 'Bluey Birthday Bash',
      desc: 'Complete Bluey themed setup with jumping castle. Perfect for little ones aged 1–6.',
      images: [], date: Date.now() - 1000*60*60*28,
    },
    {
      id: 's3', category: 'Baby Shower',
      title: 'Crocs Themed Baby Shower',
      desc: 'Fun and vibrant Crocs decor — balloon arch, table setup & custom banner.',
      images: [], date: Date.now() - 1000*60*60*52,
    },
  ];
}

// ─── HELPERS ──────────────────────────────────────────────────
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
