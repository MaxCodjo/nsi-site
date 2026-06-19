# Narrative Strength Index (NSI)

A static, single-page website that publishes a live quantitative ranking of crypto narratives.

**Live preview:** _(set on deploy)_
**Methodology:** see [Methodology section in-app](#methodology) or `/js/nsi.js`.

## What it does

NSI compresses five quantifiable signals into one 0–100 score per narrative:

```
NSI = 0.25·MCM + 0.20·VLA + 0.20·SMS + 0.15·DEV + 0.20·CFI
```

| Code | Sub-indicator | Source |
|------|---------------|--------|
| MCM | Market-Cap Momentum (cap-weighted 7d return) | **Live** — CoinGecko `/coins/markets?category=…` |
| VLA | Volume / Liquidity (24h vol ÷ mcap) | **Live** — CoinGecko |
| SMS | Social Mindshare Shift (Δ share-of-voice) | Tiered — pluggable to Kaito / LunarCrush |
| DEV | Developer Activity | Tiered — pluggable to Electric Capital / Artemis |
| CFI | Capital Inflows (ETF + stables + bridges, 14d) | Tiered — pluggable to DefiLlama / Farside |

Each sub-indicator is min-max normalized within the 21-narrative universe, so NSI is a **relative** strength score, not absolute.

Signal buckets: **NSI ≥ 65 = Accumulate · 45–65 = Hold/Watch · < 45 = Fade**

## Running locally

It's a static site — no build step needed.

```bash
# Any static server works; example with Python
python3 -m http.server 8080
# then open http://localhost:8080
```

Or open `index.html` directly in a browser. CoinGecko's public API is CORS-enabled and requires no key for the free tier.

## Deploying to GitHub Pages

```bash
git clone https://github.com/maxcodjo/nsi-site.git
cd nsi-site
# (copy this repo's files in)
git add . && git commit -m "Initial NSI site"
git push origin main
```

Then on github.com → **Settings → Pages → Source: Deploy from a branch → main / root**. Your site will be live at `https://maxcodjo.github.io/nsi-site/` in ~1 minute.

## Project structure

```
index.html             ← single page
css/styles.css         ← all styles (light + dark, no framework)
js/narratives.js       ← the 21-narrative universe + qualitative tiers + fallback snapshot
js/nsi.js              ← CoinGecko fetcher and NSI compute engine
js/app.js              ← rendering and interactivity
assets/favicon.svg
```

## Roadmap

- [ ] Wire SMS to Kaito Pro API (currently tiered)
- [ ] Wire DEV to Electric Capital monthly active dev counts
- [ ] Wire CFI to DefiLlama + Farside ETF flow data
- [ ] Add 30d historical sparkline per narrative
- [ ] GitHub Actions nightly snapshot to `data/history.json`

## Disclaimer

Research and education only. Not investment advice. The NSI is a relative-strength tool — overlay your own macro view, risk-management rules, and event-risk awareness before acting on any signal.

## License

MIT
