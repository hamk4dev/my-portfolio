const globalStore = globalThis.__portfolioRateLimitStore ?? new Map();

if (!globalThis.__portfolioRateLimitStore) {
  globalThis.__portfolioRateLimitStore = globalStore;
}

export function consumeRateLimit(key, { limit, windowMs }) {
  const now = Date.now();
  const current = globalStore.get(key);

  if (!current || current.resetAt <= now) {
    const nextState = {
      count: 1,
      resetAt: now + windowMs,
    };

    globalStore.set(key, nextState);

    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: nextState.resetAt,
    };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: current.resetAt,
    };
  }

  current.count += 1;
  globalStore.set(key, current);

  return {
    allowed: true,
    remaining: limit - current.count,
    resetAt: current.resetAt,
  };
}
