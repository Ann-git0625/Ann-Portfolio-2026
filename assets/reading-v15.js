/* Tabs and document-only expansion. No ancestor grids or card widths are changed. */
(()=>{
 const dialog=document.querySelector('#project-dialog'),content=document.querySelector('#dialog-content');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 function selectTab(tab){
  const group=tab.closest('[data-case-tabs]');
  group.querySelectorAll(':scope > .case-tabs [role="tab"]').forEach(button=>{
   const active=button===tab;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;
   group.querySelector('#'+button.getAttribute('aria-controls')).hidden=!active;
  });
 }
 content.addEventListener('click',event=>{
  const tab=event.target.closest('.case-tabs [role="tab"]');if(tab){selectTab(tab);return;}
  const image=event.target.closest('.case-image-expand');
  if(image){const open=image.getAttribute('aria-expanded')==='true',top=image.getBoundingClientRect().top;image.setAttribute('aria-expanded',String(!open));image.setAttribute('aria-label',open?'展開文件圖片':'收合文件圖片');if(open&&top<100)image.scrollIntoView({block:'start',behavior:'instant'});return;}
  const link=event.target.closest('.editorial-case:not(.hz-case) a[href^="#"]');
  if(link){const target=content.querySelector(link.getAttribute('href'));if(target){event.preventDefault();event.stopImmediatePropagation();dialog.scrollTo({top:dialog.scrollTop+target.getBoundingClientRect().top-dialog.getBoundingClientRect().top-118,behavior:reduced.matches?'auto':'smooth'});}}
 });
 content.addEventListener('keydown',event=>{
  const tab=event.target.closest('.case-tabs [role="tab"]');if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  event.preventDefault();const tabs=[...tab.parentElement.querySelectorAll('[role="tab"]')],current=tabs.indexOf(tab);
  const index=event.key==='Home'?0:event.key==='End'?tabs.length-1:(current+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
  selectTab(tabs[index]);tabs[index].focus({preventScroll:true});tabs[index].scrollIntoView({block:'nearest',inline:'nearest'});
 });
 let observer;
 new MutationObserver(()=>{
  observer?.disconnect();const chapters=content.querySelectorAll('.editorial-overview,.editorial-chapter');if(!chapters.length)return;
  observer=new IntersectionObserver(entries=>{const entry=entries.filter(e=>e.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top)[0];if(!entry)return;content.querySelectorAll('.editorial-nav a').forEach(a=>{if(a.hash==='#'+entry.target.id)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});},{root:dialog,rootMargin:'-125px 0px -50% 0px',threshold:0});chapters.forEach(e=>observer.observe(e));
 }).observe(content,{childList:true});
 dialog.addEventListener('close',()=>observer?.disconnect());
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
    copy.textContent = entry[1] + entry[2];
  }
  new MutationObserver(sync).observe(explorer, {attributes:true, attributeFilter:['data-stage']});
  sync();
})();
