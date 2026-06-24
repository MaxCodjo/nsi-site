#!/usr/bin/env python3
"""
Build a fresh NSI data snapshot from CoinGecko and write it to data/latest.json.

Run locally:        python3 scripts/snapshot.py
GitHub Actions:     workflow runs this on a schedule and commits the result.

This script mirrors the JS NSI logic in js/nsi.js so server and client agree.
"""

import json
import time
import urllib.request
from pathlib import Path
from datetime import datetime, timezone

CG = "https://api.coingecko.com/api/v3"

NARRATIVES = [
    ("prediction-markets",  ["prediction-markets"]),
    ("stablecoins",         ["stablecoins"]),
    ("ai-agents",           ["ai-agents", "artificial-intelligence"]),
    ("solana-ecosystem",    ["solana-ecosystem"]),
    ("depin",               ["depin"]),
    ("rwa",                 ["real-world-assets-rwa"]),
    ("defi",                ["decentralized-finance-defi"]),
    ("liquid-staking",      ["liquid-staking", "restaking"]),
    ("layer-2",             ["layer-2"]),
    ("memecoins",           ["meme-token"]),
    ("gaming",              ["gaming"]),
    ("socialfi",            ["socialfi"]),
    ("nft",                 ["non-fungible-tokens-nft"]),
    ("zk",                  ["zero-knowledge-zk"]),
    ("modular",             ["modular-blockchain", "data-availability"]),
    ("bitcoin-ecosystem",   ["bitcoin-ecosystem"]),
    ("oracle",              ["oracle"]),
    ("privacy",             ["privacy-coins"]),
    ("dex-perps",           ["decentralized-exchange"]),
    ("cex-tokens",          ["centralized-exchange-token-cex"]),
    ("tokenized-gold",      ["tokenized-gold"]),
]


def fetch_category(cat_id, retries=6):
    url = (f"{CG}/coins/markets?vs_currency=usd&category={cat_id}"
           f"&order=market_cap_desc&per_page=20&page=1"
           f"&price_change_percentage=7d&sparkline=false")
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "nsi-snapshot/1.0"})
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read())
        except Exception as e:
            wait = 15 * (attempt + 1)
            print(f"  retry {cat_id} in {wait}s ({e})")
            time.sleep(wait)
    raise RuntimeError(f"giving up on {cat_id}")


def aggregate(coins):
    mcap = sum((c.get("market_cap") or 0) for c in coins)
    vol  = sum((c.get("total_volume") or 0) for c in coins)
    w7d  = sum((c.get("market_cap") or 0)
               * ((c.get("price_change_percentage_7d_in_currency") or 0))
               for c in coins)
    return {
        "mcap_bn": mcap / 1e9,
        "vol_bn":  vol  / 1e9,
        "pct_7d":  (w7d / mcap) if mcap > 0 else 0.0,
    }


def main():
    out = {"capturedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
           "raw": {}}
    for key, cats in NARRATIVES:
        print(f"fetching {key}...")
        merged, seen = [], set()
        for cat in cats:
            for coin in fetch_category(cat):
                if coin["id"] in seen: continue
                seen.add(coin["id"]); merged.append(coin)
            time.sleep(5)
        out["raw"][key] = aggregate(merged)
        print(f"  -> mcap=${out['raw'][key]['mcap_bn']:.2f}B "
              f"7d={out['raw'][key]['pct_7d']:+.1f}%")
    data_dir = Path(__file__).resolve().parent.parent / "data"
    data_dir.mkdir(exist_ok=True)
    target = data_dir / "latest.json"
    target.write_text(json.dumps(out, indent=2))
    print(f"\nwrote {target}")

    # Append to a rolling history (last 120 snapshots) so the client can later
    # compute NSI directional deltas (Δ7d / Δ30d). Raw is enough — NSI is derived
    # from raw + the static tiers in js/narratives.js, so history is recomputable.
    hist_path = data_dir / "history.json"
    history = []
    if hist_path.exists():
        try:
            history = json.loads(hist_path.read_text())
            if not isinstance(history, list):
                history = []
        except Exception:
            history = []
    history.append({"capturedAt": out["capturedAt"], "raw": out["raw"]})
    history = history[-120:]
    hist_path.write_text(json.dumps(history))
    print(f"history now has {len(history)} snapshot(s) -> {hist_path}")


if __name__ == "__main__":
    main()
