// PUT    /api/pujas/:id → update (admin)
// DELETE /api/pujas/:id → delete (admin)

import dbConnect from '../lib/mongo.js';
import { Puja } from '../lib/models.js';
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
        if (body.desc_en !== undefined) update.desc_en = clean(body.desc_en, 500);
        if (body.desc_ml !== undefined) update.desc_ml = clean(body.desc_ml, 500);
        if (body.price !== undefined) {
          const price = Number(body.price);
          if (!Number.isFinite(price) || price < 0) return send400(res, 'badPrice');
          update.price = price;
        }
        if (!Object.keys(update).length) return send400(res, 'nothingToUpdate');

        await dbConnect();
        const puja = await Puja.findByIdAndUpdate(id, update, { new: true }).lean();
        if (!puja) return res.status(404).json({ ok: false, error: 'not_found' });
        return res.status(200).json({ ok: true, item: puja });
      } catch (err) {
        return send500(res, err);
      }
    },

    DELETE: async () => {
      try {
        const admin = await requireAdmin(req, res);
        if (!admin) return;
        await dbConnect();
        const r = await Puja.findByIdAndDelete(id);
        if (!r) return res.status(404).json({ ok: false, error: 'not_found' });
        return res.status(200).json({ ok: true });
      } catch (err) {
        return send500(res, err);
      }
    }
  });
}
