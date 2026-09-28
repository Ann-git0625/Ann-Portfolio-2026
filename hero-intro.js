// A finite, edge-to-edge opening, using the existing sculpture's SVG paths.
(() => {
  const root = document.documentElement;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const sessionKey = 'ann-hero-intro-seen-v5-editorial';
  let seen = false;
  try { seen = sessionStorage.getItem(sessionKey) === '1'; } catch (_) { /* Storage is optional. */ }
  const navigation = performance.getEntriesByType('navigation')[0];
  if (seen || motion.matches || document.hidden || location.hash || navigation?.type === 'back_forward') return;

  root.classList.add('hero-intro');
  let explorer, skip, caption, captionIndex, captionStage, identity, timer, active = true, settling = false;
  const timers = [];
  const restore = [];
  const listen = (node, type, callback, options) => {
    node.addEventListener(type, callback, options);
    restore.push(() => node.removeEventListener(type, callback, options));
  };
  const later = (callback, delay) => timers.push(setTimeout(callback, delay));
  const send = (type, detail) => {
    if (type === 'hero:intro-stage' && caption) {
      captionIndex.textContent = `0${detail.stage + 1} / 03`;
      [...captionStage.children].forEach((word, i) => word.classList.toggle('is-current', i === detail.stage));
    }
    explorer?.dispatchEvent(new CustomEvent(type, { detail }));
  };

  function finish() {
    if (!active) return;
    active = false;
    clearTimeout(timer);
    timers.forEach(clearTimeout);
    const restoreFocus = skip && document.activeElement === skip;
    root.classList.remove('hero-intro', 'hero-intro-ready', 'hero-intro-preparing', 'hero-intro-settling');
    root.classList.add('hero-intro-complete');
    ['--intro-x', '--intro-y', '--intro-scale-x', '--intro-scale-y', '--intro-stroke-scale', '--intro-point-scale', '--intro-duration', '--intro-settle-duration'].forEach(name => root.style.removeProperty(name));
    restore.forEach(dispose => dispose());
    skip?.remove();
    caption?.remove();
    identity?.remove();
    send('hero:intro-finish');
    if (restoreFocus) document.querySelector('.hero-copy .text-link')?.focus({ preventScroll: true });
  }
  // A script failure or a slow device must never leave a cover over the site.
  timer = setTimeout(finish, 6500);
  listen(window, 'pagehide', finish);
  listen(window, 'pageshow', event => { if (event.persisted) finish(); });
  listen(window, 'wheel', finish, { passive: true });
  listen(window, 'touchmove', finish, { passive: true });
  listen(window, 'scroll', () => { if (window.scrollY > 4) finish(); }, { passive: true });
  listen(window, 'resize', finish, { passive: true });
  listen(window, 'hashchange', finish);
  listen(document, 'visibilitychange', () => { if (document.hidden) finish(); });
  listen(motion, 'change', () => { if (motion.matches) finish(); });
  listen(document, 'keydown', event => {
    if (['Tab', 'Escape', 'Enter', ' ', 'ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End'].includes(event.key)) finish();
  });

  function start() {
    if (!active) return;
    explorer = document.querySelector('.hero-explorer');
    if (!explorer || explorer.dataset.sculptureReady !== 'true' || window.scrollY > 4 || motion.matches || document.hidden) { finish(); return; }
    try { sessionStorage.setItem(sessionKey, '1'); } catch (_) { /* Still plays only once per page. */ }
    // Keep hidden links out of the focus order without locking scrolling.
    document.querySelectorAll('main, .site-header, .skip-link').forEach(node => {
      const wasInert = node.inert;
      node.inert = true;
      restore.push(() => { node.inert = wasInert; });
    });
    skip = document.createElement('button');
    skip.type = 'button';
    skip.className = 'hero-intro-skip';
    skip.textContent = '略過開場 ↗';
    skip.addEventListener('click', finish);
    document.body.append(skip);
    caption = document.createElement('div');
    caption.className = 'hero-intro-caption';
    caption.setAttribute('aria-hidden', 'true');
    captionIndex = document.createElement('span');
    captionStage = document.createElement('em');
    ['question.', 'structure.', 'design.'].forEach(text => {
      const word = document.createElement('span'); word.textContent = text; captionStage.append(word);
    });
    caption.append(captionIndex, captionStage);
    document.body.append(caption);
    identity = document.createElement('div');
    identity.className = 'hero-intro-identity';
    identity.setAttribute('aria-hidden', 'true');
    const name = document.createElement('b'); name.textContent = 'ANN';
    const role = document.createElement('span'); role.textContent = 'PRODUCT & UX DESIGNER';
    const statement = document.createElement('span'); statement.textContent = 'DESIGN THE NEXT STEP';
    statement.className = 'intro-signature';
    identity.append(name, role, statement);
    document.body.append(identity);

    const mobile = matchMedia('(max-width: 780px)').matches;
    const timing = mobile
      ? { stage1: 580, stage2: 1340, morph1: 760, morph2: 760, settle: 2360, exit: 1050, total: 3470 }
      : { stage1: 800, stage2: 1800, morph1: 1000, morph2: 900, settle: 2860, exit: 1180, total: 4100 };
    root.style.setProperty('--intro-duration', `${timing.total}ms`);
    root.style.setProperty('--intro-settle-duration', `${timing.exit}ms`);
    function position() {
      if (!active || settling) return;
      // Read the original bounds only at setup / font completion, never per frame.
      explorer.style.transform = 'none';
      const rect = explorer.getBoundingClientRect();
      const surface = explorer.querySelector('.sculpture').getBoundingClientRect();
      const width = document.documentElement.clientWidth;
      const height = window.innerHeight;
      // Crop an overscanned field to the viewport, adapting to portrait and landscape.
      const unit = surface.width / 440;
      const scaleX = width / (300 * unit), scaleY = height / (250 * unit);
      const centerX = surface.left - rect.left + 220 * unit;
      const centerY = surface.top - rect.top + 170 * unit;
      root.style.setProperty('--intro-x', `${width / 2 - centerX * scaleX - rect.left}px`);
      root.style.setProperty('--intro-y', `${height / 2 - centerY * scaleY - rect.top}px`);
      root.style.setProperty('--intro-scale-x', String(scaleX));
      root.style.setProperty('--intro-scale-y', String(scaleY));
      root.style.setProperty('--intro-stroke-scale', String(Math.sqrt(scaleX * scaleY)));
      root.style.setProperty('--intro-point-scale', String(Math.sqrt(scaleX * scaleY) * unit));
      explorer.style.removeProperty('transform');
    }
    position();
    document.fonts?.ready.then(position);
    requestAnimationFrame(() => { if (active) root.classList.add('hero-intro-ready'); });
    send('hero:intro-stage', { stage: 0, duration: 1, immersive: true });
    later(() => send('hero:intro-stage', { stage: 1, duration: timing.morph1 }), timing.stage1);
    later(() => send('hero:intro-stage', { stage: 2, duration: timing.morph2 }), timing.stage2);
    later(() => { if (active) root.classList.add('hero-intro-preparing'); }, timing.settle - 220);
    later(() => {
      if (!active) return;
      settling = true;
      send('hero:intro-settle', { duration: timing.exit });
      root.classList.add('hero-intro-settling');
    }, timing.settle);
    later(finish, timing.total);
  }
  document.addEventListener('DOMContentLoaded', () => {
    try { start(); } catch (_) { finish(); }
  }, { once: true });
})();
