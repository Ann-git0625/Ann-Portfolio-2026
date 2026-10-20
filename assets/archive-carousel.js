/* Slide the original archive cards in equal groups of three. */
(() => {
  const carousel = document.querySelector('#visual .archive-carousel');
  if (!carousel) return;
  const wall = carousel.querySelector('.archive-wall');
  const cards = [...wall.children].filter(el => el.matches('.archive-tile'));
  if (cards.length < 2) return;
  const buttons = cards.map(card => card.querySelector('.archive-image-open'));
  const status = carousel.querySelector('[data-carousel-status]');
  const groupSize = 3;
  const pages = [];
  const pagination = document.createElement('nav');
  pagination.className = 'archive-carousel-dots';
  pagination.setAttribute('aria-label', '切換作品組，每組三件');
  for (let start = 0; start < cards.length; start += groupSize) {
    const index = pages.length;
    const page = document.createElement('div');
    page.className = 'archive-carousel-page';
    page.id = `archive-group-${index + 1}`;
    page.setAttribute('role', 'group');
    page.setAttribute('aria-roledescription', '投影片');
    page.setAttribute('aria-label', `第 ${index + 1} 組：第 ${start + 1} 至 ${Math.min(start + groupSize, cards.length)} 件作品`);
    cards.slice(start, start + groupSize).forEach(card => {
      page.append(card);
      card.querySelectorAll('img').forEach(image => { image.draggable = false; });
    });
    wall.append(page);
    pages.push(page);
  }
  // One indicator per group; its size follows the displayed group.
  const dots = pages.map((page, index) => {
    const dot = document.createElement('button');
    dot.className = 'archive-carousel-dot';
    dot.type = 'button';
    dot.setAttribute('aria-label', page.getAttribute('aria-label'));
    dot.setAttribute('aria-controls', page.id);
    dot.addEventListener('click', () => select(index));
    const point = document.createElement('span');
    point.setAttribute('aria-hidden', 'true');
    dot.append(point);
    pagination.append(dot);
    return dot;
  });
  wall.after(pagination);
  let current = 0;
  let pageWidth = 1;
  let gesture = null;
  let touchPreview = null;
  const clearTouchPreview = () => {
    touchPreview?.classList.remove('is-touch-active');
    touchPreview = null;
  };
  let suppressClickUntil = 0;
  let wheelTotal = 0;
  let wheelTime = 0;
  let wheelLockUntil = 0;
  const pageOffsets = [];
  const mod = value => (value % pages.length + pages.length) % pages.length;
  const offsetFor = index => {
    let distance = mod(index - current);
    if (distance > pages.length / 2) distance -= pages.length;
    return distance;
  };
  const paint = (drag = 0) => {
    pages.forEach((page, index) => {
      const offset = offsetFor(index);
      // A recycled group can jump from +2 to -1 (or the reverse). Teleport
      // it while hidden; animating that jump sweeps unrelated cards across
      // the viewport, especially when returning from group 2 to group 1.
      const recycled = pageOffsets[index] === undefined || Math.abs(offset - pageOffsets[index]) > 1;
      if (recycled) {
        page.style.transition = 'none';
        page.style.visibility = 'hidden';
      }
      page.style.transform = `translate3d(${(offset + drag) * (pageWidth + 16)}px, 0, 0)`;
      if (recycled) {
        // Commit the new offscreen position before restoring animation.
        page.getBoundingClientRect();
        page.style.transition = '';
      }
      page.style.visibility = Math.abs(offset) <= 1 ? 'visible' : 'hidden';
      pageOffsets[index] = offset;
    });
  };
  function select(index, announce = true) {
    clearTouchPreview();
    const focusedCard = buttons.indexOf(document.activeElement);
    current = mod(index);
    pages.forEach((page, i) => {
      const active = i === current;
      page.inert = !active;
      page.setAttribute('aria-hidden', String(!active));
      dots[i].setAttribute('aria-current', String(active));
      page.querySelectorAll('.archive-image-open').forEach(button => { button.tabIndex = active ? 0 : -1; });
      if (Math.abs(offsetFor(i)) <= 1) page.querySelectorAll('img').forEach(image => { image.loading = 'eager'; });
    });
    if (announce) status.textContent = `第 ${current + 1} 組，共 ${pages.length} 組。第 ${current * groupSize + 1} 至 ${Math.min((current + 1) * groupSize, cards.length)} 件作品。`;
    paint();
    if (focusedCard >= 0) buttons[Math.min(current * groupSize + focusedCard % groupSize, buttons.length - 1)].focus({preventScroll: true});
  }
  carousel.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const targets = {ArrowLeft: current - 1, ArrowRight: current + 1, Home: 0, End: pages.length - 1};
    if (!(event.key in targets)) return;
    event.preventDefault();
    select(targets[event.key]);
  });
  // A drag changes the group; a normal click retains each original lightbox.
  wall.addEventListener('click', event => {
    if (performance.now() < suppressClickUntil) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
  wall.addEventListener('dragstart', event => event.preventDefault());
  wall.addEventListener('pointerdown', event => {
    // A second finger starts a browser gesture, so stop the single-card preview.
    if (!event.isPrimary) clearTouchPreview();
    if (!event.isPrimary || event.button !== 0) return;
    clearTouchPreview();
    if (event.pointerType === 'touch' || event.pointerType === 'pen') {
      touchPreview = event.target.closest('.archive-tile');
      touchPreview?.classList.add('is-touch-active');
    }
    gesture = {id: event.pointerId, x: event.clientX, y: event.clientY, dx: 0, horizontal: false};
  });
  wall.addEventListener('pointermove', event => {
    if (!gesture || event.pointerId !== gesture.id) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (!gesture.horizontal) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 8) return;
      // Preview only while resting on a card, never while swiping or scrolling.
      clearTouchPreview();
      if (Math.abs(dy) > Math.abs(dx)) { gesture = null; return; }
      gesture.horizontal = true;
      wall.setPointerCapture(event.pointerId);
      wall.classList.add('is-dragging');
    }
    gesture.dx = dx;
    paint(Math.max(-.95, Math.min(.95, dx / (pageWidth + 16))));
  });
  const finishGesture = (event, cancelled = false) => {
    if (!gesture || event.pointerId !== gesture.id) return;
    clearTouchPreview();
    const {horizontal, dx} = gesture;
    gesture = null;
    wall.classList.remove('is-dragging');
    if (wall.hasPointerCapture(event.pointerId)) wall.releasePointerCapture(event.pointerId);
    if (horizontal) {
      suppressClickUntil = performance.now() + 450;
      const step = !cancelled && Math.abs(dx) > Math.min(60, pageWidth * .15) ? -Math.sign(dx) : 0;
      select(current + step, step !== 0);
    }
  };
  wall.addEventListener('pointerup', event => finishGesture(event));
  wall.addEventListener('pointercancel', event => finishGesture(event, true));
  wall.addEventListener('lostpointercapture', event => {
    // Touch starts with implicit capture on the image button. Transferring it
    // to the wall bubbles the button's lost-capture event through this listener;
    // only losing the wall's own capture should cancel the drag.
    if (event.target === wall) finishGesture(event, true);
  });
  wall.addEventListener('pointerleave', event => {
    if (event.pointerType === 'mouse' && gesture && !gesture.horizontal) gesture = null;
  });
  window.addEventListener('blur', clearTouchPreview);
  window.addEventListener('pagehide', clearTouchPreview);
  wall.addEventListener('wheel', event => {
    const delta = event.shiftKey && !event.deltaX ? event.deltaY : event.deltaX;
    if (event.ctrlKey || !delta || (!event.shiftKey && Math.abs(event.deltaY) >= Math.abs(delta))) return;
    event.preventDefault();
    const now = performance.now();
    if (now < wheelLockUntil) return;
    if (now - wheelTime > 180) wheelTotal = 0;
    wheelTime = now;
    wheelTotal += delta * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? pageWidth : 1);
    if (Math.abs(wheelTotal) >= 45) {
      select(current + Math.sign(wheelTotal));
      wheelTotal = 0;
      wheelLockUntil = now + 550;
    }
  }, {passive: false});
  carousel.classList.add('is-ready', 'is-initializing');
  const projectCover = document.querySelector('#case-hanazono .card-visual');
  const resize = () => {
    pageWidth = wall.getBoundingClientRect().width;
    const radius = projectCover ? parseFloat(getComputedStyle(projectCover).borderTopLeftRadius) || 8 : 8;
    carousel.style.setProperty('--archive-card-radius', `${radius}px`);
    carousel.style.setProperty('--archive-stage-height', `${Math.ceil(pages[0].getBoundingClientRect().height)}px`);
    paint();
  };
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(wall);
  else window.addEventListener('resize', resize, {passive: true});
  resize();
  select(0, false);
  requestAnimationFrame(() => requestAnimationFrame(() => carousel.classList.remove('is-initializing')));
})();
