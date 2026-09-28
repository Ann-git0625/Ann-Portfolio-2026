// Finite, elastic threads shared by the opening and the interactive hero.
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
  const lightweight = matchMedia('(max-width: 780px), (pointer: coarse)').matches || navigator.hardwareConcurrency <= 4;
  const TAU = Math.PI * 2, strandCount = lightweight ? 36 : 60, segments = lightweight ? 48 : 80;
  const bandSize = strandCount / 3, goldEvery = strandCount / 4;
  const frameInterval = lightweight ? 1000 / 30 : 1000 / 60;
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
        const band = Math.floor(i / bandSize), local = (i % bandSize) / (bandSize - 1);
        const radius = 114 + local * 22, tilt = (band - 1) * .8;
        const x = Math.cos(t) * radius, y = Math.sin(t) * radius * .66;
        return [
          x * Math.cos(tilt) - y * Math.sin(tilt),
          x * Math.sin(tilt) + y * Math.cos(tilt),
          Math.sin(t) * 50 + (band - 1) * 29 + Math.sin(t * 2 + phase) * 3
        ];
      }
      const across = i % 2 === 0, k = Math.floor(i / 2) / (strandCount / 2 - 1);
      const x = ((across ? u : k) - .5) * 266;
      const y = ((across ? k : u) - .5) * 236;
      return [x, y, Math.sin(x / 266 * Math.PI) * Math.cos(y / 236 * Math.PI) * 27];
    })
  ));

  // The opening spreads the same strand budget across a full-screen fabric.
  // Extra point arrays exist only during playback; the SVG is never duplicated.
  let openingShapes = document.documentElement.classList.contains('hero-intro')
    ? [0, 1, 2].map(stage => Array.from({ length: strandCount }, (_, i) =>
      Array.from({ length: segments + 1 }, (_, j) => {
        const u = j / segments, k = i / (strandCount - 1);
        if (stage === 0) {
          const x = (u - .5) * 410;
          return [x, (k - .5) * 370 + Math.sin(u * TAU + k * 3) * 30
            + Math.sin(u * TAU * 2.2 - k * 4) * 5 + Math.cos(u * TAU * .55 + k * TAU) * 7,
            Math.sin(u * Math.PI + k * 3) * 12];
        }
        if (stage === 1) {
          const band = Math.floor(i / bandSize), local = (i % bandSize) / (bandSize - 1);
          const x = (u - .5) * 430;
          return [x, (band - 1) * 126 + (local - .5) * 112 + Math.sin(u * TAU + band * 1.3) * 30 + x * .22
            + Math.sin(u * TAU * 2.4 + band + local * 2) * 3.5,
            Math.sin(u * TAU + band) * 20];
        }
        const across = i % 2 === 0, v = Math.floor(i / 2) / (strandCount / 2 - 1);
        const x = ((across ? u : v) - .5) * 410, y = ((across ? v : u) - .5) * 370;
        return [x + Math.sin(y / 110) * 15, y + Math.sin(x / 110) * 16,
          Math.sin(x / 140) * Math.cos(y / 170) * 22];
      })
    )) : null;
  let targetShapes = shapes;

  lines.replaceChildren(); details.replaceChildren(); guides.replaceChildren();
  const strands = Array.from({ length: strandCount }, (_, i) => create('path', {
    fill: 'none', stroke: i % goldEvery === Math.floor(goldEvery / 2) ? '#f2c746' : '#d6e0c5',
    'stroke-width': i % goldEvery === Math.floor(goldEvery / 2) ? '.72' : '.52',
    'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    'data-thread': i
  }, lines));
  strands.forEach((strand, i) => {
    if (i % goldEvery === Math.floor(goldEvery / 2)) strand.setAttribute('data-thread-accent', '');
  });
  // Two interpolated filaments between each pair of matching strands provide
  // ~3x visual density, without tripling 3D projections or DOM path updates.
  let filaments = null;
  let intro = null;
  let introSheen = null;
  let introLayer = null;
  const svgHome = { parent: svg.parentNode, next: svg.nextSibling,
    viewBox: svg.getAttribute('viewBox'), aspect: svg.getAttribute('preserveAspectRatio') };
  function smoothPath(points) {
    const lastIndex = points.length - 1;
    let d = `M${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;
    for (let j = 1; j < lastIndex; j++) {
      const p = points[j], next = points[j + 1];
      d += `Q${p.x.toFixed(2)},${p.y.toFixed(2)} ${((p.x + next.x) / 2).toFixed(2)},${((p.y + next.y) / 2).toFixed(2)}`;
    }
    return `${d}L${points[lastIndex].x.toFixed(2)},${points[lastIndex].y.toFixed(2)}`;
  }
  const sparks = Array.from({ length: 4 }, (_, i) => Math.floor(goldEvery / 2) + i * goldEvery).map((strand, i) => {
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
  let raf = 0, last = 0, visible = true, pointer = null, morphDuration = 1050;
  const hover = { x: 220, y: 195, targetX: 220, targetY: 195, strength: 0, active: false };
  let cy = 1, sy = 0, cp = 1, sp = 0, breath = 1;

  function project(point, strand, step) {
    let [x, y, z] = point;
    const t = step / segments * TAU, f = strand / strandCount * TAU;
    x = x * breath + Math.sin(t * 2 + f + phase * 2) * energy * 2.5;
    y = y * breath + Math.cos(t * 3 - f + phase * 1.6) * energy * 2;
    z += Math.sin(t + f + phase) * energy * 4;
    const xx = x * cy + z * sy, zz = -x * sy + z * cy;
    const yy = y * cp - zz * sp, depth = y * sp + zz * cp;
    const scale = 680 / (680 - depth);
    let px = 220 + xx * scale, py = 195 + yy * scale;
    let influence = 0;
    if (hover.strength > 0) {
      const dx = px - hover.x, dy = py - hover.y, distance = Math.hypot(dx, dy);
      influence = Math.pow(Math.max(0, 1 - distance / 72), 2) * hover.strength;
      const force = influence * 17;
      px += dx / Math.max(distance, 1) * force;
      py += dy / Math.max(distance, 1) * force;
    }
    return { x: px, y: py, depth, influence };
  }

  function draw() {
    cy = Math.cos(yaw); sy = Math.sin(yaw); cp = Math.cos(pitch); sp = Math.sin(pitch);
    breath = 1 + Math.sin(phase * 1.7) * .012 * energy;
    const points = strands.map((strand, i) => {
      let depth = 0, influence = 0;
      const projected = shape[i].map((point, j) => {
        const p = project(point, i, j);
        depth += p.depth; influence = Math.max(influence, p.influence);
        return p;
      });
      const front = clamp((depth / (segments + 1) + 100) / 200, 0, 1);
      const gold = i % goldEvery === Math.floor(goldEvery / 2);
      strand.setAttribute('d', smoothPath(projected));
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

  function prepareIntro() {
    // Draw at viewport resolution instead of scaling a small composited SVG.
    introLayer = document.createElement('div');
    introLayer.className = 'hero-intro-art';
    introLayer.setAttribute('aria-hidden', 'true');
    document.body.append(introLayer); introLayer.append(svg);
    introSheen = create('linearGradient', { id: 'intro-thread-sheen', gradientUnits: 'userSpaceOnUse',
      x1: '-100', y1: '20', x2: '240', y2: '160', spreadMethod: 'pad' }, svg.querySelector('defs'));
    [['0%', '#759080'], ['24%', '#acc1ad'], ['47%', '#fff5d5'], ['58%', '#c8d6bd'], ['100%', '#759080']]
      .forEach(([offset, color]) => create('stop', { offset, 'stop-color': color }, introSheen));
    // Project once. Quadratic curves need half as many samples as the old
    // per-frame 3D pass, while retaining every primary and secondary filament.
    const samples = segments / 2, stride = (samples + 1) * 2;
    cy = Math.cos(yaw); sy = Math.sin(yaw); cp = Math.cos(pitch); sp = Math.sin(pitch);
    breath = 1; energy = 0; hover.strength = 0;
    const cache = [...openingShapes, shapes[0]].map((form, formIndex) => {
      const buffer = new Float32Array(strandCount * stride);
      form.forEach((line, i) => {
        let depth = 0;
        for (let j = 0; j <= samples; j++) {
          const p = project(line[j * 2], i, j * 2), offset = i * stride + j * 2;
          buffer[offset] = p.x; buffer[offset + 1] = p.y; depth += p.depth;
        }
        if (formIndex === 3) {
          const front = clamp((depth / (samples + 1) + 100) / 200, 0, 1);
          const gold = i % goldEvery === Math.floor(goldEvery / 2);
          strands[i].style.setProperty('--intro-rest-opacity', String((gold ? .23 : .085) + front * .16));
        }
      });
      return buffer;
    });
    openingShapes = null;
    intro = { cache, samples, stride, current: cache[0].slice(), from: cache[0], to: cache[0],
      started: performance.now(), duration: 1, dirty: true, lastDraw: 0, startedAt: performance.now(), settling: false };
    resizeIntro();
  }

  function resizeIntro() {
    if (!intro) return;
    const width = document.documentElement.clientWidth, height = window.innerHeight;
    const rect = surface.getBoundingClientRect();
    const cover = Math.max(width / 360, height / 300), unit = rect.width / 440;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    intro.opening = { scale: cover, x: width / 2 - 220 * cover, y: height / 2 - 195 * cover };
    intro.destination = { scale: unit, x: rect.left, y: rect.top - 25 * unit };
    introLayer.style.setProperty('--intro-final-unit', String(unit));
    intro.width = width; intro.height = height; intro.dirty = true;
    requestDraw();
  }

  function introPath(offset, other = offset, mix = 0) {
    const p = intro.current, end = intro.samples * 2;
    const map = intro.mapping;
    const xAt = j => (p[offset + j] + (p[other + j] - p[offset + j]) * mix) * map.scale + (j % 2 ? map.y : map.x);
    let d = `M${xAt(0).toFixed(2)},${xAt(1).toFixed(2)}`;
    for (let j = 2; j < end; j += 2) {
      const x = xAt(j), y = xAt(j + 1);
      d += `Q${x.toFixed(2)},${y.toFixed(2)} ${((x + xAt(j + 2)) / 2).toFixed(2)},${((y + xAt(j + 3)) / 2).toFixed(2)}`;
    }
    return `${d}L${xAt(end).toFixed(2)},${xAt(end + 1).toFixed(2)}`;
  }

  function introTarget(stage, duration) {
    intro.from = intro.current.slice();
    intro.to = intro.cache[stage];
    intro.started = performance.now(); intro.duration = duration; intro.dirty = true;
    requestDraw();
  }

  function drawIntro(now) {
    const delta = now - intro.lastDraw;
    if (intro.lastDraw && delta < frameInterval - 1) { requestDraw(); return; }
    intro.lastDraw = now - (delta % frameInterval);
    const progress = clamp((now - intro.started) / intro.duration, 0, 1);
    // Absolute time prevents late frames from lagging behind the CSS transition.
    const eased = progress * progress * progress * (progress * (progress * 6 - 15) + 10);
    const blend = intro.settling ? eased : 0;
    const a = intro.opening, b = intro.destination;
    intro.mapping = { scale: a.scale + (b.scale - a.scale) * blend,
      x: a.x + (b.x - a.x) * blend, y: a.y + (b.y - a.y) * blend };
    if (intro.dirty) {
      const p = intro.current, from = intro.from, to = intro.to;
      for (let i = 0; i < p.length; i++) p[i] = from[i] + (to[i] - from[i]) * eased;
      for (let i = 0; i < strandCount; i++) strands[i].setAttribute('d', introPath(i * intro.stride));
      if (filaments && !intro.settling) {
        let d = '';
        for (let i = 0; i < strandCount - 2; i++) {
          const offset = i * intro.stride, other = (i + 2) * intro.stride;
          d += introPath(offset, other, 1 / 3) + introPath(offset, other, 2 / 3);
        }
        filaments.setAttribute('d', d);
      }
      if (progress === 1) intro.dirty = false;
    }
    const time = (now - intro.startedAt) / 1000;
    // A single gradient moves across the cached paths; no blur or extra mesh.
    if (introSheen && !intro.settling) {
      const m = intro.mapping;
      introSheen.setAttribute('gradientTransform', `translate(${m.x.toFixed(2)} ${m.y.toFixed(2)}) scale(${m.scale.toFixed(4)}) translate(${(time * 76 - 40).toFixed(2)} 0)`);
    }
    sparks.forEach((spark, i) => {
      const along = ((time * .024 + i * .237) % 1) * intro.samples;
      const j = Math.floor(along), mix = along - j, offset = spark.strand * intro.stride + j * 2;
      const p = intro.current, x = p[offset] + (p[offset + 2] - p[offset]) * mix;
      const y = p[offset + 1] + (p[offset + 3] - p[offset + 1]) * mix;
      const m = intro.mapping;
      spark.group.setAttribute('transform', `translate(${(x * m.scale + m.x).toFixed(2)} ${(y * m.scale + m.y).toFixed(2)})`);
      spark.group.setAttribute('opacity', String(.64 + Math.sin(time * 1.4 + i) * .1));
    });
    requestDraw();
  }

  function frame(now) {
    raf = 0;
    if ((!visible && !intro) || document.hidden) { last = 0; return; }
    if (intro) { drawIntro(now); return; }
    if (last && now - last < frameInterval - 1) { requestDraw(); return; }
    const dt = Math.max(0, Math.min(64, last ? now - last : frameInterval)); last = now;
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
      morph = motion.matches ? 1 : Math.min(1, morph + dt / morphDuration);
      const eased = easeOut(morph);
      shape = startShape.map((line, i) => line.map((point, j) => point.map((n, axis) => n + (targetShapes[mode][i][j][axis] - n) * eased)));
      if (morph === 1) shape = targetShapes[mode];
    }
    draw();
    const moving = morph < 1 || energy > 0 || hover.strength > 0 || velocity || kick > 0;
    if (!motion.matches && moving) requestDraw(); else last = 0;
  }

  function requestDraw() {
    if (!raf && (visible || intro) && !document.hidden) raf = requestAnimationFrame(frame);
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
      if (motion.matches) shape = targetShapes[mode];
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
  explorer.addEventListener('hero:intro-stage', event => {
    if (event.detail.immersive && openingShapes) {
      filaments = create('path', { class: 'intro-filaments', fill: 'none', stroke: '#d6e0c5',
        'stroke-opacity': '.18', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
        'aria-hidden': 'true' }, lines);
      prepareIntro();
    }
    if (intro) {
      mode = event.detail.stage;
      explorer.dataset.stage = controls[mode].dataset.stage;
      controls.forEach((button, i) => button.setAttribute('aria-pressed', String(i === mode)));
      introTarget(mode, event.detail.duration);
      return;
    }
    morphDuration = event.detail.duration;
    select(event.detail.stage);
  });
  explorer.addEventListener('hero:intro-settle', event => {
    mode = 0;
    explorer.dataset.stage = controls[0].dataset.stage;
    controls.forEach((button, i) => button.setAttribute('aria-pressed', String(i === 0)));
    if (intro) {
      resizeIntro();
      intro.settling = true;
      introTarget(3, event.detail.duration);
      return;
    }
    targetShapes = shapes;
    startShape = shape; morph = 0; morphDuration = event.detail.duration;
    requestDraw();
  });
  explorer.addEventListener('hero:intro-resize', resizeIntro);
  explorer.addEventListener('hero:intro-finish', () => {
    introSheen?.remove(); introSheen = null;
    // Keep the final glints at their last position instead of snapping them back.
    if (intro) phase = (performance.now() - intro.startedAt) / 1000 * .024 / .065;
    intro = null;
    mode = 0;
    explorer.dataset.stage = controls[0].dataset.stage;
    controls.forEach((button, i) => button.setAttribute('aria-pressed', String(i === 0)));
    if (introLayer) {
      svgHome.parent.insertBefore(svg, svgHome.next);
      svg.setAttribute('viewBox', svgHome.viewBox);
      svg.setAttribute('preserveAspectRatio', svgHome.aspect);
      introLayer.remove(); introLayer = null;
    }
    strands.forEach(strand => strand.style.removeProperty('--intro-rest-opacity'));
    filaments?.remove(); filaments = null;
    targetShapes = shapes;
    openingShapes = null;
    morphDuration = 1050;
    suspend(); morph = 1; shape = shapes[mode]; startShape = shape; draw(); requestDraw();
  });
  motion.addEventListener('change', () => {
    suspend(); morph = 1; shape = shapes[mode]; requestDraw();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) suspend(); else requestDraw();
  });
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible || intro) requestDraw(); else suspend();
  }).observe(surface);
  explorer.dataset.sculptureReady = 'true';
  draw(); requestDraw();
})();
