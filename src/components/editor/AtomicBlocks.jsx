/**
 * DEPRECATED: These components are no longer used with Editor.js
 * Editor.js handles block rendering natively through custom tools
 * Kept here for reference only
 */

const GRID_SIZE_LIMIT = 10;

// Legacy: Image block component - no longer used
export function ImageBlock({ block, contentState }) {
  console.warn('ImageBlock is deprecated. Editor.js handles images natively.');
  return null;
}

// Legacy: Gallery block component - no longer used
export function GalleryBlock({ block, contentState }) {
  console.warn('GalleryBlock is deprecated. Editor.js handles galleries natively.');
  return null;
}

// Legacy: Grid block component - no longer used
export function GridBlock({ block, contentState }) {
  console.warn('GridBlock is deprecated. Editor.js handles grids natively.');
  return null;
}

export { GRID_SIZE_LIMIT };
