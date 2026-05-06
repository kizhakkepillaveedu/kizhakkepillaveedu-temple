/* Admin panel logic — auth, tabs, CRUD on pujas/festivals/timings, bookings management */

const Admin = {
  init() {
    this.bindLogin();
    this.bindLogout();
    this.bindTabs();
    this.bindPujaUI();
    this.bindFestivalUI();
    this.refreshAuth();
    document.addEventListener('lang:change', () => {
      if (Store.isAdmin()) this.renderActiveTab();
    });
  },

  refreshAuth() {
    const loggedIn = Store.isAdmin();
    document.getElementById('login-view').classList.toggle('hidden', loggedIn);
    document.getElementById('admin-view').classList.toggle('hidden', !loggedIn);
    if (loggedIn) {
      this.activateTab('dashboard');
    }
  },

  bindLogin() {
    document.getElementById('login-form').addEventListener('submit', e => {
      e.preventDefault();
      const pw = document.getElementById('login-pw').value;
      if (Store.loginAdmin(pw)) {
        document.getElementById('login-err').style.display = 'none';
        this.refreshAuth();
        UI.toast('Welcome back', 'success');
      } else {
        document.getElementById('login-err').style.display = 'block';
      }
    });
  },

  bindLogout() {
    document.getElementById('logout-btn').addEventListener('click', () => {
      Store.logoutAdmin();
      this.refreshAuth();
    });
  },

  bindTabs() {
    document.querySelectorAll('.admin-nav-link[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => this.activateTab(btn.dataset.tab));
    });
  },

  activateTab(tab) {
    this.activeTab = tab;
    document.querySelectorAll('.admin-nav-link[data-tab]').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tab);
    });
    document.querySelectorAll('.admin-tab').forEach(p => {
      p.classList.toggle('hidden', p.dataset.pane !== tab);
    });
    this.renderActiveTab();
  },

  renderActiveTab() {
    const r = {
      dashboard: () => this.renderDashboard(),
      bookings: () => this.renderBookings(),
      pujas: () => this.renderPujas(),
      festivals: () => this.renderFestivals(),
      timings: () => this.renderTimings()
    };
    (r[this.activeTab] || r.dashboard)();
    I18N.apply();
  },

  /* ----- Dashboard ----- */
  renderDashboard() {
    const bookings = Store.getBookings();
    const pending = bookings.filter(b => b.status === 'pending').length;
    const stats = [
      { label: I18N.t('admin.stats.bookings'), value: bookings.length, gold: true },
      { label: I18N.t('admin.stats.pending'), value: pending },
      { label: I18N.t('admin.stats.pujas'), value: Store.getPujas().length },
      { label: I18N.t('admin.stats.festivals'), value: Store.getFestivals().length }
    ];
    document.getElementById('stats-grid').innerHTML = stats.map(s => `
      <div class="stat-card">
        <div class="stat-label">${s.label}</div>
        <div class="stat-value ${s.gold ? 'gold' : ''}">${s.value}</div>
      </div>
    `).join('');
    document.getElementById('recent-bookings').innerHTML = this.bookingsTable(bookings.slice(0, 5));
    this.bindBookingActions(document.getElementById('recent-bookings'));
  },

  /* ----- Bookings ----- */
  renderBookings() {
    document.getElementById('bookings-list').innerHTML = this.bookingsTable(Store.getBookings());
    this.bindBookingActions(document.getElementById('bookings-list'));
  },

  bookingsTable(list) {
    if (!list.length) {
      return `<div class="data-table"><div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 4h14a1 1 0 0 1 1 1v15l-4-3-4 3-4-3-4 3V5a1 1 0 0 1 1-1z"/></svg>
        <p>${I18N.t('admin.bookings.empty')}</p></div></div>`;
    }
    const lang = I18N.current;
    return `<div class="data-table"><table><thead><tr>
      <th>#</th><th>Devotee</th><th>Puja</th><th>Date</th><th>Phone</th><th>Status</th><th></th>
    </tr></thead><tbody>
      ${list.map((b, i) => `
        <tr>
          <td>${i + 1}</td>
          <td><strong>${this.esc(b.name)}</strong>${b.star ? `<br/><small style="color:var(--color-text-muted);">${this.esc(b.star)}</small>` : ''}</td>
          <td>${this.esc(lang === 'ml' && b.pujaNameMl ? b.pujaNameMl : b.pujaName)}<br/><small style="color:var(--color-text-muted);">₹${b.price}</small></td>
          <td>${b.date}</td>
          <td>${this.esc(b.phone)}</td>
          <td>
            <select class="status-select" data-id="${b.id}" style="padding:4px 8px;border:1px solid var(--color-border);border-radius:6px;font-size:.82rem;">
              <option value="pending" ${b.status === 'pending' ? 'selected' : ''}>Pending</option>
              <option value="confirmed" ${b.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
              <option value="cancelled" ${b.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
          </td>
          <td>
            <button class="icon-btn danger" data-del-booking="${b.id}" title="Delete">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            </button>
          </td>
        </tr>
      `).join('')}
    </tbody></table></div>`;
  },

  bindBookingActions(scope) {
    scope.querySelectorAll('.status-select').forEach(sel => {
      sel.addEventListener('change', () => {
        Store.updateBookingStatus(sel.dataset.id, sel.value);
        UI.toast('Status updated', 'success');
        this.renderActiveTab();
      });
    });
    scope.querySelectorAll('[data-del-booking]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!confirm(I18N.t('admin.delete.confirm'))) return;
        Store.deleteBooking(btn.dataset.delBooking);
        this.renderActiveTab();
      });
    });
  },

  /* ----- Pujas ----- */
  renderPujas() {
    const list = Store.getPujas();
    if (!list.length) {
      document.getElementById('pujas-list').innerHTML = `<div class="data-table"><div class="empty-state">
        <p>${I18N.t('admin.pujas.empty')}</p></div></div>`;
      return;
    }
    document.getElementById('pujas-list').innerHTML = `<div class="data-table"><table><thead><tr>
      <th>Name (EN)</th><th>Name (ML)</th><th>Price</th><th></th>
    </tr></thead><tbody>
      ${list.map(p => `
        <tr>
          <td><strong>${this.esc(p.name_en)}</strong><br/><small style="color:var(--color-text-muted);">${this.esc(p.desc_en || '')}</small></td>
          <td>${this.esc(p.name_ml || '—')}</td>
          <td><strong style="color:var(--color-gold-deep);">₹${p.price}</strong></td>
          <td>
            <button class="icon-btn" data-edit-puja="${p.id}" title="Edit">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
            </button>
            <button class="icon-btn danger" data-del-puja="${p.id}" title="Delete">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            </button>
          </td>
        </tr>
      `).join('')}
    </tbody></table></div>`;

    document.querySelectorAll('[data-edit-puja]').forEach(b => b.addEventListener('click', () => this.openPujaModal(b.dataset.editPuja)));
    document.querySelectorAll('[data-del-puja]').forEach(b => b.addEventListener('click', () => {
      if (!confirm(I18N.t('admin.delete.confirm'))) return;
      Store.deletePuja(b.dataset.delPuja);
      this.renderActiveTab();
    }));
  },

  bindPujaUI() {
    document.getElementById('add-puja-btn').addEventListener('click', () => this.openPujaModal());
    document.getElementById('puja-form').addEventListener('submit', e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const id = fd.get('id') || undefined;
      Store.upsertPuja({
        id,
        name_en: fd.get('name_en'),
        name_ml: fd.get('name_ml'),
        desc_en: fd.get('desc_en'),
        desc_ml: fd.get('desc_ml'),
        price: Number(fd.get('price'))
      });
      UI.closeModal('puja-modal');
      UI.toast(id ? 'Puja updated' : 'Puja added', 'success');
      this.renderActiveTab();
    });
  },

  openPujaModal(id) {
    const form = document.getElementById('puja-form');
    form.reset();
    if (id) {
      const p = Store.getPujas().find(x => x.id === id);
      if (p) {
        form.id.value = p.id;
        form.name_en.value = p.name_en || '';
        form.name_ml.value = p.name_ml || '';
        form.desc_en.value = p.desc_en || '';
        form.desc_ml.value = p.desc_ml || '';
        form.price.value = p.price || 0;
      }
      document.getElementById('puja-modal-title').textContent = 'Edit Puja';
    } else {
      form.id.value = '';
      document.getElementById('puja-modal-title').textContent = 'Add Puja';
    }
    UI.openModal('puja-modal');
  },

  /* ----- Festivals ----- */
  renderFestivals() {
    const list = Store.getFestivals();
    if (!list.length) {
      document.getElementById('festivals-list').innerHTML = `<div class="data-table"><div class="empty-state">
        <p>${I18N.t('admin.festivals.empty')}</p></div></div>`;
      return;
    }
    document.getElementById('festivals-list').innerHTML = `<div class="data-table"><table><thead><tr>
      <th>Name</th><th>Date</th><th>Description</th><th></th>
    </tr></thead><tbody>
      ${list.map(f => `
        <tr>
          <td><strong>${this.esc(f.name_en)}</strong>${f.name_ml ? `<br/><small style="color:var(--color-text-muted);">${this.esc(f.name_ml)}</small>` : ''}</td>
          <td><span class="tag confirmed">${this.esc(f.date_en || '')}</span></td>
          <td><small>${this.esc((f.desc_en || '').slice(0, 80))}${(f.desc_en || '').length > 80 ? '…' : ''}</small></td>
          <td>
            <button class="icon-btn" data-edit-festival="${f.id}" title="Edit">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
            </button>
            <button class="icon-btn danger" data-del-festival="${f.id}" title="Delete">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            </button>
          </td>
        </tr>
      `).join('')}
    </tbody></table></div>`;

    document.querySelectorAll('[data-edit-festival]').forEach(b => b.addEventListener('click', () => this.openFestivalModal(b.dataset.editFestival)));
    document.querySelectorAll('[data-del-festival]').forEach(b => b.addEventListener('click', () => {
      if (!confirm(I18N.t('admin.delete.confirm'))) return;
      Store.deleteFestival(b.dataset.delFestival);
      this.renderActiveTab();
    }));
  },

  bindFestivalUI() {
    document.getElementById('add-festival-btn').addEventListener('click', () => this.openFestivalModal());
    document.getElementById('festival-form').addEventListener('submit', e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const id = fd.get('id') || undefined;
      Store.upsertFestival({
        id,
        name_en: fd.get('name_en'),
        name_ml: fd.get('name_ml'),
        date_en: fd.get('date_en'),
        date_ml: fd.get('date_ml'),
        desc_en: fd.get('desc_en'),
        desc_ml: fd.get('desc_ml')
      });
      UI.closeModal('festival-modal');
      UI.toast(id ? 'Festival updated' : 'Festival added', 'success');
      this.renderActiveTab();
    });
  },

  openFestivalModal(id) {
    const form = document.getElementById('festival-form');
    form.reset();
    if (id) {
      const f = Store.getFestivals().find(x => x.id === id);
      if (f) {
        form.id.value = f.id;
        form.name_en.value = f.name_en || '';
        form.name_ml.value = f.name_ml || '';
        form.date_en.value = f.date_en || '';
        form.date_ml.value = f.date_ml || '';
        form.desc_en.value = f.desc_en || '';
        form.desc_ml.value = f.desc_ml || '';
      }
      document.getElementById('festival-modal-title').textContent = 'Edit Festival';
    } else {
      form.id.value = '';
      document.getElementById('festival-modal-title').textContent = 'Add Festival';
    }
    UI.openModal('festival-modal');
  },

  /* ----- Timings ----- */
  renderTimings() {
    const list = Store.getTimings();
    document.getElementById('timings-editor').innerHTML = `
      <div class="timings-wrap">
        <div class="timings-row head">
          <div data-i18n="timings.day">Day</div>
          <div data-i18n="timings.morning">Morning</div>
          <div data-i18n="timings.evening">Evening</div>
        </div>
        ${list.map((t, idx) => `
          <div class="timings-row">
            <div class="timings-day"><span class="dot"></span><span>${I18N.t('days.' + t.day)}</span></div>
            <div><input type="text" data-timing-idx="${idx}" data-field="morning" value="${this.esc(t.morning || '')}" placeholder="Closed" style="width:100%;padding:8px 12px;border:1px solid var(--color-border);border-radius:8px;font-size:.92rem;background:var(--color-bg);" /></div>
            <div><input type="text" data-timing-idx="${idx}" data-field="evening" value="${this.esc(t.evening || '')}" placeholder="Closed" style="width:100%;padding:8px 12px;border:1px solid var(--color-border);border-radius:8px;font-size:.92rem;background:var(--color-bg);" /></div>
          </div>
        `).join('')}
      </div>
      <div style="margin-top:20px;text-align:right;">
        <button class="btn btn-primary" id="save-timings"><span data-i18n="admin.save">Save</span></button>
      </div>
    `;
    document.getElementById('save-timings').addEventListener('click', () => {
      const updated = Store.getTimings().map((t, idx) => ({
        day: t.day,
        morning: document.querySelector(`input[data-timing-idx="${idx}"][data-field="morning"]`).value.trim(),
        evening: document.querySelector(`input[data-timing-idx="${idx}"][data-field="evening"]`).value.trim()
      }));
      Store.saveTimings(updated);
      UI.toast('Timings saved', 'success');
    });
  },

  /* ----- Helpers ----- */
  esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
};

document.addEventListener('DOMContentLoaded', () => Admin.init());
