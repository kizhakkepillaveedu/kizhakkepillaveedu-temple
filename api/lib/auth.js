// JWT + cookie helpers and route guards.

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { serialize, parse } from 'cookie';
import dbConnect from './mongo.js';
import { User } from './models.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined. Set it in .env.local and Vercel project Environment Variables.');
}

const COOKIE_NAME = 'kpv_token';
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

/* ====================== Password hashing ====================== */
export async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}
export async function verifyPassword(plain, hash) {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}

/* ====================== JWT ====================== */
export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL_SECONDS });
}
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/* ====================== Cookie helpers ====================== */
export function setAuthCookie(res, token) {
  res.setHeader(
    'Set-Cookie',
    serialize(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: TOKEN_TTL_SECONDS
    })
  );
}

export function clearAuthCookie(res) {
  res.setHeader(
    'Set-Cookie',
    serialize(COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0
    })
  );
}

export function readAuthCookie(req) {
  const header = req.headers?.cookie;
  if (!header) return null;
  const cookies = parse(header);
  return cookies[COOKIE_NAME] || null;
}

/* ====================== Guards (return user or send response and return null) ====================== */
export async function getCurrentUser(req) {
  const token = readAuthCookie(req);
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload?.uid) return null;
  await dbConnect();
  const user = await User.findById(payload.uid).lean();
  return user || null;
}

export async function requireAuth(req, res) {
  const user = await getCurrentUser(req);
  if (!user) {
    res.status(401).json({ ok: false, error: 'unauthorized' });
    return null;
  }
  return user;
}

export async function requireAdmin(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return null;
  if (user.role !== 'admin') {
    res.status(403).json({ ok: false, error: 'forbidden' });
    return null;
  }
  return user;
}
