import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

function closeAllPopovers(except) {
  document.querySelectorAll('.journey-pin-popover.open').forEach((p) => {
    if (p !== except) {
      p.classList.remove('open');
      p.previousElementSibling?.setAttribute('aria-expanded', 'false');
    }
  });
}

function buildStep(row, index) {
  const cols = [...row.children];

  // Col 0: image
  // Col 1: description text
  // Col 2: benefit label (optional → $ pin)
  // Col 3: benefit amount (optional)
  const imageCol = cols[0];
  const textCol = cols[1];
  const benefitLabelCol = cols[2];
  const benefitAmountCol = cols[3];

  const step = document.createElement('div');
  step.className = 'journey-step';
  step.dataset.index = index;
  moveInstrumentation(row, step);

  // Waypoint marker
  const waypoint = document.createElement('div');
  waypoint.className = 'journey-waypoint';

  const circle = document.createElement('span');
  circle.className = 'journey-circle';
  waypoint.append(circle);

  // $ pin (only if benefit data exists)
  const benefitLabel = benefitLabelCol?.textContent.trim();
  const benefitAmount = benefitAmountCol?.textContent.trim();

  if (benefitLabel || benefitAmount) {
    const pin = document.createElement('button');
    pin.className = 'journey-pin';
    pin.setAttribute('aria-label', `View benefit: ${benefitLabel || ''}`);
    pin.setAttribute('aria-expanded', 'false');
    pin.textContent = '$';

    const popover = document.createElement('div');
    popover.className = 'journey-pin-popover';
    popover.setAttribute('role', 'tooltip');

    if (benefitLabel) {
      const labelEl = document.createElement('span');
      labelEl.className = 'journey-popover-label';
      labelEl.textContent = benefitLabel;
      popover.append(labelEl);
    }

    if (benefitAmount) {
      const amountEl = document.createElement('span');
      amountEl.className = 'journey-popover-amount';
      amountEl.textContent = benefitAmount;
      popover.append(amountEl);
    }

    pin.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = popover.classList.contains('open');
      closeAllPopovers();
      popover.classList.toggle('open', !isOpen);
      pin.setAttribute('aria-expanded', String(!isOpen));
    });

    waypoint.append(pin, popover);
  }

  // Illustration
  const imageEl = document.createElement('div');
  imageEl.className = 'journey-image';
  if (imageCol) {
    moveInstrumentation(imageCol, imageEl);
    const pic = imageCol.querySelector('picture');
    if (pic) {
      const img = pic.querySelector('img');
      if (img.src.endsWith('.svg')) {
        imageEl.append(pic);
      } else {
        const optimized = createOptimizedPicture(img.src, img.alt, false, [{ width: '300' }]);
        moveInstrumentation(img, optimized.querySelector('img'));
        imageEl.append(optimized);
      }
    }
  }

  // Description text
  const textEl = document.createElement('div');
  textEl.className = 'journey-text';
  if (textCol) {
    moveInstrumentation(textCol, textEl);
    while (textCol.firstChild) textEl.append(textCol.firstChild);
  }

  step.append(waypoint, imageEl, textEl);
  return step;
}

export default function decorate(block) {
  const rows = [...block.children];
  block.textContent = '';

  const track = document.createElement('div');
  track.className = 'journey-track';

  rows.forEach((row, i) => {
    track.append(buildStep(row, i));
  });

  block.append(track);

  // Close popovers on outside click
  document.addEventListener('click', () => closeAllPopovers());
}
