const LIMIT = 20;

// ── App state ──────────────────────────────────────────────────────────────
// Everything the app needs to remember between page loads is stored here.
// cursor   → the pagination bookmark from the last API response
// hasMore  → whether the API said there are more pages
// loading  → prevents two fetches from running at the same time
// category → the currently selected category filter (empty = All)
// shown    → running total of products rendered on screen

let state = {
  cursor:   null,
  hasMore:  false,
  loading:  false,
  category: '',
  shown:    0,
};

// ── DOM references ─────────────────────────────────────────────────────────
const grid   = document.getElementById('grid');
const bottom = document.getElementById('bottom');
const count  = document.getElementById('count');

// ── Helpers ────────────────────────────────────────────────────────────────

// Escapes special HTML characters so user data can't inject HTML
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Formats a raw number like 1234.5 into "$1,234.50"
function fmtPrice(p) {
  return '$' + parseFloat(p).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Formats an ISO timestamp into "Jan 15, 2024"
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

// ── Skeleton loader ────────────────────────────────────────────────────────
// Shows animated placeholder cards while the first fetch is in flight.
// This makes the page feel instant even before data arrives.

function showSkeletons() {
  grid.innerHTML = Array(12).fill(0).map(() => `
    <div class="sk-card">
      <div class="sk" style="height:13px; width:52%"></div>
      <div class="sk" style="height:16px; width:80%; margin-top:4px"></div>
      <div class="sk" style="height:12px; width:38%; margin-top:18px"></div>
    </div>
  `).join('');
}

// ── Render product cards ───────────────────────────────────────────────────
// Appends one card per product into the grid.
// We append (not replace) so "Load more" adds to the existing list.

function renderCards(products) {
  if (!products.length && !state.shown) {
    grid.innerHTML = '<div class="empty">No products found for this category.</div>';
    return;
  }

  products.forEach(p => {
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `
      <span class="badge">${esc(p.category)}</span>
      <div class="card-name">${esc(p.name)}</div>
      <div class="card-foot">
        <span class="price">${fmtPrice(p.price)}</span>
        <span class="date">${fmtDate(p.created_at)}</span>
      </div>
    `;
    grid.appendChild(div);
  });
}

// ── Render bottom controls ─────────────────────────────────────────────────
// Shows "Load more" button if more pages exist, or "You've seen all" if not.

function renderBottom() {
  if (state.hasMore) {
    bottom.innerHTML = '<button class="btn" id="more-btn">Load more</button>';
    document.getElementById('more-btn').addEventListener('click', () => load(false));
  } else if (state.shown) {
    bottom.innerHTML = "<p class='end-msg'>You've seen all products.</p>";
  } else {
    bottom.innerHTML = '';
  }
}

// ── Render count label ─────────────────────────────────────────────────────
// Updates the small counter in the header (e.g. "40 shown in Electronics")

function renderCount() {
  const label = state.category ? ` in ${state.category}` : '';
  count.textContent = state.shown
    ? `${state.shown.toLocaleString()} shown${label}`
    : '';
}

// ── Main fetch function ────────────────────────────────────────────────────
// reset = true  → clear everything and load page 1 (used by category filter)
// reset = false → keep existing cards and append the next page (Load more)

async function load(reset) {
  if (state.loading) return;
  state.loading = true;

  if (reset) {
    state.cursor = null;
    state.shown  = 0;
    grid.innerHTML   = '';
    bottom.innerHTML = '';
    count.textContent = '';
    showSkeletons();
  }

  try {
    // Build the query string dynamically
    // Relative URL (/api/products) works both locally and on Railway
    const params = new URLSearchParams({ limit: LIMIT });
    if (state.cursor)   params.set('cursor',   state.cursor);
    if (state.category) params.set('category', state.category);

    const res  = await fetch(`/api/products?${params}`);
    const json = await res.json();

    // Clear skeletons before rendering real cards
    if (reset) grid.innerHTML = '';

    renderCards(json.data);

    // Save state from the response
    state.cursor  = json.nextCursor;
    state.hasMore = json.hasMore;
    state.shown  += json.data.length;

    renderBottom();
    renderCount();

  } catch (err) {
    grid.innerHTML = "<div class='empty'>Failed to load products. Please refresh.</div>";
    console.error('Fetch error:', err);

  } finally {
    state.loading = false;
  }
}

// ── Category filter clicks ─────────────────────────────────────────────────
// Single event listener on the parent — handles all pill clicks via delegation

document.getElementById('filters').addEventListener('click', e => {
  const pill = e.target.closest('.pill');
  if (!pill) return;

  // Remove active from all pills, add to clicked one
  document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
  pill.classList.add('active');

  // Reset state and reload from page 1 with the new category
  state.category = pill.dataset.cat;
  load(true);
});

// ── Initial load ───────────────────────────────────────────────────────────
load(true);