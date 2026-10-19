/* Intro: la G se dibuja, sus piezas encastran sobre el eje de 22°, aparece el logotipo
   y el logo viaja a su lugar en el header. Solo en la primera visita de la sesión.
   ?intro la fuerza, ?nointro la saltea. */
(() => {
  const root = document.documentElement;
  const done = () => {
    try { sessionStorage.setItem('gs-intro', '1'); } catch (e) {}
    dispatchEvent(new Event('intro:done'));
  };
  if (!root.classList.contains('intro-on')) return;
  const tpl = document.getElementById('intro-tpl');
  if (!tpl) { root.classList.remove('intro-on'); return done(); }

  const node = tpl.content.firstElementChild.cloneNode(true);
  document.body.append(node);
  root.classList.add('intro-live');
  const stage = node.querySelector('.intro__stage');
  const logo = node.querySelector('.intro__logo');
  const timers = [];
  const at = (ms, fn) => timers.push(setTimeout(fn, ms));
  let finished = false;

  const finish = fast => {
    if (finished) return; finished = true;
    timers.forEach(clearTimeout);
    node.classList.add('s1', 's2', 's3');
    const brand = document.querySelector('.brand img');
    const fly = () => {
      const a = logo.getBoundingClientRect(), b = brand.getBoundingClientRect();
      stage.style.transition = 'none';
      node.classList.add('out');
      const ease = 'cubic-bezier(.7,0,.2,1)', dur = fast ? 400 : 850;
      // el fondo se va con un barrido inclinado
      node.animate(
        [{ clipPath: 'polygon(0 0,100% 0,100% 140%,0 100%)' }, { clipPath: 'polygon(0 0,100% 0,100% 0%,0 -40%)' }],
        { duration: dur, easing: ease, fill: 'forwards' }
      );
      // el logo viaja al header
      const ghost = logo.cloneNode(true);
      ghost.classList.add('intro-ghost');
      Object.assign(ghost.style, { position: 'fixed', left: a.left + 'px', top: a.top + 'px', width: a.width + 'px', height: a.height + 'px', margin: 0, zIndex: 1001, transformOrigin: '0 0' });
      document.body.append(ghost);
      logo.style.opacity = '0';
      ghost.animate(
        [{ transform: 'none' }, { transform: `translate(${b.left - a.left}px,${b.top - a.top}px) scale(${b.width / a.width})` }],
        { duration: dur + 80, easing: ease, fill: 'forwards' }
      ).finished.then(cleanup);
      // por si la pestaña está en segundo plano y la animación no termina
      setTimeout(cleanup, dur + 600);
      function cleanup() {
        if (!node.isConnected) return;
        root.classList.remove('intro-on', 'intro-live');
        ghost.remove(); node.remove(); done();
      }
    };
    fly();
  };

  requestAnimationFrame(() => node.classList.add('s1'));
  at(750, () => node.classList.add('s2'));
  at(1250, () => node.classList.add('s3'));
  at(2500, () => finish(false));

  const skip = () => finish(true);
  node.addEventListener('click', skip);
  addEventListener('keydown', function k(e) { if (['Escape', 'Enter', ' '].includes(e.key)) { removeEventListener('keydown', k); skip(); } });
  addEventListener('wheel', skip, { once: true, passive: true });
  addEventListener('touchmove', skip, { once: true, passive: true });
})();
