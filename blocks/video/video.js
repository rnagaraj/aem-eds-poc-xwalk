import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Detects video type from URL and returns an embed element.
 * Supports YouTube, Vimeo, Scene7 (Dynamic Media), AEM DAM, and direct video files.
 */
function buildVideoEmbed(url) {
  const youtubeMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  );
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);

  if (youtubeMatch) {
    const id = youtubeMatch[1];
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${id}?controls=0`;
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
    iframe.setAttribute('title', 'YouTube video player');
    return iframe;
  }

  if (vimeoMatch) {
    const id = vimeoMatch[1];
    const iframe = document.createElement('iframe');
    iframe.src = `https://player.vimeo.com/video/${id}`;
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture');
    iframe.setAttribute('title', 'Vimeo video player');
    return iframe;
  }

  if (url.includes('scene7.com') || url.includes('/is/content/')) {
    if (url.includes('/s7viewers/')) {
      const iframe = document.createElement('iframe');
      iframe.src = url;
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('title', 'Scene7 video player');
      return iframe;
    }
    const video = document.createElement('video');
    video.controls = true;
    video.setAttribute('preload', 'metadata');
    const source = document.createElement('source');
    source.src = url;
    video.append(source);
    return video;
  }

  if (url.includes('/content/dam/')) {
    const video = document.createElement('video');
    video.controls = true;
    video.setAttribute('preload', 'metadata');
    const source = document.createElement('source');
    source.src = url;
    video.append(source);
    return video;
  }

  const video = document.createElement('video');
  video.controls = true;
  video.setAttribute('preload', 'metadata');
  const source = document.createElement('source');
  source.src = url;
  video.append(source);
  return video;
}

function getField(parent, prop) {
  return parent?.querySelector(`[data-aue-prop="${prop}"]`);
}

export default function decorate(block) {
  const rows = [...block.children];

  // UE: read named fields; live page: positional rows
  const titleField = getField(block, 'title');
  const descField = getField(block, 'description');
  const videoUrlField = getField(block, 'videoUrl');
  const transcriptField = getField(block, 'transcript');

  let title = titleField?.textContent.trim();
  let description = descField?.innerHTML;
  let videoUrl;
  let transcriptContent;

  if (videoUrlField) {
    // UE path — all fields present
    const linkEl = videoUrlField.querySelector('a');
    videoUrl = linkEl ? linkEl.href : videoUrlField.textContent.trim();
    transcriptContent = transcriptField;
  } else {
    // Live page fallback — positional rows
    // Row 0: optional title row (single cell, no link)
    // Row 1: optional description row
    // Detect by checking if first row has a link (video URL) or not
    let rowIndex = 0;

    const firstCell = rows[rowIndex]?.firstElementChild;
    const firstLink = firstCell?.querySelector('a');

    // If first row has no link and no picture, treat as title
    if (firstCell && !firstLink && !firstCell.querySelector('picture')) {
      const h = firstCell.querySelector('h1,h2,h3,h4');
      title = title || (h ? h.textContent.trim() : firstCell.textContent.trim());
      rowIndex += 1;
    }

    // Next non-link row without picture = description
    const secondCell = rows[rowIndex]?.firstElementChild;
    const secondLink = secondCell?.querySelector('a');
    if (secondCell && !secondLink && !secondCell.querySelector('picture') && rows.length > rowIndex + 1) {
      description = description || secondCell.innerHTML;
      rowIndex += 1;
    }

    // Video URL row
    const videoCell = rows[rowIndex]?.firstElementChild;
    const linkEl = videoCell?.querySelector('a');
    videoUrl = linkEl ? linkEl.href : videoCell?.textContent.trim();
    rowIndex += 1;

    // Transcript row
    transcriptContent = rows[rowIndex]?.firstElementChild;
  }

  block.textContent = '';

  if (!videoUrl) return;

  moveInstrumentation(block, block);

  // --- Title ---
  if (title) {
    const titleEl = document.createElement('h2');
    titleEl.className = 'video-title';
    if (titleField) moveInstrumentation(titleField, titleEl);
    titleEl.textContent = title;
    block.append(titleEl);
  }

  // --- Description ---
  if (description) {
    const descEl = document.createElement('p');
    descEl.className = 'video-description';
    if (descField) moveInstrumentation(descField, descEl);
    descEl.innerHTML = description;
    block.append(descEl);
  }

  // --- Video wrapper ---
  const videoWrapper = document.createElement('div');
  videoWrapper.className = 'video-embed-wrapper';
  if (videoUrlField) moveInstrumentation(videoUrlField, videoWrapper);
  videoWrapper.append(buildVideoEmbed(videoUrl));
  block.append(videoWrapper);

  // --- Transcript ---
  const transcriptEl = transcriptField || transcriptContent;
  if (transcriptEl && transcriptEl.children.length) {
    const transcriptSection = document.createElement('div');
    transcriptSection.className = 'video-transcript';
    if (transcriptField) moveInstrumentation(transcriptField, transcriptSection);

    const toggle = document.createElement('button');
    toggle.className = 'video-transcript-toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = '<span>View transcript</span><span class="video-transcript-icon" aria-hidden="true"></span>';

    const content = document.createElement('div');
    content.className = 'video-transcript-content';
    content.setAttribute('hidden', '');
    while (transcriptEl.firstChild) content.append(transcriptEl.firstChild);

    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      if (expanded) content.setAttribute('hidden', '');
      else content.removeAttribute('hidden');
    });

    transcriptSection.append(toggle, content);
    block.append(transcriptSection);
  }
}
