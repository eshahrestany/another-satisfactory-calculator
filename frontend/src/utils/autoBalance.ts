/**
 * Compute the clock speed that turns a fractional machine count into a whole
 * number of machines, while preserving total throughput.
 *
 * Two modes:
 *   - `respectClock = true` (legacy): compute `n` from the machine count at
 *     the node's *current* clock speed and the resulting clock will scale that
 *     count to a whole number. Useful when the user has overclocked a node
 *     and wants the balance to round relative to that overclocked value.
 *   - `respectClock = false` (default): pretend the machine is at its default
 *     clock speed (global default for recipes/water, 100% for miners), round
 *     the count there, and produce the clock that gives that integer count
 *     the right throughput. Avoids the surprise where overclocking a node
 *     locks balancing into a smaller machine count.
 *
 * Returns `null` when the count is already a whole number, or the resulting
 * clock would fall outside the in-game [1%, 250%] range.
 */
export function computeBalancedClock(args: {
  /** Machine count if the node were running at `nodeClockSpeed`. */
  countAtNodeClock: number;
  /** Machine count if the node were running at `defaultClockSpeed`. */
  countAtDefaultClock: number;
  /** The node's current effective clock speed (with override applied). */
  nodeClockSpeed: number;
  /** What the node's clock would be without any override (100% for miners,
   * settings.clock_speed for recipes / water extractors, etc.). */
  defaultClockSpeed: number;
  /** When true, balance against the current clock. When false, balance as if
   * the node were at its default clock. */
  respectClock: boolean;
}): number | null {
  const referenceCount = args.respectClock ? args.countAtNodeClock : args.countAtDefaultClock;
  const referenceClock = args.respectClock ? args.nodeClockSpeed : args.defaultClockSpeed;

  // Snap floating-point near-integers down so 5.999999 doesn't become 6 machines.
  const n = Math.ceil(referenceCount - 0.001);
  if (n === 0 || Math.abs(referenceCount - n) < 0.001) return null;

  // Round up to 4 decimal places to match the in-game clock-speed precision.
  const c = Math.ceil((referenceCount / n) * referenceClock * 10000) / 10000;
  return c >= 1 && c <= 250 ? c : null;
}

/**
 * `true` when the count differs from a whole number by more than the snap
 * threshold — i.e. balancing would actually change something.
 */
export function isCountUnbalanced(referenceCount: number): boolean {
  const n = Math.ceil(referenceCount - 0.001);
  return n > 0 && Math.abs(referenceCount - n) >= 0.001;
}
