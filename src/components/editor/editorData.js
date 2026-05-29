/**
 * Editor.js output normalization — paragraph blocks need preserveBlank
 * or non-empty text or they are skipped on load ("saved data is invalid").
 */

export const EDITOR_VERSION = '2.28.0';

export const createEmptyEditorData = () => ({
  blocks: [{ type: 'paragraph', data: { text: '' } }],
  version: EDITOR_VERSION,
});

const sanitizeBlock = (block) => {
  if (!block?.type) {
    return null;
  }

  if (block.type === 'paragraph') {
    const text = typeof block.data?.text === 'string' ? block.data.text : '';
    return { type: 'paragraph', data: { text } };
  }

  return block;
};

export const normalizeEditorData = (data) => {
  if (!data || !Array.isArray(data.blocks) || data.blocks.length === 0) {
    return createEmptyEditorData();
  }

  const blocks = data.blocks.map(sanitizeBlock).filter(Boolean);
  if (blocks.length === 0) {
    return createEmptyEditorData();
  }

  return {
    blocks,
    version: data.version || EDITOR_VERSION,
  };
};
