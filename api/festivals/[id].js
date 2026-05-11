// PUT    /api/festivals/:id → update (admin)
// DELETE /api/festivals/:id → delete (admin)

import dbConnect from '../lib/mongo.js';
import { Festival } from '../lib/models.js';
import { requireAdmin } from '../lib/auth.js';
import { readJson, method, send400, send500, clean } from '../lib/handler.js';
import mongoose from 'mongoose';

export default async function handler(req, res) {
  const id = req.query?.id;
  if (!id || !mongoose.isValidObjectId(id)) return send400(res, 'badId');

  return method(req, res, {
    PUT: async () => {
      try {
        const admin = await requireAdmin(req, res);
        if (!admin) return;
        const body = await readJson(req);
        const update = {};
        if (body.name_en !== undefined) update.name_en = clean(body.name_en, 100);
        if (body.name_ml !== undefined) update.name_ml = clean(body.name_ml, 100);
        if (body.date_en !== undefined) update.date_en = clean(body.date_en, 40);
        if (body.date_ml !== undefined) update.date_ml = clean(body.date_ml, 40);
        if (body.desc_en !== undefined) update.desc_en = clean(body.desc_en, 500);
        if (body.desc_ml !== undefined) update.desc_ml = clean(body.desc_ml, 500);
        if (body.image !== undefined) update.image = String(body.image || '').slice(0, 1024 * 200);
        if (!Object.keys(update).length) return send400(res, 'nothingToUpdate');

        await dbConnect();
        const item = await Festival.findByIdAndUpdate(id, update, { new: true }).lean();
        if (!item) return res.status(404).json({ ok: false, error: 'not_found' });
        return res.status(200).json({ ok: true, item });
      } catch (err) {
        return send500(res, err);
      }
    },

    DELETE: async () => {
      try {
        const admin = await requireAdmin(req, res);
        if (!admin) return;
        await dbConnect();
        const r = await Festival.findByIdAndDelete(id);
        if (!r) return res.status(404).json({ ok: false, error: 'not_found' });
        return res.status(200).json({ ok: true });
      } catch (err) {
        return send500(res, err);
      }
    }
  });
}
