/* One page lock shared by case viewers, archive projects and nested image dialogs. */
(() => {
  const active = new Set();
  const registered = new WeakSet();
  let saved = null;
  let touchX = 0;
  let touchY = 0;

  const remember = (element, names) => names.map(name =>
    [name, element.style.getPropertyValue(name), element.style.getPropertyPriority(name)]);
  const restore = (element, properties) => properties.forEach(([name, value, priority]) => {
    if (value) element.style.setProperty(name, value, priority);
    else element.style.removeProperty(name);
  });

  function lock() {
    const root = document.documentElement;
    const body = document.body;
    const gutter = Math.max(0, window.innerWidth - root.clientWidth);
    saved = {
      x: window.scrollX, y: window.scrollY,
      root: remember(root, ['overflow', 'overscroll-behavior', 'scroll-behavior']),
      body: remember(body, ['position', 'top', 'left', 'right', 'width', 'overflow', 'padding-right'])
    };
    const padding = parseFloat(getComputedStyle(body).paddingRight) || 0;
    root.style.setProperty('overflow', 'hidden');
    root.style.setProperty('overscroll-behavior', 'none');
    root.style.setProperty('scroll-behavior', 'auto');
    body.style.setProperty('position', 'fixed');
    body.style.setProperty('top', `${-saved.y}px`);
    body.style.setProperty('left', '0');
    body.style.setProperty('right', '0');
    body.style.setProperty('width', 'auto');
    body.style.setProperty('overflow', 'hidden');
    if (gutter) body.style.setProperty('padding-right', `${padding + gutter}px`);
  }

  function release(dialog) {
    // A queued close event may arrive after a quick reopen.
    if (dialog.open || !active.delete(dialog) || active.size || !saved) return;
    const position = saved;
    saved = null;
    restore(document.body, position.body);
    // Keep scroll restoration instant even when the site uses smooth anchor scrolling.
    restore(document.documentElement, position.root.filter(([name]) => name !== 'scroll-behavior'));
    window.scrollTo(position.x, position.y);
    restore(document.documentElement, position.root.filter(([name]) => name === 'scroll-behavior'));
  }

  window.PortfolioDialog = {
    open(dialog) {
      if (dialog.open) return;
      if (!registered.has(dialog)) {
        dialog.addEventListener('close', () => release(dialog));
        registered.add(dialog);
      }
      if (!active.size) lock();
      active.add(dialog);
      try { dialog.showModal(); }
      catch (error) { release(dialog); throw error; }
    }
  };

  document.addEventListener('touchstart', event => {
    if (event.touches.length !== 1) return;
    touchX = event.touches[0].clientX;
    touchY = event.touches[0].clientY;
  }, { passive: true, capture: true });

  // Older iOS versions need an edge guard in addition to the fixed body.
  // Scrollable content remains usable; only gestures escaping the top dialog stop.
  document.addEventListener('touchmove', event => {
    if (!active.size || event.touches.length !== 1) return;
    const dialog = [...active].reverse().find(item => item.open);
    if (!dialog) return;
    const dx = touchX - event.touches[0].clientX;
    const dy = touchY - event.touches[0].clientY;
    touchX = event.touches[0].clientX;
    touchY = event.touches[0].clientY;
    const horizontal = Math.abs(dx) > Math.abs(dy);
    const delta = horizontal ? dx : dy;
    let element = event.target instanceof Element ? event.target : null;
    if (element && dialog.contains(element)) {
      while (element) {
        const style = getComputedStyle(element);
        const overflow = horizontal ? style.overflowX : style.overflowY;
        const position = horizontal ? element.scrollLeft : element.scrollTop;
        const limit = horizontal ? element.scrollWidth - element.clientWidth : element.scrollHeight - element.clientHeight;
        if (/(auto|scroll)/.test(overflow) && limit > 1 &&
            ((delta < 0 && position > 0) || (delta > 0 && position < limit - 1))) return;
        if (element === dialog) break;
        element = element.parentElement;
      }
    }
    if (event.cancelable) event.preventDefault();
  }, { passive: false, capture: true });
})();
