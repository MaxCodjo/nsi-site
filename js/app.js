// App glue — orchestrates fetch, render, theme, and detail-dialog interactions.

document.getElementById("year").textContent = new Date().getFullYear();

// Theme toggle (prefers-color-scheme, no storage available in sandbox iframes)
(function initTheme() {
  const root = document.documentElement;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  root.setAttribute("data-theme", prefersDark ? "dark" : "light");
  document.getElementById("themeToggle").addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
  });
})();

const els = {
  loading:     document.getElementById("loadingState"),
  error:       document.getElementById("errorState"),
  cachedDate:  document.getElementById("cachedDate"),
  table:       document.getElementById("rankingTable"),
  body:        document.getElementById("rankingBody"),
  lastUpdated: document.getElementById("lastUpdated"),
  refreshBtn:  document.getElementById("refreshBtn"),
  grid:        document.getElementById("narrativeGrid"),
  dialog:      document.getElementById("detailDialog"),
  detail:      document.getElementById("detailContent")
};

function fmtMcap(bn) {
  if (bn >= 100) return `$${bn.toFixed(0)}B`;
  if (bn >= 10)  return `$${bn.toFixed(1)}B`;
  if (bn >= 1)   return `$${bn.toFixed(2)}B`;
  return `$${(bn*1000).toFixed(0)}M`;
}
const fmtPct = v => (v >= 0 ? "+" : "") + v.toFixed(1) + "%";
const fmtScore = v => v.toFixed(0);

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

async function renderFromSnapshot() {
  els.loading.classList.remove("hidden");
  els.error.classList.add("hidden");
  els.table.classList.add("hidden");
  els.lastUpdated.textContent = "Loading snapshot…";
  const snap = await window.NSI.loadSnapshot();
  const rows = window.NSI.buildRanking(snap.rawByKey);
  renderRanking(rows);
  renderGrid(rows);
  els.loading.classList.add("hidden");
  els.table.classList.remove("hidden");
  els.lastUpdated.textContent = `Snapshot · ${formatStamp(snap.capturedAt)}`;
  if (snap.source === "embedded-fallback") {
    els.error.classList.remove("hidden");
    els.cachedDate.textContent = snap.capturedAt;
  }
}

async function refreshLive() {
  els.refreshBtn.disabled = true;
  const originalLabel = els.refreshBtn.textContent;
  els.lastUpdated.textContent = "Fetching live… 0/10";
  try {
    const live = await window.NSI.loadLive((done, total) => {
      els.lastUpdated.textContent = `Fetching live… ${done}/${total}`;
    });
    const rows = window.NSI.buildRanking(live.rawByKey);
    renderRanking(rows);
    renderGrid(rows);
    const partial = live.errors && live.errors.length > 0;
    els.lastUpdated.textContent = partial
      ? `Live (partial — ${live.errors.length} fell back) · ${new Date().toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'})}`
      : `Live · ${new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`;
  } catch (e) {
    els.lastUpdated.textContent = "Live fetch failed — showing snapshot";
    await renderFromSnapshot();
  } finally {
    els.refreshBtn.disabled = false;
    els.refreshBtn.textContent = originalLabel;
  }
}

els.refreshBtn.addEventListener("click", refreshLive);

renderFromSnapshot();
