/* Shared utilities — header, mobile nav, modal, toast */

const UI = {
  init() {
    this.initMobileNav();
    this.markActiveNav();
    this.initHeaderScroll();
  },

  initHeaderScroll() {
    const header = document.querySelector('.site-header');
    if (!header) return;
    const hero = document.querySelector('.hero');
    this.updateHeader = () => {
      const onLight = !!document.querySelector('.hero-slide[data-slide="1"].active');
      if (!hero || window.scrollY > 30 || onLight) header.classList.add('scrolled');
      else header.classList.remove('scrolled');
    };
    window.addEventListener('scroll', this.updateHeader, { passive: true });
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
    if (m) m.classList.add('open');
  },

  closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove('open');
  },

  bindModalCloses() {
    document.querySelectorAll('.modal-backdrop').forEach(bd => {
      bd.addEventListener('click', e => { if (e.target === bd) bd.classList.remove('open'); });
      bd.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', () => bd.classList.remove('open'));
      });
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') document.querySelectorAll('.modal-backdrop.open').forEach(m => m.classList.remove('open'));
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

/* ============== Scroll-reveal (sections fade + de-blur + slide into view) ============== */
function initScrollReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Default fade-up reveal for generic sections / cards
  const fadeTargets = document.querySelectorAll(
    '.section, .quick-info-wrap, .ftree-row, .ftree-note, .festival-card, .puja-card'
  );
  fadeTargets.forEach(el => {
    if (!el.classList.contains('reveal-left') && !el.classList.contains('reveal-right')) {
      el.classList.add('reveal');
    }
  });

  // Combined target list (reveal + reveal-left + reveal-right)
  const allTargets = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
      } else {
        // Re-trigger: remove when fully out of view so animation plays again on return
        entry.target.classList.remove('in-view');
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

  allTargets.forEach(el => io.observe(el));
}

document.addEventListener('DOMContentLoaded', () => {
  I18N.init();
  UI.init();
  UI.bindModalCloses();
  HeroSlider.init();
  initSmoothScroll();
  initScrollReveal();
});
