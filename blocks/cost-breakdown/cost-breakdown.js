import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

function buildItem(label, amount) {
  const li = document.createElement('li');
  li.className = 'cost-breakdown-item';
  const labelEl = document.createElement('span');
  labelEl.className = 'cost-breakdown-label';
  labelEl.textContent = label;
  const amountEl = document.createElement('span');
  amountEl.className = 'cost-breakdown-amount';
  amountEl.textContent = amount;
  li.append(labelEl, amountEl);
  return li;
}

export default function decorate(block) {
  const rows = [...block.children];

  // Detect mode: UE sets data-aue-prop on cells; live page has no such attributes.
  const isUEMode = rows.some((r) => [...r.children].some((c) => c.dataset.aueProp));

  let imageCell;
  let headingCell;
  let totalLabelCell;
  let totalAmountCell;
  let variantCell;
  const lineItemRows = [];

  if (isUEMode) {
    // In UE: parent fields are single cells with known data-aue-prop names.
    // Child item rows have cells with data-aue-prop "label" / "amount".
    rows.forEach((row) => {
      const prop = row.firstElementChild?.dataset?.aueProp;
      if (prop === 'image') imageCell = row.firstElementChild;
      else if (prop === 'heading') headingCell = row.firstElementChild;
      else if (prop === 'totalLabel') totalLabelCell = row.firstElementChild;
      else if (prop === 'totalAmount') totalAmountCell = row.firstElementChild;
      else if (prop === 'variant') variantCell = row.firstElementChild;
      else lineItemRows.push(row);
    });
  } else {
    // Live page: single-cell rows are parent fields; two-cell rows are line items.
    const singleCellRows = rows.filter((r) => r.children.length === 1);
    rows.filter((r) => r.children.length >= 2).forEach((r) => lineItemRows.push(r));

    const imageRow = singleCellRows.find((r) => r.querySelector('picture'));
    imageCell = imageRow?.firstElementChild;

    const variantRow = singleCellRows.find((r) => ['default', 'dividers'].includes(r.textContent.trim()));
    variantCell = variantRow?.firstElementChild;

    const textRows = singleCellRows
      .filter((r) => r !== imageRow && r !== variantRow)
      .map((r) => r.firstElementChild);
    [headingCell, totalLabelCell, totalAmountCell] = textRows;
  }

  // Apply variant class before clearing DOM
  const variantVal = variantCell?.textContent.trim();
  if (variantVal && variantVal !== 'default') block.classList.add(variantVal);

  block.textContent = '';

  // --- Image ---
  const imageEl = document.createElement('div');
  imageEl.className = 'cost-breakdown-image';
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
  contentEl.className = 'cost-breakdown-content';

  if (headingCell?.textContent.trim()) {
    const h = document.createElement('h2');
    h.className = 'cost-breakdown-heading';
    moveInstrumentation(headingCell, h);
    h.textContent = headingCell.textContent.trim();
    contentEl.append(h);
  }

  const itemsEl = document.createElement('ul');
  itemsEl.className = 'cost-breakdown-items';

  lineItemRows.forEach((row) => {
    const labelCell = [...row.children].find((c) => c.dataset.aueProp === 'label') || row.children[0];
    const amountCell = [...row.children].find((c) => c.dataset.aueProp === 'amount') || row.children[1];
    const label = labelCell?.textContent.trim();
    const amount = amountCell?.textContent.trim();
    if (!label && !amount) return;
    const li = buildItem(label || '', amount || '');
    moveInstrumentation(row, li);
    itemsEl.append(li);
  });

  contentEl.append(itemsEl);

  // Total row
  const totalLabel = totalLabelCell?.textContent.trim();
  const totalAmount = totalAmountCell?.textContent.trim();
  if (totalLabel || totalAmount) {
    const totalEl = document.createElement('div');
    totalEl.className = 'cost-breakdown-total';
    const totalLabelEl = document.createElement('span');
    totalLabelEl.className = 'cost-breakdown-label';
    totalLabelEl.textContent = totalLabel || '';
    const totalAmountEl = document.createElement('span');
    totalAmountEl.className = 'cost-breakdown-amount';
    totalAmountEl.textContent = totalAmount || '';
    totalEl.append(totalLabelEl, totalAmountEl);
    contentEl.append(totalEl);
  }

  block.append(imageEl, contentEl);

  // In UE mode, re-append original child item rows so UE content tree
  // can find them after block.textContent cleared them from the DOM.
  if (isUEMode) {
    lineItemRows.forEach((row) => block.append(row));
  }
}
