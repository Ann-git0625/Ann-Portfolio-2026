/* Enhance selected case covers with existing videos, a live tool and document views. */
(() => {
  const content = document.querySelector('#dialog-content');
  const dialog = document.querySelector('#project-dialog');
  if (!content || !dialog) return;

  const cases = {
    hanazono: { name: 'Hanazono', video: 'H39G91j63gg' },
    luma: { name: 'Luma', video: 'uIEOtMg_Pv4' },
    you: { name: 'You', video: 'jTCPePF_uqU' },
    risk: { name: '專案進度與風險管理', demo: 'risk-dashboard.html' },
    learning: {
      name: '學習路徑與團隊知識架構', cover: '文件總覽',
      images: [
        { label: '案件流程', src: 'assets/images-knowledge-EXP.avif', alt: '樣品屋案件：沿著知識架構找到每一步的工作流程' },
        { label: '知識分類', src: 'assets/images-learning-onboarding-guide-06-knowledge-archive.avif', alt: 'UE 團隊知識分類與工作知識清單' }
      ]
    }
  };
  let dispose = () => {};

  function init() {
    dispose();
    const config = cases[content.dataset.project];
    const figure = content.querySelector('.commercial-hero .commercial-showcase');
    if (!config || !figure || figure.classList.contains('hero-preview')) return;
    figure.classList.add('hero-preview');
    const controller = new AbortController();
    const options = { signal: controller.signal };
    const surface = document.createElement('div');
    surface.className = 'hero-preview-surface';
    const original = figure.firstElementChild;
    original.classList.add('hero-preview-original');
    figure.prepend(surface);
    surface.append(original);

    const media = document.createElement('div');
    media.className = 'hero-preview-media';
    media.id = `hero-media-${content.dataset.project}`;
    media.hidden = true;
    surface.append(media);
    const controls = document.createElement('div');
    controls.className = 'hero-preview-controls';
    controls.setAttribute('role', 'group');
    controls.setAttribute('aria-label', `${config.name} 封面互動`);
    figure.append(controls);
    const status = document.createElement('span');
    status.className = 'hero-preview-status';
    status.setAttribute('role', 'status');
    figure.append(status);
    let active = false;
    let imageVersion = 0;

    function button(label, handler) {
      const el = document.createElement('button');
      el.type = 'button';
      el.textContent = label;
      el.setAttribute('aria-controls', media.id);
      el.addEventListener('click', handler, options);
      controls.append(el);
      return el;
    }
    function clearMedia() {
      imageVersion += 1;
      media.querySelectorAll('iframe').forEach(frame => { frame.src = 'about:blank'; });
      media.replaceChildren();
      media.classList.remove('is-document', 'is-video', 'is-demo');
    }
    function showCover(announce = true) {
      clearMedia();
      active = false;
      media.hidden = true;
      original.inert = false;
      original.removeAttribute('aria-hidden');
      figure.classList.remove('is-previewing');
      if (config.images) {
        [...controls.querySelectorAll('button')].forEach((el, i) => el.setAttribute('aria-pressed', String(i === 0)));
      } else {
        start.hidden = false;
        start.setAttribute('aria-expanded', 'false');
        back.hidden = true;
        external.hidden = true;
      }
      status.textContent = announce ? '已返回封面' : '';
    }
    function activate() {
      clearMedia();
      active = true;
      media.hidden = false;
      original.inert = true;
      original.setAttribute('aria-hidden', 'true');
      figure.classList.add('is-previewing');
    }

    let start, back, external;
    if (config.images) {
      button(config.cover, () => showCover()).setAttribute('aria-pressed', 'true');
      config.images.forEach(item => {
        const control = button(item.label, () => {
          activate();
          media.classList.toggle('is-document', content.dataset.project === 'learning');
          if (content.dataset.project === 'learning') {
            media.tabIndex = 0;
            media.setAttribute('role', 'region');
            media.setAttribute('aria-label', `${item.label}，可捲動閱讀`);
          }
          const version = imageVersion;
          const image = new Image();
          image.alt = item.alt;
          image.decoding = 'async';
          image.addEventListener('error', () => {
            if (version !== imageVersion) return;
            showCover(false);
            status.textContent = '圖片暫時無法載入，已返回封面。';
          }, { once: true, signal: controller.signal });
          image.src = item.src;
          media.append(image);
          [...controls.querySelectorAll('button')].forEach(el => el.setAttribute('aria-pressed', String(el === control)));
          status.textContent = `目前檢視：${item.label}`;
        });
        control.setAttribute('aria-pressed', 'false');
      });
    } else {
      start = button(config.video ? '▶ 播放示範' : '↗ 開始互動', () => {
        activate();
        media.classList.add(config.video ? 'is-video' : 'is-demo');
        const frame = document.createElement('iframe');
        frame.title = `${config.name}${config.video ? '示範影片' : '互動試算表'}`;
        frame.dataset.caseVideo = '';
        frame.referrerPolicy = 'strict-origin-when-cross-origin';
        if (config.video) {
          frame.src = `https://www.youtube-nocookie.com/embed/${config.video}?autoplay=1&playsinline=1&rel=0`;
          frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
          frame.allowFullscreen = true;
        } else {
          frame.src = config.demo;
        }
        media.append(frame);
        start.hidden = true;
        start.setAttribute('aria-expanded', 'true');
        back.hidden = false;
        external.hidden = false;
        back.focus({ preventScroll: true });
        status.textContent = config.video ? '示範影片已開啟；也可另開影片觀看。' : '互動試算表已開啟，可搜尋、切換工作表及編輯示例資料。';
      });
      start.setAttribute('aria-expanded', 'false');
      back = button('← 返回封面', () => {
        showCover();
        start.focus({ preventScroll: true });
      });
      back.hidden = true;
      external = document.createElement('a');
      external.href = config.video ? `https://www.youtube.com/watch?v=${config.video}` : config.demo;
      external.textContent = config.video ? '另開影片 ↗' : '完整操作 ↗';
      external.target = '_blank';
      external.rel = 'noopener';
      external.hidden = true;
      controls.append(external);
    }

    // Keep media from continuing after the reader moves away or closes a case.
    const observer = new IntersectionObserver(entries => {
      if (!config.images && active && !entries[0].isIntersecting) showCover(false);
    }, { root: dialog, threshold: 0 });
    observer.observe(surface);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && !config.images && active) showCover(false);
    }, options);
    dispose = () => {
      clearMedia();
      observer.disconnect();
      controller.abort();
      dispose = () => {};
    };
  }

  new MutationObserver(init).observe(content, { childList: true });
  dialog.addEventListener('close', () => dispose());
  if (dialog.open) init();
})();
