(() => {
  const content = document.querySelector('#dialog-content');
  const dialog = document.querySelector('#project-dialog');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let observer;
  function selectStep(button) {
    content.querySelectorAll('[data-hz-step]').forEach(tab => {
      const selected = tab === button;
      tab.setAttribute('aria-selected',String(selected));
      tab.tabIndex = selected ? 0 : -1;
      content.querySelector('#'+tab.getAttribute('aria-controls')).hidden = !selected;
    });
  }
  content.addEventListener('click', event => {
    const step = event.target.closest('[data-hz-step]');
    if (step) selectStep(step);
    const floor = event.target.closest('[data-hz-floor]');
    if (floor) {
      content.querySelectorAll('[data-hz-floor]').forEach(button => button.setAttribute('aria-pressed',String(button===floor)));
      content.querySelector('.hz-floor-result').textContent = `目前選取：${floor.dataset.hzFloor}。選取色會持續保留。`;
    }
    const poster = event.target.closest('[data-hz-video]');
    if (poster) {
      const frame = document.createElement('iframe');
      frame.className = 'hz-video-frame';
      frame.title = poster.getAttribute('aria-label');
      frame.dataset.caseVideo = '';
      frame.src = `https://www.youtube-nocookie.com/embed/${poster.dataset.hzVideo}?autoplay=1&playsinline=1&rel=0`;
      frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      frame.allowFullscreen = true;
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      poster.replaceWith(frame);
      frame.focus();
    }
    const internal = event.target.closest('.hz-case a[href^="#hz-"]');
    if (internal && !internal.closest('.risk-case-nav')) {
      event.preventDefault();
      const target = content.querySelector(internal.getAttribute('href'));
      if (target) dialog.scrollTo({top:dialog.scrollTop+target.getBoundingClientRect().top-dialog.getBoundingClientRect().top-118,behavior:reduced.matches?'auto':'smooth'});
    }
  });
  content.addEventListener('keydown', event => {
    const tab = event.target.closest('[data-hz-step]');
    if (!tab || !['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault();
    const tabs = [...content.querySelectorAll('[data-hz-step]')];
    let index = tabs.indexOf(tab);
    if(event.key==='Home') index=0;
    else if(event.key==='End') index=tabs.length-1;
    else index=(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
    selectStep(tabs[index]); tabs[index].focus();
  });
  new MutationObserver(() => {
    observer?.disconnect();
    const sections = content.querySelectorAll('.hz-case section[id]');
    if(!sections.length) return;
    observer = new IntersectionObserver(entries => {
      const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top);
      if(!visible.length) return;
      content.querySelectorAll('.hz-case-nav a').forEach(a=>{
        if(a.hash==='#'+visible[0].target.id) a.setAttribute('aria-current','location');
        else a.removeAttribute('aria-current');
      });
    },{root:dialog,rootMargin:'-125px 0px -50% 0px',threshold:0});
    sections.forEach(s=>observer.observe(s));
  }).observe(content,{childList:true});
  dialog.addEventListener('close',()=>observer?.disconnect());
  if(location.hash==='#shift') document.querySelector('#about').scrollIntoView();
})();
