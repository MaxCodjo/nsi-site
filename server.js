import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// --- Narrative universe → CoinGecko categories (mirrors js/narratives.js & scripts/snapshot.py) ---
const NARRATIVES = [
  ["prediction-markets", ["prediction-markets"]],
  ["stablecoins", ["stablecoins"]],
  ["ai-agents", ["ai-agents", "artificial-intelligence"]],
  ["solana-ecosystem", ["solana-ecosystem"]],
  ["depin", ["depin"]],
  ["rwa", ["real-world-assets-rwa"]],
  ["defi", ["decentralized-finance-defi"]],
  ["liquid-staking", ["liquid-staking", "restaking"]],
  ["layer-2", ["layer-2"]],
  ["memecoins", ["meme-token"]],
  ["gaming", ["gaming"]],
  ["socialfi", ["socialfi"]],
  ["nft", ["non-fungible-tokens-nft"]],
  ["zk", ["zero-knowledge-zk"]],
  ["modular", ["modular-blockchain", "data-availability"]],
  ["bitcoin-ecosystem", ["bitcoin-ecosystem"]],
  ["oracle", ["oracle"]],
  ["privacy", ["privacy-coins"]],
  ["dex-perps", ["decentralized-exchange"]],
  ["cex-tokens", ["centralized-exchange-token-cex"]],
  ["tokenized-gold", ["tokenized-gold"]],
];

const CG = "https://api.coingecko.com/api/v3";
const CG_KEY = process.env.COINGECKO_API_KEY || ""; // free CoinGecko Demo key — lifts the 429 rate limit on shared cloud IPs
const REFRESH_MS = 15 * 60 * 1000; // refresh the server cache every 15 minutes
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// In-memory cache shared by all visitors — no client ever hits CoinGecko directly.
let cache = { capturedAt: null, raw: null, source: "none", updatedAt: 0 };
let refreshing = false;

async function snapshotRaw() {
  try {
    const txt = await readFile(path.join(__dirname, "data", "latest.json"), "utf8");
    return JSON.parse(txt).raw || {};
  } catch {
    return {};
  }
}

async function fetchCategory(catId, attempt = 0) {
  const url =
    `${CG}/coins/markets?vs_currency=usd&category=${catId}` +
    `&order=market_cap_desc&per_page=20&page=1&price_change_percentage=7d&sparkline=false`;
  const headers = { "User-Agent": "nsi-site/1.0" };
  if (CG_KEY) headers["x-cg-demo-api-key"] = CG_KEY;
  const res = await fetch(url, { headers });
  if (res.status === 429 && attempt < 3) {
    await sleep(2000 * (attempt + 1));
    return fetchCategory(catId, attempt + 1);
  }
  if (!res.ok) throw new Error(`CG ${catId}: ${res.status}`);
  return res.json();
}

function aggregate(coins) {
  let mcap = 0, vol = 0, w7d = 0;
  for (const c of coins) {
    const m = c.market_cap || 0;
    mcap += m;
    vol += c.total_volume || 0;
    const p = c.price_change_percentage_7d_in_currency;
    if (typeof p === "number") w7d += m * p;
  }
  return { mcap_bn: mcap / 1e9, vol_bn: vol / 1e9, pct_7d: mcap > 0 ? w7d / mcap : 0 };
}

// Pull the whole universe from CoinGecko and replace the cache, with graceful degradation.
async function refreshCache() {
  if (refreshing) return;
  refreshing = true;
  try {
    const raw = {};
    let failures = 0;
    for (const [key, cats] of NARRATIVES) {
      try {
        const all = [];
        for (const cat of cats) {
          all.push(...(await fetchCategory(cat)));
          await sleep(700);
        }
        const seen = new Set();
        const unique = all.filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));
        raw[key] = aggregate(unique);
      } catch (e) {
        failures++;
        console.warn(`refresh ${key} failed: ${e.message}`);
      }
    }
    // Only promote a refresh that covered most of the universe.
    if (Object.keys(raw).length >= NARRATIVES.length - 3) {
      const seed = await snapshotRaw();
      for (const [key] of NARRATIVES) {
        if (!raw[key]) raw[key] = (cache.raw && cache.raw[key]) || seed[key] || { mcap_bn: 0, vol_bn: 0, pct_7d: 0 };
      }
      cache = { capturedAt: new Date().toISOString(), raw, source: "live", updatedAt: Date.now() };
      console.log(`NSI cache refreshed (${failures} partial failures)`);
    } else {
      console.warn(`refresh too incomplete (${failures} failures) — keeping previous cache`);
    }
  } finally {
    refreshing = false;
  }
}

// --- API: cached NSI data (stale-while-revalidate) ---
app.get("/api/nsi", async (req, res) => {
  const stale = Date.now() - cache.updatedAt > REFRESH_MS;
  if ((req.query.fresh === "1" || stale) && !refreshing) refreshCache(); // fire-and-forget
  res.set("Cache-Control", "no-store");
  if (!cache.raw) {
    const raw = await snapshotRaw();
    return res.json({ capturedAt: null, raw, source: "snapshot" });
  }
  res.json({ capturedAt: cache.capturedAt, raw: cache.raw, source: cache.source });
});

app.get("/healthz", (_req, res) =>
  res.json({ status: "ok", cache: cache.source, updatedAt: cache.updatedAt })
);

// Serve the static NSI site (index.html, css, js, data, assets) from the repo root.
app.use(express.static(__dirname));

app.listen(PORT, () => {
  console.log(`nsi-site running on port ${PORT}`);
  // Seed from the committed snapshot, then kick off live refresh + interval.
  (async () => {
    const raw = await snapshotRaw();
    if (Object.keys(raw).length) cache = { capturedAt: null, raw, source: "snapshot", updatedAt: 0 };
    refreshCache();
    setInterval(refreshCache, REFRESH_MS);
  })();
});
