// GET /api/auth/me — returns the current user (or 401 if not signed in).
// Used by the frontend on page load to know who is logged in.

import dbConnect from '../lib/mongo.js';
import { User } from '../lib/models.js';
import { readAuthCookie, verifyToken } from '../lib/auth.js';
import { method, send500 } from '../lib/handler.js';

export default async function handler(req, res) {
  return method(req, res, {
    GET: async () => {
      try {
        const token = readAuthCookie(req);
        if (!token) return res.status(200).json({ ok: true, user: null });

        const payload = verifyToken(token);
        if (!payload?.uid) return res.status(200).json({ ok: true, user: null });

        await dbConnect();
        const user = await User.findById(payload.uid);
        if (!user) return res.status(200).json({ ok: true, user: null });

        return res.status(200).json({ ok: true, user: user.toClient() });
      } catch (err) {
        return send500(res, err);
      }
    }
  });
}
