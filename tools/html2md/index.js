import html2md from '@adobe/helix-html2md';

export default async function html2mdHandler(request, context) {
  return html2md(request, context);
}