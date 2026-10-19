/* Garage Service — interacciones. Vanilla JS, sin dependencias. */
(() => {
  'use strict';

  // ===== Datos para reemplazar (ver TODO.md) =====
  const WA_NUMBER = '549351XXXXXXX';
  const WA_TEXT = {
    turno: 'Hola Garage Service, quiero pedir un turno.',
    chapa: 'Hola Garage Service, quiero un turno para chapa.',
    pintura: 'Hola Garage Service, quiero un turno para pintura.',
    granizo: 'Hola Garage Service, quiero un turno para sacar bollos de granizo.',
    mecanica: 'Hola Garage Service, quiero un turno para mecánica.',
    service: 'Hola Garage Service, quiero un turno para el service.',
    estetica: 'Hola Garage Service, quiero un turno para pulido / cuidado estético.',
    seguro: 'Hola Garage Service, quiero consultar si trabajan con mi seguro.',
    flota: 'Hola Garage Service, quiero pedir una cotización para mi flota.',
    pregunta: 'Hola Garage Service, tengo una consulta.',
    visita: 'Hola Garage Service, quiero coordinar una visita al taller.',
    consulta: 'Hola Garage Service, quiero hacer una consulta.'
  };

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const waURL = t => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(t)}`;

  // ===== WhatsApp =====
  $$('[data-wa]').forEach(a => {
    a.href = waURL(WA_TEXT[a.dataset.wa] || WA_TEXT.turno);
    a.target = '_blank'; a.rel = 'noopener';
  });
  $$('.yr').forEach(e => (e.textContent = new Date().getFullYear()));

  // ===== Menú del celular =====
  const burger = $('.burger'), menu = $('#menu'), txt = $('.burger__txt');
  const setMenu = open => {
    if (open) { menu.hidden = false; menu.classList.add('open'); }
    else { menu.hidden = true; menu.classList.remove('open'); }
    root.classList.toggle('menu-open', open);
    document.body.classList.toggle('lock', open);
    burger.setAttribute('aria-expanded', open);
    txt.textContent = open ? 'Cerrar' : 'Menú';
  };
  burger.addEventListener('click', () => setMenu(menu.hidden));
  $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); burger.focus(); } });
  const wide = matchMedia('(min-width: 1021px)'), onWide = e => e.matches && setMenu(false);
  wide.addEventListener ? wide.addEventListener('change', onWide) : wide.addListener(onWide);

  // ===== Header, barra inferior y sección activa =====
  const header = $('.header'), dock = $('.dock'), fab = $('.fab'), hero = $('.hero');
  const onScroll = () => {
    const y = scrollY;
    header.classList.toggle('is-scrolled', y > 10);
    const past = y > hero.offsetHeight * 0.6;
    dock.classList.toggle('show', past);
    fab.classList.toggle('show', past);
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  const navLinks = new Map($$('.nav a').map(a => [a.getAttribute('href').slice(1), a]));
  const navIO = new IntersectionObserver(es => es.forEach(e => {
    const a = navLinks.get(e.target.id);
    if (!a) return;
    if (e.isIntersecting) navLinks.forEach(l => l.classList.toggle('is-on', l === a));
    else a.classList.remove('is-on');
  }), { rootMargin: '-40% 0px -55% 0px' });
  navLinks.forEach((_, id) => { const s = document.getElementById(id); s && navIO.observe(s); });

  // Links con #ancla al cargar: re-ubica cuando terminan fuentes e imágenes
  if (location.hash.length > 1) {
    const go = () => { const t = document.getElementById(decodeURIComponent(location.hash.slice(1))); t && t.scrollIntoView({ behavior: 'instant', block: 'start' }); };
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(go);
    addEventListener('load', go, { once: true });
  }

  // ===== Aparición suave =====
  $$('[data-reveal]').forEach(el => {
    const sibs = [...el.parentElement.children].filter(c => c.hasAttribute('data-reveal'));
    const k = sibs.indexOf(el);
    if (k > 0) el.style.setProperty('--d', `${Math.min(k, 5) * 0.07}s`);
  });
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });
  $$('[data-reveal]').forEach(el => io.observe(el));

  // ===== Seguros: buscador =====
  const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const aseg = $('#aseg'), res = $('.lookup__res'), chips = $$('.insurers li'), segBtn = $('.lookup [data-wa]');
  if (aseg) aseg.addEventListener('input', () => {
    const q = norm(aseg.value);
    let hit = null;
    chips.forEach(c => {
      const m = q.length > 1 && norm(c.textContent).includes(q);
      c.classList.toggle('hit', m); c.classList.toggle('dim', q.length > 1 && !m);
      if (m && !hit) hit = c.textContent;
    });
    res.className = 'lookup__res';
    if (q.length < 2) res.textContent = '';
    else if (hit) { res.textContent = `Sí, trabajamos con ${hit}.`; res.classList.add('ok'); }
    else { res.textContent = 'No está en la lista. Consultanos igual por WhatsApp.'; res.classList.add('maybe'); }
    segBtn.href = waURL(aseg.value.trim() ? `Hola Garage Service, tengo seguro con ${aseg.value.trim()}. ¿Trabajan con esa aseguradora?` : WA_TEXT.seguro);
  });

  // ===== Antes / después =====
  const cmp = $('.compare');
  if (cmp) {
    const range = $('.compare__range', cmp);
    const set = v => { v = clamp(v, 0, 100); cmp.style.setProperty('--p', v + '%'); range.value = v; };
    range.addEventListener('input', () => set(+range.value));
    let drag = false;
    const at = e => { const r = cmp.getBoundingClientRect(); set((e.clientX - r.left) / r.width * 100); };
    cmp.addEventListener('pointerdown', e => { drag = true; cmp.setPointerCapture(e.pointerId); at(e); });
    cmp.addEventListener('pointermove', e => drag && at(e));
    ['pointerup', 'pointercancel'].forEach(t => cmp.addEventListener(t, () => (drag = false)));
    // pista: la barra se mueve sola una vez
    if (!RM) {
      const hint = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return; hint.disconnect();
        const t0 = performance.now();
        const anim = now => {
          if (drag) return;
          const k = Math.min(1, (now - t0) / 1800);
          set(50 + Math.sin(k * Math.PI * 2) * 22 * (1 - k));
          if (k < 1) requestAnimationFrame(anim);
        };
        setTimeout(() => requestAnimationFrame(anim), 600);
      }, { threshold: 0.6 });
      hint.observe(cmp);
    }
  }

  // ===== Pedí turno: arma el mensaje =====
  const qf = $('.qf');
  if (qf) {
    const DANO = {
      choque: 'Mi auto tuvo un choque.',
      granizo: 'Mi auto tiene daño por granizo.',
      pintura: 'Mi auto tiene un rayón o un detalle de pintura.',
      mecanica: 'Mi auto tiene un problema mecánico.',
      service: 'Quiero hacer el service.',
      estetica: 'Quiero un pulido o cuidado estético.'
    };
    const out = $('.bubble__txt', qf), send = $('.qf__send', qf), sets = $$('.qf__set', qf), ins = $('.qf__ins', qf);
    const qAseg = $('#q-aseg'), qAuto = $('#q-auto'), qAnio = $('#q-anio');
    const build = () => {
      const d = qf.dano.value, v = qf.via.value, a = qAseg.value.trim();
      const car = [qAuto.value.trim(), qAnio.value.trim()].filter(Boolean).join(' ');
      ins.hidden = v !== 'seguro';
      const det = [];
      if (d) det.push(DANO[d]);
      if (v === 'seguro') det.push(a ? `Lo hago con el seguro (${a}).` : 'Lo hago con el seguro.');
      if (v === 'particular') det.push('Lo hago particular.');
      if (v === 'flota') det.push('Es un vehículo de flota / empresa.');
      if (car) det.push(`Es un ${car}.`);
      const lines = ['Hola Garage Service, quiero hacer una consulta.'];
      if (det.length) lines.push('', ...det);
      if (d) lines.push('', '¿Me dan un turno para el presupuesto?');
      [!!d, !!v, !!qAuto.value.trim()].forEach((ok, i) => sets[i].classList.toggle('done', ok));
      return lines.join('\n');
    };
    const render = () => { const t = build(); out.textContent = t; send.href = waURL(t); };
    qf.addEventListener('change', render);
    qf.addEventListener('input', e => e.target.type === 'text' && render());
    qf.addEventListener('submit', e => e.preventDefault());
    render();
  }

  // ===== Mapa: solo al pedirlo =====
  const mapBtn = $('.map__btn');
  if (mapBtn) mapBtn.addEventListener('click', () => {
    const f = document.createElement('iframe');
    f.src = 'https://www.google.com/maps?q=Armada+Argentina+269,+C%C3%B3rdoba,+Argentina&output=embed';
    f.title = 'Mapa: Av. Armada Argentina 269, Córdoba'; f.loading = 'lazy';
    mapBtn.parentElement.append(f);
  });
})();
