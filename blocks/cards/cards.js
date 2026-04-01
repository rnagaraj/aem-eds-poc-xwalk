import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

// Legacy: detects bold/italic wrapping on a link to assign CTA style
function decorateCtaLink(link) {
  const strongParent = link.closest('strong');
  const emParent = link.closest('em');
  const strongChild = link.querySelector('strong');
  const emChild = link.querySelector('em');
  let style = 'tertiary';
  if (strongParent) {
    style = 'primary';
    strongParent.replaceWith(link);
  } else if (strongChild) {
    style = 'primary';
    strongChild.replaceWith(...strongChild.childNodes);
  } else if (emParent) {
    style = 'secondary';
    emParent.replaceWith(link);
  } else if (emChild) {
    style = 'secondary';
    emChild.replaceWith(...emChild.childNodes);
  }
  link.classList.remove('button');
  link.classList.add('cards-cta-btn', `cards-cta-${style}`);
  link.querySelectorAll('u').forEach((u) => u.replaceWith(...u.childNodes));
}

// Legacy: parses a single richtext column into eyebrow/title/description/cta sections
function decorateCardBody(body) {
  const children = [...body.children];

  const eyebrowDiv = document.createElement('div');
  eyebrowDiv.className = 'cards-card-eyebrow';
  const titleDiv = document.createElement('div');
  titleDiv.className = 'cards-card-title';
  const descDiv = document.createElement('div');
  descDiv.className = 'cards-card-description';
  const ctaDiv = document.createElement('div');
  ctaDiv.className = 'cards-card-cta';

  let titleFound = false;
  let eyebrowFound = false;

  children.forEach((el) => {
    const isHeading = /^H[1-6]$/.test(el.tagName);
    const hasLinks = el.querySelector('a');

    if (!eyebrowFound && !titleFound && !isHeading && el.tagName === 'P' && !hasLinks) {
      eyebrowDiv.append(el);
      eyebrowFound = true;
    } else if (!titleFound && isHeading) {
      titleDiv.append(el);
      titleFound = true;
    } else if (hasLinks) {
      [...el.querySelectorAll('a')].forEach(decorateCtaLink);
      ctaDiv.append(el);
    } else {
      descDiv.append(el);
    }
  });

  body.replaceChildren(
    ...(eyebrowDiv.children.length ? [eyebrowDiv] : []),
    ...(titleDiv.children.length ? [titleDiv] : []),
    ...(descDiv.children.length ? [descDiv] : []),
    ...(ctaDiv.children.length ? [ctaDiv] : []),
  );
}

export default function decorate(block) {
  // Extract block-level text field (single column, no picture = cards title)
  let cardsTitle = null;
  const firstRow = block.firstElementChild;
  if (firstRow && firstRow.children.length === 1 && !firstRow.querySelector('picture')) {
    cardsTitle = document.createElement('div');
    cardsTitle.className = 'cards-title';
    moveInstrumentation(firstRow, cardsTitle);
    cardsTitle.append(firstRow.firstElementChild);
    firstRow.remove();
  }

  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    moveInstrumentation(row, li);

    const cols = [...row.children];
    const imageCol = cols.find((c) => c.querySelector('picture'));
    const bodyCols = cols.filter((c) => !c.querySelector('picture'));

    if (imageCol) {
      imageCol.className = 'cards-card-image';
      li.append(imageCol);
    }

    const body = document.createElement('div');
    body.className = 'cards-card-body';

    if (bodyCols.length >= 4) {
      // Structured model: eyebrow | title | description | ctaText | ctaUrl | [ctaStyle]
      const [eyebrowCol, titleCol, descCol, ctaTextCol, ctaUrlCol, ctaStyleCol] = bodyCols;

      const eyebrowText = eyebrowCol.textContent.trim();
      if (eyebrowText) {
        const eyebrowDiv = document.createElement('div');
        eyebrowDiv.className = 'cards-card-eyebrow';
        const p = document.createElement('p');
        p.textContent = eyebrowText;
        eyebrowDiv.append(p);
        body.append(eyebrowDiv);
      }

      const titleText = titleCol.textContent.trim();
      if (titleText) {
        const titleDiv = document.createElement('div');
        titleDiv.className = 'cards-card-title';
        const h3 = document.createElement('h3');
        h3.textContent = titleText;
        titleDiv.append(h3);
        body.append(titleDiv);
      }

      if (descCol.children.length) {
        const descDiv = document.createElement('div');
        descDiv.className = 'cards-card-description';
        while (descCol.firstChild) descDiv.append(descCol.firstChild);
        body.append(descDiv);
      }

      const ctaText = ctaTextCol ? ctaTextCol.textContent.trim() : '';
      const ctaUrl = ctaUrlCol ? ctaUrlCol.textContent.trim() : '';
      if (ctaText && ctaUrl) {
        const validStyles = ['primary', 'secondary', 'tertiary'];
        const rawStyle = ctaStyleCol ? ctaStyleCol.textContent.trim() : '';
        const ctaStyle = validStyles.includes(rawStyle) ? rawStyle : 'primary';
        const ctaDiv = document.createElement('div');
        ctaDiv.className = 'cards-card-cta';
        const a = document.createElement('a');
        a.href = ctaUrl;
        a.textContent = ctaText;
        a.classList.add('cards-cta-btn', `cards-cta-${ctaStyle}`);
        ctaDiv.append(a);
        body.append(ctaDiv);
      }
    } else if (bodyCols.length > 1) {
      // Semi-structured: eyebrow | title | richtext (old 4-cell model)
      const [eyebrowCol, titleCol, ...textCols] = bodyCols;

      const eyebrowText = eyebrowCol.textContent.trim();
      if (eyebrowText) {
        const eyebrowDiv = document.createElement('div');
        eyebrowDiv.className = 'cards-card-eyebrow';
        const p = document.createElement('p');
        p.textContent = eyebrowText;
        eyebrowDiv.append(p);
        body.append(eyebrowDiv);
      }

      const titleText = titleCol.textContent.trim();
      if (titleText) {
        const titleDiv = document.createElement('div');
        titleDiv.className = 'cards-card-title';
        const h3 = document.createElement('h3');
        h3.textContent = titleText;
        titleDiv.append(h3);
        body.append(titleDiv);
      }

      textCols.forEach((col) => {
        const descDiv = document.createElement('div');
        descDiv.className = 'cards-card-description';
        const ctaDiv = document.createElement('div');
        ctaDiv.className = 'cards-card-cta';
        [...col.children].forEach((el) => {
          if (el.querySelector('a')) {
            [...el.querySelectorAll('a')].forEach(decorateCtaLink);
            ctaDiv.append(el);
          } else {
            descDiv.append(el);
          }
        });
        if (descDiv.children.length) body.append(descDiv);
        if (ctaDiv.children.length) body.append(ctaDiv);
      });
    } else if (bodyCols.length === 1) {
      // Legacy: single richtext col with all content
      decorateCardBody(bodyCols[0]);
      while (bodyCols[0].firstChild) body.append(bodyCols[0].firstChild);
    }

    li.append(body);
    ul.append(li);
  });

  ul.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    img.closest('picture').replaceWith(optimizedPic);
  });

  block.replaceChildren(...(cardsTitle ? [cardsTitle] : []), ul);
}
