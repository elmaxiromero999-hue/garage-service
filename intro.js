/* Portada: la G se dibuja, sus piezas encastran sobre el eje de 22° y aparece el logotipo.
   La portada queda quieta hasta que la persona desliza, toca o usa el teclado:
   entonces sube como una cortina y el logo viaja a su lugar en el header.
   ?nointro la saltea. No aparece con links a una sección (#) ni con movimiento reducido. */
(() => {
  const root = document.documentElement;
  if (!root.classList.contains('intro-on')) return;
  const release = () => {
    root.classList.remove('intro-on', 'intro-live', 'intro-leaving');
    dispatchEvent(new Event('intro:done'));
  };

  try {
    const tpl = document.getElementById('intro-tpl');
    if (!tpl) return release();
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    scrollTo(0, 0);

    const node = tpl.content.firstElementChild.cloneNode(true);
    document.body.append(node);
    root.classList.add('intro-live');
    const logo = node.querySelector('.intro__logo');
    const pat = node.querySelector('.intro__pat');
    const btn = node.querySelector('.intro__enter');
    const timers = [];
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));
    let ready = false, leaving = false, lastAct = 0;

    // --- patrón que se revela con el cursor (o deriva solo en pantallas táctiles) ---
    const fine = matchMedia('(pointer: fine)').matches;
    let px = innerWidth * 0.3, py = innerHeight * 0.6, tx = px, ty = py, hasPtr = false, run = true;
    node.addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; hasPtr = true; });
    const t0 = performance.now();
    const loop = now => {
      if (!run) return;
      if (!hasPtr) { const t = (now - t0) / 1000; tx = innerWidth * (0.5 + 0.32 * Math.sin(t * 0.35)); ty = innerHeight * (0.5 + 0.28 * Math.sin(t * 0.5 + 1)); }
      px += (tx - px) * (fine ? 0.08 : 0.04); py += (ty - py) * (fine ? 0.08 : 0.04);
      pat.style.setProperty('--mx', px.toFixed(1) + 'px'); pat.style.setProperty('--my', py.toFixed(1) + 'px');
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    // --- armado del logo ---
    const showAll = () => { timers.forEach(clearTimeout); node.classList.add('s1', 's2', 's3', 's4'); ready = true; lastAct = performance.now(); };
    requestAnimationFrame(() => node.classList.add('s1'));
    at(750, () => node.classList.add('s2'));
    at(1250, () => node.classList.add('s3'));
    at(2300, showAll);

    // --- entrar al sitio ---
    const enter = () => {
      if (leaving) return; leaving = true;
      const brand = document.querySelector('.brand img');
      const a = logo.getBoundingClientRect(), b = brand.getBoundingClientRect();
      root.classList.add('intro-leaving');
      node.classList.add('out');
      const ease = 'cubic-bezier(.76,0,.24,1)';
      // la portada sube como una cortina
      node.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-100%)' }], { duration: 1050, easing: ease, fill: 'forwards' });
      // el logo viaja al header
      const ghost = logo.cloneNode(true);
      ghost.classList.add('intro-ghost');
      Object.assign(ghost.style, { position: 'fixed', left: a.left + 'px', top: a.top + 'px', width: a.width + 'px', height: a.height + 'px', margin: 0, zIndex: 1001, transformOrigin: '0 0' });
      document.body.append(ghost);
      logo.style.opacity = '0';
      ghost.animate(
        [{ transform: 'none' }, { transform: `translate(${b.left - a.left}px,${b.top - a.top}px) scale(${b.width / a.width})` }],
        { duration: 1100, easing: ease, fill: 'forwards' }
      ).finished.then(cleanup);
      setTimeout(() => dispatchEvent(new Event('intro:reveal')), 350);
      setTimeout(cleanup, 1700); // por si la pestaña está en segundo plano
      function cleanup() {
        if (!node.isConnected) return;
        run = false; ghost.remove(); node.remove(); release();
      }
    };

    // un gesto antes de terminar el armado lo completa; el siguiente entra
    const act = () => {
      const now = performance.now();
      if (!ready) return showAll();
      if (now - lastAct < 650) return;
      enter();
    };
    btn.addEventListener('click', e => { e.stopPropagation(); ready ? enter() : showAll(); });
    node.addEventListener('click', act);
    addEventListener('wheel', e => { if (!leaving && e.deltaY > 3) act(); }, { passive: true });
    let sy = null;
    addEventListener('touchstart', e => { sy = e.touches[0].clientY; }, { passive: true });
    addEventListener('touchmove', e => { if (!leaving && sy != null && sy - e.touches[0].clientY > 30) { sy = null; act(); } }, { passive: true });
    addEventListener('keydown', e => {
      if (leaving || !['ArrowDown', 'PageDown', ' ', 'Enter', 'Escape'].includes(e.key)) return;
      if (document.activeElement === btn && (e.key === 'Enter' || e.key === ' ')) return; // ya lo hace el botón
      act();
    });
  } catch (err) {
    document.querySelectorAll('.intro').forEach(n => n.remove());
    release();
  }
})();
