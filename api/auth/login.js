// POST /api/auth/login
// body: { email, password }

import dbConnect from '../lib/mongo.js';
import { User } from '../lib/models.js';
import { verifyPassword, signToken, setAuthCookie } from '../lib/auth.js';
import { readJson, method, send400, send500, isValidEmail, clean } from '../lib/handler.js';

export default async function handler(req, res) {
  return method(req, res, {
    POST: async () => {
      try {
        const body = await readJson(req);
        const email = clean(body.email, 120).toLowerCase();
        const password = String(body.password || '');

        if (!email || !password) return send400(res, 'missing');
        if (!isValidEmail(email)) return send400(res, 'invalid');

        await dbConnect();
        const user = await User.findOne({ email });
        // Use a generic error so we don't leak which emails exist.
        if (!user) return res.status(401).json({ ok: false, error: 'invalid' });

        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) return res.status(401).json({ ok: false, error: 'invalid' });

        const token = signToken({ uid: user._id.toString(), role: user.role });
        setAuthCookie(res, token);
        return res.status(200).json({ ok: true, user: user.toClient() });
      } catch (err) {
        return send500(res, err);
      }
    }
  });
}
