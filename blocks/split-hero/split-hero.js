import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

function getCell(rows, prop) {
  const row = rows.find((r) => r.firstElementChild?.dataset.aueProp === prop);
  return row ? row.firstElementChild : null;
}

export default function decorate(block) {
  const rows = [...block.children];
  const isUEMode = rows.some((r) => r.firstElementChild?.dataset.aueProp);

  let imageCell;
  let imagePositionCell;
  let eyebrowCell;
  let titleCell;
  let subtitleCell;
  let descCell;
  let primaryLabelCell;
  let primaryUrlCell;
  let secondaryLabelCell;
  let secondaryUrlCell;

  if (isUEMode) {
    imageCell = getCell(rows, 'image');
    imagePositionCell = getCell(rows, 'imagePosition');
    eyebrowCell = getCell(rows, 'eyebrow');
    titleCell = getCell(rows, 'title');
    subtitleCell = getCell(rows, 'subtitle');
    descCell = getCell(rows, 'description');
    primaryLabelCell = getCell(rows, 'primaryCtaLabel');
    primaryUrlCell = getCell(rows, 'primaryCtaUrl');
    secondaryLabelCell = getCell(rows, 'secondaryCtaLabel');
    secondaryUrlCell = getCell(rows, 'secondaryCtaUrl');
  } else {
    // Live page: empty fields are omitted by AEM, so detect by content type.
    imageCell = rows.find((r) => r.querySelector('picture'))?.firstElementChild;
    const nonImageRows = rows.filter((r) => !r.querySelector('picture'));
    const posRow = nonImageRows.find((r) => ['left', 'image-right'].includes(r.textContent.trim()));
    imagePositionCell = posRow?.firstElementChild;
    const contentRows = nonImageRows.filter((r) => r !== posRow);

    // CTA URL rows contain an <a>; the row immediately before each is the label.
    const ctaUrlIndices = contentRows.reduce((acc, r, i) => {
      if (r.querySelector('a')) acc.push(i);
      return acc;
    }, []);
    const [priUrlIdx, secUrlIdx] = ctaUrlIndices;
    primaryUrlCell = priUrlIdx != null ? contentRows[priUrlIdx]?.firstElementChild : null;
    primaryLabelCell = priUrlIdx > 0 ? contentRows[priUrlIdx - 1]?.firstElementChild : null;
    secondaryUrlCell = secUrlIdx != null ? contentRows[secUrlIdx]?.firstElementChild : null;
    secondaryLabelCell = secUrlIdx > 0 ? contentRows[secUrlIdx - 1]?.firstElementChild : null;

    // Text rows before the first CTA label: eyebrow?(opt) title subtitle?(opt) description?(opt)
    const firstCtaLabelIdx = priUrlIdx != null ? priUrlIdx - 1 : contentRows.length;
    const textRows = contentRows.slice(0, firstCtaLabelIdx);
    [eyebrowCell, titleCell, subtitleCell, descCell] = textRows.map((r) => r.firstElementChild);
  }

  // Apply image-position variant before clearing DOM
  const imagePositionVal = imagePositionCell?.textContent.trim();
  const imageRight = imagePositionVal === 'image-right' || block.classList.contains('image-right');
  if (imageRight) block.classList.add('image-right');

  block.textContent = '';

  // --- Image ---
  const imageEl = document.createElement('div');
  imageEl.className = 'split-hero-image';
  if (imageCell) {
    moveInstrumentation(imageCell, imageEl);
    const pic = imageCell.querySelector('picture');
    if (pic) {
      const img = pic.querySelector('img');
      if (img.src.endsWith('.svg')) {
        imageEl.append(pic);
      } else {
        const optimized = createOptimizedPicture(img.src, img.alt, true, [
          { media: '(min-width: 900px)', width: '800' },
          { width: '480' },
        ]);
        moveInstrumentation(img, optimized.querySelector('img'));
        imageEl.append(optimized);
      }
    }
  }

  // --- Content ---
  const contentEl = document.createElement('div');
  contentEl.className = 'split-hero-content';

  if (eyebrowCell?.textContent.trim()) {
    const p = document.createElement('p');
    p.className = 'split-hero-eyebrow';
    moveInstrumentation(eyebrowCell, p);
    p.textContent = eyebrowCell.textContent.trim();
    contentEl.append(p);
  }

  if (titleCell?.textContent.trim()) {
    const h1 = document.createElement('h1');
    h1.className = 'split-hero-title';
    moveInstrumentation(titleCell, h1);
    h1.textContent = titleCell.textContent.trim();
    contentEl.append(h1);
  }

  if (subtitleCell?.textContent.trim()) {
    const h2 = document.createElement('h2');
    h2.className = 'split-hero-subtitle';
    moveInstrumentation(subtitleCell, h2);
    h2.textContent = subtitleCell.textContent.trim();
    contentEl.append(h2);
  }

  if (descCell?.children.length) {
    const div = document.createElement('div');
    div.className = 'split-hero-description';
    moveInstrumentation(descCell, div);
    while (descCell.firstChild) div.append(descCell.firstChild);
    contentEl.append(div);
  }

  // CTAs
  const primaryLabel = primaryLabelCell?.textContent.trim();
  const primaryUrl = primaryUrlCell?.querySelector('a')?.href
    || primaryUrlCell?.textContent.trim();
  const secondaryLabel = secondaryLabelCell?.textContent.trim();
  const secondaryUrl = secondaryUrlCell?.querySelector('a')?.href
    || secondaryUrlCell?.textContent.trim();

  if (primaryLabel && primaryUrl) {
    const ctaRow = document.createElement('p');
    ctaRow.className = 'split-hero-ctas';

    const primary = document.createElement('a');
    primary.href = primaryUrl;
    primary.textContent = primaryLabel;
    primary.classList.add('split-hero-cta', 'split-hero-cta-primary');
    if (primaryLabelCell) moveInstrumentation(primaryLabelCell, primary);
    ctaRow.append(primary);

    if (secondaryLabel && secondaryUrl) {
      const secondary = document.createElement('a');
      secondary.href = secondaryUrl;
      secondary.textContent = secondaryLabel;
      secondary.classList.add('split-hero-cta', 'split-hero-cta-secondary');
      if (secondaryLabelCell) moveInstrumentation(secondaryLabelCell, secondary);
      ctaRow.append(secondary);
    }

    contentEl.append(ctaRow);
  }

  // --- Assemble ---
  block.append(imageRight ? contentEl : imageEl);
  block.append(imageRight ? imageEl : contentEl);
}
