/* Shared utilities — header, mobile nav, modal, toast */

const UI = {
  init() {
    this.initMobileNav();
    this.markActiveNav();
    this.initHeaderScroll();
    this.bindLogout();
    this.bindGoogleSignIn();
    this.bindBookVazhipadGate();
  },

  bindLogout() {
    document.addEventListener('click', async e => {
      const btn = e.target.closest('.js-logout');
      if (!btn) return;
      e.preventDefault();
      if (typeof Store !== 'undefined' && Store.logoutUser) {
        try { await Store.logoutUser(); } catch {}
      }
      window.location.href = 'index.html';
    });
  },

  bindGoogleSignIn() {
    document.addEventListener('click', e => {
      const btn = e.target.closest('.js-google-signin');
      if (!btn) return;
      e.preventDefault();
      if (window.GoogleAuth) window.GoogleAuth.signIn();
    });
  },

  // Any link that points to /vazhipadu becomes a Google-sign-in gate when
  // the user isn't logged in. After Google sign-in completes, they're sent
  // straight to the booking page — regardless of admin / user role.
  bindBookVazhipadGate() {
    document.addEventListener('click', e => {
      const link = e.target.closest(
        'a[href="vazhipadu.html"], a[href$="/vazhipadu"], a[href$="/vazhipadu.html"]'
      );
      if (!link) return;
      // Don't intercept Logout / Google sign-in / other custom-handled links
      if (link.classList.contains('js-logout') || link.classList.contains('js-google-signin')) return;
      if (typeof Store === 'undefined' || !Store.isUserLoggedIn) return;
      if (Store.isUserLoggedIn()) return; // logged in → normal navigation
      e.preventDefault();
      if (window.GoogleAuth) window.GoogleAuth.signIn('vazhipadu.html');
    });
  },

  initHeaderScroll() {
    const header = document.querySelector('.site-header');
    if (!header) return;
    const hero = document.querySelector('.hero');
    this.updateHeader = () => {
      const isMobile = window.innerWidth <= 860;
      const onSlide2 = !!document.querySelector('.hero-slide[data-slide="1"].active');
      const scrolled = !hero || window.scrollY > 30;
      // Over light slide (desktop): transparent header but dark text for readability
      const overLight = !scrolled && onSlide2 && !isMobile;
      header.classList.toggle('scrolled', scrolled);
      header.classList.toggle('over-light', overLight);
    };
    window.addEventListener('scroll', this.updateHeader, { passive: true });
    window.addEventListener('resize', this.updateHeader, { passive: true });
    this.updateHeader();
  },

  initMobileNav() {
    const toggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('.nav');
    if (!toggle || !nav) return;
    toggle.addEventListener('click', () => nav.classList.toggle('open'));
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));
  },

  markActiveNav() {
    const path = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link').forEach(link => {
      const href = link.getAttribute('href');
      if (href === path || (path === '' && href === 'index.html')) {
        link.classList.add('active');
      }
    });
  },

  toast(message, type = 'success') {
    let el = document.querySelector('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.className = `toast ${type}`;
    el.textContent = message;
    requestAnimationFrame(() => el.classList.add('show'));
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
  },

  openModal(id) {
    const m = document.getElementById(id);
    if (!m) return;
    m.classList.add('open');
    this._lockScroll();
  },

  closeModal(id) {
    const m = document.getElementById(id);
    if (!m) return;
    m.classList.remove('open');
    this._unlockScrollIfNoneOpen();
  },

  _lockScroll() {
    document.body.classList.add('modal-open');
    if (window.lenis && typeof window.lenis.stop === 'function') window.lenis.stop();
  },

  _unlockScrollIfNoneOpen() {
    if (document.querySelector('.modal-backdrop.open')) return;
    document.body.classList.remove('modal-open');
    if (window.lenis && typeof window.lenis.start === 'function') window.lenis.start();
  },

  bindModalCloses() {
    // Modals close ONLY via [data-close] (the X button / Cancel) or ESC — not backdrop click
    document.querySelectorAll('.modal-backdrop').forEach(bd => {
      // Tell Lenis not to hijack wheel events inside modals (so internal scroll works without page scrolling)
      bd.setAttribute('data-lenis-prevent', '');
      const modal = bd.querySelector('.modal');
      if (modal) modal.setAttribute('data-lenis-prevent', '');

      bd.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', () => {
          bd.classList.remove('open');
          this._unlockScrollIfNoneOpen();
        });
      });
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-backdrop.open').forEach(m => m.classList.remove('open'));
        this._unlockScrollIfNoneOpen();
      }
    });
  }
};

/* ============== Hero Slider (home page only) ============== */
const HeroSlider = {
  SLIDE2_DURATION: 4 * 1000, // 4 seconds — change here to adjust hold time

  init() {
    this.slides = document.querySelectorAll('.hero-slide');
    if (this.slides.length < 2) return;
    this.dots = document.querySelectorAll('.hero-dot');
    this.dotsWrap = document.querySelector('.hero-dots');
    this.video = this.slides[0].querySelector('video');
    this.idx = 0;

    if (this.video) {
      this.video.removeAttribute('loop');
      this.video.addEventListener('ended', () => this.show(1));
      this.playVideo();
    }

    this.dots.forEach((d, i) => d.addEventListener('click', () => {
      this.show(i, true);
    }));
  },

  playVideo() {
    if (!this.video) return;
    try { this.video.currentTime = 0; } catch (e) {}
    const p = this.video.play();
    if (p && p.catch) p.catch(() => {});
  },

  show(i, manual = false) {
    if (i === this.idx) return;
    this.idx = i;

    this.slides.forEach((s, k) => s.classList.toggle('active', k === i));
    this.dots.forEach((d, k) => d.classList.toggle('active', k === i));
    if (this.dotsWrap) this.dotsWrap.classList.toggle('on-light', i === 1);

    if (UI.updateHeader) UI.updateHeader();

    clearTimeout(this.timer);

    if (i === 0) {
      this.playVideo();
    } else {
      if (this.video && !manual) this.video.pause();
      this.timer = setTimeout(() => this.show(0), this.SLIDE2_DURATION);
    }
  }
};

/* ============== Family-tree clickable cards (event delegation) ============== */
function initTreeCardClicks() {
  const map = {
    'x2-card': 'x2-modal',
    'x3-card': 'x3-modal',
    'y-card': 'y-modal',
    'z-card': 'z-modal'
  };

  document.addEventListener('click', (e) => {
    const card = e.target.closest('.ftree-card.clickable');
    if (!card || !card.id) return;
    const modalId = map[card.id];
    if (modalId) UI.openModal(modalId);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const active = document.activeElement;
    if (!active || !active.classList || !active.classList.contains('clickable')) return;
    if (!active.id) return;
    const modalId = map[active.id];
    if (modalId) {
      e.preventDefault();
      UI.openModal(modalId);
    }
  });
}

/* ============== Scroll-to-top button ============== */
function initScrollTop() {
  const btn = document.getElementById('scroll-top-btn');
  if (!btn) return;

  const THRESHOLD = 120; // px — show as soon as the user starts scrolling
  const currentScroll = () => {
    if (window.lenis && typeof window.lenis.scroll === 'number') return window.lenis.scroll;
    return window.scrollY || document.documentElement.scrollTop || 0;
  };
  const update = () => btn.classList.toggle('show', currentScroll() > THRESHOLD);

  window.addEventListener('scroll', update, { passive: true });
  // Lenis can swallow native scroll events on some setups — listen on its bus too
  if (window.lenis && typeof window.lenis.on === 'function') {
    window.lenis.on('scroll', update);
  }
  update();

  btn.addEventListener('click', () => {
    if (window.lenis && typeof window.lenis.scrollTo === 'function') {
      window.lenis.scrollTo(0, { duration: 1.2 });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
}

/* ============== Sticky hero — scale + fade based on scroll progress ============== */
function initStickyHero() {
  const hero = document.querySelector('.hero');
  if (!hero) return;

  let ticking = false;
  const update = () => {
    const heroH = hero.offsetHeight || window.innerHeight;
    const scrolled = window.scrollY;
    const progress = Math.max(0, Math.min(1, scrolled / heroH));
    hero.style.setProperty('--hero-scroll', progress.toFixed(3));
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });

  update();
}

/* ============== Smooth scrolling (Lenis) ============== */
function initSmoothScroll() {
  if (typeof Lenis === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const lenis = new Lenis({
    duration: 1.1,
    smoothWheel: true,
    smoothTouch: false,
    lerp: 0.1,
    easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t))
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  window.lenis = lenis;
}

/* ============== Scroll-reveal — content fades/slides in as it enters viewport ============== */
const Reveal = {
  io: null,

  init() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Auto-apply default upward reveal to common content blocks (skipping any that
    // already carry directional reveal classes set in HTML/JS).
    document.querySelectorAll(
      '.intro-text, .quick-info, .ftree-row, .ftree-note, .puja-card, .family-tree-wrap, .section-head'
    ).forEach(el => {
      if (!el.classList.contains('reveal-left') &&
          !el.classList.contains('reveal-right') &&
          !el.classList.contains('reveal')) {
        el.classList.add('reveal');
      }
    });

    this.io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('in-view');
        else entry.target.classList.remove('in-view');
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    this.observeAll();
  },

  // Re-scan the DOM and observe any reveal targets not yet observed.
  // Safe to call repeatedly — IntersectionObserver.observe is a no-op for already-observed targets.
  observeAll() {
    if (!this.io) return;
    document.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach(el => {
      this.io.observe(el);
    });
  }
};

function initScrollReveal() { Reveal.init(); }
window.Reveal = Reveal;

/* ============== Google Sign-In (programmatic, no separate login page) ============== */
const GoogleAuth = {
  CLIENT_ID: '291408759953-330b4ch8nd56dr115m631b1rpfh4nj0b.apps.googleusercontent.com',
  _client: null,
  _scriptLoadPromise: null,
  _next: null,

  // Lazy-loads the Google Identity Services library exactly once.
  _loadScript() {
    if (window.google && window.google.accounts && window.google.accounts.oauth2) {
      return Promise.resolve();
    }
    if (this._scriptLoadPromise) return this._scriptLoadPromise;
    this._scriptLoadPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.defer = true;
      s.onload = resolve;
      s.onerror = () => reject(new Error('gis_load_failed'));
      document.head.appendChild(s);
    });
    return this._scriptLoadPromise;
  },

  // Synchronously initialise the OAuth client once GIS is loaded.
  // After this returns successfully, `_client` is ready for `requestAccessToken()`.
  _initClient() {
    if (this._client) return true;
    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) return false;
    const self = this;
    this._client = window.google.accounts.oauth2.initTokenClient({
      client_id: this.CLIENT_ID,
      scope: 'openid email profile',
      callback: async (resp) => {
        if (!resp || !resp.access_token) {
          console.warn('[GoogleAuth] no access token in callback', resp);
          if (typeof UI !== 'undefined' && UI.toast) {
            UI.toast(I18N.t('auth.err.googleFailed'), 'error');
          }
          return;
        }
        try {
          const r = await Store.googleLogin({ accessToken: resp.access_token });
          if (!r.ok) {
            console.error('[GoogleAuth] backend rejected sign-in', r);
            if (typeof UI !== 'undefined' && UI.toast) {
              UI.toast(I18N.t('auth.err.googleFailed') + ' (' + (r.error || 'error') + ')', 'error');
            }
            return;
          }
          const dest = self._next || (r.user.isAdmin ? 'admin.html' : 'vazhipadu.html');
          self._next = null;
          window.location.href = dest;
        } catch (err) {
          console.error('[GoogleAuth] network error during sign-in', err);
          if (typeof UI !== 'undefined' && UI.toast) {
            UI.toast(I18N.t('auth.err.googleFailed') + ' (network)', 'error');
          }
        }
      },
      error_callback: (err) => {
        console.warn('[GoogleAuth] popup error', err);
        // Typical errors: popup_closed, popup_failed_to_open, access_denied
        if (typeof UI !== 'undefined' && UI.toast && err && err.type !== 'popup_closed') {
          UI.toast(I18N.t('auth.err.googleFailed') + ' (' + err.type + ')', 'error');
        }
      }
    });
    return true;
  },

  // Synchronous so it stays in the user-gesture chain — browsers block popups
  // opened from microtask callbacks (any `await` between click and popup
  // request will get the popup blocked).
  signIn(next) {
    this._next = next || null;
    if (this._initClient() && this._client) {
      try {
        this._client.requestAccessToken();
      } catch (err) {
        console.error('[GoogleAuth] requestAccessToken threw', err);
        if (typeof UI !== 'undefined' && UI.toast) {
          UI.toast('Could not open Google sign-in. Please try again.', 'error');
        }
      }
      return;
    }
    // GIS not ready yet — load it then try again (popup will likely be blocked
    // on this first attempt, but the second click works since client is now ready).
    if (typeof UI !== 'undefined' && UI.toast) {
      UI.toast('Loading Google sign-in… please click again.', 'success');
    }
    this._loadScript().then(() => this._initClient()).catch(err => {
      console.error('[GoogleAuth] GIS script failed to load', err);
      if (typeof UI !== 'undefined' && UI.toast) {
        UI.toast('Could not load Google sign-in.', 'error');
      }
    });
  },

  // Eagerly load the script + init the client on page load so signIn() is sync.
  preload() {
    this._loadScript().then(() => this._initClient()).catch(() => {});
  }
};
window.GoogleAuth = GoogleAuth;

document.addEventListener('DOMContentLoaded', () => {
  I18N.init();
  UI.init();
  UI.bindModalCloses();
  HeroSlider.init();
  initStickyHero();
  initSmoothScroll();
  initScrollReveal();
  initScrollTop();
  initTreeCardClicks();
  // Warm up GIS in the background so the popup opens with no delay
  GoogleAuth.preload();
});
