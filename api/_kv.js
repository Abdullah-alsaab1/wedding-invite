// Upstash Redis REST helper — no npm package needed
const KV_URL   = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

async function kv(cmd, ...args) {
  if (!KV_URL || !KV_TOKEN) return null;
  const res = await fetch(`${KV_URL}/${[cmd, ...args].map(encodeURIComponent).join('/')}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` }
  });
  const d = await res.json();
  return d.result ?? null;
}

export const incr  = (key) => kv('INCR', key);
export const get   = (key) => kv('GET', key);
export const mget  = (...keys) => kv('MGET', ...keys);
