// Security guard — imported by all API endpoints

// Simple in-process rate limiter (resets per cold start, good enough for serverless)
const hits = new Map();

export function rateLimit(ip, { max = 20, windowMs = 60000 } = {}) {
  const now = Date.now();
  const key = ip || 'unknown';
  const entry = hits.get(key) || { count: 0, start: now };

  if (now - entry.start > windowMs) {
    entry.count = 1; entry.start = now;
  } else {
    entry.count++;
  }
  hits.set(key, entry);

  // Prune old entries to avoid memory leak
  if (hits.size > 2000) {
    for (const [k, v] of hits) {
      if (now - v.start > windowMs) hits.delete(k);
    }
  }

  return entry.count > max; // true = blocked
}

export function getIP(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

// Strip any characters that could be used for injection or XSS
export function sanitize(str, maxLen = 200) {
  if (typeof str !== 'string') return '';
  return str
    .slice(0, maxLen)
    .replace(/[<>'"`;\\]/g, '') // remove XSS/injection chars
    .trim();
}

// Security headers for every response
export function secHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
}
