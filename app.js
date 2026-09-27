const dialog = document.querySelector('#project-dialog');
const dialogContent = document.querySelector('#dialog-content');
const closeDialog = document.querySelector('.dialog-close');
let lastTrigger = null;
let disposeProjectBrief = () => {};

function openProject(project, trigger) {
  const template = document.querySelector(`#project-${project}`);
  if (!template) return;
  lastTrigger = trigger;
  disposeProjectBrief();
  releaseCaseVideos();
  dialogContent.replaceChildren(template.content.cloneNode(true));
  disposeProjectBrief = window.initProjectBrief(dialogContent, project);
  dialog.showModal();
  dialog.scrollTop = 0;
  closeDialog.focus();
}

document.querySelectorAll('.project-open').forEach((button) => {
  button.addEventListener('click', () => openProject(button.dataset.project, button));
});

function closeProject() {
  disposeProjectBrief();
  releaseCaseVideos();
  dialog.close();
  if (lastTrigger) lastTrigger.focus();
}

// Unload embedded players when switching or closing a case to stop audio/video.
function releaseCaseVideos() {
  dialogContent.querySelectorAll('iframe[data-case-video]').forEach(frame => {
    frame.src = 'about:blank';
  });
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
  if (event.target.closest('.case-return')) { closeProject(); return; }
  const chapter = event.target.closest('.risk-case-nav a');
  if (chapter) {
    const target = dialogContent.querySelector(chapter.getAttribute('href'));
    if (target) {
      event.preventDefault();
      dialog.scrollTo({
        top: dialog.scrollTop + target.getBoundingClientRect().top - dialog.getBoundingClientRect().top - 60,
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
      });
    }
    return;
  }
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

// Delegation covers Hanazono, spreadsheet, and Figma images cloned from case templates.
const hanazonoLightbox = document.querySelector('#hanazono-lightbox');
const hanazonoLightboxImage = document.querySelector('#hanazono-lightbox-image');
let activeHanazonoTrigger = null;
dialogContent.addEventListener('click', (event) => {
  const trigger = event.target.closest('.hanazono-image-open, .prototype-image-open');
  if (!trigger) return;
  const source = trigger.querySelector('img');
  activeHanazonoTrigger = trigger;
  hanazonoLightboxImage.src = source.currentSrc || source.src;
  hanazonoLightboxImage.alt = source.alt;
  hanazonoLightbox.setAttribute('aria-label', source.alt || '作品集圖片放大檢視');
  hanazonoLightbox.showModal();
});
hanazonoLightbox.addEventListener('click', () => hanazonoLightbox.close());
hanazonoLightbox.addEventListener('close', () => {
  hanazonoLightboxImage.removeAttribute('src');
  hanazonoLightboxImage.alt = '';
  activeHanazonoTrigger?.focus({ preventScroll: true });
  activeHanazonoTrigger = null;
});

// About Ann: mouse leaves the whole playground, not the moving button.
(() => {
  const area = document.querySelector('.ann-playground');
  const button = area?.querySelector('.ann-runaway');
  if (!button) return;
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
    button.textContent = 'Ａｎｎ在這！';
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

// Research images open above the case and restore focus when closed.
const researchLightbox = document.querySelector('#research-lightbox');
const researchLightboxImage = document.querySelector('#research-lightbox-image');
let activeResearchTrigger = null;
dialogContent.addEventListener('click', event => {
  const trigger = event.target.closest('.research-image-open');
  if (!trigger) return;
  activeResearchTrigger = trigger;
  const isOverview = trigger.classList.contains('research-overview-open');
  researchLightbox.classList.toggle('is-overview', isOverview);
  researchLightbox.classList.toggle('is-diagram', trigger.classList.contains('research-diagram-open'));
  if (!isOverview) {
    const source = trigger.querySelector('img');
    researchLightboxImage.src = source.currentSrc || source.src;
    researchLightboxImage.alt = source.alt;
  }
  researchLightbox.showModal();
  researchLightbox.scrollTop = 0;
});
researchLightbox.addEventListener('click', () => researchLightbox.close());
researchLightbox.addEventListener('close', () => {
  researchLightbox.classList.remove('is-overview', 'is-diagram');
  researchLightboxImage.removeAttribute('src');
  researchLightboxImage.alt = '';
  if (activeResearchTrigger?.isConnected) activeResearchTrigger.focus({ preventScroll: true });
});
