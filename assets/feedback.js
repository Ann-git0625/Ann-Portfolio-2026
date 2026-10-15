/* v10.03 — no dependency, no visitor identifiers, no automatic submissions. */
(() => {
  'use strict';

  // Restored from Ann_Portfolio_v9.02; retain the v10 button label/font.
// About Ann: mouse leaves the whole playground, not the moving button.
(() => {
  const area = document.querySelector('.ann-playground');
  const button = area?.querySelector('.ann-runaway');
  if (!button) return;
  button.hidden = false;
  const tags = area.querySelector('.about-tags');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let timer = null;
  let active = false;
  let pointerType = 'mouse';
  let x = 0;
  let y = 0;
  const cancelReturn = () => { clearTimeout(timer); timer = null; };
  const reset = (immediate = false) => {
    cancelReturn();
    active = false;
    x = y = 0;
    if (immediate) button.classList.add('is-resetting');
    button.style.transform = 'translate3d(0, 0, 0)';
    button.textContent = 'Ann 在這裡！';
    if (immediate) {
      // Flush before restoring transitions, including iOS orientation changes.
      button.getBoundingClientRect();
      button.classList.remove('is-resetting');
    }
  };
  const scheduleReturn = () => {
    cancelReturn();
    if (active) timer = setTimeout(() => reset(), 2000);
  };
  button.addEventListener('pointerdown', event => { pointerType = event.pointerType; });
  button.addEventListener('click', event => {
    cancelReturn();
    active = true;
    button.textContent = '你抓不到我～';
    const keyboard = event.detail === 0;
    // Keyboard / reduced-motion users get the same joke without chasing focus.
    if (!keyboard && !reducedMotion.matches) {
      const width = button.offsetWidth;
      const height = button.offsetHeight;
      const homeX = button.offsetLeft;
      const homeY = button.offsetTop;
      const minX = 4;
      const maxX = Math.max(minX, area.clientWidth - width - 4);
      const minY = tags.offsetHeight + 8;
      const maxY = Math.max(minY, area.clientHeight - height - 8);
      // Choose a new spot in the empty space below the tags, away from this click.
      let nextX = minX;
      let nextY = minY;
      let bestDistance = -1;
      const current = button.getBoundingClientRect();
      const bounds = area.getBoundingClientRect();
      for (let i = 0; i < 16; i++) {
        const candidateX = minX + Math.random() * (maxX - minX);
        const candidateY = minY + Math.random() * (maxY - minY);
        const distance = Math.hypot(candidateX - (current.left - bounds.left), candidateY - (current.top - bounds.top));
        if (distance > bestDistance) {
          bestDistance = distance;
          nextX = candidateX;
          nextY = candidateY;
        }
      }
      x = nextX - homeX;
      y = nextY - homeY;
      button.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }
    if (keyboard || reducedMotion.matches || pointerType !== 'mouse' || !area.matches(':hover')) scheduleReturn();
  });
  area.addEventListener('pointerleave', event => {
    if (event.pointerType === 'mouse') scheduleReturn();
  });
  area.addEventListener('pointerenter', event => {
    if (event.pointerType === 'mouse' && !reducedMotion.matches) cancelReturn();
  });
  button.addEventListener('blur', scheduleReturn);
  button.addEventListener('keydown', event => { if (event.key === 'Escape') reset(); });
  window.addEventListener('resize', () => reset(true), { passive: true });
  window.addEventListener('pagehide', () => reset(true));
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(true); });
  if ('ResizeObserver' in window) new ResizeObserver(() => reset(true)).observe(area);
  if (document.fonts?.ready) document.fonts.ready.then(() => reset(true));
})();

  const form = document.querySelector('#portfolio-feedback-form');
  if (!form) return;

  const fields = form.querySelector('.feedback-fields');
  const status = form.querySelector('#feedback-status');
  const submitLabel = form.querySelector('.feedback-submit span');
  const message = form.querySelector('#feedback-message');
  const count = form.querySelector('#feedback-message-count');
  const success = document.querySelector('#feedback-success');
  let sending = false;
  let submitted = false;

  const ratings = [...form.querySelectorAll('[data-rating]')].map(row => {
    const input = row.querySelector('input');
    const output = row.querySelector('output');
    const state = row.querySelector('[data-rating-state]');
    const confirm = row.querySelector('[data-rating-confirm]');
    const rating = { input, answered: false };
    const render = () => {
      output.replaceChildren(document.createTextNode(input.value));
      const denominator = document.createElement('span');
      denominator.textContent = ' / 10';
      output.append(denominator);
      input.style.setProperty('--rating-progress', `${Number(input.value) * 10}%`);
      input.setAttribute('aria-valuetext', `${input.value} 分，${rating.answered ? '已作答' : '尚未作答'}`);
      row.classList.toggle('is-answered', rating.answered);
      state.textContent = rating.answered ? '已選擇，將列入回饋' : '尚未作答';
      confirm.textContent = rating.answered ? '清除評分' : '確認 5 分';
      confirm.setAttribute('aria-label', `${input.id === 'feedback-clarity' ? '第一題' : '第二題'}：${confirm.textContent}`);
    };
    const answer = () => {
      rating.answered = true;
      render();
    };
    // Focus alone is not an answer. Clicking the middle or confirming explicitly is.
    input.addEventListener('input', answer);
    input.addEventListener('change', answer);
    input.addEventListener('click', answer);
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        answer();
      }
    });
    confirm.addEventListener('click', () => {
      rating.answered = !rating.answered;
      if (!rating.answered) input.value = '5';
      render();
    });
    rating.reset = () => { rating.answered = false; input.value = '5'; render(); };
    render();
    return rating;
  });

  message.addEventListener('input', () => { count.textContent = String(message.value.length); });
  form.addEventListener('reset', () => {
    ratings.forEach(rating => rating.reset());
    count.textContent = '0';
  });

  const showStatus = (text, kind, focus = false) => {
    status.textContent = text;
    status.dataset.kind = kind;
    if (focus) status.focus();
  };

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending || submitted) return;
    const hasAnswer = ratings.some(rating => rating.answered) || message.value.trim();
    if (!hasAnswer) {
      showStatus('留下一點觀察再送出吧：確認一個分數，或寫下一句話即可。', 'error', true);
      return;
    }
    if (!form.reportValidity()) return;

    // Snapshot before disabling controls. Untouched scores are omitted, never sent as 5.
    const data = new FormData(form);
    ratings.forEach(rating => {
      data.set(`${rating.input.name}_answered`, String(rating.answered));
      if (!rating.answered) data.delete(rating.input.name);
    });
    data.set('message', message.value.trim());
    data.set('source', 'Ann Portfolio v13');
    data.set('_subject', 'Ann Portfolio — 新的作品集回饋');

    sending = true;
    fields.disabled = true;
    form.setAttribute('aria-busy', 'true');
    submitLabel.textContent = '送出中…';
    showStatus('正在傳送你的回饋…', 'pending');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(form.action, {
        method: 'POST', body: data, headers: { Accept: 'application/json' },
        signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer'
      });
      if (!response.ok) {
        const retryLater = response.status === 429;
        throw new Error(retryLater ? 'rate-limit' : 'server-error');
      }
      // A redirected HTML challenge is not proof that Formspree accepted a submission.
      const result = await response.json();
      // Match Formspree's public client: a successful submission contains `next`.
      // Stay on this page rather than following the returned URL.
      if (!result || typeof result.next !== 'string' || result.errors || result.error) throw new Error('server-error');
      submitted = true;
      form.hidden = true;
      success.hidden = false;
      success.focus();
    } catch (error) {
      const text = error.name === 'AbortError'
        ? '連線逾時，暫時無法確認是否送達。內容已保留，請稍後再試。'
        : error.message === 'rate-limit'
          ? '目前暫時無法接收回饋。內容已保留，請稍後再試。'
          : '回饋未能送出。內容已保留，請確認網路連線後再試一次。';
      showStatus(text, 'error', true);
    } finally {
      window.clearTimeout(timeout);
      sending = false;
      fields.disabled = submitted;
      form.removeAttribute('aria-busy');
      submitLabel.textContent = submitted ? '已送出' : '送出回饋';
    }
  });
  fields.disabled = false;
})();
