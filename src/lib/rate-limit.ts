// Fixed-window counter held in memory. On Vercel each function instance has its
// own memory, so this is a speed bump rather than a hard limit. Swap for Upstash
// or a Turso table if the URL is ever shared.
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  b.count += 1;
  return b.count <= max;
}
