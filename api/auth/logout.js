// POST /api/auth/logout — clears the auth cookie. No body required.

import { clearAuthCookie } from '../lib/auth.js';
import { method } from '../lib/handler.js';

export default async function handler(req, res) {
  return method(req, res, {
    POST: () => {
      clearAuthCookie(res);
      return res.status(200).json({ ok: true });
    }
  });
}
