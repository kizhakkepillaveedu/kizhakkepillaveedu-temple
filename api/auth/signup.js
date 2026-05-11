// POST /api/auth/signup
// body: { name, email, phone?, password }

import dbConnect from '../lib/mongo.js';
import { User } from '../lib/models.js';
import { hashPassword, signToken, setAuthCookie } from '../lib/auth.js';
import { readJson, method, send400, send500, isValidEmail, clean } from '../lib/handler.js';

export default async function handler(req, res) {
  return method(req, res, {
    POST: async () => {
      try {
        const body = await readJson(req);
        const name = clean(body.name, 80);
        const email = clean(body.email, 120).toLowerCase();
        const phone = clean(body.phone, 20);
        const password = String(body.password || '');

        if (!name || !email || !password) return send400(res, 'missing');
        if (!isValidEmail(email)) return send400(res, 'badEmail');
        if (password.length < 6) return send400(res, 'weakPassword');

        await dbConnect();
        const existing = await User.findOne({ email });
        if (existing) return res.status(409).json({ ok: false, error: 'exists' });

        const passwordHash = await hashPassword(password);
        const user = await User.create({ name, email, phone, passwordHash, role: 'user' });

        const token = signToken({ uid: user._id.toString(), role: user.role });
        setAuthCookie(res, token);
        return res.status(201).json({ ok: true, user: user.toClient() });
      } catch (err) {
        return send500(res, err);
      }
    }
  });
}
