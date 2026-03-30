export function formatRate(rate: number): string {
  if (rate >= 100) return rate.toFixed(0);
  if (rate >= 10) return rate.toFixed(1);
  return rate.toFixed(2);
}

export function formatPower(mw: number): string {
  if (mw >= 1000) return `${(mw / 1000).toFixed(1)} GW`;
  return `${formatRate(mw)} MW`;
}

export function formatCount(count: number): string {
  const rounded = Math.ceil(count);
  if (Math.abs(count - rounded) < 0.001) return `${rounded}`;
  return `${count.toFixed(2)} (${rounded})`;
}
