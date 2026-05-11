/* Data layer — talks to the backend (/api/*) instead of localStorage.
 *
 * Public surface (mostly unchanged from the localStorage version, but methods are now async):
 *   Store.init()                  — fetches /api/auth/me, caches current user, fetches Pujas list
 *   Store.getCurrentUser()        — sync, returns the cached user
 *   Store.isUserLoggedIn() / isAdmin()
 *   Store.signupUser({...})       — POST /api/auth/signup
 *   Store.loginUser(email, pwd)   — POST /api/auth/login
 *   Store.logoutUser()            — POST /api/auth/logout
 *
 *   Store.getPujas()              — sync, returns the cached list (call refreshPujas to update)
 *   Store.refreshPujas()          — GET /api/pujas → cache
 *   Store.upsertPuja(p) / deletePuja(id)
 *
 *   Store.getFestivals() / refreshFestivals() / upsertFestival / deleteFestival
 *   Store.getTimings()  / refreshTimings()  / saveTimings(list)
 *
 *   Store.getBookings()         — admin
 *   Store.getUserBookings(uid)  — back-compat: ignores uid, uses ?scope=mine
 *   Store.addBooking(b)
 *   Store.updateBookingStatus(id, status)
 *   Store.deleteBooking(id)
 *
 *   Store.addEnquiry(e) / getEnquiries()
 */

/* ====================== Nakshatram (birth-star) constants — unchanged ====================== */
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

/* ====================== Security utilities — kept for XSS-escape in render code ====================== */
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

/* ====================== Tiny fetch helper ====================== */
async function api(path, { method = 'GET', body } = {}) {
  const opts = {
    method,
    credentials: 'same-origin',
    headers: {}
  };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  let res, data;
  try {
    res = await fetch(path, opts);
  } catch (e) {
    return { ok: false, error: 'network', status: 0 };
  }
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (!res.ok) {
    return { ok: false, error: data.error || res.statusText || 'error', status: res.status, data };
  }
  return { ...data, ok: true, status: res.status };
}

/* ====================== Store ====================== */
const Store = {
  _currentUser: null,
  _pujas: [],
  _festivals: [],
  _timings: [],
  _ready: null,

  /* ---------- Init: called once on every page load ---------- */
  init() {
    if (this._ready) return this._ready;
    this._ready = (async () => {
      // Fetch session + reference data in parallel.
      const [me, pujas, festivals, timings] = await Promise.all([
        api('/api/auth/me'),
        api('/api/pujas'),
        api('/api/festivals'),
        api('/api/timings')
      ]);
      if (me.ok) this._currentUser = me.user || null;
      if (pujas.ok) this._pujas = (pujas.items || []).map(this._mapId);
      if (festivals.ok) this._festivals = (festivals.items || []).map(this._mapId);
      if (timings.ok) this._timings = timings.days || [];
    })();
    return this._ready;
  },

  _mapId(doc) {
    // Mongo returns `_id`; the existing UI expects `id`.
    if (doc && doc._id && !doc.id) doc.id = String(doc._id);
    return doc;
  },

  /* ---------- Auth ---------- */
  getCurrentUser() { return this._currentUser; },
  isUserLoggedIn() { return !!this._currentUser; },
  isAdmin() { return !!(this._currentUser && this._currentUser.isAdmin); },

  async signupUser({ name, email, phone, password }) {
    const r = await api('/api/auth/signup', {
      method: 'POST',
      body: { name, email, phone, password }
    });
    if (!r.ok) return { ok: false, error: r.error };
    this._currentUser = r.user;
    return { ok: true, user: r.user };
  },

  async loginUser(email, password) {
    const r = await api('/api/auth/login', { method: 'POST', body: { email, password } });
    if (!r.ok) return { ok: false, error: r.error };
    this._currentUser = r.user;
    return { ok: true, user: r.user };
  },

  async googleLogin(payload) {
    // Accepts:
    //   - a string (ID token)         → { credential: string }
    //   - { credential: string }      → ID-token flow
    //   - { accessToken: string }     → OAuth access-token flow
    let body;
    if (typeof payload === 'string')           body = { credential: payload };
    else if (payload && payload.credential)    body = { credential: payload.credential };
    else if (payload && payload.accessToken)   body = { accessToken: payload.accessToken };
    else return { ok: false, error: 'noCredential' };

    const r = await api('/api/auth/google', { method: 'POST', body });
    if (!r.ok) return { ok: false, error: r.error };
    this._currentUser = r.user;
    return { ok: true, user: r.user };
  },

  async logoutUser() {
    await api('/api/auth/logout', { method: 'POST' });
    this._currentUser = null;
  },

  /* ---------- Pujas ---------- */
  getPujas() { return this._pujas.slice(); },
  async refreshPujas() {
    const r = await api('/api/pujas');
    if (r.ok) this._pujas = (r.items || []).map(this._mapId);
    return this._pujas;
  },
  async upsertPuja(puja) {
    let r;
    if (puja.id) {
      r = await api(`/api/pujas/${puja.id}`, {
        method: 'PUT',
        body: {
          name_en: puja.name_en, name_ml: puja.name_ml,
          desc_en: puja.desc_en, desc_ml: puja.desc_ml,
          price: puja.price
        }
      });
    } else {
      r = await api('/api/pujas', { method: 'POST', body: puja });
    }
    if (r.ok) await this.refreshPujas();
    return r;
  },
  async deletePuja(id) {
    const r = await api(`/api/pujas/${id}`, { method: 'DELETE' });
    if (r.ok) await this.refreshPujas();
    return r;
  },

  /* ---------- Festivals ---------- */
  getFestivals() { return this._festivals.slice(); },
  async refreshFestivals() {
    const r = await api('/api/festivals');
    if (r.ok) this._festivals = (r.items || []).map(this._mapId);
    return this._festivals;
  },
  async upsertFestival(item) {
    let r;
    if (item.id) {
      r = await api(`/api/festivals/${item.id}`, { method: 'PUT', body: item });
    } else {
      r = await api('/api/festivals', { method: 'POST', body: item });
    }
    if (r.ok) await this.refreshFestivals();
    return r;
  },
  async deleteFestival(id) {
    const r = await api(`/api/festivals/${id}`, { method: 'DELETE' });
    if (r.ok) await this.refreshFestivals();
    return r;
  },

  /* ---------- Timings ---------- */
  getTimings() { return this._timings.slice(); },
  async refreshTimings() {
    const r = await api('/api/timings');
    if (r.ok) this._timings = r.days || [];
    return this._timings;
  },
  async saveTimings(list) {
    const r = await api('/api/timings', { method: 'PUT', body: { days: list } });
    if (r.ok) this._timings = r.days || [];
    return r;
  },

  /* ---------- Bookings ---------- */
  async getBookings() {
    const r = await api('/api/bookings');
    return r.ok ? (r.items || []).map(this._mapId) : [];
  },
  async getUserBookings(/* uid — ignored, server uses session */) {
    const r = await api('/api/bookings?scope=mine');
    return r.ok ? (r.items || []).map(this._mapId) : [];
  },
  async addBooking(booking) {
    const r = await api('/api/bookings', { method: 'POST', body: booking });
    if (r.ok && r.booking) r.booking = this._mapId(r.booking);
    return r;
  },
  async updateBookingStatus(id, status) {
    return api(`/api/bookings/${id}`, { method: 'PATCH', body: { status } });
  },
  async deleteBooking(id) {
    return api(`/api/bookings/${id}`, { method: 'DELETE' });
  },

  /* ---------- Enquiries (contact form) ---------- */
  async addEnquiry(payload) {
    const r = await api('/api/enquiries', { method: 'POST', body: payload });
    return r.ok ? { ok: true, enquiry: r.enquiry } : { ok: false, error: r.error };
  },
  async getEnquiries() {
    const r = await api('/api/enquiries');
    return r.ok ? r.items || [] : [];
  },

  /* ---------- Receipt generator no longer needed client-side (server-issued) ---------- */
  generateReceipt() { return ''; }
};

// Kick off the initial load as soon as the script is parsed. Pages can `await Store.init()`
// before using cached data, or just rely on the promise resolving by the time DOMContentLoaded fires.
Store.init();
