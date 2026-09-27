// Fine, elastic threads inside the existing hero artwork. No layout or copy changes.
(() => {
  const explorer = document.querySelector('.hero-explorer');
  if (!explorer) return;
  const surface = explorer.querySelector('.sculpture');
  const svg = surface.querySelector('.sculpture-svg');
  const lines = explorer.querySelector('.sculpture-links');
  const details = explorer.querySelector('.sculpture-cards');
  const guides = explorer.querySelector('.sculpture-guides');
  const controls = [...explorer.querySelectorAll('[data-stage]')];
  if (!svg || !lines || !details || !guides) return;

  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const NS = 'http://www.w3.org/2000/svg';
  const TAU = Math.PI * 2, strandCount = 60, segments = 80;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const create = (name, attributes, parent) => {
    const node = document.createElementNS(NS, name);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
    parent.append(node);
    return node;
  };

  // Loose questions become three related ribbons, then a gently woven surface.
  const shapes = [0, 1, 2].map(stage => Array.from({ length: strandCount }, (_, i) =>
    Array.from({ length: segments + 1 }, (_, j) => {
      const u = j / segments, t = u * TAU, phase = i / strandCount * TAU;
      if (stage === 0) {
        const radius = 126 + 15 * Math.sin(t * 3 + phase * 2) + 5 * Math.cos(t * 5 - phase);
        return [
          Math.cos(t) * (radius + 17 * Math.cos(phase)) + 9 * Math.sin(phase),
          Math.sin(t) * (112 + 20 * Math.sin(phase)) + 9 * Math.sin(t * 3 + phase),
          38 * Math.sin(t * 2 + phase) + 18 * Math.cos(phase)
        ];
      }
      if (stage === 1) {
        const band = Math.floor(i / 20), local = (i % 20) / 19;
        const radius = 114 + local * 22, tilt = (band - 1) * .8;
        const x = Math.cos(t) * radius, y = Math.sin(t) * radius * .66;
        return [
          x * Math.cos(tilt) - y * Math.sin(tilt),
          x * Math.sin(tilt) + y * Math.cos(tilt),
          Math.sin(t) * 50 + (band - 1) * 29 + Math.sin(t * 2 + phase) * 3
        ];
      }
      const across = i % 2 === 0, k = Math.floor(i / 2) / 29;
      const x = ((across ? u : k) - .5) * 266;
      const y = ((across ? k : u) - .5) * 236;
      return [x, y, Math.sin(x / 266 * Math.PI) * Math.cos(y / 236 * Math.PI) * 27];
    })
  ));

  lines.replaceChildren(); details.replaceChildren(); guides.replaceChildren();
  const strands = Array.from({ length: strandCount }, (_, i) => create('path', {
    fill: 'none', stroke: i % 15 === 7 ? '#f2c746' : '#d6e0c5',
    'stroke-width': i % 15 === 7 ? '.72' : '.52',
    'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    'data-thread': i
  }, lines));
  const sparks = [7, 22, 37, 52].map((strand, i) => {
    const group = create('g', { 'data-thread-light': i }, details);
    create('circle', { r: '9', fill: 'url(#node-glow)' }, group);
    create('circle', { r: '1.6', fill: '#f2c746' }, group);
    return { strand, group };
  });
  const ripple = create('circle', {
    cx: '220', cy: '195', r: '0', fill: 'none', stroke: '#f2c746',
    'stroke-width': '.7', opacity: '0'
  }, details);

  let mode = 0, yaw = -.24, pitch = .12, velocity = 0;
  let shape = shapes[0].map(line => line.map(p => p.map(n => n * .92)));
  let startShape = shape, morph = motion.matches ? 1 : 0;
  if (motion.matches) shape = shapes[0];
  let phase = 0, energy = motion.matches ? 0 : .6, kick = 0;
  let raf = 0, last = 0, visible = true, pointer = null;
  const hover = { x: 220, y: 195, targetX: 220, targetY: 195, strength: 0, active: false };

  function project(point, strand, step) {
    let [x, y, z] = point;
    const t = step / segments * TAU, f = strand / strandCount * TAU;
    const breath = 1 + Math.sin(phase * 1.7) * .012 * energy;
    x = x * breath + Math.sin(t * 2 + f + phase * 2) * energy * 2.5;
    y = y * breath + Math.cos(t * 3 - f + phase * 1.6) * energy * 2;
    z += Math.sin(t + f + phase) * energy * 4;
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const xx = x * cy + z * sy, zz = -x * sy + z * cy;
    const yy = y * cp - zz * sp, depth = y * sp + zz * cp;
    const scale = 680 / (680 - depth);
    let px = 220 + xx * scale, py = 195 + yy * scale;
    const dx = px - hover.x, dy = py - hover.y, distance = Math.hypot(dx, dy);
    const influence = Math.pow(Math.max(0, 1 - distance / 72), 2) * hover.strength;
    const force = influence * 17;
    px += dx / Math.max(distance, 1) * force;
    py += dy / Math.max(distance, 1) * force;
    return { x: px, y: py, depth, influence };
  }

  function draw() {
    const points = strands.map((strand, i) => {
      let depth = 0, influence = 0;
      const projected = shape[i].map((point, j) => {
        const p = project(point, i, j);
        depth += p.depth; influence = Math.max(influence, p.influence);
        return p;
      });
      const front = clamp((depth / (segments + 1) + 100) / 200, 0, 1);
      const gold = i % 15 === 7;
      strand.setAttribute('d', projected.map((p, j) => `${j ? 'L' : 'M'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(''));
      strand.setAttribute('stroke-opacity', String((gold ? .23 : .085) + front * .16 + influence * .25));
      strand.setAttribute('stroke', gold || influence > .6 ? '#f2c746' : '#d6e0c5');
      return projected;
    });
    sparks.forEach((spark, i) => {
      const progress = ((phase * .065 + i * .237) % 1) * segments;
      const index = Math.floor(progress), mix = progress - index;
      const a = points[spark.strand][index], b = points[spark.strand][index + 1];
      const x = a.x + (b.x - a.x) * mix, y = a.y + (b.y - a.y) * mix;
      spark.group.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
      spark.group.setAttribute('opacity', String(.5 + energy * .4));
    });
    ripple.setAttribute('r', String((1 - kick) * 75 + 8));
    ripple.setAttribute('opacity', String(Math.sin(kick * Math.PI) * .24));
  }

  function frame(now) {
    raf = 0;
    if (!visible || document.hidden) { last = 0; return; }
    const dt = Math.max(0, Math.min(40, last ? now - last : 16)); last = now;
    const easing = motion.matches ? 1 : 1 - Math.exp(-dt / 140);
    const targetEnergy = hover.active || pointer ? 1 : 0;
    energy += ((motion.matches ? 0 : targetEnergy) - energy) * (motion.matches ? 1 : 1 - Math.exp(-dt / 550));
    if (energy < .003) energy = 0;
    hover.x += (hover.targetX - hover.x) * easing;
    hover.y += (hover.targetY - hover.y) * easing;
    hover.strength += ((hover.active && !pointer && !motion.matches ? 1 : 0) - hover.strength) * easing;
    if (hover.strength < .003) hover.strength = 0;
    if (!motion.matches) {
      phase += dt * .0005 * Math.max(energy, morph < 1 ? .5 : 0);
      if (!pointer) {
        yaw += velocity * dt / 16;
        velocity *= Math.exp(-dt / 180);
        if (Math.abs(velocity) < .0001) velocity = 0;
      }
      kick = Math.max(0, kick - dt / 850);
    }
    if (morph < 1) {
      morph = motion.matches ? 1 : Math.min(1, morph + dt / 1050);
      const eased = easeOut(morph);
      shape = startShape.map((line, i) => line.map((point, j) => point.map((n, axis) => n + (shapes[mode][i][j][axis] - n) * eased)));
      if (morph === 1) shape = shapes[mode];
    }
    draw();
    const moving = morph < 1 || energy > 0 || hover.strength > 0 || velocity || kick > 0;
    if (!motion.matches && moving) requestDraw(); else last = 0;
  }

  function requestDraw() {
    if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame);
  }
  function excite(x = 220, y = 195) {
    if (motion.matches) return;
    energy = 1; kick = 1;
    ripple.setAttribute('cx', String(x)); ripple.setAttribute('cy', String(y));
  }
  function select(next, point) {
    next = (next + controls.length) % controls.length;
    if (next !== mode) {
      startShape = shape; mode = next; morph = motion.matches ? 1 : 0;
      if (motion.matches) shape = shapes[mode];
    }
    explorer.dataset.stage = controls[mode].dataset.stage;
    controls.forEach((button, i) => button.setAttribute('aria-pressed', String(i === mode)));
    velocity = 0; excite(point?.x, point?.y); requestDraw();
  }
  function localPoint(event) {
    const matrix = svg.getScreenCTM();
    if (!matrix) return { x: 220, y: 195 };
    const p = svg.createSVGPoint(); p.x = event.clientX; p.y = event.clientY;
    return p.matrixTransform(matrix.inverse());
  }
  function updateHover(event) {
    const p = localPoint(event);
    hover.targetX = p.x; hover.targetY = p.y;
    hover.active = event.pointerType === 'mouse' || event.pointerType === 'pen';
  }
  controls.forEach((button, i) => {
    button.addEventListener('click', () => select(i));
    button.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (i + 1) % controls.length;
      if (event.key === 'ArrowLeft') next = (i + controls.length - 1) % controls.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = controls.length - 1;
      if (next === undefined) return;
      event.preventDefault(); select(next); controls[next].focus();
    });
  });
  surface.addEventListener('pointerenter', event => { updateHover(event); requestDraw(); });
  surface.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    surface.focus({ preventScroll: true });
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, time: performance.now(), moved: false };
    velocity = 0; energy = motion.matches ? 0 : 1;
    surface.setPointerCapture(event.pointerId); surface.classList.add('is-dragging');
    requestDraw();
  });
  surface.addEventListener('pointermove', event => {
    if (pointer && event.pointerId === pointer.id) {
      const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
      const elapsed = Math.max(8, performance.now() - pointer.time);
      yaw += dx * .006; pitch = clamp(pitch + dy * .004, -.65, .65);
      velocity = motion.matches ? 0 : clamp(dx * .006 * 16 / elapsed, -.06, .06);
      pointer.x = event.clientX; pointer.y = event.clientY; pointer.time = performance.now();
      pointer.moved ||= Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY) > 6;
    } else updateHover(event);
    requestDraw();
  });
  function release(event) {
    if (!pointer || pointer.id !== event.pointerId) return;
    const click = !pointer.moved && event.type === 'pointerup';
    if (performance.now() - pointer.time > 90 || event.type !== 'pointerup') velocity = 0;
    pointer = null;
    surface.classList.remove('is-dragging');
    if (surface.hasPointerCapture(event.pointerId)) surface.releasePointerCapture(event.pointerId);
    if (click) select(mode + 1, localPoint(event)); else requestDraw();
  }
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(name => surface.addEventListener(name, release));
  surface.addEventListener('pointerleave', () => { hover.active = false; requestDraw(); });
  surface.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Enter' || event.key === ' ') select(mode + 1);
    else {
      if (event.key === 'ArrowLeft') yaw -= .15;
      if (event.key === 'ArrowRight') yaw += .15;
      if (event.key === 'ArrowUp') pitch = clamp(pitch - .1, -.65, .65);
      if (event.key === 'ArrowDown') pitch = clamp(pitch + .1, -.65, .65);
      velocity = 0; requestDraw();
    }
  });

  function suspend() {
    cancelAnimationFrame(raf); raf = 0; last = 0; velocity = 0;
    hover.active = false; hover.strength = 0; energy = 0; kick = 0;
    const capture = pointer?.id; pointer = null;
    surface.classList.remove('is-dragging');
    if (capture !== undefined && surface.hasPointerCapture(capture)) surface.releasePointerCapture(capture);
  }
  motion.addEventListener('change', () => {
    suspend(); morph = 1; shape = shapes[mode]; requestDraw();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) suspend(); else requestDraw();
  });
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible) requestDraw(); else suspend();
  }).observe(surface);
  draw(); requestDraw();
})();
