/* Garage Service — interacciones. Vanilla JS, sin dependencias. */
(() => {
  'use strict';

  // ===== Datos para reemplazar (ver TODO.md) =====
  const WA_NUMBER = '549351XXXXXXX';
  const WA_TEXT = {
    turno: 'Hola Garage Service, quiero pedir un turno.',
    visita: 'Hola Garage Service, quiero coordinar una visita al taller.',
    seguro: 'Hola Garage Service, quiero consultar si trabajan con mi seguro.',
    flota: 'Hola Garage Service, quiero pedir una cotización para mi flota.',
    granizo: 'Hola Garage Service, me agarró el granizo y quiero un turno.',
    pregunta: 'Hola Garage Service, tengo una consulta.',
    consulta: 'Hola Garage Service, quiero hacer una consulta.'
  };

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(pointer: fine)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const waURL = t => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(t)}`;

  // Espera a que termine la intro (si la hay) antes de animar el hero.
  const introDone = new Promise(res => {
    if (!root.classList.contains('intro-on')) return res();
    addEventListener('intro:done', res, { once: true });
    setTimeout(res, 7000);
  });

  // ===== WhatsApp =====
  $$('[data-wa]').forEach(a => {
    a.href = waURL(WA_TEXT[a.dataset.wa] || WA_TEXT.turno);
    a.target = '_blank'; a.rel = 'noopener';
  });
  $$('.yr').forEach(e => (e.textContent = new Date().getFullYear()));

  // ===== Texto partido en palabras =====
  $$('[data-split]').forEach(el => {
    let i = 0;
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(' '); return; }
            const w = document.createElement('span'); w.className = 'w';
            const s = document.createElement('span'); s.textContent = part; s.style.setProperty('--i', i++);
            w.append(s); frag.append(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    el.setAttribute('aria-label', el.textContent.trim());
    walk(el);
    $$('.w', el).forEach(w => w.setAttribute('aria-hidden', 'true'));
  });

  // ===== Reveals =====
  $$('[data-reveal]').forEach(el => {
    const sibs = [...el.parentElement.children].filter(c => c.hasAttribute('data-reveal'));
    const k = sibs.indexOf(el);
    if (k > 0) el.style.setProperty('--d', `${Math.min(k, 6) * 0.08}s`);
  });
  const revealIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      revealIO.unobserve(el);
      if (el.closest('.hero')) introDone.then(() => requestAnimationFrame(() => el.classList.add('in')));
      else el.classList.add('in');
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  $$('[data-reveal],[data-split]').forEach(el => revealIO.observe(el));

  // ===== Links con #ancla al cargar: re-ubica cuando terminan fuentes e imágenes =====
  if (location.hash.length > 1) {
    const go = () => { const t = document.getElementById(decodeURIComponent(location.hash.slice(1))); t && t.scrollIntoView({ behavior: 'instant', block: 'start' }); };
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(go);
    addEventListener('load', go, { once: true });
  }

  // ===== Header, progreso, menú =====
  const header = $('.header'), prog = $('.progress'), dock = $('.dock'), fab = $('.fab');
  const hero = $('.hero');
  let lastY = scrollY;
  const onScroll = () => {
    const y = scrollY, max = root.scrollHeight - innerHeight;
    prog.style.setProperty('--sp', max > 0 ? (y / max).toFixed(4) : 0);
    header.classList.toggle('is-scrolled', y > 30);
    const pastHero = y > hero.offsetHeight * 0.7;
    header.classList.toggle('is-hidden', pastHero && y > lastY + 4 && !root.classList.contains('nav-open'));
    if (y < lastY - 4 || !pastHero) header.classList.remove('is-hidden');
    dock.classList.toggle('show', pastHero);
    fab.classList.toggle('show', pastHero);
    lastY = y;
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  const burger = $('.burger');
  const setNav = open => { root.classList.toggle('nav-open', open); burger.setAttribute('aria-expanded', open); burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú'); };
  burger.addEventListener('click', () => setNav(!root.classList.contains('nav-open')));
  $$('.nav a').forEach(a => a.addEventListener('click', () => setNav(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') setNav(false); });

  const navLinks = new Map($$('.nav a').map(a => [a.getAttribute('href').slice(1), a]));
  const navIO = new IntersectionObserver(es => es.forEach(e => {
    const a = navLinks.get(e.target.id); if (!a) return;
    if (e.isIntersecting) { navLinks.forEach(l => l.classList.remove('is-on')); a.classList.add('is-on'); }
  }), { rootMargin: '-45% 0px -50% 0px' });
  navLinks.forEach((_, id) => { const s = document.getElementById(id); s && navIO.observe(s); });

  // Pausa animaciones fuera de pantalla
  const whenVisible = (el, cb) => {
    const io = new IntersectionObserver(([e]) => cb(e.isIntersecting), { rootMargin: '100px' });
    io.observe(el);
  };

  // ===== Hero: campo de piezas de la G que reacciona al cursor =====
  const field = $('.hero__field');
  if (field && !RM) {
    const ctx = field.getContext('2d');
    const SK = Math.tan(22 * Math.PI / 180);
    let W, H, dpr, cells = [], run = false, t0 = performance.now();
    const ptr = { x: -9999, y: -9999, tx: -9999, ty: -9999 };
    const size = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = field.clientWidth; H = field.clientHeight;
      field.width = W * dpr; field.height = H * dpr;
      const gap = W < 700 ? 30 : 26; cells = [];
      for (let y = gap / 2; y < H; y += gap)
        for (let x = gap / 2 - 20; x < W + 40; x += gap) cells.push([x, y, Math.random()]);
    };
    const draw = now => {
      if (!run) return;
      const t = (now - t0) / 1000;
      ptr.x = lerp(ptr.x, ptr.tx, 0.12); ptr.y = lerp(ptr.y, ptr.ty, 0.12);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.setTransform(dpr, 0, -SK * dpr, dpr, 0, 0);
      const wave = (t * 220) % (W + H + 600) - 300;
      for (const [x, y, r] of cells) {
        const dx = x - ptr.x, dy = y - ptr.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        const near = Math.max(0, 1 - d / 190);
        const band = Math.max(0, 1 - Math.abs(x + y * 0.6 - wave) / 120);
        const fade = Math.min(1, y / (H * 0.25)) * (1 - Math.max(0, (x - W * 0.45) / W) * 0.6);
        let a = 0.045 + r * 0.03 + band * 0.16 + near * 0.75;
        a *= fade;
        if (a < 0.02) continue;
        ctx.globalAlpha = Math.min(a, 1);
        ctx.fillStyle = near > 0.35 ? '#9DBBFF' : '#3D7BFF';
        const s = 1 + near * 1.4;
        ctx.fillRect(x + y * SK - 5 * s, y - 1.5 * s, 10 * s, 3 * s);
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(draw);
    };
    size(); addEventListener('resize', size);
    hero.addEventListener('pointermove', e => { const r = field.getBoundingClientRect(); ptr.tx = e.clientX - r.left; ptr.ty = e.clientY - r.top; if (ptr.x < -999) { ptr.x = ptr.tx; ptr.y = ptr.ty; } });
    hero.addEventListener('pointerleave', () => { ptr.tx = ptr.ty = -9999; });
    whenVisible(hero, v => { if (v && !run && !document.hidden) { run = true; requestAnimationFrame(draw); } else if (!v) run = false; });
    document.addEventListener('visibilitychange', () => { if (document.hidden) run = false; else if (!run) { run = true; requestAnimationFrame(draw); } });
  }

  // Luz que sigue al cursor
  const glow = $('.hero__glow');
  if (glow && FINE) hero.addEventListener('pointermove', e => {
    glow.style.setProperty('--gx', (e.clientX / innerWidth * 100).toFixed(1));
    glow.style.setProperty('--gy', ((e.clientY - hero.getBoundingClientRect().top) / hero.offsetHeight * 100).toFixed(1));
  });

  // ===== Escáner del auto =====
  const scan = $('.scan');
  if (scan) {
    const tags = $$('.scan__tags li', scan), pct = $('.scan__pct', scan);
    let x = 38, target = null, run = false, t0 = performance.now(), last = -1;
    const apply = () => {
      scan.style.setProperty('--x', x.toFixed(2) + '%');
      const n = Math.round(clamp(x, 0, 100));
      if (n !== last) { pct.textContent = String(n).padStart(3, '0'); last = n; }
      tags.forEach(li => li.classList.toggle('on', x > +li.dataset.at + 2));
    };
    const loop = now => {
      if (!run) return;
      const auto = 50 + Math.sin((now - t0) / 1000 * 0.55 - 0.3) * 46;
      x = lerp(x, target ?? auto, target == null ? 1 : 0.14);
      apply(); requestAnimationFrame(loop);
    };
    if (RM) { x = 100; apply(); }
    else {
      scan.addEventListener('pointermove', e => { const r = scan.getBoundingClientRect(); target = clamp((e.clientX - r.left) / r.width * 100, 0, 100); });
      scan.addEventListener('pointerleave', () => { target = null; t0 = performance.now() - (Math.asin(clamp((x - 50) / 46, -1, 1)) + 0.3) / 0.55 * 1000; });
      introDone.then(() => whenVisible(scan, v => { if (v && !run) { run = true; requestAnimationFrame(loop); } else if (!v) run = false; }));
    }
  }

  // ===== Brillo que sigue al cursor en tarjetas =====
  if (FINE) $$('[data-spot]').forEach(el => el.addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`); el.style.setProperty('--my', `${e.clientY - r.top}px`);
  }));

  // ===== Botones magnéticos =====
  if (FINE && !RM) $$('[data-magnet]').forEach(b => {
    b.addEventListener('pointermove', e => {
      const r = b.getBoundingClientRect();
      b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px,${(e.clientY - r.top - r.height / 2) * 0.3}px)`;
    });
    b.addEventListener('pointerleave', () => (b.style.transform = ''));
  });

  // ===== Servicios =====
  const svcItems = $$('.svc__item'), svcImgs = $$('.svc__media img'), svcLabel = $('.svc__label');
  const setSvc = i => {
    svcItems.forEach((it, k) => it.classList.toggle('is-on', k === i));
    svcImgs.forEach((im, k) => im.classList.toggle('is-on', k === i));
    if (svcLabel) svcLabel.textContent = `0${i + 1} / 06`;
  };
  svcItems.forEach((it, i) => {
    it.tabIndex = 0;
    it.addEventListener('pointerenter', () => FINE && setSvc(i));
    it.addEventListener('focus', () => setSvc(i));
    it.addEventListener('click', () => setSvc(i));
  });
  if (matchMedia('(min-width: 900px)').matches) {
    const svcIO = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && setSvc(svcItems.indexOf(e.target))), { rootMargin: '-48% 0px -48% 0px' });
    svcItems.forEach(it => svcIO.observe(it));
  }

  // ===== Plano del taller =====
  const cells = $$('.cell'), areas = $$('.area');
  let auto = null;
  const setArea = id => {
    cells.forEach(c => c.classList.toggle('is-on', c.dataset.area === id));
    areas.forEach(a => a.classList.toggle('is-on', a.dataset.area === id));
  };
  const stopAuto = () => { clearInterval(auto); auto = 'off'; };
  cells.forEach(c => {
    c.addEventListener('click', () => { stopAuto(); setArea(c.dataset.area); });
    c.addEventListener('pointerenter', () => { if (FINE) { stopAuto(); setArea(c.dataset.area); } });
    c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); stopAuto(); setArea(c.dataset.area); } });
  });
  setArea('mecanica');
  const plan = $('.plan');
  if (plan) whenVisible(plan, v => {
    if (auto === 'off' || RM) return;
    if (v && !auto) { let k = 0; auto = setInterval(() => { k = (k + 1) % cells.length; setArea(cells[k].dataset.area); }, 3200); }
    else if (!v && auto) { clearInterval(auto); auto = null; }
  });

  // Polvo que no sale del área de chapa
  const dustG = $('.dust');
  if (dustG && !RM) {
    const NS = 'http://www.w3.org/2000/svg', box = { x: 276, y: 10, w: 230, h: 160 }, ps = [];
    for (let i = 0; i < 34; i++) {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('r', (Math.random() * 1.8 + 0.8).toFixed(1));
      dustG.append(c);
      ps.push({ c, x: box.x + Math.random() * box.w, y: box.y + Math.random() * box.h, vx: (Math.random() - 0.5) * 0.9, vy: (Math.random() - 0.5) * 0.9 });
    }
    let run = false;
    const step = () => {
      if (!run) return;
      for (const p of ps) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < box.x || p.x > box.x + box.w) p.vx *= -1;
        if (p.y < box.y || p.y > box.y + box.h) p.vy *= -1;
        p.c.setAttribute('cx', p.x.toFixed(1)); p.c.setAttribute('cy', p.y.toFixed(1));
      }
      requestAnimationFrame(step);
    };
    whenVisible(plan, v => { if (v && !run) { run = true; requestAnimationFrame(step); } else if (!v) run = false; });
  }

  // ===== Proceso =====
  const steps = $$('.step'), order = $('.order'), oSteps = $$('.order__steps li'), oStage = $('.order__stage b');
  const setStep = n => {
    steps.forEach((s, k) => { s.classList.toggle('is-on', k === n - 1); s.classList.toggle('is-done', k < n - 1); });
    oSteps.forEach((s, k) => { s.classList.toggle('is-on', k === n - 1); s.classList.toggle('is-done', k < n - 1); });
    if (order) {
      order.style.setProperty('--p', (n / 5).toFixed(2));
      order.style.setProperty('--done', n >= 4 ? 1 : 0);
      oStage.textContent = `0${n}`;
    }
  };
  setStep(1);
  const stepIO = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && setStep(+e.target.dataset.step)), { rootMargin: '-45% 0px -45% 0px' });
  steps.forEach(s => stepIO.observe(s));
  const stepsEl = $('.steps');
  if (stepsEl) addEventListener('scroll', () => {
    const r = stepsEl.getBoundingClientRect();
    stepsEl.style.setProperty('--sp', clamp((innerHeight * 0.55 - r.top) / r.height, 0, 1).toFixed(3));
  }, { passive: true });

  // ===== Chat de seguimiento =====
  const chat = $('.chat');
  if (chat) {
    const msgs = $$('.msg', chat), typing = $('.typing', chat);
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return; io.disconnect();
      if (RM) { msgs.forEach(m => m.classList.add('in')); return; }
      let t = 300;
      msgs.forEach((m, i) => {
        if (!m.classList.contains('msg--me')) {
          setTimeout(() => { chat.insertBefore(typing, m); typing.classList.add('in'); }, t);
          t += 750;
        }
        setTimeout(() => { typing.classList.remove('in'); m.classList.add('in'); }, t);
        t += i === 0 ? 500 : 650;
      });
    }, { threshold: 0.4 });
    io.observe(chat);
  }

  // ===== Seguros =====
  const tgl = $('.toggles');
  if (tgl) {
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return; io.disconnect();
      $$('li', tgl).forEach((li, i) => setTimeout(() => li.classList.add('on'), RM ? 0 : 500 + i * 420));
    }, { threshold: 0.5 });
    io.observe(tgl);
  }
  const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const aseg = $('#aseg'), res = $('.lookup__res'), chips = $$('.insurers li');
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
    else { res.textContent = 'No está en la lista. Consultanos igual: te respondemos por WhatsApp.'; res.classList.add('maybe'); }
    const btn = $('.lookup [data-wa]');
    btn.href = waURL(aseg.value.trim() ? `Hola Garage Service, tengo seguro con ${aseg.value.trim()}. ¿Trabajan con esa aseguradora?` : WA_TEXT.seguro);
  });

  // ===== Flotas: parallax =====
  const fleet = $('.fleet'), fleetBg = $('.fleet__bg');
  if (fleet && !RM) addEventListener('scroll', () => {
    const r = fleet.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    fleetBg.style.setProperty('--py', ((innerHeight - r.top) * 0.12).toFixed(1));
  }, { passive: true });

  // ===== Antes / después =====
  const cmp = $('.compare');
  if (cmp) {
    const range = $('.compare__range', cmp);
    const set = v => { v = clamp(v, 0, 100); cmp.style.setProperty('--p', v + '%'); range.value = v; };
    range.style.pointerEvents = 'none';
    range.addEventListener('input', () => set(+range.value));
    let drag = false;
    const at = e => { const r = cmp.getBoundingClientRect(); set((e.clientX - r.left) / r.width * 100); };
    cmp.addEventListener('pointerdown', e => { drag = true; cmp.setPointerCapture(e.pointerId); at(e); });
    cmp.addEventListener('pointermove', e => drag && at(e));
    cmp.addEventListener('pointerup', () => (drag = false));
    cmp.addEventListener('pointercancel', () => (drag = false));
    if (!RM) {
      const io = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return; io.disconnect();
        const t0 = performance.now();
        const anim = now => {
          if (drag) return;
          const k = Math.min(1, (now - t0) / 2200);
          set(50 + Math.sin(k * Math.PI * 2) * 28 * (1 - k));
          if (k < 1) requestAnimationFrame(anim);
        };
        setTimeout(() => requestAnimationFrame(anim), 500);
      }, { threshold: 0.6 });
      io.observe(cmp);
    }
  }

  // ===== Granizo =====
  const hail = $('.hail__fx');
  if (hail && !RM) {
    const ctx = hail.getContext('2d'), sec = hail.parentElement;
    let W, H, dpr, ps = [], run = false;
    const ptr = { x: -999, y: -999 };
    const size = () => {
      dpr = Math.min(devicePixelRatio || 1, 2); W = sec.clientWidth; H = sec.clientHeight;
      hail.width = W * dpr; hail.height = H * dpr;
      const n = Math.round(W * H / (W < 700 ? 9000 : 6500));
      ps = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, v: 2 + Math.random() * 3.5, r: 1 + Math.random() * 1.8, vx: 0 }));
    };
    const draw = () => {
      if (!run) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#fff';
      for (const p of ps) {
        const dx = p.x - ptr.x, dy = p.y - ptr.y, d2 = dx * dx + dy * dy;
        if (d2 < 120 * 120) { const d = Math.sqrt(d2) || 1; p.vx += dx / d * 0.9; p.y += dy / d * 0.6; }
        p.vx *= 0.92; p.x += p.vx + p.v * 0.4; p.y += p.v;
        if (p.y > H + 10) { p.y = -10; p.x = Math.random() * W; }
        if (p.x > W + 10) p.x = -10; if (p.x < -10) p.x = W + 10;
        ctx.globalAlpha = 0.18 + p.r * 0.12;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      }
      requestAnimationFrame(draw);
    };
    size(); addEventListener('resize', size);
    sec.addEventListener('pointermove', e => { const r = sec.getBoundingClientRect(); ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top; });
    sec.addEventListener('pointerleave', () => { ptr.x = ptr.y = -999; });
    whenVisible(sec, v => { if (v && !run) { run = true; requestAnimationFrame(draw); } else if (!v) run = false; });
  }

  // ===== Consulta en 10 segundos =====
  const qf = $('.qf');
  if (qf) {
    const DANO = {
      'un choque': 'Mi auto tuvo un choque.',
      'daño por granizo': 'Mi auto tiene daño por granizo.',
      'un rayón o detalle de pintura': 'Mi auto tiene un rayón o un detalle de pintura.',
      'un problema mecánico': 'Mi auto tiene un problema mecánico.',
      'el service': 'Quiero hacer el service.',
      'pulido o cuidado estético': 'Quiero un pulido o cuidado estético.'
    };
    const body = $('.term__body', qf), meter = $('.term__meter', qf), send = $('.qf__send', qf);
    const sets = $$('.qf__set', qf), ins = $('.qf__ins', qf);
    const qAseg = $('#q-aseg'), qAuto = $('#q-auto'), qAnio = $('#q-anio');
    const live = $('.qf__live', qf);
    let shown = body.textContent, typingT = null, liveT = null;
    const build = () => {
      const d = qf.dano.value, v = qf.via.value, a = qAseg.value.trim();
      const car = [qAuto.value.trim(), qAnio.value.trim()].filter(Boolean).join(' ');
      ins.hidden = v !== 'seguro';
      const lines = ['Hola Garage Service, quiero hacer una consulta.'];
      const det = [];
      if (d) det.push(DANO[d]);
      if (v === 'seguro') det.push(a ? `Lo hago con el seguro (${a}).` : 'Lo hago con el seguro.');
      if (v === 'particular') det.push('Lo hago particular.');
      if (v === 'flota') det.push('Es un vehículo de flota / empresa.');
      if (car) det.push(`Es un ${car}.`);
      if (det.length) lines.push('', ...det);
      if (d) lines.push('', '¿Me dan un turno para el presupuesto?');
      const done = [!!d, !!v, !!qAuto.value.trim()];
      sets.forEach((s, i) => s.classList.toggle('done', done[i]));
      const n = done.filter(Boolean).length;
      meter.style.setProperty('--q', n / 3); $('small', meter).textContent = `${n} de 3`;
      return lines.join('\n');
    };
    const render = () => {
      const txt = build();
      send.href = waURL(txt);
      clearTimeout(liveT); liveT = setTimeout(() => (live.textContent = txt), 900);
      clearInterval(typingT);
      let k = 0; while (k < shown.length && k < txt.length && shown[k] === txt[k]) k++;
      if (RM) { body.textContent = shown = txt; return; }
      let cur = txt.slice(0, k);
      body.textContent = cur;
      typingT = setInterval(() => {
        if (cur.length >= txt.length) { clearInterval(typingT); shown = txt; return; }
        cur = txt.slice(0, cur.length + 2); body.textContent = cur; shown = cur;
      }, 14);
    };
    qf.addEventListener('change', render);
    qf.addEventListener('input', e => { if (e.target.type === 'text') render(); });
    qf.addEventListener('submit', e => e.preventDefault());
    send.href = waURL(build());
  }

  // ===== Instagram: arrastrar con el mouse =====
  const rail = $('.ig__rail');
  if (rail && FINE) {
    let down = false, sx = 0, sl = 0, moved = false;
    rail.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; moved = false; sx = e.clientX; sl = rail.scrollLeft; });
    addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - sx; if (Math.abs(dx) > 4) { moved = true; rail.classList.add('drag'); } rail.scrollLeft = sl - dx; });
    addEventListener('pointerup', () => { down = false; rail.classList.remove('drag'); });
    rail.addEventListener('click', e => moved && e.preventDefault(), true);
  }

  // ===== Mapa: solo al pedirlo =====
  const mapBtn = $('.map__btn');
  if (mapBtn) mapBtn.addEventListener('click', () => {
    const f = document.createElement('iframe');
    f.src = 'https://www.google.com/maps?q=Armada+Argentina+269,+C%C3%B3rdoba,+Argentina&output=embed';
    f.title = 'Mapa: Armada Argentina 269, Córdoba'; f.loading = 'lazy'; f.referrerPolicy = 'no-referrer-when-downgrade';
    mapBtn.parentElement.append(f);
  });

  // ===== Cursor =====
  const cur = $('.cursor');
  if (cur && FINE && !RM) {
    let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
    addEventListener('pointermove', e => { x = e.clientX; y = e.clientY; cur.classList.add('on'); }, { passive: true });
    document.addEventListener('pointerleave', () => cur.classList.remove('on'));
    document.addEventListener('pointerover', e => cur.classList.toggle('big', !!e.target.closest('a,button,label,.cell,.svc__item,summary,.compare')));
    const tick = () => { cx = lerp(cx, x, 0.2); cy = lerp(cy, y, 0.2); cur.style.transform = `translate3d(${cx}px,${cy}px,0)`; requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }
})();
