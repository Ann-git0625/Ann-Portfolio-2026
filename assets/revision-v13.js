/* Inline image expansion is shared by every case and the visual archive. */
(() => {
  const dialog = document.querySelector('#project-dialog');
  const content = document.querySelector('#dialog-content');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const restore = new WeakMap();
  function toggleImage(button) {
    const expanded = button.getAttribute('aria-expanded') === 'true';
    const figure = button.closest('figure');
    const before = button.getBoundingClientRect().top;
    const scrollRoot = button.closest('#project-dialog') || document.scrollingElement;
    if (!expanded) {
      const modified = [];
      let node = button.parentElement;
      while (node && !node.matches('.editorial-case,.hz-case,.visual-category,.visual-archive')) {
        if (getComputedStyle(node).display === 'grid') { node.classList.add('inline-expanded-grid'); modified.push([node,'inline-expanded-grid']); }
        if (node.parentElement && getComputedStyle(node.parentElement).display === 'grid') {node.classList.add('inline-expand-ancestor');modified.push([node,'inline-expand-ancestor']);}
        node = node.parentElement;
      }
      restore.set(button,modified);
      if (button.dataset.fullSrc) {
        const img=button.querySelector('img');
        if (img) {img.dataset.previewSrc=img.getAttribute('src');img.src=button.dataset.fullSrc;}
      }
    } else {
      (restore.get(button)||[]).forEach(([node,className])=>node.classList.remove(className));
      restore.delete(button);
    }
    button.setAttribute('aria-expanded',String(!expanded));
    const label=button.dataset.imageLabel || button.querySelector('img')?.alt || '圖片';
    button.setAttribute('aria-label',`${expanded?'展開完整圖片':'收合圖片'}：${label}`);
    const related=button.closest('.hz-flow-art')?.querySelector('.inline-document-toggle');
    if(related){related.setAttribute('aria-expanded',String(!expanded));related.textContent=expanded?'展開完整圖片 ＋':'收合圖片 −';}
    figure?.classList.toggle('is-expanded',!expanded);
    // Keep the clicked image in place when an expanded grid returns to columns.
    if (expanded) scrollRoot.scrollTop += button.getBoundingClientRect().top - before;
  }
  document.addEventListener('click',event=>{
    const image=event.target.closest('.inline-image-toggle');
    if (image) {event.preventDefault();event.stopImmediatePropagation();toggleImage(image);return;}
    const documentButton=event.target.closest('.inline-document-toggle');
    if (documentButton) {
      event.preventDefault();event.stopImmediatePropagation();
      const associated=documentButton.closest('.hz-flow-art')?.querySelector('.inline-image-toggle');
      if(associated){toggleImage(associated);return;}
      let view=documentButton.nextElementSibling;
      if (!view?.classList.contains('inline-document-view')) {
        view=document.createElement('div');view.className='inline-document-view';
        const img=document.createElement('img');img.src=documentButton.dataset.documentSrc;img.alt=documentButton.textContent;view.append(img);documentButton.after(view);
      }
      const expanded=documentButton.getAttribute('aria-expanded')==='true';
      documentButton.setAttribute('aria-expanded',String(!expanded));view.hidden=expanded;
      return;
    }
    const anchor=event.target.closest('.editorial-case a[href^="#"]');
    if(anchor && !anchor.closest('.hz-case')) {
      const target=content.querySelector(anchor.getAttribute('href'));
      if(target){event.preventDefault();event.stopImmediatePropagation();dialog.scrollTo({top:dialog.scrollTop+target.getBoundingClientRect().top-dialog.getBoundingClientRect().top-118,behavior:reduced.matches?'auto':'smooth'});}
    }
  },true);
  let chapterObserver;
  new MutationObserver(()=>{
    chapterObserver?.disconnect();
    const chapters=content.querySelectorAll('.editorial-overview,.editorial-chapter');
    if(!chapters.length) return;
    chapterObserver=new IntersectionObserver(entries=>{
      const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top)[0];
      if(!visible) return;
      content.querySelectorAll('.editorial-nav a').forEach(a=>{
        if(a.hash==='#'+visible.target.id)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');
      });
    },{root:dialog,rootMargin:'-125px 0px -50% 0px',threshold:0});
    chapters.forEach(section=>chapterObserver.observe(section));
  }).observe(content,{childList:true});
  dialog.addEventListener('close',()=>chapterObserver?.disconnect());
})();

/* Peripheral captions follow the existing three-stage renderer. */
(() => {
  const hero = document.querySelector('.hero-studio');
  const explorer = hero?.querySelector('.hero-explorer');
  if (!explorer) return;
  const labels = {
    question: ['01 / QUESTION', '整理線索，', '看見真正的問題。'],
    structure: ['02 / STRUCTURE', '連結資訊，', '建立可理解的結構。'],
    design: ['03 / DESIGN', '讓下一步，', '成為可使用的體驗。']
  };
  function sync() {
    const entry = labels[explorer.dataset.stage] || labels.question;
    hero.querySelector('.hero-stage-index').textContent = entry[0];
    const copy = hero.querySelector('.hero-stage-copy');
    copy.replaceChildren(document.createTextNode(entry[1]), document.createElement('br'), document.createTextNode(entry[2]));
  }
  new MutationObserver(sync).observe(explorer, {attributes:true, attributeFilter:['data-stage']});
  sync();
})();
