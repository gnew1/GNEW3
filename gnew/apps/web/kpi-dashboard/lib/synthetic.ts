type Params = { chain: string; network: string; token: string; range: string };
export function buildSynthetic({ chain, network, token, range }: Params) {
  const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
  const today = new Date();
  const ts = Array.from({ length: days }).map((_, i) => {
    const d = new Date(today); d.setDate(d.getDate() - (days - 1 - i));
    const base = 1 + Math.sin(i / 5) * 0.05 + Math.random() * 0.02;
    return {
      date: d.toISOString().slice(0,10),
      price: +(1.2 * base + Math.random()*0.02).toFixed(4),
      volume: Math.round(1_000_000 * base * (1 + Math.sin(i/3) * 0.2)),
      tvl: Math.round(25_000_000 * (1 + Math.sin(i/20)*0.1)),
      tx: Math.round(120_000 * (1 + Math.sin(i/7)*0.2)),
      active_addresses: Math.round(35_000 * (1 + Math.cos(i/6)*0.15)),
      fees: +(150_000 * base * (1 + Math.sin(i/10)*0.15)).toFixed(2),
      apr: +(0.06 + Math.sin(i/30)*0.01).toFixed(4),
    };
  });
  const last = ts[ts.length-1];
  const circSupply = 100_000_000;
  const price = last.price;
  const holders = 56_234;
  return {
    summary: {
      chain, network, token,
      price_usd: price,
      market_cap_usd: Math.round(price * circSupply),
      tvl_usd: last.tvl,
      tx_count_24h: last.tx,
      active_addresses_24h: last.active_addresses,
      fees_24h: last.fees,
      apr_estimate: last.apr,
      circ_supply: circSupply,
      holders,
      holder_buckets: [34,26,19,13,8]
    },
    dao: {
      proposals_30d: 18,
      voters_30d: 4212,
      participation_rate_30d: 0.37
    },
    timeseries: ts
  };
}

