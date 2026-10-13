// Global top-5 leaderboard for Vercel + Upstash Redis (no npm packages needed)
const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const KEY = 'oliv_care_leaderboard';

async function redis(cmd) {
  const r = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + TOKEN },
    body: JSON.stringify(cmd),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'POST') {
      const b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const s = Math.floor(Number(b.s));
      const n = String(b.n || 'Guest').replace(/[^\p{L}\p{N} .\-_]/gu, '').trim().slice(0, 12) || 'Guest';
      if (!(s > 0 && s <= 300)) return res.status(400).json({ error: 'bad score' });
      await redis(['ZADD', KEY, s, n + '|' + Date.now() + Math.random().toString(36).slice(2, 6)]);
    }
    const r = await redis(['ZREVRANGE', KEY, 0, 4, 'WITHSCORES']);
    const out = [];
    for (let i = 0; i < r.length; i += 2) out.push({ n: r[i].split('|')[0], s: Number(r[i + 1]) });
    res.status(200).json(out);
  } catch (e) {
    res.status(500).json({ error: 'server error' });
  }
};
