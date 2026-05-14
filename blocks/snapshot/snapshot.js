import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

function buildItem(label, amount) {
  const li = document.createElement('li');
  li.className = 'snapshot-item';
  const labelEl = document.createElement('span');
  labelEl.className = 'snapshot-label';
  labelEl.textContent = label;
  const amountEl = document.createElement('span');
  amountEl.className = 'snapshot-amount';
  amountEl.textContent = amount;
  li.append(labelEl, amountEl);
  return li;
}

function parseItems(cell) {
  return [...cell.querySelectorAll('p')]
    .map((p) => p.textContent.trim())
    .filter(Boolean)
    .map((line) => {
      const sep = line.indexOf(' | ');
      return sep !== -1
        ? { label: line.slice(0, sep), amount: line.slice(sep + 3) }
        : { label: line, amount: '' };
    });
}

export default function decorate(block) {
  const rows = [...block.children];

  // Detect mode: UE sets data-aue-prop on cells; live page has no such attributes.
  const isUEMode = rows.some((r) => [...r.children].some((c) => c.dataset.aueProp));

  let imageCell;
  let headingCell;
  let itemsCell;
  let totalLabelCell;
  let totalAmountCell;
  let variantCell;

  if (isUEMode) {
    rows.forEach((row) => {
      const prop = row.firstElementChild?.dataset?.aueProp;
      if (prop === 'image') imageCell = row.firstElementChild;
      else if (prop === 'heading') headingCell = row.firstElementChild;
      else if (prop === 'items') itemsCell = row.firstElementChild;
      else if (prop === 'totalLabel') totalLabelCell = row.firstElementChild;
      else if (prop === 'totalAmount') totalAmountCell = row.firstElementChild;
      else if (prop === 'variant') variantCell = row.firstElementChild;
    });
  } else {
    // Live page: all fields are single-cell rows.
    // Items row is identified by containing " | " in its text content.
    const singleCellRows = rows.filter((r) => r.children.length === 1);

    const imageRow = singleCellRows.find((r) => r.querySelector('picture'));
    imageCell = imageRow?.firstElementChild;

    const variantRow = singleCellRows.find((r) => ['default', 'dividers'].includes(r.textContent.trim()));
    variantCell = variantRow?.firstElementChild;

    const itemsRow = singleCellRows.find(
      (r) => r !== imageRow && r !== variantRow && r.textContent.includes(' | '),
    );
    itemsCell = itemsRow?.firstElementChild;

    const textRows = singleCellRows
      .filter((r) => r !== imageRow && r !== variantRow && r !== itemsRow)
      .map((r) => r.firstElementChild);
    [headingCell, totalLabelCell, totalAmountCell] = textRows;
  }

  // Apply variant class before clearing DOM
  const variantVal = variantCell?.textContent.trim();
  if (variantVal && variantVal !== 'default') block.classList.add(variantVal);

  // --- Image ---
  const imageEl = document.createElement('div');
  imageEl.className = 'snapshot-image';
  if (imageCell) {
    moveInstrumentation(imageCell, imageEl);
    const pic = imageCell.querySelector('picture');
    if (pic) {
      const img = pic.querySelector('img');
      if (img.src.endsWith('.svg')) {
        imageEl.append(pic);
      } else {
        const optimized = createOptimizedPicture(img.src, img.alt, false, [{ width: '400' }]);
        moveInstrumentation(img, optimized.querySelector('img'));
        imageEl.append(optimized);
      }
    }
  }

  // --- Content ---
  const contentEl = document.createElement('div');
  contentEl.className = 'snapshot-content';

  if (headingCell?.textContent.trim()) {
    const h = document.createElement('h2');
    h.className = 'snapshot-heading';
    moveInstrumentation(headingCell, h);
    h.textContent = headingCell.textContent.trim();
    contentEl.append(h);
  }

  const itemsEl = document.createElement('ul');
  itemsEl.className = 'snapshot-items';

  if (itemsCell) {
    moveInstrumentation(itemsCell, itemsEl);
    parseItems(itemsCell).forEach(({ label, amount }) => {
      itemsEl.append(buildItem(label, amount));
    });
  }

  contentEl.append(itemsEl);

  // Total row
  const totalLabel = totalLabelCell?.textContent.trim();
  const totalAmount = totalAmountCell?.textContent.trim();
  if (totalLabel || totalAmount) {
    const totalEl = document.createElement('div');
    totalEl.className = 'snapshot-total';
    const totalLabelEl = document.createElement('span');
    totalLabelEl.className = 'snapshot-label';
    totalLabelEl.textContent = totalLabel || '';
    const totalAmountEl = document.createElement('span');
    totalAmountEl.className = 'snapshot-amount';
    totalAmountEl.textContent = totalAmount || '';
    totalEl.append(totalLabelEl, totalAmountEl);
    contentEl.append(totalEl);
  }

  if (isUEMode) {
    [imageCell, headingCell, itemsCell, totalLabelCell, totalAmountCell, variantCell]
      .forEach((cell) => {
      cell?.parentElement?.remove();
    });
    block.prepend(contentEl);
    block.prepend(imageEl);
  } else {
    block.textContent = '';
    block.append(imageEl, contentEl);
  }
}
