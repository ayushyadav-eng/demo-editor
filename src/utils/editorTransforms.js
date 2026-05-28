export const customEntityTransform = (entity) => {
  if (entity.type === 'IMAGE') {
    const src = entity.data.src || '';
    return `<figure class="image"><img src="${src}" alt=""/></figure>`;
  }

  if (entity.type === 'GALLERY') {
    const items = (entity.data.urls || [])
      .map((src) => `<figure class="gallery-item"><img src="${src}" alt=""/></figure>`)
      .join('');
    return `<div class="gallery">${items}</div>`;
  }

  if (entity.type === 'GRID') {
    const columns = entity.data.columns || 3;
    const items = (entity.data.urls || [])
      .map((src) => `<figure class="grid-item"><img src="${src}" alt=""/></figure>`)
      .join('');
    return `<div class="grid" style="display: grid; gap: 10px; grid-template-columns: repeat(${columns}, 1fr);">${items}</div>`;
  }

  return undefined;
};

// TODO: roundtrip — load saved HTML back into GALLERY/GRID atomic blocks via html-to-draftjs
