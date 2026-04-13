export function formatRate(rate: number): string {
  if (rate >= 100) return rate.toFixed(0);
  if (rate >= 10) return rate.toFixed(1);
  return rate.toFixed(2);
}

// Thresholds in MW (descending). Each entry: [threshold, divisor, suffix]
const POWER_TIERS: [number, number, string][] = [
  [1e24, 1e24, 'QW'],  // quetta
  [1e21, 1e21, 'RW'],  // ronna
  [1e18, 1e18, 'YW'],  // yotta
  [1e15, 1e15, 'ZW'],  // zetta
  [1e12, 1e12, 'EW'],  // exa
  [1e9,  1e9,  'PW'],  // peta
  [1e6,  1e6,  'TW'],  // tera
  [1e3,  1e3,  'GW'],  // giga
];

export function formatPower(mw: number): string {
  for (const [threshold, divisor, suffix] of POWER_TIERS) {
    if (mw >= threshold) return `${(mw / divisor).toFixed(2)} ${suffix}`;
  }
  return `${formatRate(mw)} MW`;
}


export function formatCount(count: number): string {
  const rounded = Math.ceil(count);
  if (Math.abs(count - rounded) < 0.001) return `${rounded}`;
  return `${count.toFixed(2)} (${rounded})`;
}
