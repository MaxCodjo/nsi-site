// NSI compute engine — fetches per-category market data from CoinGecko and
// computes the Narrative Strength Index across the configured universe.

const CG_BASE = "https://api.coingecko.com/api/v3";

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Fetch top constituents of a category with one retry on rate-limit.
async function fetchCategory(catId, attempt = 0) {
  const url = `${CG_BASE}/coins/markets?vs_currency=usd&category=${catId}` +
              `&order=market_cap_desc&per_page=20&page=1&price_change_percentage=7d&sparkline=false`;
  const res = await fetch(url);
  if (res.status === 429 && attempt < 2) {
    await sleep(1500 * (attempt + 1));
    return fetchCategory(catId, attempt + 1);
  }
  if (!res.ok) throw new Error(`CG ${catId}: ${res.status}`);
  return res.json();
}

function aggregate(coins) {
  let mcap = 0, vol = 0, w7d = 0;
  for (const c of coins) {
    const m = c.market_cap || 0;
    const v = c.total_volume || 0;
    const p = c.price_change_percentage_7d_in_currency;
    mcap += m;
    vol  += v;
    if (typeof p === "number") w7d += m * p;
  }
  return {
    mcap_bn: mcap / 1e9,
    vol_bn:  vol  / 1e9,
    pct_7d:  mcap > 0 ? w7d / mcap : 0
  };
}

// Min-max scaling to 0-100 within the universe.
function minmax(values) {
  const lo = Math.min(...values), hi = Math.max(...values);
  if (hi === lo) return values.map(() => 50);
  return values.map(v => ((v - lo) / (hi - lo)) * 100);
}

function signalFor(nsi) {
  if (nsi >= 65) return { label: "ACCUMULATE", cls: "accumulate" };
  if (nsi >= 45) return { label: "HOLD/WATCH", cls: "hold" };
  return { label: "FADE", cls: "fade" };
}

// Build the full ranking from raw per-narrative data.
function buildRanking(rawByKey) {
  const rows = window.NARRATIVES.map(n => {
    const raw = rawByKey[n.key] || { mcap_bn: 0, vol_bn: 0, pct_7d: 0 };
    return {
      ...n,
      mcap_bn: raw.mcap_bn,
      vol_bn:  raw.vol_bn,
      pct_7d:  raw.pct_7d,
      vol_to_mcap: raw.mcap_bn > 0 ? raw.vol_bn / raw.mcap_bn : 0
    };
  });

  const MCM = minmax(rows.map(r => r.pct_7d));
  const VLA = minmax(rows.map(r => r.vol_to_mcap));
  const SMS = minmax(rows.map(r => r.mindshareDelta));
  const DEV = minmax(rows.map(r => r.devTier));
  const CFI = minmax(rows.map(r => r.flowTier));

  rows.forEach((r, i) => {
    r.MCM = MCM[i]; r.VLA = VLA[i]; r.SMS = SMS[i];
    r.DEV = DEV[i]; r.CFI = CFI[i];
    r.NSI = +(0.25*MCM[i] + 0.20*VLA[i] + 0.20*SMS[i]
            + 0.15*DEV[i] + 0.20*CFI[i]).toFixed(1);
    r.signal = signalFor(r.NSI);
  });

  rows.sort((a, b) => b.NSI - a.NSI);
  return rows;
}

// Public entry — fetch live or fall back.
window.NSI = {
  buildRanking,
  async loadLive(onProgress) {
    const results = {};
    const errors = [];
    // Sequential with generous spacing — CoinGecko free tier is strict on burst rate (~30 req/min).
    const total = window.NARRATIVES.length;
    let done = 0;
    for (const n of window.NARRATIVES) {
      try {
        const all = [];
        for (const cat of n.cgCategories) {
          const data = await fetchCategory(cat);
          all.push(...data);
          await sleep(700);
        }
        const seen = new Set();
        const unique = all.filter(c => {
          if (seen.has(c.id)) return false;
          seen.add(c.id); return true;
        });
        results[n.key] = aggregate(unique);
      } catch (e) {
        errors.push({ key: n.key, err: e.message });
      }
      done++;
      if (onProgress) onProgress(done, total);
    }
    if (errors.length === window.NARRATIVES.length) {
      throw new Error("All CoinGecko requests failed");
    }
    // Fill any missing with fallback
    for (const n of window.NARRATIVES) {
      if (!results[n.key]) results[n.key] = window.NSI_FALLBACK.raw[n.key];
    }
    return { rawByKey: results, errors };
  },
  loadFallback() {
    return { rawByKey: window.NSI_FALLBACK.raw, errors: [], cached: window.NSI_FALLBACK.capturedAt };
  },
  // Load from our own server cache (Railway /api/nsi) — server-side fetched + cached
  // every ~15 min, so no client ever hits CoinGecko and there are no rate-limit failures.
  async loadServer(fresh = false) {
    const res = await fetch("/api/nsi" + (fresh ? "?fresh=1" : ""), { cache: "no-store" });
    if (!res.ok) throw new Error("server " + res.status);
    const json = await res.json();
    if (!json.raw || !Object.keys(json.raw).length) throw new Error("server: empty");
    return { rawByKey: json.raw, errors: [], capturedAt: json.capturedAt, source: json.source || "live" };
  },
  // Load a pre-built snapshot from data/latest.json (committed by the snapshot script).
  // Falls through to the hard-coded fallback if the file is missing.
  async loadSnapshot() {
    try {
      const res = await fetch("data/latest.json?cb=" + Date.now(), { cache: "no-store" });
      if (!res.ok) throw new Error("snapshot " + res.status);
      const json = await res.json();
      return { rawByKey: json.raw, errors: [], capturedAt: json.capturedAt, source: "snapshot" };
    } catch (e) {
      const fb = window.NSI.loadFallback();
      return { ...fb, capturedAt: fb.cached, source: "embedded-fallback" };
    }
  }
};
