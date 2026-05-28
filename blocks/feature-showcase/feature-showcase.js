import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Resolves CTA URL from a cell.
 * AEM auto-links text field values as <a> on the live page.
 * Falls back to raw text content for hash anchors or plain paths.
 */
function resolveCtaUrl(cell) {
  if (!cell) return null;
  const anchor = cell.querySelector('a');
  if (anchor) return anchor.getAttribute('href') || anchor.href;
  return cell.textContent.trim() || null;
}

export default function decorate(block) {
  const rows = [...block.children];
  const isUEMode = rows.some((r) => [...r.children].some((c) => c.dataset.aueProp));

  let imageCell;
  let eyebrowCell;
  let headingCell;
  let bodyCell;
  let ctaLabelCell;
  let ctaUrlCell;

  if (isUEMode) {
    // Universal Editor: every field exposes data-aue-prop — find by name.
    rows.forEach((row) => {
      const prop = row.firstElementChild?.dataset?.aueProp;
      if (prop === 'image') imageCell = row.firstElementChild;
      else if (prop === 'eyebrow') eyebrowCell = row.firstElementChild;
      else if (prop === 'heading') headingCell = row.firstElementChild;
      else if (prop === 'body') bodyCell = row.firstElementChild;
      else if (prop === 'ctaLabel') ctaLabelCell = row.firstElementChild;
      else if (prop === 'ctaUrl') ctaUrlCell = row.firstElementChild;
    });
  } else {
    // Live page: imageAlt is absorbed into <img alt> — not a row.
    // style (multiselect) becomes a CSS class — not a row.
    // All other fields render as rows, even when empty.
    // Use content-type signals to identify each row without relying on position.
    const cells = rows
      .filter((r) => r.children.length === 1)
      .map((r) => r.firstElementChild);

    // Signal: <picture> element → image field
    imageCell = cells.find((c) => c.querySelector('picture'));

    // Signal: <a> tag (excluding image row) → ctaUrl field
    const ctaUrlIdx = cells.findIndex(
      (c) => c !== imageCell && c.querySelector('a'),
    );
    if (ctaUrlIdx >= 0) {
      ctaUrlCell = cells[ctaUrlIdx];
      // CTA label is always the row immediately before the URL row
      ctaLabelCell = ctaUrlIdx > 0 ? cells[ctaUrlIdx - 1] : null;
    }

    // Signal: block-level HTML elements → body (richtext field)
    bodyCell = cells.find(
      (c) => c !== imageCell && c !== ctaUrlCell && c !== ctaLabelCell
        && c.querySelector('p, ul, ol'),
    );

    // Remainder in model order: eyebrow, heading (plain-text rows)
    const identified = new Set(
      [imageCell, ctaUrlCell, ctaLabelCell, bodyCell].filter(Boolean),
    );
    [eyebrowCell, headingCell] = cells.filter((c) => !identified.has(c));
  }

  // ── Image ──────────────────────────────────────────────────────────
  const imageEl = document.createElement('div');
  imageEl.className = 'feature-showcase-image';

  if (imageCell) {
    moveInstrumentation(imageCell, imageEl);
    const pic = imageCell.querySelector('picture');
    if (pic) {
      const img = pic.querySelector('img');
      if (img) {
        if (img.src.endsWith('.svg')) {
          imageEl.append(pic);
        } else {
          const optimized = createOptimizedPicture(img.src, img.alt || '', false, [
            { media: '(min-width: 768px)', width: '640' },
            { width: '480' },
          ]);
          moveInstrumentation(img, optimized.querySelector('img'));
          imageEl.append(optimized);
        }
      }
    }
  }

  // ── Content ────────────────────────────────────────────────────────
  const contentEl = document.createElement('div');
  contentEl.className = 'feature-showcase-content';

  if (eyebrowCell?.textContent.trim()) {
    const eyebrow = document.createElement('p');
    eyebrow.className = 'feature-showcase-eyebrow';
    moveInstrumentation(eyebrowCell, eyebrow);
    eyebrow.textContent = eyebrowCell.textContent.trim();
    contentEl.append(eyebrow);
  }

  if (headingCell?.textContent.trim()) {
    const heading = document.createElement('h2');
    heading.className = 'feature-showcase-heading';
    moveInstrumentation(headingCell, heading);
    heading.textContent = headingCell.textContent.trim();
    contentEl.append(heading);
  }

  if (bodyCell) {
    const body = document.createElement('div');
    body.className = 'feature-showcase-body';
    moveInstrumentation(bodyCell, body);
    while (bodyCell.firstChild) body.append(bodyCell.firstChild);
    contentEl.append(body);
  }

  const ctaUrl = resolveCtaUrl(ctaUrlCell);
  const ctaLabel = ctaLabelCell?.textContent.trim();
  if (ctaUrl && ctaLabel) {
    const cta = document.createElement('a');
    cta.className = 'feature-showcase-cta';
    cta.href = ctaUrl;
    cta.textContent = ctaLabel;
    moveInstrumentation(ctaLabelCell, cta);
    contentEl.append(cta);
  }

  // ── Assemble ───────────────────────────────────────────────────────
  block.textContent = '';
  block.append(imageEl, contentEl);
}
