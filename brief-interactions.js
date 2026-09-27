/* One finite animation per hover entry, tap, or keyboard activation. */
(() => {
  const svg = body => `<svg viewBox="0 0 240 110" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
  const line = (x1, y1, x2, y2, cls = '') => `<path class="${cls}" d="M${x1} ${y1}L${x2} ${y2}"/>`;
  const dot = (x, y, r = 3, cls = '') => `<circle class="${cls}" cx="${x}" cy="${y}" r="${r}"/>`;
  const clamp = n => Math.max(0, Math.min(1, n));
  const pulse = p => Math.sin(Math.PI * clamp(p));
  const configs = {
    hanazono: {
      label: 'Hanazono 建築、樓層與空間導覽動畫', duration: 3000,
      render(p) {
        // A stable three-step diagram: choose a floor, locate a room, enter it.
        const floor = clamp((p - .12) / .3);
        const room = clamp((p - .48) / .3);
        const buildingClass = p < .36 ? 'brief-accent' : '';
        const floorClass = p >= .36 && p < .7 ? 'brief-accent' : '';
        const roomClass = p >= .7 ? 'brief-accent' : '';
        return svg(`
          <g class="${buildingClass}">
            <path d="M17 85V24l22-10 22 10v61Z"/>
            <path class="brief-faint" d="M17 44h44M17 63h44M31 24v56M47 24v56M24 85v5h30v-5"/>
          </g>
          <rect class="brief-accent" x="21" y="48" width="36" height="11" rx="1" fill="#f2c746" fill-opacity=".12"/>
          <path class="brief-faint" d="M69 54h16m-4-4 4 4-4 4"/>
          <path class="brief-accent" d="M69 54h16" stroke-dasharray="16" stroke-dashoffset="${(16*(1-floor)).toFixed(2)}"/>
          <g class="${floorClass}">
            <rect x="94" y="29" width="54" height="52" rx="1"/>
            <path d="M117 29v20m0 10v22M94 55h15m8 0h31M131 55v26"/>
            <path class="brief-faint" d="M117 49a10 10 0 0 1 10 10h-10"/>
          </g>
          <rect class="brief-accent" x="122" y="34" width="21" height="16" rx="1" fill="#f2c746" fill-opacity="${(.03+floor*.17).toFixed(2)}" opacity="${(.3+floor*.7).toFixed(2)}"/>
          <path class="brief-faint" d="M155 54h15m-4-4 4 4-4 4"/>
          <path class="brief-accent" d="M155 54h15" stroke-dasharray="15" stroke-dashoffset="${(15*(1-room)).toFixed(2)}"/>
          <g class="${roomClass}">
            <path d="M180 81V29h48v52h-16m-14 0h-18"/>
            <path class="brief-faint" d="M198 81V67a14 14 0 0 1 14 14M192 29v3h25v-3"/>
            <rect x="188" y="39" width="31" height="17" rx="2"/>
            <path d="M188 44h31m-21-5v5m11-5v5"/>
            <rect class="brief-faint" x="197" y="61" width="14" height="7" rx="2"/>
          </g>
          <g opacity="${room.toFixed(2)}" class="brief-accent"><circle cx="224" cy="22" r="6" fill="#244237"/><path d="m221 22 2 2 4-4"/></g>
        `);
      },
    },
    risk: {
      label: '風險管理異常提示動畫', duration: 2400,
      render(p) {
        const highlight = .35 + pulse(p) * .65;
        return svg(`<rect class="brief-faint" x="33" y="14" width="174" height="84" rx="4"/>${[0,1,2].map(i => `${line(49, 33+i*23, 176, 33+i*23, 'brief-faint')}${line(65, 33+i*23, 125-i*12, 33+i*23)}${dot(49,33+i*23,3,i===1?'brief-accent':'')}${i===1 ? '<path class="brief-accent" d="m175 47 7 13h-14Zm0 4v3m0 3v.1"/>' : '<path d="m171 '+(31+i*23)+' 3 3 6-6"/>'}`).join('')}<g opacity="${highlight.toFixed(3)}"><rect class="brief-accent" x="40" y="45" width="160" height="22" rx="2"/></g><path class="brief-accent" opacity="${pulse(p).toFixed(3)}" d="M${(40+160*p).toFixed(2)} 46v20"/>`);
      },
    },
    research: {
      label: '七日收納與一日藥盒動畫', duration: 3200,
      render(p) {
        return svg(`${line(29,78,211,78,'brief-faint')}${Array.from({length:7},(_,i)=>{
          const lift = pulse((p*8-i)/1.4)*21;
          return `<g class="${lift>3?'brief-accent':''}" transform="translate(${29+i*27} ${(38-lift).toFixed(2)})"><rect width="21" height="36" rx="5"/>${line(0,17,21,17)}${dot(10.5,9,2,lift>3?'brief-accent':'brief-faint')}</g>`;
        }).join('')}`);
      },
    },
    knowledge: {
      label: '專案知識查找動畫', duration: 2700,
      render(p) {
        const step = Math.min(2, Math.floor(p*3));
        return svg(`${[0,1,2].map(i=>`<g class="${i===step?'brief-accent':'brief-faint'}" transform="translate(0 ${(-pulse((p*3-i))*5).toFixed(2)})"><path d="M${26+i*70} 36v-9h21l6 7h31v52h-58V36Z"/>${line(37+i*70,48,67+i*70,48)}${line(37+i*70,57,58+i*70,57)}${line(37+i*70,66,62+i*70,66)}</g>`).join('')}<path class="brief-faint" d="M55 18h140m-4-4 4 4-4 4"/>${dot(55+Math.min(1,p*1.35)*140,18,3,'brief-accent')}`);
      },
    },
    learning: {
      label: '新人任務路徑動畫', duration: 3000,
      render(p) {
        const progress = clamp(p*1.3);
        return svg(`${line(37,55,203,55,'brief-faint')}${line(37,55,37+progress*166,55,'brief-accent')}${[0,1,2].map(i=>{
          const complete = p> .12 + i*.25;
          return `${dot(37+i*83,55,12,complete?'brief-accent':'')}${complete?`<path class="brief-accent" d="m${31+i*83} 55 4 4 7-8"/>`:dot(37+i*83,55,2,'brief-faint')}`;
        }).join('')}`);
      },
    },
    luma: {
      label: 'Luma 口說練習波形動畫', duration: 2800,
      render(p) {
        const heights = [8,16,11,28,39,22,46,31,18,35,25,42,19,12,26,16,7];
        return svg(`<path class="brief-faint" d="M22 81h196"/>${heights.map((h,i)=>{
          const height = h*(.65+pulse(p)*Math.sin(p*Math.PI*8-i*.6)*.35);
          return `<path class="${p>i/22&&p>0?'brief-accent':''}" d="M${32+i*11} ${(52-height/2).toFixed(2)}v${height.toFixed(2)}"/>`;
        }).join('')}`);
      },
    },
    you: {
      label: 'You 證據與假設翻卡動畫', duration: 2800,
      render(p) {
        const turned = p>.25&&p<.75;
        const scale = Math.max(.05,Math.abs(Math.cos(p*Math.PI*2)));
        return svg(`<rect class="brief-faint" x="55" y="22" width="126" height="70" rx="3" transform="rotate(-7 118 57)"/><g transform="translate(120 55) scale(${scale.toFixed(3)} 1) translate(-120 -55)"><rect x="55" y="18" width="130" height="76" rx="3" fill="#244237"/><path class="brief-accent" d="M69 36h21"/>${line(69,52,141,52,'brief-faint')}${line(69,66,165,66,'brief-faint')}${line(69,76,143,76,'brief-faint')}${turned?'<path class="brief-accent" d="M161 30a7 7 0 0 1 5 12l-3 3v4m0 6v.1"/>':dot(164,36,5,'brief-accent')}</g>`);
      },
    },
    graph: {
      label: 'Knowledge Graph 節點探索動畫', duration: 3000,
      render(p) {
        const step = Math.min(2,Math.floor(p*3));
        const nodes = [[46,55],[118,35],[193,65]], side = [[94,87],[159,15],[220,29]];
        return svg(`${line(46,55,118,35,step>0?'brief-accent':'brief-faint')}${line(118,35,193,65,step>1?'brief-accent':'brief-faint')}${side.map(([x,y])=>`${line(nodes[step][0],nodes[step][1],x,y,'brief-faint')}${dot(x,y,3)}`).join('')}${nodes.map(([x,y],i)=>`${dot(x,y,i===step?12:7,i<=step?'brief-accent':'')}${i===step?dot(x,y,18+pulse(p*3-step)*3,'brief-faint'):''}`).join('')}`);
      },
    },
  };

  window.initProjectBrief = (container, project) => {
    const config = configs[project], header = container.querySelector('.brief-main');
    if (!config || !header || header.querySelector('.brief-interaction')) return () => {};
    const copy = document.createElement('div');
    copy.className = 'brief-copy';
    copy.append(header.querySelector('.brief-title'), header.querySelector('.brief-summary'));
    const widget = document.createElement('button');
    widget.type = 'button';
    widget.className = `brief-interaction brief-interaction-${project}`;
    widget.setAttribute('aria-label', `${config.label}，播放一輪`);
    header.classList.add('has-brief-art');
    header.append(copy, widget);

    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const events = new AbortController();
    const options = { signal: events.signal };
    let frame = 0, playing = false, disposed = false;
    const render = progress => { widget.innerHTML = config.render(progress); };
    function stop() {
      cancelAnimationFrame(frame);
      frame = 0; playing = false;
      widget.dataset.playing = 'false';
      render(0);
    }
    function play() {
      // Staying hovered never starts another cycle. A new entry or tap is needed.
      if (playing || disposed || document.hidden) return;
      if (motion.matches) { render(.5); return; }
      playing = true;
      widget.dataset.playing = 'true';
      const start = performance.now();
      function tick(now) {
        if (disposed || !widget.isConnected || document.hidden) { stop(); return; }
        const progress = clamp((now - start) / config.duration);
        if (progress === 1) { stop(); return; }
        render(progress);
        frame = requestAnimationFrame(tick);
      }
      frame = requestAnimationFrame(tick);
    }
    widget.addEventListener('pointerenter', event => {
      if (event.pointerType === 'mouse' || event.pointerType === 'pen') play();
    }, options);
    // Leaving lets the current finite cycle finish; it does not queue a repeat.
    widget.addEventListener('pointerleave', () => { if (motion.matches) stop(); }, options);
    widget.addEventListener('click', play, options);
    widget.addEventListener('blur', () => { if (motion.matches) stop(); }, options);
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); }, options);
    motion.addEventListener('change', stop, options);
    const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) stop();
    }) : null;
    observer?.observe(widget);
    stop();
    return () => {
      disposed = true;
      stop();
      events.abort();
      observer?.disconnect();
    };
  };
})();
