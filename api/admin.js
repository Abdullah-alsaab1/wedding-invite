import { readFileSync } from 'fs';
import { join } from 'path';

const ADMIN_USER = process.env.ADMIN_USER || 'king';
const ADMIN_PASS = process.env.ADMIN_PASS || 'king2026';

export default function handler(req, res) {
  const auth = req.headers['authorization'];

  if (auth) {
    const [scheme, encoded] = auth.split(' ');
    if (scheme === 'Basic') {
      const decoded = Buffer.from(encoded, 'base64').toString();
      const [user, pass] = decoded.split(':');
      if (user === ADMIN_USER && pass === ADMIN_PASS) {
        const html = readFileSync(join(process.cwd(), 'admin.html'), 'utf8');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(html);
      }
    }
  }

  res.setHeader('WWW-Authenticate', 'Basic realm="Admin"');
  return res.status(401).send('Unauthorized');
}
