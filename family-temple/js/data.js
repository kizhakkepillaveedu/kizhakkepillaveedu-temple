/* Data layer — localStorage backed store for pujas, festivals, timings, bookings */

/* Nakshatram (birth star) list — 27 entries shared across booking + dashboard */
const STARS = [
  { value: 'aswathy',       en: 'Aswathy',       ml: 'അശ്വതി' },
  { value: 'bharani',       en: 'Bharani',       ml: 'ഭരണി' },
  { value: 'karthika',      en: 'Karthika',      ml: 'കാർത്തിക' },
  { value: 'rohini',        en: 'Rohini',        ml: 'രോഹിണി' },
  { value: 'makayiram',     en: 'Makayiram',     ml: 'മകയിരം' },
  { value: 'thiruvathira',  en: 'Thiruvathira',  ml: 'തിരുവാതിര' },
  { value: 'punartham',     en: 'Punartham',     ml: 'പുണർതം' },
  { value: 'pooyam',        en: 'Pooyam',        ml: 'പൂയം' },
  { value: 'ayilyam',       en: 'Ayilyam',       ml: 'ആയില്യം' },
  { value: 'makam',         en: 'Makam',         ml: 'മകം' },
  { value: 'pooram',        en: 'Pooram',        ml: 'പൂരം' },
  { value: 'uthram',        en: 'Uthram',        ml: 'ഉത്രം' },
  { value: 'atham',         en: 'Atham',         ml: 'അത്തം' },
  { value: 'chithira',      en: 'Chithira',      ml: 'ചിത്തിര' },
  { value: 'chothi',        en: 'Chothi',        ml: 'ചോതി' },
  { value: 'vishakham',     en: 'Vishakham',     ml: 'വിശാഖം' },
  { value: 'anizham',       en: 'Anizham',       ml: 'അനിഴം' },
  { value: 'thrikketta',    en: 'Thrikketta',    ml: 'തൃക്കേട്ട' },
  { value: 'moolam',        en: 'Moolam',        ml: 'മൂലം' },
  { value: 'pooradam',      en: 'Pooradam',      ml: 'പൂരാടം' },
  { value: 'uthradam',      en: 'Uthradam',      ml: 'ഉത്രാടം' },
  { value: 'thiruvonam',    en: 'Thiruvonam',    ml: 'തിരുവോണം' },
  { value: 'avittom',       en: 'Avittom',       ml: 'അവിട്ടം' },
  { value: 'chathayam',     en: 'Chathayam',     ml: 'ചതയം' },
  { value: 'pooruruttathi', en: 'Pooruruttathi', ml: 'പൂരൂരുട്ടാതി' },
  { value: 'uthrattathi',   en: 'Uthrattathi',   ml: 'ഉത്രട്ടാതി' },
  { value: 'revathi',       en: 'Revathi',       ml: 'രേവതി' }
];

const Stars = {
  list: STARS,
  find(value) {
    if (!value) return null;
    const v = String(value).toLowerCase();
    return STARS.find(s => s.value === v || s.en.toLowerCase() === v || s.ml === value) || null;
  },
  label(value) {
    if (!value) return '';
    const s = this.find(value);
    if (!s) return value;
    const lang = (typeof I18N !== 'undefined' && I18N.current) ? I18N.current : 'ml';
    return lang === 'ml' ? s.ml : s.en;
  },
  options(placeholder) {
    return `<option value="">${placeholder || '—'}</option>` +
      STARS.map(s => `<option value="${s.value}">${s.ml} (${s.en})</option>`).join('');
  }
};

/* ===== Security utilities ===== */

const Sec = {
  esc(s) {
    return String(s ?? '').replace(/[&<>"'`]/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;'
    }[c]));
  },
  email(s) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim());
  },
  phone(s) {
    return /^\+?[0-9\-\s]{7,20}$/.test(String(s || '').trim());
  },
  trim(s, max = 200) {
    return String(s ?? '').trim().slice(0, max);
  }
};

const CryptoUtil = {
  generateSalt() {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
  },
  async hash(password, salt) {
    const enc = new TextEncoder();
    const data = enc.encode(`${salt}:${password}`);
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
};

const RateLimit = {
  KEY_PREFIX: 'kpv.rl.',
  MAX_ATTEMPTS: 5,
  WINDOW_MS: 5 * 60 * 1000,

  _key(scope) { return this.KEY_PREFIX + scope; },

  _read(scope) {
    try {
      const raw = localStorage.getItem(this._key(scope));
      return raw ? JSON.parse(raw) : { count: 0, lockedUntil: 0 };
    } catch { return { count: 0, lockedUntil: 0 }; }
  },

  _write(scope, val) {
    localStorage.setItem(this._key(scope), JSON.stringify(val));
  },

  check(scope) {
    const s = this._read(scope);
    if (s.lockedUntil && s.lockedUntil > Date.now()) {
      return { allowed: false, retryInSeconds: Math.ceil((s.lockedUntil - Date.now()) / 1000) };
    }
    return { allowed: true };
  },

  fail(scope) {
    const s = this._read(scope);
    s.count = (s.count || 0) + 1;
    if (s.count >= this.MAX_ATTEMPTS) {
      s.lockedUntil = Date.now() + this.WINDOW_MS;
      s.count = 0;
    }
    this._write(scope, s);
    return s;
  },

  reset(scope) {
    localStorage.removeItem(this._key(scope));
  }
};

const STORE_KEYS = {
  pujas: 'kpv.pujas',
  festivals: 'kpv.festivals',
  timings: 'kpv.timings',
  bookings: 'kpv.bookings',
  admin: 'kpv.admin',
  users: 'kpv.users',
  session: 'kpv.session',
  enquiries: 'kpv.enquiries'
};

const DEFAULT_PUJAS = [
  {
    id: 'p1',
    name_en: 'Pushpanjali',
    name_ml: 'പുഷ്പാഞ്ജലി',
    desc_en: 'Floral offering recited with mantras for blessings of prosperity and well-being.',
    desc_ml: 'സമ്പത്തിനും ക്ഷേമത്തിനും വേണ്ടി മന്ത്രങ്ങളോടെ പൂക്കൾ അർച്ചിക്കുന്ന വഴിപാട്.',
    price: 51
  },
  {
    id: 'p2',
    name_en: 'Bhagavathi Seva',
    name_ml: 'ഭഗവതി സേവ',
    desc_en: 'A grand puja dedicated to the Devi, performed with traditional offerings and lamps.',
    desc_ml: 'ദേവിക്കുള്ള മഹാപൂജ. പരമ്പരാഗത നൈവേദ്യങ്ങളും ദീപങ്ങളും ഉപയോഗിച്ച് നടത്തുന്നു.',
    price: 1001
  },
  {
    id: 'p3',
    name_en: 'Ganapathi Homam',
    name_ml: 'ഗണപതി ഹോമം',
    desc_en: 'Sacred fire ritual to remove obstacles and invoke divine grace before any new endeavour.',
    desc_ml: 'വിഘ്നങ്ങൾ ഒഴിവാക്കാനും ഈശ്വരാനുഗ്രഹം നേടാനും നടത്തുന്ന ഹോമം.',
    price: 501
  },
  {
    id: 'p4',
    name_en: 'Nei Vilakku',
    name_ml: 'നെയ് വിളക്ക്',
    desc_en: 'Lighting of the ghee lamp — a deeply revered offering for inner light and clarity.',
    desc_ml: 'ഉള്ളിലെ പ്രകാശത്തിനായി തിളങ്ങുന്ന നെയ് വിളക്ക് സമർപ്പിക്കുന്ന വഴിപാട്.',
    price: 21
  },
  {
    id: 'p5',
    name_en: 'Archana',
    name_ml: 'അർച്ചന',
    desc_en: 'Recital of the devotee\'s name and star with sacred chants and offerings.',
    desc_ml: 'ഭക്തന്റെ പേരും നക്ഷത്രവും ചൊല്ലി മന്ത്രങ്ങളോടെ നടത്തുന്ന അർച്ചന.',
    price: 31
  },
  {
    id: 'p6',
    name_en: 'Annadanam',
    name_ml: 'അന്നദാനം',
    desc_en: 'Sponsor a community feast — one of the most blessed offerings in our tradition.',
    desc_ml: 'സമൂഹ ഭോജനം സ്‌പോൺസർ ചെയ്യുന്ന ഏറ്റവും പുണ്യകരമായ വഴിപാട്.',
    price: 2501
  }
];

const DEFAULT_FESTIVALS = [
  {
    id: 'f1',
    name_en: 'Navarathri Mahotsavam',
    name_ml: 'നവരാത്രി മഹോത്സവം',
    date_en: 'Sept – Oct',
    date_ml: 'കന്നി – തുലാം',
    desc_en: 'Nine sacred nights celebrating the Devi in her divine forms with music and worship.',
    desc_ml: 'ഒൻപത് രാത്രികൾ ദേവിയെ ആരാധിക്കുന്ന മഹോത്സവം.'
  },
  {
    id: 'f2',
    name_en: 'Vishu Vilakku',
    name_ml: 'വിഷു വിളക്ക്',
    date_en: 'Medam 1',
    date_ml: 'മേടം 1',
    desc_en: 'New year festival of light, prosperity and the Vishukkani darshan at dawn.',
    desc_ml: 'പുതുവർഷ വിളക്കും വിഷുക്കണി ദർശനവുമായ പ്രഭാത ഉത്സവം.'
  },
  {
    id: 'f3',
    name_en: 'Mandala Pooja',
    name_ml: 'മണ്ഡല പൂജ',
    date_en: 'Vrischikam – Dhanu',
    date_ml: 'വൃശ്ചികം – ധനു',
    desc_en: '41 days of sacred discipline culminating in the grand Mandala Pooja celebration.',
    desc_ml: '41 ദിവസത്തെ വ്രതാനുഷ്ഠാനത്തിന്റെ സമാപനത്തിലെ മഹാപൂജ.'
  },
  {
    id: 'f4',
    name_en: 'Pongala',
    name_ml: 'പൊങ്കാല',
    date_en: 'Makaram',
    date_ml: 'മകരം',
    desc_en: 'Devotees gather to offer the sacred pongala to the Devi with collective prayers.',
    desc_ml: 'ഭക്തർ ഒത്തുചേർന്ന് ദേവിക്ക് സമർപ്പിക്കുന്ന പൊങ്കാല വഴിപാട്.'
  }
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

const Store = {
  uid() { return 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); },

  read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch { return fallback; }
  },

  write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },

  init() {
    if (!localStorage.getItem(STORE_KEYS.pujas)) this.write(STORE_KEYS.pujas, DEFAULT_PUJAS);
    if (!localStorage.getItem(STORE_KEYS.festivals)) this.write(STORE_KEYS.festivals, DEFAULT_FESTIVALS);
    if (!localStorage.getItem(STORE_KEYS.timings)) this.write(STORE_KEYS.timings, DEFAULT_TIMINGS);
    if (!localStorage.getItem(STORE_KEYS.bookings)) this.write(STORE_KEYS.bookings, []);
    if (!localStorage.getItem(STORE_KEYS.users)) this.write(STORE_KEYS.users, []);
    if (!localStorage.getItem(STORE_KEYS.enquiries)) this.write(STORE_KEYS.enquiries, []);
    this.ensureAdminUser();
  },

  ensureAdminUser() {
    const list = this.read(STORE_KEYS.users, []);
    if (list.some(u => u.isAdmin)) return;
    list.push({
      id: 'admin-seed',
      name: 'Temple Admin',
      email: 'admin@temple.com',
      phone: '',
      password: 'admin123',
      isAdmin: true,
      createdAt: new Date().toISOString()
    });
    this.write(STORE_KEYS.users, list);
  },

  /* ----- Pujas ----- */
  getPujas() { return this.read(STORE_KEYS.pujas, []); },
  savePujas(list) { this.write(STORE_KEYS.pujas, list); },
  upsertPuja(puja) {
    const list = this.getPujas();
    if (puja.id) {
      const idx = list.findIndex(p => p.id === puja.id);
      if (idx >= 0) list[idx] = puja; else list.push(puja);
    } else {
      puja.id = this.uid();
      list.push(puja);
    }
    this.savePujas(list);
    return puja;
  },
  deletePuja(id) { this.savePujas(this.getPujas().filter(p => p.id !== id)); },

  /* ----- Festivals ----- */
  getFestivals() { return this.read(STORE_KEYS.festivals, []); },
  saveFestivals(list) { this.write(STORE_KEYS.festivals, list); },
  upsertFestival(item) {
    const list = this.getFestivals();
    if (item.id) {
      const idx = list.findIndex(p => p.id === item.id);
      if (idx >= 0) list[idx] = item; else list.push(item);
    } else {
      item.id = this.uid();
      list.push(item);
    }
    this.saveFestivals(list);
    return item;
  },
  deleteFestival(id) { this.saveFestivals(this.getFestivals().filter(f => f.id !== id)); },

  /* ----- Timings ----- */
  getTimings() { return this.read(STORE_KEYS.timings, DEFAULT_TIMINGS); },
  saveTimings(list) { this.write(STORE_KEYS.timings, list); },

  /* ----- Bookings ----- */
  getBookings() { return this.read(STORE_KEYS.bookings, []); },
  saveBookings(list) { this.write(STORE_KEYS.bookings, list); },
  addBooking(booking) {
    booking.id = this.uid();
    booking.createdAt = new Date().toISOString();
    booking.status = 'pending';
    const list = this.getBookings();
    list.unshift(booking);
    this.saveBookings(list);
    return booking;
  },
  updateBookingStatus(id, status) {
    const list = this.getBookings();
    const idx = list.findIndex(b => b.id === id);
    if (idx >= 0) { list[idx].status = status; this.saveBookings(list); }
  },
  deleteBooking(id) { this.saveBookings(this.getBookings().filter(b => b.id !== id)); },
  getUserBookings(userId) {
    return this.getBookings().filter(b => b.userId === userId);
  },
  /* ----- Enquiries (contact form) ----- */
  getEnquiries() { return this.read(STORE_KEYS.enquiries, []); },
  addEnquiry({ name, email, subject, message }) {
    const e = {
      id: this.uid(),
      name: Sec.trim(name, 80),
      email: Sec.trim(email, 120).toLowerCase(),
      subject: Sec.trim(subject, 40) || 'general',
      message: Sec.trim(message, 1000),
      createdAt: new Date().toISOString(),
      status: 'new'
    };
    if (!e.name || !Sec.email(e.email) || !e.message) {
      return { ok: false, error: 'invalid' };
    }
    const list = this.getEnquiries();
    list.unshift(e);
    this.write(STORE_KEYS.enquiries, list);
    return { ok: true, enquiry: e };
  },

  generateReceipt() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const seq = String(this.getBookings().length + 1).padStart(4, '0');
    return `KPV-${yyyy}${mm}${dd}-${seq}`;
  },

  /* ----- Users (devotee accounts) ----- */
  getUsers() { return this.read(STORE_KEYS.users, []); },
  saveUsers(list) { this.write(STORE_KEYS.users, list); },
  findUserByEmail(email) {
    const e = (email || '').trim().toLowerCase();
    return this.getUsers().find(u => u.email === e) || null;
  },
  async signupUser({ name, email, phone, password }) {
    const cleanName = Sec.trim(name, 80);
    const e = Sec.trim(email, 120).toLowerCase();
    const cleanPhone = Sec.trim(phone, 20);
    if (!cleanName || !e || !password) return { ok: false, error: 'missing' };
    if (!Sec.email(e)) return { ok: false, error: 'badEmail' };
    if (cleanPhone && !Sec.phone(cleanPhone)) return { ok: false, error: 'badPhone' };
    if (String(password).length < 6) return { ok: false, error: 'weakPassword' };
    if (this.findUserByEmail(e)) return { ok: false, error: 'exists' };

    const salt = CryptoUtil.generateSalt();
    const passwordHash = await CryptoUtil.hash(password, salt);
    const user = {
      id: this.uid(),
      name: cleanName,
      email: e,
      phone: cleanPhone,
      salt,
      passwordHash,
      isAdmin: false,
      createdAt: new Date().toISOString()
    };
    const list = this.getUsers();
    list.push(user);
    this.saveUsers(list);
    sessionStorage.setItem(STORE_KEYS.session, user.id);
    return { ok: true, user };
  },

  async loginUser(email, password) {
    const e = Sec.trim(email, 120).toLowerCase();
    const scope = 'login:' + e;
    const gate = RateLimit.check(scope);
    if (!gate.allowed) {
      return { ok: false, error: 'locked', retryInSeconds: gate.retryInSeconds };
    }

    const u = this.findUserByEmail(e);
    if (!u) {
      RateLimit.fail(scope);
      return { ok: false, error: 'invalid' };
    }

    let valid = false;

    // New (hashed) credentials
    if (u.salt && u.passwordHash) {
      const hash = await CryptoUtil.hash(password, u.salt);
      valid = (hash === u.passwordHash);
    }
    // Legacy (plaintext) — verify, then migrate to hashed
    if (!valid && typeof u.password === 'string' && u.password.length > 0) {
      if (u.password === password) {
        const salt = CryptoUtil.generateSalt();
        const passwordHash = await CryptoUtil.hash(password, salt);
        u.salt = salt;
        u.passwordHash = passwordHash;
        delete u.password;
        const list = this.getUsers().map(x => x.id === u.id ? u : x);
        this.saveUsers(list);
        valid = true;
      }
    }

    if (!valid) {
      RateLimit.fail(scope);
      return { ok: false, error: 'invalid' };
    }

    RateLimit.reset(scope);
    sessionStorage.setItem(STORE_KEYS.session, u.id);
    return { ok: true, user: u };
  },
  logoutUser() { sessionStorage.removeItem(STORE_KEYS.session); },
  getCurrentUser() {
    const id = sessionStorage.getItem(STORE_KEYS.session);
    if (!id) return null;
    return this.getUsers().find(u => u.id === id) || null;
  },
  isUserLoggedIn() { return !!this.getCurrentUser(); },

  /* ----- Admin auth — derived from the current user's isAdmin flag ----- */
  isAdmin() {
    const u = this.getCurrentUser();
    return !!(u && u.isAdmin);
  },
  logoutAdmin() { this.logoutUser(); }
};

Store.init();
