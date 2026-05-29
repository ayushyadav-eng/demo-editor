/**
 * DEPRECATED: Toolbar buttons are no longer used with Editor.js
 * Editor.js has built-in toolbar and custom tools handle block insertion
 * Kept here for reference only
 */

import { GRID_SIZE_LIMIT } from './AtomicBlocks';

// Legacy: Upload image button - no longer used
export function UploadImageButton({ disabled, onSelectFiles }) {
  console.warn('UploadImageButton is deprecated. Editor.js handles image uploads natively.');
  return null;
}

// Legacy: Insert gallery button - no longer used
export function InsertGalleryButton({ disabled, onSelectFiles }) {
  console.warn('InsertGalleryButton is deprecated. Editor.js handles galleries natively.');
  return null;
}

// Legacy: Insert grid button - no longer used
export function InsertGridButton({ disabled, gridSelection, setGridSelection, onSelectFiles }) {
  console.warn('InsertGridButton is deprecated. Editor.js handles grids natively.');
  return null;
}

export { GRID_SIZE_LIMIT };
