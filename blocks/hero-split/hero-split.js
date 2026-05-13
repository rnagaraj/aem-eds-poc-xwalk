import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

function getCol(cols, prop, index) {
  return cols.find((c) => c.dataset.aueProp === prop)
    || (cols[index] && !cols[index].dataset.aueProp ? cols[index] : null);
}

export default function decorate(block) {
  const row = block.firstElementChild;
  const cols = [...row.children];

  // In UE: cols are identified by data-aue-prop.
  // On live page: positional fallback — col 0 = image, col 1 = content.
  const imageCol = cols.find((c) => c.querySelector('picture'))
    || getCol(cols, 'image', 0);
  const contentCol = cols.find((c) => !c.querySelector('picture'))
    || getCol(cols, null, 1);

  // Read structured fields (UE model) by data-aue-prop, fall back to positional children
  const contentChildren = contentCol ? [...contentCol.children] : [];

  const getField = (prop, fallbackEl) => {
    const el = contentCol?.querySelector(`[data-aue-prop="${prop}"]`);
    return el || fallbackEl;
  };

  // Positional fallback elements from content column
  const [eyebrowEl, titleEl, subtitleEl, descEl, ctaEl] = contentChildren;

  block.textContent = '';

  // Apply image-position variant from UE select field or existing block class
  const imagePositionCol = cols.find((c) => c.dataset.aueProp === 'imagePosition');
  if (imagePositionCol) {
    const val = imagePositionCol.textContent.trim();
    if (val && val !== 'left') block.classList.add(val);
  }
  const imageRight = block.classList.contains('image-right');

  // --- Image ---
  const imageEl = document.createElement('div');
  imageEl.className = 'hero-split-image';
  if (imageCol) {
    moveInstrumentation(imageCol, imageEl);
    const pic = imageCol.querySelector('picture');
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
  contentEl.className = 'hero-split-content';
  if (contentCol) moveInstrumentation(contentCol, contentEl);

  // Eyebrow
  const eyebrow = getField('eyebrow', eyebrowEl);
  if (eyebrow?.textContent.trim()) {
    const div = document.createElement('p');
    div.className = 'hero-split-eyebrow';
    div.textContent = eyebrow.textContent.trim();
    contentEl.append(div);
  }

  // Title
  const title = getField('title', titleEl);
  if (title?.textContent.trim()) {
    const h1 = document.createElement('h1');
    h1.className = 'hero-split-title';
    h1.textContent = title.textContent.trim();
    contentEl.append(h1);
  }

  // Subtitle
  const subtitle = getField('subtitle', subtitleEl);
  if (subtitle?.textContent.trim()) {
    const h2 = document.createElement('h2');
    h2.className = 'hero-split-subtitle';
    h2.textContent = subtitle.textContent.trim();
    contentEl.append(h2);
  }

  // Description
  const desc = getField('description', descEl);
  if (desc && desc.children.length) {
    const div = document.createElement('div');
    div.className = 'hero-split-description';
    while (desc.firstChild) div.append(desc.firstChild);
    contentEl.append(div);
  }

  // CTAs
  const primaryLabel = getField('primaryCtaLabel', null)?.textContent.trim();
  const primaryUrl = getField('primaryCtaUrl', null)?.textContent.trim();
  const secondaryLabel = getField('secondaryCtaLabel', null)?.textContent.trim();
  const secondaryUrl = getField('secondaryCtaUrl', null)?.textContent.trim();

  // Fallback: read CTAs from links in the last content column child
  const ctaLinks = ctaEl?.querySelectorAll('a') || [];
  const resolvedPrimaryLabel = primaryLabel || ctaLinks[0]?.textContent.trim();
  const resolvedPrimaryUrl = primaryUrl || ctaLinks[0]?.href;
  const resolvedSecondaryLabel = secondaryLabel || ctaLinks[1]?.textContent.trim();
  const resolvedSecondaryUrl = secondaryUrl || ctaLinks[1]?.href;

  if (resolvedPrimaryLabel && resolvedPrimaryUrl) {
    const ctaRow = document.createElement('p');
    ctaRow.className = 'hero-split-ctas';

    const primary = document.createElement('a');
    primary.href = resolvedPrimaryUrl;
    primary.textContent = resolvedPrimaryLabel;
    primary.classList.add('hero-split-cta', 'hero-split-cta-primary');
    ctaRow.append(primary);

    if (resolvedSecondaryLabel && resolvedSecondaryUrl) {
      const secondary = document.createElement('a');
      secondary.href = resolvedSecondaryUrl;
      secondary.textContent = resolvedSecondaryLabel;
      secondary.classList.add('hero-split-cta', 'hero-split-cta-secondary');
      ctaRow.append(secondary);
    }

    contentEl.append(ctaRow);
  }

  // --- Assemble in correct order ---
  block.append(imageRight ? contentEl : imageEl);
  block.append(imageRight ? imageEl : contentEl);
}
