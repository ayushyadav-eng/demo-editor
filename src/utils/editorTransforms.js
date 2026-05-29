/**
 * Convert Editor.js output format to HTML
 * Handles standard Editor.js blocks and custom blocks (image, gallery, grid)
 */
export const editorJSToHtml = (editorData = {}) => {
  if (!editorData.blocks || !Array.isArray(editorData.blocks)) {
    return '';
  }

  return editorData.blocks
    .map((block) => blockToHtml(block))
    .filter(Boolean)
    .join('');
};

/**
 * Convert a single Editor.js block to HTML
 */
const blockToHtml = (block) => {
  switch (block.type) {
    case 'paragraph':
      return `<p>${block.data?.text || ''}</p>`;

    case 'header':
      const level = block.data?.level || 2;
      return `<h${level}>${block.data?.text || ''}</h${level}>`;

    case 'list':
      return listToHtml(block.data);

    case 'code':
      return `<pre><code>${escapeHtml(block.data?.code || '')}</code></pre>`;

    case 'quote':
      const caption = block.data?.caption ? `<footer>${escapeHtml(block.data.caption)}</footer>` : '';
      return `<blockquote><p>${block.data?.text || ''}</p>${caption}</blockquote>`;

    case 'embed':
      return embedToHtml(block.data);

    case 'image':
      return `<figure class="image"><img src="${block.data?.url || ''}" alt="${block.data?.caption || ''}" />${
        block.data?.caption ? `<figcaption>${block.data.caption}</figcaption>` : ''
      }</figure>`;

    case 'gallery':
      return galleryToHtml(block.data);

    case 'grid':
      return gridToHtml(block.data);

    case 'table':
      return tableToHtml(block.data);

    case 'delimiter':
      return '<hr />';

    default:
      console.warn(`Unknown block type: ${block.type}`);
      return '';
  }
};

/**
 * Convert list block to HTML
 */
const listItemToHtml = (item) => {
  if (typeof item === 'string') {
    return `<li>${item}</li>`;
  }

  const text = item?.content || item?.text || '';
  const children = Array.isArray(item?.items)
    ? item.items.map(listItemToHtml).join('')
    : '';
  const nested = children ? `<ul>${children}</ul>` : '';
  return `<li>${text}${nested}</li>`;
};

const listToHtml = (data = {}) => {
  if (!data.items || !Array.isArray(data.items)) {
    return '';
  }

  const tag =
    data.style === 'ordered' || data.style === 'checklist' ? 'ol' : 'ul';
  const items = data.items.map(listItemToHtml).join('');
  return `<${tag}>${items}</${tag}>`;
};

/**
 * Convert embed block to HTML
 */
const embedToHtml = (data = {}) => {
  const { service, embed, width, height, caption } = data;

  switch (service) {
    case 'youtube':
      return `<iframe width="${width || 560}" height="${height || 315}" src="${embed}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;

    case 'vimeo':
      return `<iframe src="${embed}" width="${width || 560}" height="${height || 315}" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>`;

    case 'instagram':
      return `<blockquote class="instagram-media">${embed}</blockquote>`;

    default:
      return `<a href="${embed}" target="_blank">${caption || embed}</a>`;
  }
};

/**
 * Convert gallery block to HTML
 */
const galleryToHtml = (data = {}) => {
  if (!data.urls || !Array.isArray(data.urls)) {
    return '';
  }

  const items = data.urls
    .map((src, index) => `<figure class="gallery-item" key="${src}-${index}"><img src="${src}" alt="" /></figure>`)
    .join('');

  return `<div class="gallery">${items}</div>`;
};

/**
 * Convert table block to HTML
 */
const tableToHtml = (data = {}) => {
  const content = data?.content;
  if (!Array.isArray(content) || !content.length) {
    return '';
  }

  const rows = content
    .map((row) => {
      const cells = row
        .map((cell) => `<td>${cell || ''}</td>`)
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  return `<table class="editor-table">${rows}</table>`;
};

/**
 * Convert grid block to HTML
 */
const gridToHtml = (data = {}) => {
  if (!data.urls || !Array.isArray(data.urls)) {
    return '';
  }

  const columns = data.columns || 3;
  const items = data.urls
    .map((src, index) => `<figure class="grid-item" key="${src}-${index}"><img src="${src}" alt="" /></figure>`)
    .join('');

  return `<div class="grid" style="display: grid; gap: 10px; grid-template-columns: repeat(${columns}, 1fr);">${items}</div>`;
};

/**
 * Escape HTML special characters
 */
const escapeHtml = (text = '') => {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};

// Legacy support: if someone uses customEntityTransform
export const customEntityTransform = (entity) => {
  // This is no longer needed with Editor.js, but kept for backward compatibility
  console.warn('customEntityTransform is deprecated. Use editorJSToHtml instead.');
  return undefined;
};
