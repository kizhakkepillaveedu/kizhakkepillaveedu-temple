// GET    /api/images/:id  — serves the binary with the right Content-Type
// DELETE /api/images/:id  — admin only
//
// Extensions are stripped: /api/images/abc123.jpg behaves the same as /api/images/abc123
// so URLs are forgiving to copy-paste.

import dbConnect from '../lib/mongo.js';
import { Image } from '../lib/models.js';
import { requireAdmin } from '../lib/auth.js';
import { method, send500 } from '../lib/handler.js';
import mongoose from 'mongoose';

export default async function handler(req, res) {
  let id = String(req.query?.id || '');
  id = id.replace(/\.[a-z0-9]{1,5}$/i, ''); // strip optional extension

  if (!mongoose.isValidObjectId(id)) {
    return res.status(404).json({ ok: false, error: 'not_found' });
  }

  return method(req, res, {
    GET: async () => {
      try {
        await dbConnect();
        const img = await Image.findById(id).lean();
        if (!img) return res.status(404).json({ ok: false, error: 'not_found' });

        // .lean() returns the Buffer field as a Node Buffer in current Mongoose,
        // but be defensive in case the runtime hands us a BSON Binary instead.
        const bytes = Buffer.isBuffer(img.data)
          ? img.data
          : Buffer.from(img.data?.buffer || img.data || []);

        res.setHeader('Content-Type', img.mimeType || 'application/octet-stream');
        res.setHeader('Content-Length', String(bytes.length));
        // Image bytes never change for a given id, so cache forever
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return res.status(200).send(bytes);
      } catch (err) {
        return send500(res, err);
      }
    },

    DELETE: async () => {
      try {
        const admin = await requireAdmin(req, res);
        if (!admin) return;
        await dbConnect();
        const r = await Image.findByIdAndDelete(id);
        if (!r) return res.status(404).json({ ok: false, error: 'not_found' });
        return res.status(200).json({ ok: true });
      } catch (err) {
        return send500(res, err);
      }
    }
  });
}
