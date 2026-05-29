/**
 * Safely tear down an Editor.js instance (destroy() is synchronous and returns void).
 */
export const destroyEditor = (editor) => {
  if (!editor || typeof editor.destroy !== 'function') {
    return;
  }

  try {
    editor.destroy();
  } catch (error) {
    console.warn('Error destroying editor:', error);
  }
};

export const clearHolder = (holder) => {
  if (holder) {
    holder.innerHTML = '';
  }
};
