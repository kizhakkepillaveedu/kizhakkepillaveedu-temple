// GET  /api/bookings           → list (admin)
// GET  /api/bookings?scope=mine → list for the current user
// POST /api/bookings           → create a booking (auth)

import dbConnect from '../lib/mongo.js';
import { Booking, Puja } from '../lib/models.js';
import { requireAuth, requireAdmin } from '../lib/auth.js';
import { readJson, method, send400, send500, clean } from '../lib/handler.js';

function genReceipt() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `KPV-${y}${m}${day}-${rand}`;
}

export default async function handler(req, res) {
  return method(req, res, {
    GET: async () => {
      try {
        await dbConnect();
        const scope = String(req.query?.scope || '').toLowerCase();

        if (scope === 'mine') {
          const user = await requireAuth(req, res);
          if (!user) return;
          const items = await Booking.find({ userId: user._id }).sort({ createdAt: -1 }).lean();
          return res.status(200).json({ ok: true, items });
        }

        // Default: admin-only full list
        const admin = await requireAdmin(req, res);
        if (!admin) return;
        const items = await Booking.find({}).sort({ createdAt: -1 }).lean();
        return res.status(200).json({ ok: true, items });
      } catch (err) {
        return send500(res, err);
      }
    },

    POST: async () => {
      try {
        const user = await requireAuth(req, res);
        if (!user) return;
        const body = await readJson(req);

        const contact = body.contact || {};
        const name = clean(contact.name, 80);
        const phone = clean(contact.phone, 20);
        const address = clean(contact.address, 500);
        if (!name || !phone || !address) return send400(res, 'badContact');

        const preferredDate = clean(body.preferredDate, 10);
        const notes = clean(body.notes, 500);

        // Validate and recompute members + total from real Puja documents
        // so the client can't tamper with prices.
        await dbConnect();
        const members = Array.isArray(body.members) ? body.members : [];
        if (!members.length) return send400(res, 'noMembers');

        const verifiedMembers = [];
        let total = 0;
        for (const m of members) {
          const pujaId = m.pujaId || null;
          if (!pujaId) continue;
          const puja = await Puja.findById(pujaId).lean();
          if (!puja) continue;
          const price = Number(puja.price) || 0;
          total += price;
          verifiedMembers.push({
            who: clean(m.who, 80),
            star: clean(m.star, 40),
            pujaId: puja._id,
            pujaName: puja.name_en, // canonical English name; UI re-localises
            price,
            role: m.role === 'primary' ? 'primary' : 'member'
          });
        }
        if (!verifiedMembers.length) return send400(res, 'noValidMembers');

        const payment = body.payment || {};
        const methodKind = payment.method === 'online' ? 'online' : 'counter';
        const status = methodKind === 'online' ? 'paid' : 'pending_counter';

        // Generate a unique receipt — retry once on collision.
        let receipt = genReceipt();
        let booking;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            booking = await Booking.create({
              userId: user._id,
              contact: { name, phone, address },
              preferredDate,
              members: verifiedMembers,
              total,
              notes,
              payment: { method: methodKind, status, receipt },
              status: 'pending'
            });
            break;
          } catch (e) {
            if (e?.code === 11000) {
              receipt = genReceipt();
              continue;
            }
            throw e;
          }
        }
        if (!booking) return send500(res, new Error('receipt_collision'));

        return res.status(201).json({ ok: true, booking: booking.toObject() });
      } catch (err) {
        return send500(res, err);
      }
    }
  });
}
