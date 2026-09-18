const dialog = document.querySelector('#project-dialog');
const dialogContent = document.querySelector('#dialog-content');
const closeDialog = document.querySelector('.dialog-close');
let lastTrigger = null;

function openProject(project, trigger) {
  const template = document.querySelector(`#project-${project}`);
  if (!template) return;
  lastTrigger = trigger;
  dialogContent.replaceChildren(template.content.cloneNode(true));
  dialog.showModal();
  closeDialog.focus();
}

document.querySelectorAll('.project-open').forEach((button) => {
  button.addEventListener('click', () => openProject(button.dataset.project, button));
});

function closeProject() {
  dialog.close();
  if (lastTrigger) lastTrigger.focus();
}

closeDialog.addEventListener('click', closeProject);
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) closeProject();
});
dialog.addEventListener('cancel', (event) => {
  event.preventDefault();
  closeProject();
});

const filters = document.querySelectorAll('.filter');
const cards = document.querySelectorAll('.project-card');
filters.forEach((filter) => {
  filter.addEventListener('click', () => {
    filters.forEach((item) => item.classList.remove('is-active'));
    filter.classList.add('is-active');
    const category = filter.dataset.filter;
    cards.forEach((card) => {
      card.classList.toggle('is-hidden', category !== 'all' && card.dataset.category !== category);
    });
  });
});



// Draggable card sculpture, refined as a fine-line node network with no dependencies.
const explorer = document.querySelector('.hero-explorer');
if (explorer) {
  const surface = explorer.querySelector('.sculpture');
  const layer = explorer.querySelector('.sculpture-cards');
  const linkLayer = explorer.querySelector('.sculpture-links');
  const controls = [...explorer.querySelectorAll('[data-stage]')];
  const stages = ['question', 'listen', 'build'];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const NS = 'http://www.w3.org/2000/svg';
  const count = 72;
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  function position(i, mode) {
    if (mode === 0) {
      const y = 1 - 2 * (i + .5) / count;
      const r = Math.sqrt(1 - y * y);
      const a = i * Math.PI * (3 - Math.sqrt(5));
      return [Math.cos(a) * r * 148, y * 150, Math.sin(a) * r * 148];
    }
    if (mode === 1) {
      const band = Math.floor(i / 24);
      const a = (i % 24) / 24 * Math.PI * 2 + band * .35;
      const r = 138 - band * 13;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      const tilt = (band - 1) * .85;
      return [x, y * Math.cos(tilt), y * Math.sin(tilt)];
    }
    const col = i % 9, row = Math.floor(i / 9);
    return [(col - 4) * 32, (row - 3.5) * 36, 0];
  }
  const cards = Array.from({ length: count }, (_, i) => {
    const g = document.createElementNS(NS, 'g');
    const glow = document.createElementNS(NS, 'circle');
    glow.setAttribute('fill', 'url(#node-glow)');
    const face = document.createElementNS(NS, 'path');
    const marks = document.createElementNS(NS, 'path');
    g.append(glow, face, marks); layer.append(g);
    return { g, glow, face, marks, p: position(i, 0), i };
  });
  // Each arrangement has its own topology; link visibility morphs with the nodes.
  const graph = new Map();
  function connect(a, b, mode) {
    if (a === b) return;
    const key = [Math.min(a, b), Math.max(a, b)].join(':');
    if (!graph.has(key)) {
      const el = document.createElementNS(NS, 'path');
      el.setAttribute('fill', 'none');
      linkLayer.append(el);
      graph.set(key, { a, b, modes: new Set(), opacity: 0, el });
    }
    graph.get(key).modes.add(mode);
  }
  for (let i = 0; i < count; i++) {
    const p = position(i, 0);
    const nearest = cards.filter(c => c.i !== i).map(c => ({ i: c.i, d: Math.hypot(...c.p.map((v, k) => v - p[k])) })).sort((a,b) => a.d - b.d);
    nearest.slice(0, 2).forEach(c => connect(i, c.i, 0));
    connect(i, Math.floor(i / 24) * 24 + (i + 1) % 24, 1);
    if (i % 8 === 0 && i < 48) connect(i, i + 24, 1);
    if (i % 9 < 8) connect(i, i + 1, 2);
    if (i + 9 < count) connect(i, i + 9, 2);
  }
  const edges = [...graph.values()];
  edges.forEach(edge => edge.opacity = Number(edge.modes.has(0)));
  layer.querySelectorAll('[data-fallback]').forEach(el => el.remove());
  linkLayer.querySelectorAll('[data-fallback]').forEach(el => el.remove());
  let mode = 0, yaw = -.35, pitch = -.15, velocity = 0;
  let pointer = null, hovered = null, raf = 0, lastTime = 0;
  let visible = true, morphing = false;
  function project(p) {
    const [x, y, z] = p, cy = Math.cos(yaw), sy = Math.sin(yaw);
    const xx = x * cy + z * sy, zz = -x * sy + z * cy;
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const yy = y * cp - zz * sp, depth = y * sp + zz * cp;
    const scale = 620 / (620 - depth);
    return { x: 220 + xx * scale, y: 195 + yy * scale, z: depth, s: scale };
  }
  function draw(dt = 16) {
    const ease = motion.matches ? 1 : 1 - Math.pow(.88, dt / 16);
    morphing = false;
    const projected = cards.map(card => {
      const target = position(card.i, mode);
      card.p = card.p.map((n, axis) => {
        const d = target[axis] - n;
        if (Math.abs(d) > .08) morphing = true;
        return Math.abs(d) < .08 ? target[axis] : n + d * ease;
      });
      return { ...project(card.p), card };
    }).sort((a, b) => a.z - b.z);
    let nearest = null, distance = 18;
    if (hovered && !pointer) for (const p of projected) {
      if (p.z < -20) continue;
      const d = Math.hypot(p.x - hovered.x, p.y - hovered.y);
      if (d < distance) { distance = d; nearest = p.card.i; }
    }
    const byIndex = new Map(projected.map(p => [p.card.i, p]));
    const connected = new Set();
    for (const edge of edges) {
      const target = Number(edge.modes.has(mode));
      edge.opacity += (target - edge.opacity) * ease;
      if (Math.abs(target - edge.opacity) < .005) edge.opacity = target;
      else morphing = true;
      const a = byIndex.get(edge.a), b = byIndex.get(edge.b);
      const focus = nearest !== null && (edge.a === nearest || edge.b === nearest) && target;
      if (focus) { connected.add(edge.a); connected.add(edge.b); }
      const depth = clamp(((a.z + b.z) / 2 + 180) / 360, 0, 1);
      edge.el.setAttribute('d', `M${a.x.toFixed(2)},${a.y.toFixed(2)}L${b.x.toFixed(2)},${b.y.toFixed(2)}`);
      edge.el.setAttribute('stroke', focus ? '#f2c746' : '#d6e0c5');
      edge.el.setAttribute('stroke-width', focus ? '1' : '.65');
      edge.el.setAttribute('stroke-opacity', String(edge.opacity * (focus ? .8 : .05 + depth * .29)));
    }
    for (const p of projected) {
      const { card } = p;
      const focused = card.i === nearest;
      const depth = clamp((p.z + 180) / 360, 0, 1);
      const hub = card.i % 17 === 0;
      const gold = hub || focused || connected.has(card.i);
      const hollow = card.i % 5 === 0 && !gold;
      const r = (hub ? 2.7 : 1.15 + (card.i % 3) * .25) * p.s * (focused ? 1.7 : 1);
      const circle = radius => `M${-radius},0a${radius},${radius} 0 1,0 ${radius*2},0a${radius},${radius} 0 1,0 ${-radius*2},0`;
      card.g.setAttribute('transform', `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)})`);
      card.glow.setAttribute('r', String(r * (focused ? 6 : 5.2)));
      card.glow.setAttribute('opacity', gold ? String(.3 + depth * .7) : '0');
      card.face.setAttribute('d', circle(r));
      card.face.setAttribute('fill', hollow ? '#192924' : gold ? '#f2c746' : '#f6f2e9');
      card.face.setAttribute('fill-opacity', hollow ? '1' : String(.24 + depth * .76));
      card.face.setAttribute('stroke', gold ? '#f2c746' : '#d6e0c5');
      card.face.setAttribute('stroke-opacity', String(.24 + depth * .65));
      card.face.setAttribute('stroke-width', hollow ? '.8' : '.35');
      card.marks.setAttribute('d', hub || focused ? circle(r + 2.5 * p.s) : '');
      card.marks.setAttribute('fill', 'none');
      card.marks.setAttribute('stroke', '#f2c746');
      card.marks.setAttribute('stroke-opacity', focused ? '.65' : String(.1 + depth * .24));
      card.marks.setAttribute('stroke-width', '.55');
      layer.append(card.g);
    }
  }
  function frame(now) {
    raf = 0;
    const dt = Math.min(40, lastTime ? now - lastTime : 16); lastTime = now;
    if (!pointer && !motion.matches) {
      yaw += velocity * dt / 16;
      velocity *= Math.pow(.94, dt / 16);
      if (Math.abs(velocity) < .0001) velocity = 0;
    }
    draw(dt);
    if (visible && !document.hidden && (morphing || velocity)) raf = requestAnimationFrame(frame);
    else lastTime = 0;
  }
  function requestDraw() {
    if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame);
  }
  function select(index) {
    mode = (index + 3) % 3;
    explorer.dataset.stage = stages[mode];
    controls.forEach((control, i) => control.setAttribute('aria-pressed', String(i === mode)));
    velocity = 0;
    requestDraw();
  }
  controls.forEach((control, i) => {
    control.addEventListener('click', () => select(i));
    control.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (i + 1) % 3;
      if (event.key === 'ArrowLeft') next = (i + 2) % 3;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = 2;
      if (next === undefined) return;
      event.preventDefault(); select(next); controls[next].focus();
    });
  });
  surface.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    surface.focus({ preventScroll: true });
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, moved: false, time: performance.now() };
    velocity = 0; hovered = null;
    surface.setPointerCapture(event.pointerId);
    surface.classList.add('is-dragging');
  });
  surface.addEventListener('pointermove', event => {
    if (pointer && pointer.id === event.pointerId) {
      const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
      const elapsed = Math.max(8, performance.now() - pointer.time);
      yaw += dx * .008; pitch = clamp(pitch + dy * .004, -.6, .6);
      velocity = motion.matches ? 0 : clamp(dx * .008 * 16 / elapsed, -.1, .1);
      pointer.x = event.clientX; pointer.y = event.clientY; pointer.time = performance.now();
      pointer.moved ||= Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY) > 5;
      requestDraw();
    } else if (event.pointerType === 'mouse') {
      const rect = surface.getBoundingClientRect();
      hovered = { x: (event.clientX - rect.left) / rect.width * 440, y: (event.clientY - rect.top) / rect.height * 400 };
      requestDraw();
    }
  });
  function release(event) {
    if (!pointer || event.pointerId !== pointer.id) return;
    const click = !pointer.moved && event.type === 'pointerup';
    if (performance.now() - pointer.time > 90 || event.type !== 'pointerup') velocity = 0;
    pointer = null;
    surface.classList.remove('is-dragging');
    if (surface.hasPointerCapture(event.pointerId)) surface.releasePointerCapture(event.pointerId);
    if (click) select(mode + 1); else requestDraw();
  }
  surface.addEventListener('pointerup', release);
  surface.addEventListener('pointercancel', release);
  surface.addEventListener('lostpointercapture', release);
  surface.addEventListener('pointerleave', () => { hovered = null; requestDraw(); });
  surface.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Enter' || event.key === ' ') select(mode + 1);
    else {
      if (event.key === 'ArrowLeft') yaw -= .15;
      if (event.key === 'ArrowRight') yaw += .15;
      if (event.key === 'ArrowUp') pitch = clamp(pitch - .1, -.6, .6);
      if (event.key === 'ArrowDown') pitch = clamp(pitch + .1, -.6, .6);
      velocity = 0; requestDraw();
    }
  });
  function updateMotion() { velocity = 0; requestDraw(); }
  motion.addEventListener('change', updateMotion);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; velocity = 0; lastTime = 0; }
    else requestDraw();
  });
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible) requestDraw();
    else { cancelAnimationFrame(raf); raf = 0; velocity = 0; lastTime = 0; }
  }).observe(surface);
  draw();
}

// One finite response on hover, focus or touch: no continuous decorative loops.
const caseMotion = matchMedia('(prefers-reduced-motion: reduce)');
document.querySelectorAll('.practice-card .project-open').forEach(button => {
  const visual = button.querySelector('.card-visual');
  const track = visual.querySelector('.path-visual i');
  const tiles = [...visual.querySelectorAll('.library-visual > span')];
  const lights = [...visual.querySelectorAll('.risk-dot')];
  let frame = 0, lastIndex = -1;
  function mark(items, index) {
    items.forEach((item, i) => item.classList.toggle('is-lit', i === index));
  }
  function reset() {
    cancelAnimationFrame(frame); frame = 0; lastIndex = -1;
    if (track) {
      track.style.removeProperty('--path-progress');
      track.style.removeProperty('--path-scale');
      track.style.removeProperty('--path-halo');
    }
    mark(tiles, -1); mark(lights, -1);
  }
  function start() {
    reset();
    if (caseMotion.matches) { mark(tiles, 0); mark(lights, 0); return; }
    const startTime = performance.now();
    function tick(now) {
      const progress = Math.min(1, (now - startTime) / 1250);
      if (track) {
        const eased = 1 - Math.pow(1 - progress, 3);
        track.style.setProperty('--path-progress', `${eased * 100}%`);
        track.style.setProperty('--path-scale', String(eased));
        track.style.setProperty('--path-halo', '5px');
      }
      const items = tiles.length ? tiles : lights;
      const index = Math.min(items.length - 1, Math.floor(progress * items.length));
      if (index !== lastIndex) { mark(items, index); lastIndex = index; }
      if (progress < 1) frame = requestAnimationFrame(tick); else frame = 0;
    }
    frame = requestAnimationFrame(tick);
  }
  button.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') start(); });
  button.addEventListener('pointerleave', reset);
  button.addEventListener('focus', start);
  button.addEventListener('blur', reset);
  button.addEventListener('pointerdown', event => { if (event.pointerType !== 'mouse') start(); });
  button.addEventListener('click', reset);
  caseMotion.addEventListener('change', reset);
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });
  // Direct exploration takes over from the entry sequence.
  visual.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse') return;
    if (track && !caseMotion.matches) {
      cancelAnimationFrame(frame); frame = 0;
      const rect = track.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / Math.max(1, rect.width)));
      track.style.setProperty('--path-progress', `${ratio * 100}%`);
      track.style.setProperty('--path-scale', String(ratio));
    }
    const tile = event.target.closest('.library-visual > span');
    if (tile) { cancelAnimationFrame(frame); frame = 0; mark(tiles, tiles.indexOf(tile)); }
  });
});

// Delegation also handles case content freshly cloned from templates.
function selectComparisonTab(tab) {
  const comparison = tab.closest('.design-comparison');
  comparison.querySelectorAll('[role="tab"]').forEach((item) => {
    const selected = item === tab;
    item.setAttribute('aria-selected', String(selected));
    item.tabIndex = selected ? 0 : -1;
    comparison.querySelector(`#${item.getAttribute('aria-controls')}`).hidden = !selected;
  });
}
dialogContent.addEventListener('click', (event) => {
  const tab = event.target.closest('.comparison-tabs [role="tab"]');
  if (tab) selectComparisonTab(tab);
});
dialogContent.addEventListener('keydown', (event) => {
  const tab = event.target.closest('.comparison-tabs [role="tab"]');
  if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const tabs = [...tab.parentElement.querySelectorAll('[role="tab"]')];
  let index = tabs.indexOf(tab);
  if (event.key === 'Home') index = 0;
  else if (event.key === 'End') index = tabs.length - 1;
  else index = (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
  selectComparisonTab(tabs[index]);
  tabs[index].focus();
});

// UE work opens in an in-page lightbox; clicking again closes it.
const ueLightbox = document.querySelector('#ue-lightbox');
const ueLightboxImage = document.querySelector('#ue-lightbox-image');
let activeUeTrigger = null;

document.querySelectorAll('.ue-lightbox-trigger').forEach((trigger) => {
  trigger.addEventListener('click', () => {
    const source = trigger.querySelector('img');
    activeUeTrigger = trigger;
    ueLightboxImage.src = source.currentSrc || source.src;
    ueLightboxImage.alt = source.alt;
    ueLightbox.showModal();
  });
});

ueLightbox.addEventListener('click', () => ueLightbox.close());
ueLightbox.addEventListener('close', () => {
  ueLightboxImage.removeAttribute('src');
  ueLightboxImage.alt = '';
  activeUeTrigger?.focus();
  activeUeTrigger = null;
});
