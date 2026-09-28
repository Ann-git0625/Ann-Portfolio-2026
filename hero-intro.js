// Five seconds on every page load. One SVG moves from the opening to the hero.
(() => {
  const root = document.documentElement;
  root.classList.add('hero-intro');
  let explorer, caption, captionIndex, captionStage, identity, timer, active = true;
  const timers = [], restore = [];
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
    clearTimeout(timer); timers.forEach(clearTimeout);
    root.classList.remove('hero-intro', 'hero-intro-ready', 'hero-intro-preparing', 'hero-intro-settling');
    root.classList.add('hero-intro-complete');
    ['--intro-duration', '--intro-settle-duration'].forEach(name => root.style.removeProperty(name));
    restore.forEach(dispose => dispose());
    caption?.remove(); identity?.remove();
    send('hero:intro-finish');
    if (location.hash) {
      try { document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView({ behavior: 'instant' }); } catch (_) { /* Ignore malformed fragments. */ }
    }
  }
  // Failure recovery must release the page even if its artwork cannot load.
  timer = setTimeout(finish, 6500);
  listen(window, 'pagehide', finish);
  const preventScroll = event => { if (event.cancelable) event.preventDefault(); };
  listen(window, 'wheel', preventScroll, { passive: false });
  listen(window, 'touchmove', preventScroll, { passive: false });
  listen(document, 'keydown', event => {
    if (!event.ctrlKey && !event.metaKey && !event.altKey && [' ', 'ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End'].includes(event.key)) preventScroll(event);
  });
  function start() {
    if (!active) return;
    explorer = document.querySelector('.hero-explorer');
    if (!explorer || explorer.dataset.sculptureReady !== 'true') { finish(); return; }
    document.querySelectorAll('main, .site-header, .skip-link, footer').forEach(node => {
      const wasInert = node.inert; node.inert = true;
      restore.push(() => { node.inert = wasInert; });
    });
    caption = document.createElement('div'); caption.className = 'hero-intro-caption';
    caption.setAttribute('aria-hidden', 'true');
    captionIndex = document.createElement('span'); captionStage = document.createElement('em');
    ['question.', 'structure.', 'design.'].forEach(text => {
      const word = document.createElement('span'); word.textContent = text; captionStage.append(word);
    });
    caption.append(captionIndex, captionStage); document.body.append(caption);
    identity = document.createElement('div'); identity.className = 'hero-intro-identity';
    identity.setAttribute('aria-hidden', 'true');
    const name = document.createElement('b'); name.textContent = 'ANN';
    const role = document.createElement('span'); role.textContent = 'PRODUCT & UX DESIGNER';
    const statement = document.createElement('span'); statement.textContent = 'DESIGN THE NEXT STEP';
    statement.className = 'intro-signature'; identity.append(name, role, statement); document.body.append(identity);
    const timing = { stage1: 950, stage2: 2150, morph1: 1200, morph2: 1050, settle: 3550, exit: 1390, total: 5000 };
    clearTimeout(timer); timer = setTimeout(finish, timing.total + 1500);
    root.style.setProperty('--intro-duration', `${timing.total}ms`);
    root.style.setProperty('--intro-settle-duration', `${timing.exit}ms`);
    const resize = () => { if (active) send('hero:intro-resize'); };
    listen(window, 'resize', resize, { passive: true });
    if (window.visualViewport) listen(window.visualViewport, 'resize', resize, { passive: true });
    document.fonts?.ready.then(resize);
    send('hero:intro-stage', { stage: 0, duration: 1, immersive: true });
    requestAnimationFrame(() => { if (active) root.classList.add('hero-intro-ready'); });
    later(() => send('hero:intro-stage', { stage: 1, duration: timing.morph1 }), timing.stage1);
    later(() => send('hero:intro-stage', { stage: 2, duration: timing.morph2 }), timing.stage2);
    later(() => { if (active) root.classList.add('hero-intro-preparing'); }, timing.settle - 220);
    later(() => {
      if (!active) return;
      send('hero:intro-settle', { duration: timing.exit });
      root.classList.add('hero-intro-settling');
    }, timing.settle);
    later(finish, timing.total);
  }
  document.addEventListener('DOMContentLoaded', () => {
    try { start(); } catch (_) { finish(); }
  }, { once: true });
})();
