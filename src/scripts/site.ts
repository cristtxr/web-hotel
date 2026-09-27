import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let lenis: Lenis | null = null;

function qs<T extends Element>(selector: string, root: ParentNode = document) {
  return root.querySelector<T>(selector);
}

function qsa<T extends Element>(selector: string, root: ParentNode = document) {
  return Array.from(root.querySelectorAll<T>(selector));
}

function setupLenis() {
  if (reducedMotion) return;
  lenis = new Lenis({
    duration: 1.05,
    smoothWheel: true,
    syncTouch: false,
    wheelMultiplier: 0.9,
  });
  lenis.on('scroll', ScrollTrigger.update);
  const tick = (time: number) => lenis?.raf(time * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
}

function setupHeader() {
  const header = qs<HTMLElement>('[data-site-header]');
  const toggle = qs<HTMLButtonElement>('.menu-toggle');
  const nav = qs<HTMLElement>('.main-nav');
  if (!header) return;

  let lastY = window.scrollY;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    header.classList.toggle('is-hidden', y > lastY && y > 160 && !nav?.classList.contains('is-open'));
    lastY = y;
  }, { passive: true });

  toggle?.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    nav?.classList.toggle('is-open', open);
    lenis?.[open ? 'stop' : 'start']();
  });

  qsa<HTMLAnchorElement>('[data-prefetch-route]').forEach((link) => {
    const prefetch = () => {
      if (document.head.querySelector(`link[href="${link.href}"]`)) return;
      const hint = document.createElement('link');
      hint.rel = 'prefetch';
      hint.href = link.href;
      document.head.appendChild(hint);
    };
    link.addEventListener('pointerenter', prefetch, { once: true });
    link.addEventListener('focus', prefetch, { once: true });
  });
}

function setupCursor() {
  const pointer = qs<HTMLElement>('.pointer');
  const label = qs<HTMLElement>('.pointer span');
  if (!pointer || !label || matchMedia('(hover: none)').matches) return;

  window.addEventListener('pointermove', (event) => {
    gsap.to(pointer, { x: event.clientX, y: event.clientY, duration: .35, ease: 'power3.out' });
  }, { passive: true });

  qsa<HTMLElement>('[data-cursor]').forEach((target) => {
    target.addEventListener('pointerenter', () => {
      label.textContent = target.dataset.cursor ?? 'Explorar';
      pointer.classList.add('is-visible');
    });
    target.addEventListener('pointerleave', () => pointer.classList.remove('is-visible'));
  });
}

function setupBooking() {
  const dialog = qs<HTMLDialogElement>('[data-booking]');
  const panel = qs<HTMLElement>('.booking-panel');
  const backdrop = qs<HTMLElement>('.booking-backdrop');
  if (!dialog || !panel || !backdrop) return;

  const arrival = qs<HTMLInputElement>('input[name="arrival"]', dialog);
  const departure = qs<HTMLInputElement>('input[name="departure"]', dialog);
  const today = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const after = new Date(today); after.setDate(today.getDate() + 3);
  const dateValue = (date: Date) => date.toISOString().slice(0, 10);
  if (arrival) { arrival.min = dateValue(today); arrival.value ||= dateValue(tomorrow); }
  if (departure) { departure.min = dateValue(tomorrow); departure.value ||= dateValue(after); }

  const open = () => {
    if (dialog.open) return;
    dialog.showModal();
    lenis?.stop();
    gsap.timeline()
      .to(backdrop, { opacity: 1, duration: .35 })
      .to(panel, { y: 0, duration: .8, ease: 'power4.out' }, 0);
  };
  const close = () => {
    gsap.timeline({ onComplete: () => { dialog.close(); lenis?.start(); } })
      .to(panel, { y: '102%', duration: .55, ease: 'power3.in' })
      .to(backdrop, { opacity: 0, duration: .25 }, '-=.25');
  };
  qsa<HTMLButtonElement>('[data-book-open]').forEach((button) => button.addEventListener('click', open));
  qsa<HTMLElement>('[data-book-close]', dialog).forEach((button) => button.addEventListener('click', close));
  dialog.addEventListener('cancel', (event) => { event.preventDefault(); close(); });
  qs<HTMLFormElement>('[data-book-form]', dialog)?.addEventListener('submit', (event) => {
    event.preventDefault();
    const note = qs<HTMLElement>('[data-book-note]', dialog);
    if (note) note.textContent = 'Fechas seleccionadas · Listo para continuar con la reserva directa';
  });
}

async function setupPreloader() {
  const preloader = qs<HTMLElement>('[data-preloader]');
  if (!preloader) return;
  const returning = sessionStorage.getItem('luna-intro-seen') === 'yes';
  if (returning || reducedMotion) {
    preloader.remove();
    revealHero();
    return;
  }

  const progress = qs<HTMLElement>('[data-loader-progress]', preloader);
  const image = qs<HTMLImageElement>('.hero-image img');
  if (image && !image.complete) {
    try { await image.decode(); } catch { /* the browser can still render the image */ }
  }

  const counter = { value: 0 };
  const doors = qsa<HTMLElement>('.preloader-door', preloader);
  gsap.set(doors, { transformPerspective: 1600 });
  gsap.timeline({
    onComplete: () => {
      sessionStorage.setItem('luna-intro-seen', 'yes');
      preloader.remove();
      revealHero();
      ScrollTrigger.refresh();
    },
  })
    .to(counter, { value: 100, duration: .9, ease: 'power2.inOut', onUpdate: () => { if (progress) progress.textContent = String(Math.round(counter.value)).padStart(2, '0'); } })
    .to('.preloader-copy, .preloader-progress', { opacity: 0, y: -12, duration: .3 })
    .to('.preloader-door--left', { rotateY: -108, xPercent: -7, duration: 1.45, ease: 'power4.inOut' })
    .to('.preloader-door--right', { rotateY: 108, xPercent: 7, duration: 1.45, ease: 'power4.inOut' }, '<')
    .to(preloader, { autoAlpha: 0, duration: .25 }, '-=.16');
}

function revealHero() {
  const root = qs<HTMLElement>('.home-hero, .world-hero');
  if (!root || reducedMotion) return;
  const image = qs<HTMLImageElement>('[data-hero-image] img', root);
  const copy = qsa<HTMLElement>('.hero-title .line > span, .hero-kicker, .hero-meta, .world-hero-copy > *, .back-hub', root);
  gsap.timeline()
    .to(image, { scale: 1, duration: 1.6, ease: 'power3.out' })
    .fromTo(copy, { y: 42, opacity: 0 }, { y: 0, opacity: 1, duration: .9, stagger: .09, ease: 'power3.out' }, .15);
}

function setupPortals() {
  qsa<HTMLAnchorElement>('[data-portal]').forEach((portal) => {
    portal.addEventListener('pointermove', (event) => {
      if (reducedMotion || matchMedia('(hover: none)').matches) return;
      const rect = portal.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - .5;
      const y = (event.clientY - rect.top) / rect.height - .5;
      gsap.to(portal, { rotateY: x * 3.2, rotateX: y * -2.7, scale: 1.025, duration: .5, ease: 'power2.out' });
    });
    portal.addEventListener('pointerleave', () => gsap.to(portal, { rotateX: 0, rotateY: 0, scale: 1, duration: .7, ease: 'power3.out' }));
    portal.addEventListener('click', (event) => {
      if (event.metaKey || event.ctrlKey || reducedMotion) return;
      event.preventDefault();
      const visual = qs<HTMLElement>('.portal-visual', portal);
      const img = qs<HTMLImageElement>('img', portal);
      if (!visual || !img) { window.location.href = portal.href; return; }
      const rect = visual.getBoundingClientRect();
      const clone = img.cloneNode(true) as HTMLImageElement;
      Object.assign(clone.style, {
        position: 'fixed', zIndex: '180', left: `${rect.left}px`, top: `${rect.top}px`,
        width: `${rect.width}px`, height: `${rect.height}px`, objectFit: 'cover', maxWidth: 'none', margin: '0',
      });
      document.body.appendChild(clone);
      document.body.style.overflow = 'hidden';
      gsap.timeline({ onComplete: () => { window.location.href = portal.href; } })
        .to(qsa<HTMLElement>('.portal, .showroom-head').filter((item) => item !== portal), { opacity: 0, duration: .35 }, 0)
        .to(clone, { left: 0, top: 0, width: '100vw', height: '100vh', duration: 1.05, ease: 'power4.inOut' }, 0)
        .to(img, { scale: 1.08, duration: 1.05, ease: 'power3.inOut' }, 0);
    });
  });
}

function setupReturnTransitions() {
  qsa<HTMLAnchorElement>('[data-return-hub]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (event.metaKey || event.ctrlKey || reducedMotion) return;
      event.preventDefault();
      sessionStorage.setItem('luna-intro-seen', 'yes');
      const veil = qs<HTMLElement>('.route-veil');
      const hero = qs<HTMLImageElement>('.world-hero-image img');
      if (hero) {
        const clone = hero.cloneNode(true) as HTMLImageElement;
        Object.assign(clone.style, { position: 'fixed', zIndex: '140', inset: '0', width: '100vw', height: '100vh', objectFit: 'cover', maxWidth: 'none' });
        document.body.appendChild(clone);
        gsap.to(clone, {
          left: window.innerWidth > 900 ? '38vw' : '8vw', top: '18vh', width: window.innerWidth > 900 ? '31vw' : '84vw', height: '64vh',
          duration: .85, ease: 'power4.inOut', onComplete: () => { window.location.href = link.href; },
        });
      } else if (veil) {
        gsap.to(veil, { scaleY: 1, duration: .6, ease: 'power3.inOut', onComplete: () => { window.location.href = link.href; } });
      } else window.location.href = link.href;
    });
  });
}

function setupScrollMotion() {
  if (reducedMotion) return;
  qsa<HTMLElement>('[data-reveal-image]').forEach((figure) => {
    gsap.fromTo(figure, { clipPath: 'inset(0 0 100% 0)' }, {
      clipPath: 'inset(0 0 0% 0)', duration: 1.2, ease: 'power3.out',
      scrollTrigger: { trigger: figure, start: 'top 82%' },
    });
  });
  qsa<HTMLElement>('[data-parallax]').forEach((wrap) => {
    if (window.innerWidth > 900 && wrap.closest('[data-home-horizontal]')) return;
    const image = qs<HTMLImageElement>('img', wrap);
    const speed = Number(wrap.dataset.speed ?? .1);
    const portrait = wrap.matches('.journey-image--tall, .reset-image, .material-image, .floorplan-preview');
    if (!image) return;
    gsap.fromTo(image, { yPercent: -speed * 70, scale: portrait ? 1.015 : 1.055 }, {
      yPercent: speed * 70,
      scale: portrait ? 1.005 : 1.015,
      ease: 'none',
      scrollTrigger: { trigger: wrap, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });
  if (qs('.room-journey')) {
    gsap.fromTo('.journey-head h2', { y: 90 }, { y: -35, ease: 'none', scrollTrigger: { trigger: '.journey-head', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.fromTo('.journey-image--wide', { xPercent: 5 }, { xPercent: -3, ease: 'none', scrollTrigger: { trigger: '.journey-image--wide', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.fromTo('.journey-text', { y: 115 }, { y: -55, ease: 'none', scrollTrigger: { trigger: '.journey-pair', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.fromTo('.journey-image--tall', { y: -55, rotate: .65 }, { y: 65, rotate: -.65, ease: 'none', scrollTrigger: { trigger: '.journey-pair', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.fromTo('.journey-image--bath', { xPercent: -4 }, { xPercent: 4, ease: 'none', scrollTrigger: { trigger: '.journey-image--bath', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.fromTo('.journey-image figcaption', { y: 30 }, { y: -18, ease: 'none', scrollTrigger: { trigger: '.room-journey', start: 'top center', end: 'bottom center', scrub: true } });
    gsap.fromTo('.floorplan header', { y: 75 }, { y: -35, ease: 'none', scrollTrigger: { trigger: '.floorplan', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.fromTo('.floorplan-board', { y: 65 }, { y: -35, ease: 'none', scrollTrigger: { trigger: '.floorplan', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.fromTo('.floorplan-preview', { y: -45 }, { y: 55, ease: 'none', scrollTrigger: { trigger: '.floorplan', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.fromTo('.world-closing img', { yPercent: -4, scale: 1.065 }, { yPercent: 4, scale: 1.015, ease: 'none', scrollTrigger: { trigger: '.world-closing', start: 'top bottom', end: 'bottom top', scrub: true } });
  }
}

function setupHomeHorizontal() {
  const section = qs<HTMLElement>('[data-home-horizontal]');
  const track = qs<HTMLElement>('[data-home-track]');
  if (!section || !track || reducedMotion) return;

  const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
  const horizontal = gsap.to(track, {
    x: () => -distance(),
    ease: 'none',
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: () => `+=${distance()}`,
      pin: true,
      scrub: 1,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
  });

  gsap.to('.hero-image img', {
    xPercent: 9,
    scale: 1.08,
    ease: 'none',
    scrollTrigger: { trigger: '.home-hero', containerAnimation: horizontal, start: 'left left', end: 'right left', scrub: true },
  });
  gsap.fromTo('.showroom-head', { x: 110 }, {
    x: -35,
    ease: 'none',
    scrollTrigger: { trigger: '.showroom', containerAnimation: horizontal, start: 'left right', end: 'left 18%', scrub: true },
  });
  qsa<HTMLImageElement>('.portal-visual img').forEach((image) => {
    gsap.fromTo(image, { xPercent: -7, scale: 1.035 }, {
      xPercent: 7,
      scale: 1.015,
      ease: 'none',
      scrollTrigger: { trigger: image.closest('.portal'), containerAnimation: horizontal, start: 'left right', end: 'right left', scrub: true },
    });
  });
  gsap.fromTo('.home-closing-image img', { xPercent: -7, scale: 1.13 }, {
    xPercent: 7,
    scale: 1.04,
    ease: 'none',
    scrollTrigger: { trigger: '.home-closing', containerAnimation: horizontal, start: 'left right', end: 'right left', scrub: true },
  });
}

function setupRooms() {
  const section = qs<HTMLElement>('[data-horizontal-rooms]');
  const track = qs<HTMLElement>('[data-rooms-track]');
  if (section && track && !reducedMotion) {
    const tween = gsap.to(track, {
      x: () => -(track.scrollWidth - window.innerWidth),
      ease: 'none',
      scrollTrigger: { trigger: section, start: 'top top', end: () => `+=${track.scrollWidth - window.innerWidth}`, pin: true, scrub: 1, invalidateOnRefresh: true },
    });
    qsa<HTMLImageElement>('.room-card img').forEach((image) => {
      gsap.to(image, { xPercent: 8, ease: 'none', scrollTrigger: { trigger: image.closest('.room-card'), containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
    });
  }

  qsa<HTMLAnchorElement>('[data-room-link]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const target = qs<HTMLElement>(link.hash);
      const selected = qs<HTMLElement>('[data-selected-room]');
      if (selected) selected.textContent = link.dataset.roomName ?? 'Panorama Suite';
      if (!target) return;
      if (reducedMotion) { target.scrollIntoView(); return; }
      const image = qs<HTMLImageElement>('img', link);
      const figure = qs<HTMLElement>('figure', link);
      if (!image || !figure) { lenis?.scrollTo(target); return; }
      const rect = figure.getBoundingClientRect();
      const clone = image.cloneNode(true) as HTMLImageElement;
      Object.assign(clone.style, { position: 'fixed', zIndex: '120', left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`, objectFit: 'cover', maxWidth: 'none' });
      document.body.appendChild(clone);
      lenis?.stop();
      gsap.to(clone, { left: 0, top: 0, width: '100vw', height: '100vh', duration: .75, ease: 'power4.inOut', onComplete: () => {
        window.scrollTo(0, target.offsetTop);
        gsap.to(clone, { opacity: 0, duration: .35, onComplete: () => clone.remove() });
        lenis?.start();
        ScrollTrigger.refresh();
      } });
    });
  });
}

function setupFloorplan() {
  qsa<HTMLButtonElement>('[data-hotspot]').forEach((button) => {
    const activate = () => {
      const index = button.dataset.hotspot;
      qsa('[data-hotspot]').forEach((item) => item.classList.toggle('is-active', item === button));
      qsa<HTMLElement>('[data-preview-index]').forEach((image) => image.classList.toggle('is-active', image.dataset.previewIndex === index));
    };
    button.addEventListener('mouseenter', activate);
    button.addEventListener('focus', activate);
    button.addEventListener('click', activate);
  });
}

function setupExperience() {
  const wipe = qs<HTMLElement>('.water-wipe');
  if (wipe && !reducedMotion) {
    gsap.to(wipe, { scaleX: 0, ease: 'none', scrollTrigger: { trigger: '.experience-chapter--immerse', start: 'top 88%', end: 'top 20%', scrub: true } });
  }
}

function setupConstruction() {
  const section = qs<HTMLElement>('[data-construction]');
  if (!section || reducedMotion) return;
  const frames = qsa<HTMLElement>('[data-build-frame]', section);
  const labels = ['Blueprint', 'Structure', 'Volume', 'Roof', 'Material', 'Landscape', 'Inhabit'];
  const count = qs<HTMLElement>('[data-build-count]', section);
  const label = qs<HTMLElement>('[data-build-label]', section);
  const progress = qs<HTMLElement>('[data-build-progress]', section);
  const timeline = gsap.timeline({
    scrollTrigger: {
      trigger: section, start: 'top top', end: 'bottom bottom', scrub: .7,
      onUpdate: (self) => {
        const active = Math.min(6, Math.round(self.progress * 6));
        if (count) count.textContent = String(active + 1).padStart(2, '0');
        if (label) label.textContent = labels[active];
        if (progress) progress.style.transform = `scaleX(${self.progress})`;
      },
    },
  });
  frames.slice(1).forEach((frame, index) => {
    timeline.to(frame, { opacity: 1, clipPath: 'inset(0 0% 0 0)', duration: 1, ease: 'none' }, index);
  });
}

function setupMap() {
  const path = qs<SVGPathElement>('[data-route-path]');
  if (!path || reducedMotion) return;
  const length = path.getTotalLength();
  gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
  gsap.to(path, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: '.territory-map', start: 'top 80%', end: 'bottom 65%', scrub: true } });
  gsap.from('.map-point', { opacity: 0, y: 15, stagger: .16, scrollTrigger: { trigger: '.territory-map', start: 'top 60%' } });
}

function init() {
  setupLenis();
  setupHeader();
  setupCursor();
  setupBooking();
  setupPreloader();
  if (!qs('[data-preloader]')) revealHero();
  setupPortals();
  setupReturnTransitions();
  setupHomeHorizontal();
  setupScrollMotion();
  setupRooms();
  setupFloorplan();
  setupExperience();
  setupConstruction();
  setupMap();
  window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();
