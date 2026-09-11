const dialog = document.querySelector('#project-dialog');
const dialogContent = document.querySelector('#dialog-content');
const closeDialog = document.querySelector('.dialog-close');
let lastTrigger = null;

function openProject(project, trigger) {
  const template = document.querySelector(`#project-${project}`);
  if (!template) return;
  lastTrigger = trigger;
  dialogContent.replaceChildren(template.content.cloneNode(true));
  dialog.showModal();
  closeDialog.focus();
}

document.querySelectorAll('.project-open').forEach((button) => {
  button.addEventListener('click', () => openProject(button.dataset.project, button));
});

function closeProject() {
  dialog.close();
  if (lastTrigger) lastTrigger.focus();
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
