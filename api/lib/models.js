// Mongoose schemas for the whole site.
// Single file so any endpoint can `import { User, Booking, ... } from '../lib/models.js'`.

import mongoose from 'mongoose';

/* ====================== User ====================== */
const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 120 },
    phone: { type: String, default: '', trim: true, maxlength: 20 },
    // Either passwordHash (email/password sign-in) or googleId (Google sign-in) must be present.
    passwordHash: { type: String, default: '' },
    googleId: { type: String, default: '', index: true, sparse: true },
    avatar: { type: String, default: '' },
    role: { type: String, enum: ['user', 'admin'], default: 'user' }
  },
  { timestamps: true }
);

// At least one auth method must be set
UserSchema.pre('validate', function (next) {
  if (!this.passwordHash && !this.googleId) {
    next(new Error('User must have either a password or a googleId'));
  } else {
    next();
  }
});

UserSchema.methods.toClient = function () {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    phone: this.phone,
    avatar: this.avatar,
    role: this.role,
    isAdmin: this.role === 'admin',
    hasGoogle: !!this.googleId,
    createdAt: this.createdAt
  };
};

/* ====================== Puja ====================== */
const PujaSchema = new mongoose.Schema(
  {
    name_en: { type: String, required: true, trim: true, maxlength: 100 },
    name_ml: { type: String, default: '', trim: true, maxlength: 100 },
    desc_en: { type: String, default: '', trim: true, maxlength: 500 },
    desc_ml: { type: String, default: '', trim: true, maxlength: 500 },
    price: { type: Number, required: true, min: 0 }
  },
  { timestamps: true }
);

/* ====================== Festival ====================== */
const FestivalSchema = new mongoose.Schema(
  {
    name_en: { type: String, required: true, trim: true, maxlength: 100 },
    name_ml: { type: String, default: '', trim: true, maxlength: 100 },
    date_en: { type: String, default: '', trim: true, maxlength: 40 },
    date_ml: { type: String, default: '', trim: true, maxlength: 40 },
    desc_en: { type: String, default: '', trim: true, maxlength: 500 },
    desc_ml: { type: String, default: '', trim: true, maxlength: 500 },
    image: { type: String, default: '' } // URL or data-URL
  },
  { timestamps: true }
);

/* ====================== Timings (single document) ====================== */
const DayTimingSchema = new mongoose.Schema(
  {
    day: { type: String, enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], required: true },
    morning: { type: String, default: '' },
    evening: { type: String, default: '' }
  },
  { _id: false }
);

const TimingsSchema = new mongoose.Schema(
  {
    _singleton: { type: String, default: 'timings', unique: true },
    days: { type: [DayTimingSchema], default: [] }
  },
  { timestamps: true }
);

/* ====================== Booking ====================== */
const BookingMemberSchema = new mongoose.Schema(
  {
    who: { type: String, default: '', trim: true, maxlength: 80 },
    star: { type: String, default: '', trim: true, maxlength: 40 },
    pujaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Puja' },
    pujaName: { type: String, default: '' },
    price: { type: Number, default: 0, min: 0 },
    role: { type: String, enum: ['primary', 'member'], default: 'member' }
  },
  { _id: false }
);

const BookingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    contact: {
      name: { type: String, required: true, trim: true, maxlength: 80 },
      phone: { type: String, required: true, trim: true, maxlength: 20 },
      address: { type: String, required: true, trim: true, maxlength: 500 }
    },
    preferredDate: { type: String, default: '' }, // ISO date 'YYYY-MM-DD'
    members: { type: [BookingMemberSchema], default: [] },
    total: { type: Number, required: true, min: 0 },
    notes: { type: String, default: '', maxlength: 500 },
    payment: {
      method: { type: String, enum: ['online', 'counter'], default: 'counter' },
      status: { type: String, enum: ['paid', 'pending_counter', 'pending'], default: 'pending' },
      receipt: { type: String, default: '', unique: true, sparse: true }
    },
    status: { type: String, enum: ['pending', 'confirmed', 'completed', 'cancelled'], default: 'pending' }
  },
  { timestamps: true }
);

/* ====================== Image ======================
 * Stores uploaded image bytes in MongoDB itself (not Cloudinary / S3 / disk).
 * Each Festival / Puja keeps a /api/images/<id> URL in its `image` field.
 */
const ImageSchema = new mongoose.Schema(
  {
    data: { type: Buffer, required: true },          // raw binary, NOT base64
    mimeType: { type: String, required: true },      // 'image/jpeg', 'image/png', ...
    size: { type: Number, required: true, min: 0 },  // bytes
    source: { type: String, default: '' }            // 'festival' | 'puja' | ... (optional tag)
  },
  { timestamps: true }
);
// Don't return the `data` Buffer by default when toJSON-ing the model
// (so we never accidentally leak a multi-MB binary in JSON responses).
ImageSchema.methods.toLight = function () {
  return {
    id: this._id.toString(),
    mimeType: this.mimeType,
    size: this.size,
    source: this.source,
    url: `/api/images/${this._id}`,
    createdAt: this.createdAt
  };
};

/* ====================== Enquiry (contact form) ====================== */
const EnquirySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, lowercase: true, trim: true, maxlength: 120 },
    subject: { type: String, default: 'general', maxlength: 40 },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    status: { type: String, enum: ['new', 'read', 'replied'], default: 'new' }
  },
  { timestamps: true }
);

/* ====================== Exports — use mongoose.models cache to support hot reload ====================== */
export const User = mongoose.models.User || mongoose.model('User', UserSchema);
export const Puja = mongoose.models.Puja || mongoose.model('Puja', PujaSchema);
export const Festival = mongoose.models.Festival || mongoose.model('Festival', FestivalSchema);
export const Timings = mongoose.models.Timings || mongoose.model('Timings', TimingsSchema);
export const Booking = mongoose.models.Booking || mongoose.model('Booking', BookingSchema);
export const Enquiry = mongoose.models.Enquiry || mongoose.model('Enquiry', EnquirySchema);
export const Image = mongoose.models.Image || mongoose.model('Image', ImageSchema);
