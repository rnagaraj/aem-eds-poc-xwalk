import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

function buildSlide(row) {
  const cols = [...row.children];
  const imageCol = cols.find((c) => c.querySelector('picture'));
  const bodyCols = cols.filter((c) => !c.querySelector('picture'));

  const getCol = (prop, index) => bodyCols.find((c) => c.dataset.aueProp === prop)
    || (bodyCols[index] && !bodyCols[index].dataset.aueProp ? bodyCols[index] : null);

  const slide = document.createElement('li');
  slide.className = 'carousel-slide';
  moveInstrumentation(row, slide);

  if (imageCol) {
    imageCol.className = 'carousel-slide-image';
    slide.append(imageCol);
  }

  const body = document.createElement('div');
  body.className = 'carousel-slide-body';

  const eyebrowCol = getCol('eyebrow', 0);
  const titleCol = getCol('title', 1);
  const descCol = getCol('description', 2);
  const ctaLabelCol = getCol('ctaLabel', 3);
  const ctaUrlCol = getCol('ctaUrl', 4);
  const ctaStyleCol = getCol('ctaStyle', 5);

  const eyebrowText = eyebrowCol ? eyebrowCol.textContent.trim() : '';
  if (eyebrowText) {
    const eyebrowDiv = document.createElement('div');
    eyebrowDiv.className = 'carousel-slide-eyebrow';
    const p = document.createElement('p');
    p.textContent = eyebrowText;
    eyebrowDiv.append(p);
    body.append(eyebrowDiv);
  }

  const titleText = titleCol ? titleCol.textContent.trim() : '';
  if (titleText) {
    const titleDiv = document.createElement('div');
    titleDiv.className = 'carousel-slide-title';
    const h3 = document.createElement('h3');
    h3.textContent = titleText;
    titleDiv.append(h3);
    body.append(titleDiv);
  }

  if (descCol && descCol.children.length) {
    const descDiv = document.createElement('div');
    descDiv.className = 'carousel-slide-description';
    while (descCol.firstChild) descDiv.append(descCol.firstChild);
    body.append(descDiv);
  }

  const ctaLabel = ctaLabelCol ? ctaLabelCol.textContent.trim() : '';
  const ctaUrl = ctaUrlCol ? ctaUrlCol.textContent.trim() : '';
  if (ctaLabel && ctaUrl) {
    const validStyles = ['primary', 'secondary', 'tertiary'];
    const rawStyle = ctaStyleCol ? ctaStyleCol.textContent.trim() : '';
    const ctaStyle = validStyles.includes(rawStyle) ? rawStyle : 'primary';
    const ctaDiv = document.createElement('div');
    ctaDiv.className = 'carousel-slide-cta';
    const a = document.createElement('a');
    a.href = ctaUrl;
    a.textContent = ctaLabel;
    a.classList.add('carousel-cta-btn', `carousel-cta-${ctaStyle}`);
    ctaDiv.append(a);
    body.append(ctaDiv);
  }

  slide.append(body);
  return slide;
}

export default function decorate(block) {
  const rows = [...block.children];

  const track = document.createElement('ul');
  track.className = 'carousel-track';

  rows.forEach((row) => {
    track.append(buildSlide(row));
  });

  track.querySelectorAll('picture > img').forEach((img) => {
    if (img.src.endsWith('.svg')) return;
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    img.closest('picture').replaceWith(optimizedPic);
  });

  const slides = [...track.children];
  const total = slides.length;
  let current = 0;

  // dot indicators
  const dotsNav = document.createElement('div');
  dotsNav.className = 'carousel-dots';
  const dots = slides.map((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'carousel-dot';
    dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
    dot.addEventListener('click', () => goTo(i));
    dotsNav.append(dot);
    return dot;
  });

  function goTo(index) {
    slides[current].classList.remove('active');
    dots[current].classList.remove('active');
    current = (index + total) % total;
    slides[current].classList.add('active');
    dots[current].classList.add('active');
  }

  // prev/next buttons
  const prevBtn = document.createElement('button');
  prevBtn.className = 'carousel-prev';
  prevBtn.setAttribute('aria-label', 'Previous slide');
  prevBtn.innerHTML = '&#8249;';
  prevBtn.addEventListener('click', () => goTo(current - 1));

  const nextBtn = document.createElement('button');
  nextBtn.className = 'carousel-next';
  nextBtn.setAttribute('aria-label', 'Next slide');
  nextBtn.innerHTML = '&#8250;';
  nextBtn.addEventListener('click', () => goTo(current + 1));

  // activate first slide
  slides[0].classList.add('active');
  dots[0].classList.add('active');

  const container = document.createElement('div');
  container.className = 'carousel-container';
  container.append(prevBtn, track, nextBtn);

  block.replaceChildren(container, dotsNav);
}
