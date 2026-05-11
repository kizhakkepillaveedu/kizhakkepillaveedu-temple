// GET    /api/bookings/:id → owner or admin
// PATCH  /api/bookings/:id → admin (update status / payment.status)
// DELETE /api/bookings/:id → admin

import dbConnect from '../lib/mongo.js';
import { Booking } from '../lib/models.js';
import { requireAuth, requireAdmin } from '../lib/auth.js';
import { readJson, method, send400, send500 } from '../lib/handler.js';
import mongoose from 'mongoose';

const VALID_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'];
const VALID_PAY_STATUSES = ['paid', 'pending_counter', 'pending'];

export default async function handler(req, res) {
  const id = req.query?.id;
  if (!id || !mongoose.isValidObjectId(id)) return send400(res, 'badId');

  return method(req, res, {
    GET: async () => {
      try {
        const user = await requireAuth(req, res);
        if (!user) return;
        await dbConnect();
        const booking = await Booking.findById(id).lean();
        if (!booking) return res.status(404).json({ ok: false, error: 'not_found' });
        const isOwner = String(booking.userId) === String(user._id);
        if (!isOwner && user.role !== 'admin') {
          return res.status(403).json({ ok: false, error: 'forbidden' });
        }
        return res.status(200).json({ ok: true, booking });
      } catch (err) {
        return send500(res, err);
      }
    },

    PATCH: async () => {
      try {
        const admin = await requireAdmin(req, res);
        if (!admin) return;
        const body = await readJson(req);
        await dbConnect();
        const update = {};
        if (body.status && VALID_STATUSES.includes(body.status)) update.status = body.status;
        if (body.paymentStatus && VALID_PAY_STATUSES.includes(body.paymentStatus)) {
          update['payment.status'] = body.paymentStatus;
        }
        if (!Object.keys(update).length) return send400(res, 'nothingToUpdate');
        const booking = await Booking.findByIdAndUpdate(id, update, { new: true }).lean();
        if (!booking) return res.status(404).json({ ok: false, error: 'not_found' });
        return res.status(200).json({ ok: true, booking });
      } catch (err) {
        return send500(res, err);
      }
    },

    DELETE: async () => {
      try {
        const admin = await requireAdmin(req, res);
        if (!admin) return;
        await dbConnect();
        const r = await Booking.findByIdAndDelete(id);
        if (!r) return res.status(404).json({ ok: false, error: 'not_found' });
        return res.status(200).json({ ok: true });
      } catch (err) {
        return send500(res, err);
      }
    }
  });
}
