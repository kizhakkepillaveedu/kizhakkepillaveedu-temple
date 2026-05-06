/* Data layer — localStorage backed store for pujas, festivals, timings, bookings */

const STORE_KEYS = {
  pujas: 'kpv.pujas',
  festivals: 'kpv.festivals',
  timings: 'kpv.timings',
  bookings: 'kpv.bookings',
  admin: 'kpv.admin'
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

  /* ----- Admin auth (simple, client-side) ----- */
  ADMIN_PASSWORD: 'admin123',
  isAdmin() { return sessionStorage.getItem('kpv.admin') === '1'; },
  loginAdmin(pw) {
    if (pw === this.ADMIN_PASSWORD) { sessionStorage.setItem('kpv.admin', '1'); return true; }
    return false;
  },
  logoutAdmin() { sessionStorage.removeItem('kpv.admin'); }
};

Store.init();
