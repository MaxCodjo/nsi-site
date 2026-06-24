// App glue — orchestrates fetch, render, theme, sorting, matrix view, and detail dialog.

document.getElementById("year").textContent = new Date().getFullYear();

// Theme toggle — persisted to localStorage, falling back to prefers-color-scheme.
(function initTheme() {
  const root = document.documentElement;
  let saved = null;
  try { saved = localStorage.getItem("nsi-theme"); } catch {}
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  root.setAttribute("data-theme", saved || (prefersDark ? "dark" : "light"));
  document.getElementById("themeToggle").addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("nsi-theme", next); } catch {}
  });
})();

const els = {
  loading:     document.getElementById("loadingState"),
  error:       document.getElementById("errorState"),
  cachedDate:  document.getElementById("cachedDate"),
  table:       document.getElementById("rankingTable"),
  body:        document.getElementById("rankingBody"),
  matrixView:  document.getElementById("matrixView"),
  viewTable:   document.getElementById("viewTable"),
  viewMatrix:  document.getElementById("viewMatrix"),
  lastUpdated: document.getElementById("lastUpdated"),
  refreshBtn:  document.getElementById("refreshBtn"),
  grid:        document.getElementById("narrativeGrid"),
  dialog:      document.getElementById("detailDialog"),
  detail:      document.getElementById("detailContent")
};

let currentRows = [];
let sortState = { key: "NSI", dir: -1 };  // default: NSI descending
let currentView = "table";

function fmtMcap(bn) {
  if (bn >= 100) return `$${bn.toFixed(0)}B`;
  if (bn >= 10)  return `$${bn.toFixed(1)}B`;
  if (bn >= 1)   return `$${bn.toFixed(2)}B`;
  return `$${(bn*1000).toFixed(0)}M`;
}
const fmtPct = v => (v >= 0 ? "+" : "") + v.toFixed(1) + "%";
const fmtScore = v => v.toFixed(0);

function sortRows(rows) {
  const { key, dir } = sortState;
  return [...rows].sort((a, b) => {
    if (key === "name") return dir * String(a.name).localeCompare(String(b.name));
    return dir * (((a[key] ?? 0)) - ((b[key] ?? 0)));
  });
}

function renderRanking(rows) {
  els.body.innerHTML = "";
  rows.forEach((r, i) => {
    const row = document.createElement("div");
    row.className = "ranking-row";
    row.dataset.key = r.key;
    row.innerHTML = `
      <div class="col-rank">${i + 1}</div>
      <div class="col-name">${r.name}<small>${r.blurb}</small></div>
      <div class="col-mcap">${fmtMcap(r.mcap_bn)}</div>
      <div class="col-7d ${r.pct_7d >= 0 ? 'pos' : 'neg'}">${fmtPct(r.pct_7d)}</div>
      <div class="col-sub">${fmtScore(r.MCM)}</div>
      <div class="col-sub">${fmtScore(r.VLA)}</div>
      <div class="col-sub">${fmtScore(r.SMS)}</div>
      <div class="col-sub">${fmtScore(r.DEV)}</div>
      <div class="col-sub">${fmtScore(r.CFI)}</div>
      <div class="col-nsi">${r.NSI}</div>
      <div class="col-signal"><span class="signal-pill ${r.signal.cls}">${r.signal.label}</span></div>
    `;
    row.addEventListener("click", () => openDetail(r));
    els.body.appendChild(row);
  });
}

function renderGrid(rows) {
  els.grid.innerHTML = "";
  rows.forEach(r => {
    const card = document.createElement("article");
    card.className = "narrative-card";
    card.innerHTML = `
      <h3>${r.name}</h3>
      <p>${r.blurb}</p>
      <div class="nc-meta">
        <span>NSI ${r.NSI}</span>
        <span class="signal-pill ${r.signal.cls}">${r.signal.label}</span>
      </div>
    `;
    card.addEventListener("click", () => openDetail(r));
    els.grid.appendChild(card);
  });
}

// --- Sortable columns ---
function setSort(key) {
  if (sortState.key === key) sortState.dir *= -1;
  else sortState = { key, dir: key === "name" ? 1 : -1 };
  updateSortIndicators();
  renderRanking(sortRows(currentRows));
}

function updateSortIndicators() {
  document.querySelectorAll(".ranking-head [data-sort]").forEach(el => {
    const k = el.getAttribute("data-sort");
    const active = k === sortState.key;
    el.classList.toggle("active", active);
    let arrow = el.querySelector(".sort-arrow");
    if (!arrow) {
      arrow = document.createElement("span");
      arrow.className = "sort-arrow";
      el.appendChild(arrow);
    }
    arrow.textContent = active ? (sortState.dir < 0 ? "▼" : "▲") : "";
  });
}

function initSortHandlers() {
  document.querySelectorAll(".ranking-head [data-sort]").forEach(el => {
    el.addEventListener("click", () => setSort(el.getAttribute("data-sort")));
  });
}

// --- Matrix / Quadrant view (Momentum MCM vs Liquidity VLA) ---
function renderMatrix(rows) {
  const W = 820, H = 480, mt = 46, mr = 34, mb = 56, ml = 60;
  const iw = W - ml - mr, ih = H - mt - mb;
  const cl = v => Math.max(0, Math.min(100, v || 0));
  const X = v => +(ml + cl(v) / 100 * iw).toFixed(1);
  const Y = v => +(mt + ih - cl(v) / 100 * ih).toFixed(1);
  const ticks = [0, 20, 40, 60, 80, 100];

  let s = `<svg viewBox="0 0 ${W} ${H}" class="matrix-svg" role="img" aria-label="Narrative quadrants: momentum vs liquidity">`;
  // axis titles
  s += `<text class="axis-title" x="${ml}" y="${mt - 24}" text-anchor="start">Momentum (MCM) ↑</text>`;
  s += `<text class="axis-title" x="${ml + iw}" y="${mt + ih + 44}" text-anchor="end">Liquidity Acceleration (VLA) →</text>`;
  // quadrant dividers
  s += `<line class="divider" x1="${X(50)}" y1="${mt}" x2="${X(50)}" y2="${mt + ih}"/>`;
  s += `<line class="divider" x1="${ml}" y1="${Y(50)}" x2="${ml + iw}" y2="${Y(50)}"/>`;
  // axes
  s += `<line class="axis" x1="${ml}" y1="${mt}" x2="${ml}" y2="${mt + ih}"/>`;
  s += `<line class="axis" x1="${ml}" y1="${mt + ih}" x2="${ml + iw}" y2="${mt + ih}"/>`;
  // ticks
  ticks.forEach(t => {
    s += `<text class="tick" x="${ml - 9}" y="${Y(t) + 4}" text-anchor="end">${t}</text>`;
    s += `<text class="tick" x="${X(t)}" y="${mt + ih + 19}" text-anchor="middle">${t}</text>`;
  });
  // quadrant labels
  s += `<text class="quad" x="${X(25)}" y="${mt + 16}" text-anchor="middle">OVERHEATED / ILLIQUID</text>`;
  s += `<text class="quad" x="${X(75)}" y="${mt + 16}" text-anchor="middle">LEADING</text>`;
  s += `<text class="quad" x="${X(25)}" y="${mt + ih - 10}" text-anchor="middle">FADING</text>`;
  s += `<text class="quad" x="${X(75)}" y="${mt + ih - 10}" text-anchor="middle">ACCUMULATING RAILS</text>`;
  // points
  rows.forEach(r => {
    const cx = X(r.VLA), cy = Y(r.MCM);
    const anchor = cx > ml + iw * 0.8 ? "end" : "start";
    const tx = anchor === "end" ? cx - 10 : cx + 10;
    s += `<g class="pt" data-key="${r.key}" tabindex="0" role="button" aria-label="${r.name}, NSI ${r.NSI}">`;
    s += `<circle class="dot ${r.signal.cls}" cx="${cx}" cy="${cy}" r="6"/>`;
    s += `<text class="pt-label" x="${tx}" y="${cy + 4}" text-anchor="${anchor}">${r.name}</text>`;
    s += `</g>`;
  });
  s += `</svg>`;
  els.matrixView.innerHTML = s;
  els.matrixView.querySelectorAll(".pt").forEach(g => {
    const r = rows.find(x => x.key === g.getAttribute("data-key"));
    g.addEventListener("click", () => openDetail(r));
    g.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDetail(r); }
    });
  });
}

function setView(view) {
  currentView = view;
  const matrix = view === "matrix";
  els.matrixView.classList.toggle("hidden", !matrix);
  els.table.classList.toggle("hidden", matrix);
  els.viewMatrix.classList.toggle("active", matrix);
  els.viewTable.classList.toggle("active", !matrix);
  if (matrix) renderMatrix(currentRows);
}

function openDetail(r) {
  els.detail.innerHTML = `
    <h2>${r.name}</h2>
    <p style="color:var(--ink-soft);margin:0">${r.blurb}</p>
    <div class="nsi-display">${r.NSI} <span style="font-size:1rem;color:var(--ink-soft)">/ 100</span> <span class="signal-pill ${r.signal.cls}" style="font-size:.85rem;vertical-align:middle;margin-left:.5rem">${r.signal.label}</span></div>

    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:.5rem;margin-bottom:1rem">
      ${["MCM","VLA","SMS","DEV","CFI"].map(k => `
        <div style="background:var(--line-soft);border-radius:8px;padding:.6rem;text-align:center">
          <div style="font-size:.7rem;color:var(--ink-soft);font-family:'JetBrains Mono',monospace;letter-spacing:.05em">${k}</div>
          <div style="font-family:'JetBrains Mono',monospace;font-weight:700;font-size:1.1rem">${r[k].toFixed(0)}</div>
        </div>
      `).join("")}
    </div>

    <h3>Market snapshot</h3>
    <p>
      <span class="mono">${fmtMcap(r.mcap_bn)}</span> mcap ·
      <span class="mono">${fmtMcap(r.vol_bn)}</span> 24h vol ·
      <span class="mono ${r.pct_7d >= 0 ? 'pos' : 'neg'}" style="color:${r.pct_7d>=0?'var(--green)':'var(--red)'}">${fmtPct(r.pct_7d)}</span> 7d return
    </p>

    <h3>Thesis</h3>
    <p>${r.thesis}</p>

    <h3>Key tickers</h3>
    <div class="key-tickers">
      ${r.tickers.map(t => `<span class="ticker-chip">${t}</span>`).join("")}
    </div>

    <h3>Invalidation</h3>
    <div class="invalidation">${r.invalidation}</div>
  `;
  els.dialog.showModal();
}

els.dialog.addEventListener("click", e => {
  if (e.target.dataset.close !== undefined || e.target === els.dialog) {
    els.dialog.close();
  }
});

function formatStamp(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch { return iso; }
}

// --- Data orchestration ---
function applyData(rows) {
  currentRows = rows;
  updateSortIndicators();
  renderRanking(sortRows(rows));
  renderGrid([...rows].sort((a, b) => b.NSI - a.NSI));
  if (currentView === "matrix") renderMatrix(rows);
}

function finishStamp(snap) {
  const live = snap.source === "live" || snap.source === "server";
  const label = live ? "Live" : snap.source === "snapshot" ? "Snapshot" : "Cached";
  els.lastUpdated.textContent = `${label} · ${snap.capturedAt ? formatStamp(snap.capturedAt) : "—"}`;
  const fallback = snap.source === "embedded-fallback";
  els.error.classList.toggle("hidden", !fallback);
  if (fallback) els.cachedDate.textContent = snap.capturedAt;
}

async function loadInitial() {
  els.loading.classList.remove("hidden");
  els.error.classList.add("hidden");
  els.table.classList.add("hidden");
  els.lastUpdated.textContent = "Loading…";
  let snap;
  try {
    snap = await window.NSI.loadServer();        // server cache (Railway)
  } catch {
    snap = await window.NSI.loadSnapshot();       // committed snapshot / embedded fallback
  }
  applyData(window.NSI.buildRanking(snap.rawByKey));
  els.loading.classList.add("hidden");
  if (currentView === "table") els.table.classList.remove("hidden");
  finishStamp(snap);
}

async function refresh() {
  els.refreshBtn.disabled = true;
  els.lastUpdated.textContent = "Refreshing…";
  try {
    const snap = await window.NSI.loadServer(true);
    applyData(window.NSI.buildRanking(snap.rawByKey));
    finishStamp(snap);
  } catch {
    try {
      const snap = await window.NSI.loadSnapshot();
      applyData(window.NSI.buildRanking(snap.rawByKey));
      finishStamp(snap);
    } catch {
      els.lastUpdated.textContent = "Refresh failed";
    }
  } finally {
    els.refreshBtn.disabled = false;
  }
}

els.refreshBtn.addEventListener("click", refresh);
els.viewTable.addEventListener("click", () => setView("table"));
els.viewMatrix.addEventListener("click", () => setView("matrix"));
initSortHandlers();
loadInitial();
