const globalStore = globalThis.__portofolioRateLimitStore ?? new Map();
const UPSTASH_TIMEOUT_MS = 5000;

if (!globalThis.__portofolioRateLimitStore) {
  globalThis.__portofolioRateLimitStore = globalStore;
}

function getUpstashConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!url || !token) {
    return null;
  }

  return {
    url: url.replace(/\/$/, ''),
    token,
  };
}

function toRedisKey(key) {
  return `initcv:ratelimit:${String(key).trim()}`;
}

function consumeLocalRateLimit(key, { limit, windowMs }) {
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
      backend: 'memory',
    };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: current.resetAt,
      backend: 'memory',
    };
  }

  current.count += 1;
  globalStore.set(key, current);

  return {
    allowed: true,
    remaining: limit - current.count,
    resetAt: current.resetAt,
    backend: 'memory',
  };
}

async function callUpstashCommand(config, commandPath) {
  const response = await fetch(`${config.url}${commandPath}`, {
    method: 'POST',
    cache: 'no-store',
    signal: AbortSignal.timeout(UPSTASH_TIMEOUT_MS),
    headers: {
      Authorization: `Bearer ${config.token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Upstash REST error (${response.status}): ${errorText}`);
  }

  return response.json();
}

async function consumeUpstashRateLimit(key, { limit, windowMs }) {
  const config = getUpstashConfig();
  if (!config) {
    return consumeLocalRateLimit(key, { limit, windowMs });
  }

  const now = Date.now();
  const ttlSeconds = Math.max(1, Math.ceil(windowMs / 1000));
  const redisKey = encodeURIComponent(toRedisKey(key));

  try {
    const incrResult = await callUpstashCommand(config, `/incr/${redisKey}`);
    const count = Number(incrResult?.result ?? 0);

    if (!Number.isFinite(count) || count <= 0) {
      throw new Error('Invalid counter result from Upstash.');
    }

    if (count === 1) {
      await callUpstashCommand(config, `/expire/${redisKey}/${ttlSeconds}`);
    }

    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      resetAt: now + windowMs,
      backend: 'upstash',
    };
  } catch (error) {
    console.error('Rate limit backend fallback:', error);
    const fallbackResult = consumeLocalRateLimit(key, { limit, windowMs });
    return {
      ...fallbackResult,
      backend: 'memory-fallback',
    };
  }
}

export function getRateLimitBackendMode() {
  return getUpstashConfig() ? 'upstash' : 'memory';
}

export async function consumeRateLimit(key, options) {
  return consumeUpstashRateLimit(key, options);
}