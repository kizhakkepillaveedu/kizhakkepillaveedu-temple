// POST /api/images (admin) — upload an image
//   body: { dataUri: "data:image/jpeg;base64,...", source?: "festival" }
//   returns: { ok, id, url: "/api/images/<id>", mimeType, size }
//
// The actual bytes are stored as a Buffer in the `images` collection in MongoDB.
// The DB document is small (no other docs carry base64 strings any more).

import dbConnect from '../lib/mongo.js';
import { Image } from '../lib/models.js';
import { requireAdmin } from '../lib/auth.js';
import { readJson, method, send400, send500, clean } from '../lib/handler.js';

// Vercel default body size limit is 4.5MB. Bump to 8MB to comfortably accept ~5MB images.
export const config = { api: { bodyParser: { sizeLimit: '8mb' } } };

const MAX_BYTES = 4 * 1024 * 1024; // 4MB cap after decoding (post-resize the UI sends ~200-500KB)

export default async function handler(req, res) {
  return method(req, res, {
    POST: async () => {
      try {
        const admin = await requireAdmin(req, res);
        if (!admin) return;

        const body = await readJson(req);
        const dataUri = String(body.dataUri || '');
        const match = dataUri.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
        if (!match) return send400(res, 'badData');

        const mimeType = match[1].toLowerCase();
        const buffer = Buffer.from(match[2], 'base64');
        if (buffer.length === 0) return send400(res, 'empty');
        if (buffer.length > MAX_BYTES) return send400(res, 'tooLarge');

        await dbConnect();
        const img = await Image.create({
          data: buffer,
          mimeType,
          size: buffer.length,
          source: clean(body.source, 40)
        });

        return res.status(201).json({ ok: true, ...img.toLight() });
      } catch (err) {
        return send500(res, err);
      }
    }
  });
}
