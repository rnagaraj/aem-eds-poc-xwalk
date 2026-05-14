import { moveInstrumentation } from '../../scripts/scripts.js';

function openModal(block) {
  block.removeAttribute('hidden');
  block.querySelector('.modal-dialog')?.focus();
  document.body.style.overflow = 'hidden';
}

function closeModal(block) {
  block.setAttribute('hidden', '');
  document.body.style.overflow = '';
}

function ensureGlobalListener() {
  if (window.modalListenerAdded) return;
  window.modalListenerAdded = true;

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const name = link.getAttribute('href').slice(1);
    const modal = document.querySelector(`.modal[data-modal-name="${name}"]`);
    if (modal) {
      e.preventDefault();
      openModal(modal);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal:not([hidden])').forEach((m) => closeModal(m));
    }
  });
}

export default function decorate(block) {
  const rows = [...block.children];
  const isUEMode = rows.some((r) => [...r.children].some((c) => c.dataset.aueProp));

  let nameCell;
  let leftCell;
  let rightCell;

  if (isUEMode) {
    rows.forEach((row) => {
      const prop = row.firstElementChild?.dataset?.aueProp;
      if (prop === 'name') nameCell = row.firstElementChild;
      else if (prop === 'contentLeft') leftCell = row.firstElementChild;
      else if (prop === 'contentRight') rightCell = row.firstElementChild;
    });
  } else {
    [nameCell, leftCell, rightCell] = rows.map((r) => r.firstElementChild);
  }

  const name = nameCell?.textContent.trim();
  if (name) block.dataset.modalName = name;

  // --- Content ---
  const contentEl = document.createElement('div');
  contentEl.className = 'modal-content';

  const leftEl = document.createElement('div');
  leftEl.className = 'modal-content-left';
  if (leftCell) {
    moveInstrumentation(leftCell, leftEl);
    while (leftCell.firstChild) leftEl.append(leftCell.firstChild);
  }

  const rightEl = document.createElement('div');
  rightEl.className = 'modal-content-right';
  if (rightCell) {
    moveInstrumentation(rightCell, rightEl);
    while (rightCell.firstChild) rightEl.append(rightCell.firstChild);
  }

  contentEl.append(leftEl, rightEl);

  // --- Close button ---
  const closeBtn = document.createElement('button');
  closeBtn.className = 'modal-close';
  closeBtn.setAttribute('aria-label', 'Close modal');
  closeBtn.innerHTML = '&times; Close';
  closeBtn.addEventListener('click', () => closeModal(block));

  // --- Dialog ---
  const dialog = document.createElement('div');
  dialog.className = 'modal-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('tabindex', '-1');
  dialog.append(contentEl, closeBtn);

  // --- Overlay ---
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.append(dialog);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal(block);
  });

  if (isUEMode) {
    // Render inline in UE so content is editable without a fixed overlay
    block.classList.add('modal-inline');
    [nameCell, leftCell, rightCell].forEach((cell) => cell?.parentElement?.remove());
    block.prepend(overlay);
  } else {
    block.setAttribute('hidden', '');
    block.textContent = '';
    block.append(overlay);
    ensureGlobalListener();
  }
}
