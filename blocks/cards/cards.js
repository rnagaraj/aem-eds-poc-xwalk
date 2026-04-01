import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

function decorateCardBody(body) {
  const children = [...body.children];

  const eyebrow = document.createElement('div');
  eyebrow.className = 'cards-card-eyebrow';
  const titleWrapper = document.createElement('div');
  titleWrapper.className = 'cards-card-title';
  const descWrapper = document.createElement('div');
  descWrapper.className = 'cards-card-description';
  const ctaWrapper = document.createElement('div');
  ctaWrapper.className = 'cards-card-cta';

  let titleFound = false;
  let eyebrowFound = false;

  children.forEach((el) => {
    const isHeading = /^H[1-6]$/.test(el.tagName);
    const hasLinks = el.querySelector('a');

    if (!eyebrowFound && !titleFound && !isHeading && el.tagName === 'P' && !hasLinks) {
      eyebrow.append(el);
      eyebrowFound = true;
    } else if (!titleFound && isHeading) {
      titleWrapper.append(el);
      titleFound = true;
    } else if (hasLinks) {
      [...el.querySelectorAll('a')].forEach((link) => {
        const strongParent = link.closest('strong');
        const emParent = link.closest('em');
        let style = 'tertiary';
        if (strongParent) {
          style = 'primary';
          strongParent.replaceWith(link);
        } else if (emParent) {
          style = 'secondary';
          emParent.replaceWith(link);
        }
        link.classList.add('cards-cta-btn', `cards-cta-${style}`);
      });
      ctaWrapper.append(el);
    } else {
      descWrapper.append(el);
    }
  });

  body.replaceChildren(
    ...(eyebrow.children.length ? [eyebrow] : []),
    ...(titleWrapper.children.length ? [titleWrapper] : []),
    ...(descWrapper.children.length ? [descWrapper] : []),
    ...(ctaWrapper.children.length ? [ctaWrapper] : []),
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

  /* change to ul, li */
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    moveInstrumentation(row, li);
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) div.className = 'cards-card-image';
      else {
        div.className = 'cards-card-body';
        decorateCardBody(div);
      }
    });
    ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    img.closest('picture').replaceWith(optimizedPic);
  });

  // Rebuild block: title first, then cards grid
  block.replaceChildren(...(cardsTitle ? [cardsTitle] : []), ul);
}
