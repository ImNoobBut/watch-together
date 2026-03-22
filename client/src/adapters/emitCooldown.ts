/** Ignore user-driven player callbacks briefly after programmatic seek/play/pause to avoid socket echo loops. */
export function createEmitCooldown(ms = 320) {
  let until = 0;
  return {
    bump() {
      until = performance.now() + ms;
    },
    isActive() {
      return performance.now() < until;
    },
  };
}
