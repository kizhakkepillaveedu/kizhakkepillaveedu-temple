// One-time seed: admin user + default pujas + default festivals + default timings.
// Run with:  npm run seed
//
// Safe to re-run: it upserts based on email/name. Won't duplicate.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env.local');

if (fs.existsSync(envPath)) {
  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const MONGODB_URI = process.env.MONGODB_URI;
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@temple.com').toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Temple Admin';

if (!MONGODB_URI) {
  console.error('MONGODB_URI missing — set it in .env.local');
  process.exit(1);
}

/* ---------- Schemas (kept identical to api/lib/models.js) ---------- */
const UserSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true, lowercase: true },
    phone: String,
    passwordHash: String,
    role: { type: String, enum: ['user', 'admin'], default: 'user' }
  },
  { timestamps: true }
);
const PujaSchema = new mongoose.Schema(
  {
    name_en: { type: String, required: true },
    name_ml: String,
    desc_en: String,
    desc_ml: String,
    price: { type: Number, required: true }
  },
  { timestamps: true }
);
const FestivalSchema = new mongoose.Schema(
  {
    name_en: { type: String, required: true },
    name_ml: String,
    date_en: String,
    date_ml: String,
    desc_en: String,
    desc_ml: String,
    image: String
  },
  { timestamps: true }
);
const DayTimingSchema = new mongoose.Schema(
  { day: String, morning: String, evening: String },
  { _id: false }
);
const TimingsSchema = new mongoose.Schema(
  {
    _singleton: { type: String, default: 'timings', unique: true },
    days: [DayTimingSchema]
  },
  { timestamps: true }
);

const DEFAULT_PUJAS = [
  { name_en: 'Pushpanjali', name_ml: 'പുഷ്പാഞ്ജലി', desc_en: 'Floral offering recited with mantras for blessings of prosperity and well-being.', desc_ml: 'സമ്പത്തിനും ക്ഷേമത്തിനും വേണ്ടി മന്ത്രങ്ങളോടെ പൂക്കൾ അർച്ചിക്കുന്ന വഴിപാട്.', price: 51 },
  { name_en: 'Bhagavathi Seva', name_ml: 'ഭഗവതി സേവ', desc_en: 'A grand puja dedicated to the Devi, performed with traditional offerings and lamps.', desc_ml: 'ദേവിക്കുള്ള മഹാപൂജ. പരമ്പരാഗത നൈവേദ്യങ്ങളും ദീപങ്ങളും ഉപയോഗിച്ച് നടത്തുന്നു.', price: 1001 },
  { name_en: 'Ganapathi Homam', name_ml: 'ഗണപതി ഹോമം', desc_en: 'Sacred fire ritual to remove obstacles and invoke divine grace before any new endeavour.', desc_ml: 'വിഘ്നങ്ങൾ ഒഴിവാക്കാനും ഈശ്വരാനുഗ്രഹം നേടാനും നടത്തുന്ന ഹോമം.', price: 501 },
  { name_en: 'Nei Vilakku', name_ml: 'നെയ് വിളക്ക്', desc_en: 'Lighting of the ghee lamp — a deeply revered offering for inner light and clarity.', desc_ml: 'ഉള്ളിലെ പ്രകാശത്തിനായി തിളങ്ങുന്ന നെയ് വിളക്ക് സമർപ്പിക്കുന്ന വഴിപാട്.', price: 21 },
  { name_en: 'Archana', name_ml: 'അർച്ചന', desc_en: "Recital of the devotee's name and star with sacred chants and offerings.", desc_ml: 'ഭക്തന്റെ പേരും നക്ഷത്രവും ചൊല്ലി മന്ത്രങ്ങളോടെ നടത്തുന്ന അർച്ചന.', price: 31 },
  { name_en: 'Annadanam', name_ml: 'അന്നദാനം', desc_en: 'Sponsor a community feast — one of the most blessed offerings in our tradition.', desc_ml: 'സമൂഹ ഭോജനം സ്‌പോൺസർ ചെയ്യുന്ന ഏറ്റവും പുണ്യകരമായ വഴിപാട്.', price: 2501 }
];

const DEFAULT_FESTIVALS = [
  { name_en: 'Navarathri Mahotsavam', name_ml: 'നവരാത്രി മഹോത്സവം', date_en: 'Sept – Oct', date_ml: 'കന്നി – തുലാം', desc_en: 'Nine sacred nights celebrating the Devi in her divine forms with music and worship.', desc_ml: 'ഒൻപത് രാത്രികൾ ദേവിയെ ആരാധിക്കുന്ന മഹോത്സവം.', image: '' },
  { name_en: 'Vishu Vilakku', name_ml: 'വിഷു വിളക്ക്', date_en: 'Medam 1', date_ml: 'മേടം 1', desc_en: 'New year festival of light, prosperity and the Vishukkani darshan at dawn.', desc_ml: 'പുതുവർഷ വിളക്കും വിഷുക്കണി ദർശനവുമായ പ്രഭാത ഉത്സവം.', image: '' },
  { name_en: 'Mandala Pooja', name_ml: 'മണ്ഡല പൂജ', date_en: 'Vrischikam – Dhanu', date_ml: 'വൃശ്ചികം – ധനു', desc_en: '41 days of sacred discipline culminating in the grand Mandala Pooja celebration.', desc_ml: '41 ദിവസത്തെ വ്രതാനുഷ്ഠാനത്തിന്റെ സമാപനത്തിലെ മഹാപൂജ.', image: '' },
  { name_en: 'Pongala', name_ml: 'പൊങ്കാല', date_en: 'Makaram', date_ml: 'മകരം', desc_en: 'Devotees gather to offer the sacred pongala to the Devi with collective prayers.', desc_ml: 'ഭക്തർ ഒത്തുചേർന്ന് ദേവിക്ക് സമർപ്പിക്കുന്ന പൊങ്കാല വഴിപാട്.', image: '' }
];

const DEFAULT_TIMINGS = [
  { day: 'mon', morning: '5:30 AM – 9:00 AM', evening: '5:30 PM – 7:30 PM' },
  { day: 'tue', morning: '5:30 AM – 9:00 AM', evening: '5:30 PM – 7:30 PM' },
  { day: 'wed', morning: '5:30 AM – 9:00 AM', evening: '5:30 PM – 7:30 PM' },
  { day: 'thu', morning: '5:30 AM – 9:00 AM', evening: '5:30 PM – 7:30 PM' },
  { day: 'fri', morning: '5:00 AM – 10:00 AM', evening: '5:00 PM – 8:30 PM' },
  { day: 'sat', morning: '5:30 AM – 9:00 AM', evening: '5:30 PM – 7:30 PM' },
  { day: 'sun', morning: '5:00 AM – 10:30 AM', evening: '5:00 PM – 8:00 PM' }
];

async function main() {
  await mongoose.connect(MONGODB_URI, { bufferCommands: false });
  const User = mongoose.models.User || mongoose.model('User', UserSchema);
  const Puja = mongoose.models.Puja || mongoose.model('Puja', PujaSchema);
  const Festival = mongoose.models.Festival || mongoose.model('Festival', FestivalSchema);
  const Timings = mongoose.models.Timings || mongoose.model('Timings', TimingsSchema);

  /* ---------- Admin ---------- */
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const existingAdmin = await User.findOne({ email: ADMIN_EMAIL });
  if (existingAdmin) {
    existingAdmin.name = ADMIN_NAME;
    existingAdmin.role = 'admin';
    existingAdmin.passwordHash = passwordHash;
    await existingAdmin.save();
    console.log(`✓ Updated admin: ${ADMIN_EMAIL}`);
  } else {
    await User.create({ name: ADMIN_NAME, email: ADMIN_EMAIL, phone: '', passwordHash, role: 'admin' });
    console.log(`✓ Created admin: ${ADMIN_EMAIL}`);
  }

  /* ---------- Pujas ---------- */
  const pujaCount = await Puja.countDocuments();
  if (pujaCount === 0) {
    await Puja.insertMany(DEFAULT_PUJAS);
    console.log(`✓ Seeded ${DEFAULT_PUJAS.length} default pujas`);
  } else {
    console.log(`• ${pujaCount} pujas already exist — skipped seed`);
  }

  /* ---------- Festivals ---------- */
  const festCount = await Festival.countDocuments();
  if (festCount === 0) {
    await Festival.insertMany(DEFAULT_FESTIVALS);
    console.log(`✓ Seeded ${DEFAULT_FESTIVALS.length} default festivals`);
  } else {
    console.log(`• ${festCount} festivals already exist — skipped seed`);
  }

  /* ---------- Timings ---------- */
  const timingsDoc = await Timings.findOne({ _singleton: 'timings' });
  if (!timingsDoc) {
    await Timings.create({ _singleton: 'timings', days: DEFAULT_TIMINGS });
    console.log(`✓ Seeded default timings`);
  } else {
    console.log(`• Timings already configured — skipped seed`);
  }

  console.log('\nAdmin login:');
  console.log(`  email:    ${ADMIN_EMAIL}`);
  console.log(`  password: ${ADMIN_PASSWORD}`);
  console.log('Rotate by editing ADMIN_PASSWORD in .env.local and re-running.');

  await mongoose.connection.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
