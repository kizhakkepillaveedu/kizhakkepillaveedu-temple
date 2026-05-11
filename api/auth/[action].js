// Single function that fans out to signup / login / logout / me.
// Vercel routes /api/auth/<action> → this file with req.query.action set.
// Merged from four separate files to stay under the Hobby plan's 12-function cap.

import dbConnect from '../lib/mongo.js';
import { User } from '../lib/models.js';
import {
  hashPassword, verifyPassword, signToken,
  setAuthCookie, clearAuthCookie,
  readAuthCookie, verifyToken
} from '../lib/auth.js';
import {
  readJson, method, send400, send500,
  isValidEmail, clean
} from '../lib/handler.js';

/* ====================== Signup ====================== */
async function handleSignup(req, res) {
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

/* ====================== Login ====================== */
async function handleLogin(req, res) {
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

/* ====================== Logout ====================== */
async function handleLogout(req, res) {
  return method(req, res, {
    POST: () => {
      clearAuthCookie(res);
      return res.status(200).json({ ok: true });
    }
  });
}

/* ====================== Google Sign-In ======================
 * Verifies the ID token returned by Google Identity Services (GIS),
 * then finds-or-creates the user in MongoDB.
 *
 * Verification strategy: call Google's `tokeninfo` endpoint. Google
 * does all the JWT signature/expiry checks for us and returns the
 * decoded claims. No extra dependency (no `google-auth-library`).
 */
async function handleGoogle(req, res) {
  return method(req, res, {
    POST: async () => {
      try {
        const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
        if (!CLIENT_ID) {
          return res.status(500).json({ ok: false, error: 'google_not_configured' });
        }

        const body = await readJson(req);
        let info;

        // Path A — ID token from `google.accounts.id` (rendered button flow)
        if (body.credential) {
          const r = await fetch(
            `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(body.credential)}`
          );
          info = await r.json();
          if (!r.ok || !info.sub) return res.status(401).json({ ok: false, error: 'invalid_token' });
          if (info.aud !== CLIENT_ID) return res.status(401).json({ ok: false, error: 'wrong_audience' });
          if (info.iss !== 'accounts.google.com' && info.iss !== 'https://accounts.google.com') {
            return res.status(401).json({ ok: false, error: 'wrong_issuer' });
          }
        }
        // Path B — OAuth access token from `google.accounts.oauth2.initTokenClient`
        // (programmatic flow, used when our own custom button is clicked).
        else if (body.accessToken) {
          const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${body.accessToken}` }
          });
          info = await r.json();
          if (!r.ok || !info.sub) return res.status(401).json({ ok: false, error: 'invalid_token' });
        } else {
          return send400(res, 'noCredential');
        }

        if (info.email_verified !== 'true' && info.email_verified !== true) {
          return res.status(401).json({ ok: false, error: 'email_not_verified' });
        }

        await dbConnect();
        const email = String(info.email).toLowerCase();
        const googleId = String(info.sub);
        const displayName = clean(info.name || email.split('@')[0], 80);
        const avatar = String(info.picture || '').slice(0, 500);
        const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || '').toLowerCase().trim();

        // Match by googleId first (most reliable), then fall back to email
        // so existing email/password accounts get linked rather than duplicated.
        let user = await User.findOne({ googleId });
        if (!user) user = await User.findOne({ email });

        if (user) {
          let changed = false;
          if (!user.googleId) { user.googleId = googleId; changed = true; }
          if (!user.avatar && avatar) { user.avatar = avatar; changed = true; }
          if (!user.name && displayName) { user.name = displayName; changed = true; }
          // Auto-promote whoever signs in with the configured admin Gmail
          if (ADMIN_EMAIL && email === ADMIN_EMAIL && user.role !== 'admin') {
            user.role = 'admin';
            changed = true;
          }
          if (changed) await user.save();
        } else {
          const role = ADMIN_EMAIL && email === ADMIN_EMAIL ? 'admin' : 'user';
          user = await User.create({ name: displayName, email, googleId, avatar, role });
        }

        const token = signToken({ uid: user._id.toString(), role: user.role });
        setAuthCookie(res, token);
        return res.status(200).json({ ok: true, user: user.toClient() });
      } catch (err) {
        return send500(res, err);
      }
    }
  });
}

/* ====================== Me ====================== */
async function handleMe(req, res) {
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

/* ====================== Router ====================== */
export default async function handler(req, res) {
  const action = String(req.query?.action || '').toLowerCase();
  switch (action) {
    case 'signup': return handleSignup(req, res);
    case 'login':  return handleLogin(req, res);
    case 'logout': return handleLogout(req, res);
    case 'me':     return handleMe(req, res);
    case 'google': return handleGoogle(req, res);
    default:
      return res.status(404).json({ ok: false, error: 'unknown_action' });
  }
}
