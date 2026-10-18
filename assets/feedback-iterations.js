/* Independent of the existing feedback form and submission logic. */
(() => {
  'use strict';
  const region = document.querySelector('.portfolio-iterations');
  if (!region) return;
  const panels = [...region.querySelectorAll('.iteration-panel')];
  const navigation = region.querySelector('.iteration-navigation');
  const dots = [...navigation.querySelectorAll('[data-iteration-index]')];
  const status = region.querySelector('[data-iteration-status]');
  let current = 0;
  const feedbackColumn = document.querySelector('.feedback-column');
  let fitFrame;
  const fitComparison = () => {
    cancelAnimationFrame(fitFrame);
    fitFrame = requestAnimationFrame(() => {
      if (matchMedia('(max-width: 960px)').matches) {
        region.style.removeProperty('--iteration-image-height');
        return;
      }
      const imageButton = panels[current].querySelector('.iteration-image-button');
      const available = feedbackColumn.getBoundingClientRect().height;
      const otherContent = region.getBoundingClientRect().height - imageButton.getBoundingClientRect().height;
      // Match the feedback column's lower edge, including on wider screens.
      const height = Math.max(160, available - otherContent);
      const value = `${height}px`;
      if (region.style.getPropertyValue('--iteration-image-height') !== value) {
        region.style.setProperty('--iteration-image-height', value);
      }
    });
  };

  const show = (index, announce = true) => {
    const focusedControl = navigation.contains(document.activeElement) ? document.activeElement : null;
    current = (index + panels.length) % panels.length;
    // Move controls before hiding the old panel so keyboard focus is retained.
    panels[current].hidden = false;
    panels[current].insertBefore(navigation, panels[current].querySelector('.iteration-notes'));
    panels.forEach((panel, i) => { panel.hidden = i !== current; });
    dots.forEach((dot, i) => dot.setAttribute('aria-current', String(i === current)));
    if (focusedControl) focusedControl.focus({ preventScroll: true });
    if (announce) status.textContent = `第 ${current + 1} 組，共 ${panels.length} 組：${panels[current].dataset.title}`;
    fitComparison();
  };
  navigation.querySelector('[data-iteration-prev]').addEventListener('click', () => show(current - 1));
  navigation.querySelector('[data-iteration-next]').addEventListener('click', () => show(current + 1));
  dots.forEach((dot,i) => dot.addEventListener('click', () => show(i)));
  navigation.addEventListener('keydown', event => {
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault();
    show(event.key === 'Home' ? 0 : event.key === 'End' ? panels.length - 1 : current + (event.key === 'ArrowRight' ? 1 : -1));
    dots[current].focus({ preventScroll: true });
  });
  navigation.hidden = false;
  show(0, false);
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(fitComparison);
    observer.observe(feedbackColumn);
    observer.observe(region);
  }
  window.addEventListener('resize', fitComparison, { passive: true });
  if (document.fonts?.ready) document.fonts.ready.then(fitComparison);

  const dialog = document.querySelector('.iteration-dialog');
  const image = dialog.querySelector('img');
  const scroll = dialog.querySelector('.iteration-dialog-scroll');
  const original = dialog.querySelector('[data-iteration-original]');
  const close = dialog.querySelector('[data-iteration-close]');
  let opener;
  region.querySelectorAll('[data-image]').forEach(button => {
    button.addEventListener('click', () => {
      opener = button;
      image.src = button.dataset.image;
      image.alt = button.dataset.imageTitle;
      dialog.querySelector('h2').textContent = button.dataset.imageTitle;
      scroll.classList.remove('is-original');
      original.setAttribute('aria-pressed','false');
      window.PortfolioDialog.open(dialog);
      scroll.scrollTo(0,0);
      close.focus({ preventScroll: true });
    });
  });
  original.addEventListener('click', () => {
    const active = scroll.classList.toggle('is-original');
    original.setAttribute('aria-pressed',String(active));
  });
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    opener?.focus({ preventScroll: true });
  });
})();
