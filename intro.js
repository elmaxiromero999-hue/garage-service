/* Intro: la G se dibuja como plano, las piezas encastran sobre el eje de 22°,
   aparece el logotipo y el logo viaja al header. Solo en la primera visita de la sesión.
   ?intro la fuerza, ?nointro la saltea. */
(() => {
  const root = document.documentElement;
  const done = keep => {
    if (!keep) root.classList.remove('intro-on');
    try { sessionStorage.setItem('gs-intro', '1'); } catch (e) {}
    dispatchEvent(new Event('intro:done'));
  };
  if (!root.classList.contains('intro-on')) return;
  const tpl = document.getElementById('intro-tpl');
  if (!tpl) return done();

  const node = tpl.content.firstElementChild.cloneNode(true);
  document.body.append(node);
  root.classList.add('intro-live');
  const stage = node.querySelector('.intro__stage');
  const logo = node.querySelector('.intro__logo');
  const pct = node.querySelector('.intro__pct');
  const msg = node.querySelector('.intro__msg');
  const timers = [];
  const at = (ms, fn) => timers.push(setTimeout(fn, ms));
  let finished = false, t0 = performance.now(), raf;

  // contador 000 → 100
  const count = now => {
    const k = Math.min(1, (now - t0) / 2500);
    const e = 1 - Math.pow(1 - k, 3);
    node.style.setProperty('--ip', e.toFixed(3));
    pct.textContent = String(Math.round(e * 100)).padStart(3, '0');
    if (k < 1) raf = requestAnimationFrame(count);
  };

  const finish = fast => {
    if (finished) return; finished = true;
    timers.forEach(clearTimeout); cancelAnimationFrame(raf);
    node.classList.add('s1', 's2', 's3', 's4');
    const brand = document.querySelector('.brand img');
    // el logo viaja a su lugar en el header (FLIP)
    const fly = () => {
      const a = logo.getBoundingClientRect(), b = brand.getBoundingClientRect();
      stage.style.transition = 'none';
      node.classList.add('out');
      const wipe = node.animate(
        [{ clipPath: 'polygon(0 0,100% 0,100% 140%,0 100%)' }, { clipPath: 'polygon(0 0,100% 0,100% 0%,0 -40%)' }],
        { duration: fast ? 380 : 900, easing: 'cubic-bezier(.7,0,.2,1)', fill: 'forwards' }
      );
      // el fondo se va con un barrido; el logo queda fuera del recorte
      const ghost = logo.cloneNode(true);
      ghost.classList.add('intro-ghost');
      Object.assign(ghost.style, { position: 'fixed', left: a.left + 'px', top: a.top + 'px', width: a.width + 'px', height: a.height + 'px', margin: 0, zIndex: 1001, transformOrigin: '0 0' });
      document.body.append(ghost);
      logo.style.opacity = '0';
      const s = b.width / a.width;
      ghost.animate(
        [{ transform: 'none' }, { transform: `translate(${b.left - a.left}px,${b.top - a.top}px) scale(${s})` }],
        { duration: fast ? 420 : 1000, easing: 'cubic-bezier(.7,0,.2,1)', fill: 'forwards' }
      ).finished.then(() => {
        root.classList.remove('intro-on', 'intro-live');
        requestAnimationFrame(() => { ghost.remove(); node.remove(); });
      });
      wipe.finished.then(() => done(true));
    };
    fast ? requestAnimationFrame(fly) : fly();
  };

  // línea de tiempo
  requestAnimationFrame(() => {
    node.classList.add('s1');
    raf = requestAnimationFrame(count);
  });
  at(950, () => node.classList.add('s2'));
  at(1500, () => node.classList.add('s3'));
  at(2350, () => { node.classList.add('s4'); msg.textContent = 'Listo · precisión que se ve'; });
  at(3050, () => finish(false));

  const skip = () => finish(true);
  node.querySelector('.intro__skip').addEventListener('click', skip);
  node.addEventListener('click', skip);
  addEventListener('keydown', function k(e) { if (['Escape', 'Enter', ' '].includes(e.key)) { removeEventListener('keydown', k); skip(); } });
  addEventListener('wheel', skip, { once: true, passive: true });
  addEventListener('touchmove', skip, { once: true, passive: true });
})();
