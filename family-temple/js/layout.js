/* Layout: injects header & footer into pages so we keep markup DRY. */

const Layout = {
  isLoggedIn() {
    return !!(typeof Store !== 'undefined' && Store.isUserLoggedIn && Store.isUserLoggedIn());
  },

  authButtons() {
    if (this.isLoggedIn()) {
      return `
        <a href="#" class="nav-cta nav-cta-ghost js-logout" data-i18n="nav.logout">Logout</a>
        <a href="vazhipadu.html" class="nav-cta nav-cta-primary" data-i18n="nav.book">Book Vazhipad</a>
      `;
    }
    // Login button triggers Google's account-chooser popup directly (no separate login page).
    return `
      <a href="#" class="nav-cta nav-cta-ghost js-google-signin" data-i18n="nav.login">Login</a>
      <a href="vazhipadu.html" class="nav-cta nav-cta-primary" data-i18n="nav.book">Book Vazhipad</a>
    `;
  },

  navAuthLink() {
    if (this.isLoggedIn()) {
      return `<a href="#" class="nav-link nav-link-auth js-logout" data-i18n="nav.logout">Logout</a>`;
    }
    return `<a href="#" class="nav-link nav-link-auth js-google-signin" data-i18n="nav.login">Login</a>`;
  },

  isAdminLayout() {
    return document.body.dataset.layout === 'admin';
  },

  adminHeader() {
    return `
      <header class="site-header admin-header">
        <div class="container header-inner">
          <a href="admin.html" class="brand">
            <div class="brand-mark">ॐ</div>
            <div class="brand-text">
              <span class="brand-name" data-i18n="brand.name">Kizhakke Pilla Veedu</span>
              <span class="brand-sub" data-i18n="admin.title">Admin Panel</span>
            </div>
          </a>
          <div class="header-actions">
            <div class="lang-switch">
              <button class="lang-btn" data-lang="en">EN</button>
              <button class="lang-btn" data-lang="ml" aria-label="മലയാളം">മല</button>
            </div>
            <button class="menu-toggle admin-menu-toggle" id="admin-menu-toggle" aria-label="Menu" type="button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18" stroke-linecap="round"/></svg>
            </button>
          </div>
        </div>
      </header>
    `;
  },

  header() {
    if (this.isAdminLayout()) return this.adminHeader();
    return `
      <header class="site-header">
        <div class="container header-inner">
          <a href="index.html" class="brand">
            <div class="brand-mark">ॐ</div>
            <div class="brand-text">
              <span class="brand-name" data-i18n="brand.name">Kizhakke Pilla Veedu</span>
              <span class="brand-sub" data-i18n="brand.sub">Sree Bhagavathi Temple</span>
            </div>
          </a>
          <nav class="nav">
            <a href="index.html" class="nav-link" data-i18n="nav.home">Home</a>
            <a href="index.html#festivals" class="nav-link" data-i18n="nav.festivals">Festivals</a>
            <a href="index.html#timings" class="nav-link" data-i18n="nav.timings">Timings</a>
            <a href="index.html#contact" class="nav-link" data-i18n="nav.contact">Contact</a>
            ${this.navAuthLink()}
          </nav>
          <div class="header-actions">
            <div class="lang-switch">
              <button class="lang-btn" data-lang="en">EN</button>
              <button class="lang-btn" data-lang="ml" aria-label="മലയാളം">മല</button>
            </div>
            <div class="auth-actions">${this.authButtons()}</div>
            <button class="menu-toggle" aria-label="Menu">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18" stroke-linecap="round"/></svg>
            </button>
          </div>
        </div>
      </header>
    `;
  },

  footer() {
    return `
      <footer class="site-footer">
        <div class="container">
          <div class="footer-grid">
            <div>
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
                <div class="brand-mark" style="background:linear-gradient(135deg,var(--color-gold-light),var(--color-gold));">ॐ</div>
                <div>
                  <div style="color:var(--color-gold-light);font-family:var(--font-en);font-weight:600;" data-i18n="brand.name">Kizhakke Pilla Veedu</div>
                  <div style="font-size:.75rem;color:#9b9580;letter-spacing:.08em;text-transform:uppercase;" data-i18n="brand.sub">Sree Bhagavathi Temple</div>
                </div>
              </div>
              <p style="font-size:.92rem;line-height:1.7;max-width:380px;" data-i18n="footer.about">
                A heritage temple of the Kizhakke Pilla Veedu family.
              </p>
            </div>
            <div>
              <h4 data-i18n="footer.links">Quick Links</h4>
              <ul>
                <li><a href="index.html" data-i18n="nav.home">Home</a></li>
                <li><a href="vazhipadu.html" data-i18n="nav.book">Book Vazhipad</a></li>
                <li><a href="index.html#festivals" data-i18n="nav.festivals">Festivals</a></li>
                <li><a href="index.html#timings" data-i18n="nav.timings">Timings</a></li>
                <li><a href="index.html#contact" data-i18n="nav.contact">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 data-i18n="footer.contact">Contact</h4>
              <ul>
                <li data-i18n="footer.address">Kizhakke Pilla Veedu, Plamthanikkode, Kerala</li>
                <li>+91 00000 00000</li>
                <li>info@kizhakkepillaveedu.org</li>
              </ul>
            </div>
          </div>
          <div class="footer-bottom" data-i18n="footer.copy">© 2026 Kizhakke Pilla Veedu Sree Bhagavathi Temple. All rights reserved.</div>
        </div>
      </footer>
    `;
  },

  scrollTopBtn() {
    return `
      <button class="scroll-top-btn" id="scroll-top-btn" aria-label="Scroll to top">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M5 15l7-7 7 7" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    `;
  },

  mount() {
    const headerHost = document.getElementById('layout-header');
    const footerHost = document.getElementById('layout-footer');
    if (headerHost) headerHost.outerHTML = this.header();
    if (footerHost) {
      footerHost.outerHTML = this.isAdminLayout() ? '' : this.footer();
    }
    document.body.insertAdjacentHTML('beforeend', this.scrollTopBtn());

    // Auth buttons render BEFORE Store.init() finishes, so they default to the
    // logged-out state. Once the session check resolves, swap the contents in
    // place without re-rendering the whole header.
    if (typeof Store !== 'undefined' && Store._ready) {
      Store._ready.then(() => {
        const slot = document.querySelector('.auth-actions');
        if (slot) slot.innerHTML = this.authButtons();
        const navAuth = document.querySelector('.nav .nav-link-auth');
        if (navAuth && navAuth.parentNode) {
          const wrapper = document.createElement('template');
          wrapper.innerHTML = this.navAuthLink().trim();
          navAuth.parentNode.replaceChild(wrapper.content.firstChild, navAuth);
        }
        // Re-translate any newly-injected data-i18n nodes
        if (typeof I18N !== 'undefined' && I18N.apply) I18N.apply();
      });
    }
  }
};

Layout.mount();
