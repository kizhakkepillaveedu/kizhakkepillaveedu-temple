/* Admin panel logic — auth, tabs, CRUD on pujas/festivals/timings, bookings management */

const Admin = {
  // Local cache for the bookings list — populated on every dashboard/bookings render
  // so that openBookingDetail() can resolve from memory.
  _bookings: [],

  async init() {
    // Wait for /api/auth/me to settle before checking the role.
    await Store.init();

    if (!Store.isUserLoggedIn()) {
      window.location.href = 'login.html?next=admin.html';
      return;
    }
    if (!Store.isAdmin()) {
      window.location.href = 'index.html';
      return;
    }

    this.bindLogout();
    this.bindTabs();
    this.bindPujaUI();
    this.bindFestivalUI();
    this.bindDrawer();
    this.activateTab('dashboard');
    document.addEventListener('lang:change', () => this.renderActiveTab());
  },

  bindDrawer() {
    const toggle = document.getElementById('admin-menu-toggle');
    const shell = document.querySelector('.admin-shell');
    const sidebar = document.querySelector('.admin-sidebar');
    if (!toggle || !shell || !sidebar) return;

    const close = () => shell.classList.remove('drawer-open');
    const open = () => shell.classList.add('drawer-open');

    toggle.addEventListener('click', e => {
      e.stopPropagation();
      shell.classList.contains('drawer-open') ? close() : open();
    });
    // Close drawer when any sidebar link is clicked (after activating its tab)
    sidebar.querySelectorAll('.admin-nav-link').forEach(link => {
      link.addEventListener('click', () => close());
    });
    // Close when clicking the dimmed backdrop (anywhere outside the sidebar)
    shell.addEventListener('click', e => {
      if (!shell.classList.contains('drawer-open')) return;
      if (sidebar.contains(e.target)) return;
      close();
    });
    // Close on Escape
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && shell.classList.contains('drawer-open')) close();
    });
  },

  syncMobileTabSelect() { /* no-op kept for back-compat with activateTab */ },

  bindLogout() {
    const btn = document.getElementById('logout-btn');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      await Store.logoutUser();
      window.location.href = 'index.html';
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
    this.syncMobileTabSelect(tab);
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
  async renderDashboard() {
    this._bookings = await Store.getBookings();
    const pending = this._bookings.filter(b => b.status === 'pending').length;
    const stats = [
      { label: I18N.t('admin.stats.bookings'), value: this._bookings.length, gold: true },
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
    document.getElementById('recent-bookings').innerHTML = this.bookingsTable(this._bookings.slice(0, 5));
    this.bindBookingActions(document.getElementById('recent-bookings'));
  },

  /* ----- Bookings ----- */
  async renderBookings() {
    this._bookings = await Store.getBookings();
    document.getElementById('bookings-list').innerHTML = this.bookingsTable(this._bookings);
    this.bindBookingActions(document.getElementById('bookings-list'));
  },

  bookingsTable(list) {
    if (!list.length) {
      return `<div class="data-table"><div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 4h14a1 1 0 0 1 1 1v15l-4-3-4 3-4-3-4 3V5a1 1 0 0 1 1-1z"/></svg>
        <p>${I18N.t('admin.bookings.empty')}</p></div></div>`;
    }
    return `<div class="data-table"><table><thead><tr>
      <th>#</th><th>Receipt</th><th>Devotee</th><th>Offerings</th><th>Puja Date</th><th>Phone</th><th>Total</th><th>Payment</th><th>Status</th><th></th>
    </tr></thead><tbody>
      ${list.map((b, i) => {
        const contact = b.contact || {};
        const members = Array.isArray(b.members) ? b.members : [];
        const pay = b.payment || {};
        const receipt = pay.receipt || ('—');
        const memberSummary = members.length
          ? `${members.length} ${members.length === 1 ? 'offering' : 'offerings'}`
          : '—';
        const memberPreview = members.slice(0, 2).map(m => this.esc(m.pujaName || '')).join(', ')
          + (members.length > 2 ? ` +${members.length - 2}` : '');
        const preferred = b.preferredDate
          ? new Date(b.preferredDate + 'T00:00:00').toLocaleDateString()
          : '—';
        const payMethodLabel = pay.method
          ? I18N.t(pay.method === 'online' ? 'payment.online' : 'payment.counter')
          : '—';
        const payStatusKey = pay.status === 'paid' ? 'payment.status.paid'
          : pay.status === 'pending_counter' ? 'payment.status.pending_counter' : null;
        const payStatusLabel = payStatusKey ? I18N.t(payStatusKey) : '';
        return `
        <tr class="booking-row" data-view-booking="${b.id}" style="cursor:pointer;">
          <td data-label="#">${i + 1}</td>
          <td data-label="Receipt"><strong style="color:var(--color-gold-deep);font-family:'Inter',monospace;font-size:.82rem;">${this.esc(receipt)}</strong></td>
          <td data-label="Devotee"><strong>${this.esc(contact.name || '—')}</strong></td>
          <td data-label="Offerings">${memberSummary}<br/><small style="color:var(--color-text-muted);">${memberPreview || '—'}</small></td>
          <td data-label="Puja Date">${preferred}</td>
          <td data-label="Phone">${this.esc(contact.phone || '—')}</td>
          <td data-label="Total"><strong style="color:var(--color-gold-deep);">₹${(b.total || 0).toLocaleString('en-IN')}</strong></td>
          <td data-label="Payment">${payMethodLabel}${payStatusLabel ? `<br/><small class="pay-${pay.status}">${payStatusLabel}</small>` : ''}</td>
          <td data-label="Status">
            <select class="status-select" data-id="${b.id}" style="padding:4px 8px;border:1px solid var(--color-border);border-radius:6px;font-size:.82rem;" onclick="event.stopPropagation()">
              <option value="pending" ${b.status === 'pending' ? 'selected' : ''}>Pending</option>
              <option value="confirmed" ${b.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
              <option value="completed" ${b.status === 'completed' ? 'selected' : ''}>Completed</option>
              <option value="cancelled" ${b.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
          </td>
          <td data-label="" class="td-actions">
            <button class="icon-btn danger" data-del-booking="${b.id}" title="Delete" onclick="event.stopPropagation()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            </button>
          </td>
          <td data-label="" class="td-toggle" aria-hidden="true">
            <button type="button" class="btn-expand" aria-label="Toggle details" onclick="event.stopPropagation(); this.closest('tr').classList.toggle('expanded')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="20" height="20"><path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </td>
        </tr>
      `;
      }).join('')}
    </tbody></table></div>`;
  },

  bindBookingActions(scope) {
    scope.querySelectorAll('.status-select').forEach(sel => {
      sel.addEventListener('change', async e => {
        e.stopPropagation();
        await Store.updateBookingStatus(sel.dataset.id, sel.value);
        UI.toast('Status updated', 'success');
        this.renderActiveTab();
      });
      sel.addEventListener('click', e => e.stopPropagation());
    });
    scope.querySelectorAll('[data-del-booking]').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        if (!confirm(I18N.t('admin.delete.confirm'))) return;
        await Store.deleteBooking(btn.dataset.delBooking);
        this.renderActiveTab();
      });
    });
    scope.querySelectorAll('[data-view-booking]').forEach(row => {
      row.addEventListener('click', () => this.openBookingDetail(row.dataset.viewBooking));
    });
  },

  openBookingDetail(id) {
    const b = (this._bookings || []).find(x => x.id === id);
    if (!b) return;
    const contact = b.contact || {};
    const pay = b.payment || {};
    const members = Array.isArray(b.members) ? b.members : [];
    const lang = I18N.current;
    const pujas = Store.getPujas();
    const localizedPuja = (m) => {
      const p = pujas.find(x => x.id === m.pujaId);
      if (p) return p[`name_${lang}`] || p.name_en;
      return m.pujaName || '—';
    };
    const created = b.createdAt ? new Date(b.createdAt) : null;
    const createdStr = created ? `${created.toLocaleDateString()} · ${created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '—';
    const preferred = b.preferredDate
      ? new Date(b.preferredDate + 'T00:00:00').toLocaleDateString()
      : '—';
    const payMethodLabel = pay.method
      ? I18N.t(pay.method === 'online' ? 'payment.online' : 'payment.counter')
      : '—';
    const payStatusKey = pay.status === 'paid' ? 'payment.status.paid'
      : pay.status === 'pending_counter' ? 'payment.status.pending_counter' : null;
    const statusKey = 'status.' + (b.status || 'pending');

    const memberRows = members.map((m, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${this.esc(m.who || '—')}</strong>${m.role === 'primary' ? ` <small style="color:var(--color-gold-deep);">(${I18N.t('admin.booking.primary')})</small>` : ''}</td>
        <td>${this.esc(Stars.label(m.star) || '—')}</td>
        <td>${this.esc(localizedPuja(m))}</td>
        <td><strong style="color:var(--color-gold-deep);">₹${(m.price || 0).toLocaleString('en-IN')}</strong></td>
      </tr>
    `).join('');

    document.getElementById('booking-detail-body').innerHTML = `
      <div class="bd-header">
        <div>
          <span class="bd-receipt">${this.esc(pay.receipt || '#' + b.id.slice(-6).toUpperCase())}</span>
          <span class="bd-created">${createdStr}</span>
        </div>
        <span class="status-badge status-${b.status || 'pending'}">${I18N.t(statusKey)}</span>
      </div>

      <div class="bd-grid">
        <div class="bd-cell">
          <span class="bd-label">${I18N.t('booking.field.name')}</span>
          <span class="bd-value">${this.esc(contact.name || '—')}</span>
        </div>
        <div class="bd-cell">
          <span class="bd-label">${I18N.t('booking.field.phone')}</span>
          <span class="bd-value">${this.esc(contact.phone || '—')}</span>
        </div>
        <div class="bd-cell bd-cell-wide">
          <span class="bd-label">${I18N.t('booking.field.address')}</span>
          <span class="bd-value">${this.esc(contact.address || '—')}</span>
        </div>
        <div class="bd-cell">
          <span class="bd-label">${I18N.t('booking.field.preferredDate')}</span>
          <span class="bd-value">${preferred}</span>
        </div>
        <div class="bd-cell">
          <span class="bd-label">${I18N.t('receipt.method')}</span>
          <span class="bd-value">${payMethodLabel}</span>
        </div>
        ${payStatusKey ? `
          <div class="bd-cell">
            <span class="bd-label">${I18N.t('payment.status')}</span>
            <span class="bd-value pay-${pay.status}">${I18N.t(payStatusKey)}</span>
          </div>
        ` : ''}
      </div>

      <h4 class="bd-section-title">${I18N.t('admin.booking.offerings')}</h4>
      <div class="data-table"><table>
        <thead><tr>
          <th>#</th>
          <th>${I18N.t('booking.field.name')}</th>
          <th>${I18N.t('booking.field.star')}</th>
          <th>${I18N.t('booking.field.vazhipad')}</th>
          <th>${I18N.t('receipt.amount')}</th>
        </tr></thead>
        <tbody>${memberRows || `<tr><td colspan="5" style="text-align:center;color:var(--color-text-muted);">—</td></tr>`}</tbody>
      </table></div>

      ${b.notes ? `
        <div class="bd-notes">
          <span class="bd-label">${I18N.t('booking.field.notes')}</span>
          <p>${this.esc(b.notes)}</p>
        </div>
      ` : ''}

      <div class="bd-total">
        <span>${I18N.t('booking.cart.total')}</span>
        <strong>₹${(b.total || 0).toLocaleString('en-IN')}</strong>
      </div>
    `;

    UI.openModal('booking-detail-modal');
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
          <td data-label="Name"><strong>${this.esc(p.name_en)}</strong><br/><small style="color:var(--color-text-muted);">${this.esc(p.desc_en || '')}</small></td>
          <td data-label="Name (ML)">${this.esc(p.name_ml || '—')}</td>
          <td data-label="Price"><strong style="color:var(--color-gold-deep);">₹${p.price}</strong></td>
          <td data-label="" class="td-actions">
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
    document.querySelectorAll('[data-del-puja]').forEach(b => b.addEventListener('click', async () => {
      if (!confirm(I18N.t('admin.delete.confirm'))) return;
      await Store.deletePuja(b.dataset.delPuja);
      this.renderActiveTab();
    }));
  },

  bindPujaUI() {
    document.getElementById('add-puja-btn').addEventListener('click', () => this.openPujaModal());
    document.getElementById('puja-form').addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const id = fd.get('id') || undefined;
      const r = await Store.upsertPuja({
        id,
        name_en: fd.get('name_en'),
        name_ml: fd.get('name_ml'),
        desc_en: fd.get('desc_en'),
        desc_ml: fd.get('desc_ml'),
        price: Number(fd.get('price'))
      });
      if (!r.ok) { UI.toast('Save failed', 'error'); return; }
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
      <th></th><th>Name</th><th>Date</th><th>Description</th><th></th>
    </tr></thead><tbody>
      ${list.map(f => `
        <tr>
          <td data-label="Image">${f.image ? `<img class="row-thumb" src="${this.esc(f.image)}" alt="" />` : '<span class="row-thumb row-thumb-empty"></span>'}</td>
          <td data-label="Name"><strong>${this.esc(f.name_en)}</strong>${f.name_ml ? `<br/><small style="color:var(--color-text-muted);">${this.esc(f.name_ml)}</small>` : ''}</td>
          <td data-label="Date"><span class="tag confirmed">${this.esc(f.date_en || '')}</span></td>
          <td data-label="Description"><small>${this.esc((f.desc_en || '').slice(0, 80))}${(f.desc_en || '').length > 80 ? '…' : ''}</small></td>
          <td data-label="" class="td-actions">
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
    document.querySelectorAll('[data-del-festival]').forEach(b => b.addEventListener('click', async () => {
      if (!confirm(I18N.t('admin.delete.confirm'))) return;
      await Store.deleteFestival(b.dataset.delFestival);
      this.renderActiveTab();
    }));
  },

  bindFestivalUI() {
    document.getElementById('add-festival-btn').addEventListener('click', () => this.openFestivalModal());

    // File picker → resized data URL → fill URL field + preview
    const fileInput = document.getElementById('festival-image-file');
    const urlInput = document.getElementById('festival-image-url');
    const preview = document.getElementById('festival-image-preview');

    const renderPreview = (src) => {
      if (!src) { preview.innerHTML = ''; return; }
      preview.innerHTML = `<img src="${this.esc(src)}" alt="preview"/>`;
    };

    if (fileInput) {
      fileInput.addEventListener('change', async () => {
        const file = fileInput.files && fileInput.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
          UI.toast('Please choose an image file', 'error');
          fileInput.value = '';
          return;
        }
        try {
          // Resize via canvas to keep the upload small, then POST to the images API.
          // Bytes are stored as a Buffer in the `images` collection in MongoDB,
          // and only the /api/images/<id> URL ends up in the festival doc.
          const dataUrl = await this.resizeImage(file, 1600, 0.85);
          const r = await fetch('/api/images', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ dataUri: dataUrl, source: 'festival' })
          });
          const data = await r.json();
          if (!r.ok || !data.ok || !data.url) {
            throw new Error(data.error || 'upload_failed');
          }
          urlInput.value = data.url;
          renderPreview(data.url);
        } catch (err) {
          UI.toast('Could not upload image: ' + (err.message || 'error'), 'error');
        }
      });
    }

    if (urlInput) {
      urlInput.addEventListener('input', () => renderPreview(urlInput.value.trim()));
    }

    document.getElementById('festival-form').addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const id = fd.get('id') || undefined;
      const r = await Store.upsertFestival({
        id,
        name_en: fd.get('name_en'),
        name_ml: fd.get('name_ml'),
        date_en: fd.get('date_en'),
        date_ml: fd.get('date_ml'),
        desc_en: fd.get('desc_en'),
        desc_ml: fd.get('desc_ml'),
        image: (fd.get('image') || '').trim()
      });
      if (!r.ok) { UI.toast('Save failed', 'error'); return; }
      UI.closeModal('festival-modal');
      UI.toast(id ? 'Festival updated' : 'Festival added', 'success');
      this.renderActiveTab();
    });
  },

  // Resize an image File via canvas → JPEG data URL (caps localStorage bloat)
  resizeImage(file, maxWidth = 1200, quality = 0.85) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const ratio = Math.min(1, maxWidth / img.width);
          const w = Math.round(img.width * ratio);
          const h = Math.round(img.height * ratio);
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  openFestivalModal(id) {
    const form = document.getElementById('festival-form');
    form.reset();
    const fileInput = document.getElementById('festival-image-file');
    const urlInput = document.getElementById('festival-image-url');
    const preview = document.getElementById('festival-image-preview');
    if (fileInput) fileInput.value = '';
    if (preview) preview.innerHTML = '';

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
        if (urlInput) urlInput.value = f.image || '';
        if (preview && f.image) preview.innerHTML = `<img src="${this.esc(f.image)}" alt="preview"/>`;
      }
      document.getElementById('festival-modal-title').textContent = 'Edit Festival';
    } else {
      form.id.value = '';
      if (urlInput) urlInput.value = '';
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
    document.getElementById('save-timings').addEventListener('click', async () => {
      const updated = Store.getTimings().map((t, idx) => ({
        day: t.day,
        morning: document.querySelector(`input[data-timing-idx="${idx}"][data-field="morning"]`).value.trim(),
        evening: document.querySelector(`input[data-timing-idx="${idx}"][data-field="evening"]`).value.trim()
      }));
      const r = await Store.saveTimings(updated);
      if (!r.ok) { UI.toast('Save failed', 'error'); return; }
      UI.toast('Timings saved', 'success');
    });
  },

  /* ----- Helpers ----- */
  esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
};

document.addEventListener('DOMContentLoaded', () => Admin.init());
