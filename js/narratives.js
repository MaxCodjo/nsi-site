// Narrative universe — maps each tracked narrative to CoinGecko category IDs,
// qualitative tiers (mindshare, dev, flow), and editorial content.

window.NARRATIVES = [
  {
    key: "prediction-markets",
    name: "Prediction Markets",
    blurb: "Event-contract platforms — Kalshi, Polymarket, on-chain proxies.",
    cgCategories: ["prediction-markets"],
    mindshareDelta: 5.2,
    devTier: 0.6,
    flowTier: 1.0,
    tickers: ["REP", "NMR", "RAIN", "POLYMARKET (private)"],
    thesis: "Sector volume crossed $21B monthly notional in early 2026. Kalshi at ~71% market share. Polymarket token launch is the highest-conviction 2026 airdrop catalyst.",
    invalidation: "US CFTC reverses 2025 event-contract stance, OR Kalshi weekly notional < $2B for 2 consecutive weeks."
  },
  {
    key: "stablecoins",
    name: "Stablecoins",
    blurb: "Tokenized dollars and dollar-equivalents — the rails of crypto.",
    cgCategories: ["stablecoins"],
    mindshareDelta: 1.2,
    devTier: 1.0,
    flowTier: 1.0,
    tickers: ["USDT", "USDC", "USDe", "USDS", "ENA", "SKY"],
    thesis: "$300B+ sector mcap, ~$100B daily turnover. 2026 is the year stablecoins become 'the internet's dollar.' Best exposure is via issuer-linked tokens (ENA, SKY/MKR) and beneficiary L1s.",
    invalidation: "Major reserve break (USDT/USDC depeg > 3%), OR US legislation imposing punitive reserve carve-outs."
  },
  {
    key: "ai-agents",
    name: "AI & AI Agents",
    blurb: "Decentralized inference, agent frameworks, autonomous on-chain agents.",
    cgCategories: ["ai-agents", "artificial-intelligence"],
    mindshareDelta: 3.8,
    devTier: 1.0,
    flowTier: 0.6,
    tickers: ["TAO", "FET", "VIRTUAL", "RENDER", "KITE", "IP", "LINK"],
    thesis: "Agentic commerce (Cloudflare/Google + crypto rails) is the dominant 2026 meta per Messari. Sustained dev activity, high mindshare delta.",
    invalidation: "TAO breaks below $200 with 7d volume contraction, OR VIRTUAL agent-launch counts decline 3 consecutive weeks."
  },
  {
    key: "solana-ecosystem",
    name: "Solana Ecosystem",
    blurb: "Solana L1 and the consumer apps, DEXes, and DePINs built on it.",
    cgCategories: ["solana-ecosystem"],
    mindshareDelta: 0.4,
    devTier: 1.0,
    flowTier: 0.6,
    tickers: ["SOL", "JUP", "JTO", "PUMP", "BONK", "HNT"],
    thesis: "De facto venue for consumer apps, memecoins, prediction markets, and DePIN. Massive liquidity but momentum has rotated out short-term.",
    invalidation: "SOL loses $75 weekly close, OR Pump.fun daily revenue < $500k for 2 weeks."
  },
  {
    key: "depin",
    name: "DePIN",
    blurb: "Decentralized physical infrastructure — wireless, GPU, mapping, geospatial.",
    cgCategories: ["depin"],
    mindshareDelta: 2.1,
    devTier: 1.0,
    flowTier: 0.6,
    tickers: ["TAO", "RENDER", "FIL", "HNT", "IO", "AKT", "GRASS"],
    thesis: "Messari projects >$100M on-chain verifiable revenue in 2026. AI-compute sub-narrative is hottest. Helium leads on real adoption (2.5M DAUs, AT&T partner).",
    invalidation: "RENDER 7d down > 10% AND TAO breaks $230, OR Helium MOBILE subscribers stall."
  },
  {
    key: "rwa",
    name: "RWA Tokenization",
    blurb: "On-chain treasuries, private credit, equities, commodities.",
    cgCategories: ["real-world-assets-rwa"],
    mindshareDelta: 1.5,
    devTier: 0.6,
    flowTier: 1.0,
    tickers: ["ONDO", "LINK", "MKR", "CFG", "POLYX", "OM"],
    thesis: "Cleanest institutional flow story. $33.8B on-chain (RWA.xyz), Solana RWA TVL +22.5% MoM. Low NSI = retail price action lags institutional flows. Buy the boring.",
    invalidation: "RWA.xyz total value declines 2 consecutive months, OR BlackRock BUIDL AUM contracts."
  },
  {
    key: "defi",
    name: "DeFi & BTCfi",
    blurb: "Lending, DEXes, perps, and Bitcoin-native DeFi.",
    cgCategories: ["decentralized-finance-defi"],
    mindshareDelta: 1.0,
    devTier: 1.0,
    flowTier: 0.6,
    tickers: ["AAVE", "UNI", "MKR", "HYPE", "BABY", "LOMB", "SOLV"],
    thesis: "Blue-chips (AAVE, UNI, LINK) not leading. BTCfi most interesting sub-pocket: Babylon $4.9B TVL, Lombard $2B, SOLV $1.8B.",
    invalidation: "AAVE TVL declines 15% from current, OR BTCfi aggregate TVL drops below $25B."
  },
  {
    key: "liquid-staking",
    name: "Liquid Staking / Restaking",
    blurb: "ETH/SOL LSTs and AVS restaking infrastructure.",
    cgCategories: ["liquid-staking", "restaking"],
    mindshareDelta: 0.6,
    devTier: 0.6,
    flowTier: 0.6,
    tickers: ["LDO", "EIGEN", "ETHFI", "RPL", "JTO"],
    thesis: "Restaking euphoria fully normalized — now a yield-infra play, not a narrative trade. Park capital here only inside a broader ETH thesis.",
    invalidation: "ETH itself loses key support, OR restaking AVS revenue stays anemic."
  },
  {
    key: "layer-2",
    name: "Ethereum L2s",
    blurb: "Optimistic and ZK rollups settling to Ethereum.",
    cgCategories: ["layer-2"],
    mindshareDelta: -0.8,
    devTier: 1.0,
    flowTier: 0.3,
    tickers: ["ARB", "OP", "MNT", "IMX"],
    thesis: "Worst capital-flow score in the universe. Sequencer revenue collapsing post-Pectra blob expansion; ARB/OP/MATIC at multi-year lows vs ETH.",
    invalidation: "Robinhood-scale consumer app deploys exclusively on a single L2 and drives sustained revenue."
  },
  {
    key: "memecoins",
    name: "Memecoins",
    blurb: "Pure attention assets — Solana, Base, BNB meme cohorts.",
    cgCategories: ["meme-token"],
    mindshareDelta: -1.4,
    devTier: 0.3,
    flowTier: 0.3,
    tickers: ["—"],
    thesis: "Bottom of every sub-indicator. 2024–2025 supercycle has decisively ended. Tactical longs only on specific event catalysts.",
    invalidation: "Solana memecoin daily volume sustains > $5B for a week AND BTC dominance breaks below 55%."
  }
];

// Fallback snapshot — used when CoinGecko is unreachable.
// Captured 27 May 2026.
window.NSI_FALLBACK = {
  capturedAt: "2026-05-27",
  raw: {
    "prediction-markets": { mcap_bn: 8.36, vol_bn: 0.093, pct_7d: 69.71 },
    "stablecoins":        { mcap_bn: 300.86, vol_bn: 102.29, pct_7d: -0.08 },
    "ai-agents":          { mcap_bn: 28.38, vol_bn: 5.11, pct_7d: 7.10 },
    "solana-ecosystem":   { mcap_bn: 327.99, vol_bn: 104.06, pct_7d: -0.27 },
    "depin":              { mcap_bn: 11.33, vol_bn: 1.86, pct_7d: 7.09 },
    "rwa":                { mcap_bn: 11.28, vol_bn: 0.879, pct_7d: -1.57 },
    "defi":               { mcap_bn: 51.52, vol_bn: 3.57, pct_7d: 5.98 },
    "liquid-staking":     { mcap_bn: 1.15, vol_bn: 0.162, pct_7d: 1.96 },
    "layer-2":            { mcap_bn: 5.55, vol_bn: 0.591, pct_7d: -2.49 },
    "memecoins":          { mcap_bn: 31.11, vol_bn: 2.25, pct_7d: -3.87 }
  }
};
