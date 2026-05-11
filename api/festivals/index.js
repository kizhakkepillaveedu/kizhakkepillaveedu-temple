// GET  /api/festivals → list (public)
// POST /api/festivals → create (admin)

import dbConnect from '../lib/mongo.js';
import { Festival } from '../lib/models.js';
import { requireAdmin } from '../lib/auth.js';
import { readJson, method, send400, send500, clean } from '../lib/handler.js';

export default async function handler(req, res) {
  return method(req, res, {
    GET: async () => {
      try {
        await dbConnect();
        const items = await Festival.find({}).sort({ createdAt: 1 }).lean();
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

        await dbConnect();
        const f = await Festival.create({
          name_en,
          name_ml: clean(body.name_ml, 100),
          date_en: clean(body.date_en, 40),
          date_ml: clean(body.date_ml, 40),
          desc_en: clean(body.desc_en, 500),
          desc_ml: clean(body.desc_ml, 500),
          image: String(body.image || '').slice(0, 1024 * 200) // up to ~200KB data URL
        });
        return res.status(201).json({ ok: true, item: f.toObject() });
      } catch (err) {
        return send500(res, err);
      }
    }
  });
}
