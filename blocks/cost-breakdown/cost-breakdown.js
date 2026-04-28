import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

function getField(parent, prop) {
  return parent?.querySelector(`[data-aue-prop="${prop}"]`);
}

function buildItem(label, amount, isBold) {
  const li = document.createElement('li');
  li.className = 'cost-breakdown-item';
  if (isBold) li.classList.add('cost-breakdown-item-bold');

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
  const row = block.firstElementChild;
  const cols = [...row.children];

  // Col 0 = image, Col 1 = content
  const imageCol = cols.find((c) => c.querySelector('picture')) || cols[0];
  const contentCol = cols.find((c) => !c.querySelector('picture')) || cols[1];

  block.textContent = '';

  // --- Image ---
  const imageEl = document.createElement('div');
  imageEl.className = 'cost-breakdown-image';
  if (imageCol) {
    moveInstrumentation(imageCol, imageEl);
    const pic = imageCol.querySelector('picture');
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
  if (contentCol) moveInstrumentation(contentCol, contentEl);

  // Heading — from data-aue-prop or first heading element
  const headingField = getField(contentCol, 'heading');
  const headingText = headingField?.textContent.trim()
    || contentCol?.querySelector('h2,h3,h4,h5,h6')?.textContent.trim();
  if (headingText) {
    const h = document.createElement('h2');
    h.className = 'cost-breakdown-heading';
    h.textContent = headingText;
    contentEl.append(h);
  }

  // Line items — from UE container (data-aue-prop="items" children)
  // or from table rows in the content column
  const itemsContainer = getField(contentCol, 'items');
  const itemsEl = document.createElement('ul');
  itemsEl.className = 'cost-breakdown-items';
  let liveTotalRow = null;

  if (itemsContainer) {
    // UE structured: each child is an item with label + amount props
    [...itemsContainer.children].forEach((item) => {
      moveInstrumentation(item, item);
      const label = item.querySelector('[data-aue-prop="label"]')?.textContent.trim()
        || item.children[0]?.textContent.trim();
      const amount = item.querySelector('[data-aue-prop="amount"]')?.textContent.trim()
        || item.children[1]?.textContent.trim();
      if (!label && !amount) return;
      const li = buildItem(label, amount, false);
      moveInstrumentation(item, li);
      itemsEl.append(li);
    });
  } else {
    // Live page fallback: rows are <p> elements with pipe-separated "label | amount"
    // or <table> rows, or adjacent <p> pairs
    const rows = [...(contentCol?.querySelectorAll('p') || [])].filter((p) => {
      const text = p.textContent.trim();
      return text && !p.querySelector('h1,h2,h3,h4,h5,h6')
        && p !== contentCol?.querySelector('h1,h2,h3,h4,h5,h6')?.closest('p');
    });

    rows.forEach((p) => {
      const text = p.textContent.trim();
      if (!text) return;
      // Pipe-separated: "Transportation to hospital | $300"
      const parts = text.split('|').map((s) => s.trim());
      if (parts.length === 2) {
        const isBold = p.querySelector('strong');
        if (isBold) {
          // Bold pipe row is the total — capture it, don't add to list
          liveTotalRow = { label: parts[0], amount: parts[1] };
        } else {
          const li = buildItem(parts[0], parts[1], false);
          itemsEl.append(li);
        }
      }
    });
  }

  contentEl.append(itemsEl);

  // Total row — from data-aue-prop (UE) or last bold pipe row (live page)
  const totalLabel = getField(contentCol, 'totalLabel')?.textContent.trim() || liveTotalRow?.label;
  const totalAmount = getField(contentCol, 'totalAmount')?.textContent.trim() || liveTotalRow?.amount;
  if (totalLabel && totalAmount) {
    // Use <div> not <li> so it is not an orphan list item outside the <ul>
    const totalEl = document.createElement('div');
    totalEl.className = 'cost-breakdown-total';
    const totalLabelEl = document.createElement('span');
    totalLabelEl.className = 'cost-breakdown-label';
    totalLabelEl.textContent = totalLabel;
    const totalAmountEl = document.createElement('span');
    totalAmountEl.className = 'cost-breakdown-amount';
    totalAmountEl.textContent = totalAmount;
    totalEl.append(totalLabelEl, totalAmountEl);
    contentEl.append(totalEl);
  }

  block.append(imageEl, contentEl);
}
