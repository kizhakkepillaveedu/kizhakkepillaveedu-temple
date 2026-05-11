// GET  /api/pujas → list (public)
// POST /api/pujas → create (admin)

import dbConnect from '../lib/mongo.js';
import { Puja } from '../lib/models.js';
import { requireAdmin } from '../lib/auth.js';
import { readJson, method, send400, send500, clean } from '../lib/handler.js';

export default async function handler(req, res) {
  return method(req, res, {
    GET: async () => {
      try {
        await dbConnect();
        const items = await Puja.find({}).sort({ createdAt: 1 }).lean();
        // Edge-cache at Vercel for 2 min, serve stale up to 10 min while
        // revalidating in the background. Admin edits are visible within
        // ~2 min; for everyone else this turns subsequent page loads into
        // CDN hits (skips the serverless cold start completely).
        res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
        return res.status(200).json({ ok: true, items });
      } catch (err) {
        return send500(res, err);
      }
    },

    POST: async () => {
      try {
        const admin = await requireAdmin(req, res);
        if (!admin) return;
        const body = await readJson(req);
        const name_en = clean(body.name_en, 100);
        if (!name_en) return send400(res, 'badName');
        const price = Number(body.price);
        if (!Number.isFinite(price) || price < 0) return send400(res, 'badPrice');

        await dbConnect();
        const puja = await Puja.create({
          name_en,
          name_ml: clean(body.name_ml, 100),
          desc_en: clean(body.desc_en, 500),
          desc_ml: clean(body.desc_ml, 500),
          price
        });
        return res.status(201).json({ ok: true, item: puja.toObject() });
      } catch (err) {
        return send500(res, err);
      }
    }
  });
}
