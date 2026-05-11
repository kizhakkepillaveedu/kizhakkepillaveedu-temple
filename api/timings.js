// GET /api/timings → returns { days: [{ day, morning, evening }, ...] } (public)
// PUT /api/timings → replace the whole list (admin)

import dbConnect from './lib/mongo.js';
import { Timings } from './lib/models.js';
import { requireAdmin } from './lib/auth.js';
import { readJson, method, send400, send500, clean } from './lib/handler.js';

const VALID_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export default async function handler(req, res) {
  return method(req, res, {
    GET: async () => {
      try {
        await dbConnect();
        let doc = await Timings.findOne({ _singleton: 'timings' }).lean();
        if (!doc) doc = { days: [] };
        res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=1800');
        return res.status(200).json({ ok: true, days: doc.days || [] });
      } catch (err) {
        return send500(res, err);
      }
    },

    PUT: async () => {
      try {
        const admin = await requireAdmin(req, res);
        if (!admin) return;
        const body = await readJson(req);
        const incoming = Array.isArray(body.days) ? body.days : [];
        const days = incoming
          .filter((d) => VALID_DAYS.includes(d.day))
          .map((d) => ({
            day: d.day,
            morning: clean(d.morning, 40),
            evening: clean(d.evening, 40)
          }));
        await dbConnect();
        const doc = await Timings.findOneAndUpdate(
          { _singleton: 'timings' },
          { _singleton: 'timings', days },
          { upsert: true, new: true }
        ).lean();
        return res.status(200).json({ ok: true, days: doc.days });
      } catch (err) {
        return send500(res, err);
      }
    }
  });
}
