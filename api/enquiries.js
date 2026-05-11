// POST /api/enquiries → submit a contact-form enquiry (public)
// GET  /api/enquiries → list (admin)

import dbConnect from './lib/mongo.js';
import { Enquiry } from './lib/models.js';
import { requireAdmin } from './lib/auth.js';
import { readJson, method, send400, send500, clean, isValidEmail } from './lib/handler.js';

export default async function handler(req, res) {
  return method(req, res, {
    POST: async () => {
      try {
        const body = await readJson(req);
        const name = clean(body.name, 80);
        const email = clean(body.email, 120).toLowerCase();
        const message = clean(body.message, 1000);
        const subject = clean(body.subject, 40) || 'general';
        if (!name || !message) return send400(res, 'missing');
        if (!isValidEmail(email)) return send400(res, 'badEmail');

        await dbConnect();
        const item = await Enquiry.create({ name, email, subject, message });
        return res.status(201).json({ ok: true, enquiry: item.toObject() });
      } catch (err) {
        return send500(res, err);
      }
    },

    GET: async () => {
      try {
        const admin = await requireAdmin(req, res);
        if (!admin) return;
        await dbConnect();
        const items = await Enquiry.find({}).sort({ createdAt: -1 }).lean();
        return res.status(200).json({ ok: true, items });
      } catch (err) {
        return send500(res, err);
      }
    }
  });
}
