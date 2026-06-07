const UPSTASH_URL   = process.env.STORAGE_KV_REST_API_URL;
const UPSTASH_TOKEN = process.env.STORAGE_KV_REST_API_TOKEN;

async function redis(cmd) {
  const res = await fetch(`${UPSTASH_URL}/${cmd.map(encodeURIComponent).join('/')}`, {
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
  });
  const data = await res.json();
  return data.result;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    try {
      const raw = await redis(['LRANGE', 'smudges', '0', '799']);
      const smudges = (raw || []).map(s => {
        try { return JSON.parse(s); } catch { return null; }
      }).filter(Boolean);
      return res.status(200).json({ smudges });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { x, y, color, size } = req.body;
      if (x == null || y == null || !color) {
        return res.status(400).json({ error: 'Missing fields' });
      }
      const smudge = JSON.stringify({ x, y, color, size: size || 32 });
      await redis(['LPUSH', 'smudges', smudge]);
      await redis(['LTRIM', 'smudges', '0', '799']);
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}