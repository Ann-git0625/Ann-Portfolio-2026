/* Separate archive lightbox; the main case viewer and its image controls are untouched. */
(() => {
  const archive = document.querySelector('#visual');
  const dialog = document.querySelector('#visual-art-dialog');
  if (!archive || !dialog) return;
  const items = [...archive.querySelectorAll('.archive-image-open')];
  const stage = dialog.querySelector('.archive-lightbox-stage');
  const title = dialog.querySelector('#archive-art-title');
  const counter = dialog.querySelector('[data-archive-counter]');
  let current = 0;
  let origin = null;
  let originalOverflow = '';
  const render = () => {
    const item = items[current];
    const thumbnail = item.querySelector('img');
    const caption = item.closest('figure').querySelector('figcaption');
    const project = item.closest('figure').querySelector('.archive-project-images');
    title.textContent = caption?.textContent || thumbnail.alt;
    counter.textContent = `${String(current + 1).padStart(2, '0')} / ${items.length}`;
    stage.classList.toggle('is-project', Boolean(project));
    stage.classList.remove('is-long');
    if (project) {
      stage.replaceChildren(project.content.cloneNode(true));
    } else {
      const image = document.createElement('img');
      const useScrollLayout = ratio => item.dataset.archiveLayout === 'scroll' || ratio > 1.8;
      image.alt = thumbnail.alt;
      image.decoding = 'async';
      image.addEventListener('load', () => {
        if (stage.contains(image)) {
          stage.classList.toggle('is-long', useScrollLayout(image.naturalHeight / image.naturalWidth));
        }
      });
      image.src = item.dataset.archiveSrc;
      stage.classList.toggle('is-long', useScrollLayout(Number(thumbnail.getAttribute('height')) / Number(thumbnail.getAttribute('width'))));
      stage.replaceChildren(image);
    }
    stage.scrollTop = 0;
    stage.scrollLeft = 0;
  };
  const navigate = direction => {
    current = (current + direction + items.length) % items.length;
    render();
  };
  items.forEach((item,index) => item.addEventListener('click', () => {
    current = index;
    origin = item;
    render();
    originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    // Reset after the dialog is visible so reopening always starts at the overview.
    stage.scrollTop = 0;
    stage.scrollLeft = 0;
    dialog.querySelector('[data-archive-close]').focus({preventScroll:true});
  }));
  dialog.querySelector('[data-archive-prev]').addEventListener('click', () => navigate(-1));
  dialog.querySelector('[data-archive-next]').addEventListener('click', () => navigate(1));
  dialog.querySelector('[data-archive-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target === dialog) {
      const rect=dialog.getBoundingClientRect();
      if(event.clientX<rect.left || event.clientX>rect.right || event.clientY<rect.top || event.clientY>rect.bottom) dialog.close();
    }
  });
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight') {event.preventDefault();navigate(1);}
    if (event.key === 'ArrowLeft') {event.preventDefault();navigate(-1);}
  });
  dialog.addEventListener('close', () => {
    // Unmount embedded players so audio stops when the project closes.
    stage.replaceChildren();
    document.body.style.overflow = originalOverflow;
    origin?.focus({preventScroll:true});
  });
})();

