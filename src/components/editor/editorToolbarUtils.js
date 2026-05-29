/** Helpers for the fixed RTE toolbar driving Editor.js blocks. */

export const BLOCK_STYLES = [
  { value: 'paragraph', label: 'Paragraph', tool: 'paragraph' },
  { value: 'header-2', label: 'Heading 2', tool: 'header', data: { level: 2 } },
  { value: 'header-3', label: 'Heading 3', tool: 'header', data: { level: 3 } },
  { value: 'header-4', label: 'Heading 4', tool: 'header', data: { level: 4 } },
  { value: 'quote', label: 'Quote', tool: 'quote' },
  { value: 'code', label: 'Code', tool: 'code' },
];

export const getHolderRoot = (holderRef) => holderRef?.current || null;

const isNodeInDocument = (node) => {
  if (!node) {
    return false;
  }
  const element = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
  return Boolean(element && document.contains(element));
};

const isRangeInDocument = (range) =>
  range && isNodeInDocument(range.startContainer) && isNodeInDocument(range.endContainer);

let savedEditorRange = null;

/** Call before toolbar mousedown (which uses preventDefault and clears focus). */
export const saveEditorSelection = (holderRef) => {
  const holder = getHolderRoot(holderRef);
  const selection = window.getSelection();
  if (!holder || !selection || selection.rangeCount === 0) {
    savedEditorRange = null; // clear stale range rather than keep old one
    return;
  }

  const range = selection.getRangeAt(0);
  if (holder.contains(range.commonAncestorContainer)) {
    savedEditorRange = range.cloneRange();
  } else {
    savedEditorRange = null; // selection is outside editor, don't hold old ref
  }
};

const safeAddRange = (selection, range) => {
  if (!selection || !range) return false;
  // Re-check liveness right before the call, not just at save time
  if (!isRangeInDocument(range)) return false;
  try {
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  } catch {
    return false;
  }
};
const placeCaretAtEnd = (editable) => {
  const selection = window.getSelection();
  if (!selection || !editable || !document.contains(editable)) {
    return;
  }

  const range = document.createRange();
  range.selectNodeContents(editable);
  range.collapse(false);
  safeAddRange(selection, range);
};

/** Restore a valid selection inside the editor before execCommand. */
export const restoreEditorSelection = (holderRef, editable) => {
  const selection = window.getSelection();
  if (!selection || !editable || !document.contains(editable)) {
    return false;
  }

  try {
    if (
      savedEditorRange
      && editable.contains(savedEditorRange.commonAncestorContainer)
      && safeAddRange(selection, savedEditorRange)
    ) {
      return true;
    }

    if (selection.rangeCount > 0) {
      const current = selection.getRangeAt(0);
      if (isRangeInDocument(current) && editable.contains(current.commonAncestorContainer)) {
        return true;
      }
    }

    placeCaretAtEnd(editable);
    return true;
  } catch {
    placeCaretAtEnd(editable);
    return document.contains(editable);
  }
};

export const getActiveContentEditable = (holderRef) => {
  const root = getHolderRoot(holderRef);
  if (!root) {
    return null;
  }

  const selection = window.getSelection();
  if (selection?.anchorNode) {
    const node =
      selection.anchorNode.nodeType === Node.TEXT_NODE
        ? selection.anchorNode.parentElement
        : selection.anchorNode;
    const editable = node?.closest?.('[contenteditable="true"]');
    if (editable && root.contains(editable)) {
      return editable;
    }
  }

  return root.querySelector('.ce-block--focused [contenteditable="true"]')
    || root.querySelector('[contenteditable="true"]');
};

export const focusActiveEditable = (holderRef) => {
  const editable = getActiveContentEditable(holderRef);
  if (editable) {
    editable.focus();
  }
  return editable;
};

export const execOnSelection = (holderRef, command, value = null) => {
  const editable = focusActiveEditable(holderRef);
  if (!editable) {
    return false;
  }

  try {
    if (!restoreEditorSelection(holderRef, editable)) {
      return false;
    }
    return document.execCommand(command, false, value);
  } catch {
    return false;
  }
};

export const insertLink = (holderRef) => {
  const url = window.prompt('Enter link URL');
  if (!url) {
    return;
  }
  execOnSelection(holderRef, 'createLink', url);
};

const stripHtml = (value = '') => value.replace(/<[^>]*>/g, '').trim();

export const getPlainTextFromBlock = (block) => {
  if (!block?.data) {
    return '';
  }
  if (typeof block.data.text === 'string') {
    return stripHtml(block.data.text);
  }
  if (typeof block.data.code === 'string') {
    return block.data.code;
  }
  return '';
};

export const getHtmlFromBlock = (block) => {
  if (!block?.data || typeof block.data.text !== 'string') {
    return '';
  }
  return block.data.text;
};

const buildBlockData = (style, text) => {
  if (style.tool === 'header') {
    return { text, level: style.data?.level || 2 };
  }
  if (style.tool === 'quote') {
    return { text, caption: '' };
  }
  if (style.tool === 'code') {
    return { code: stripHtml(text) };
  }
  return { text };
};

const styleKeyForBlock = (block) => {
  if (!block) {
    return 'paragraph';
  }
  if (block.type === 'header') {
    const level = block.data?.level || 2;
    return `header-${level}`;
  }
  if (block.type === 'paragraph') {
    return 'paragraph';
  }
  if (block.type === 'quote') {
    return 'quote';
  }
  if (block.type === 'code') {
    return 'code';
  }
  return null;
};

export const getBlockStyleKey = async (editor) => {
  await editor.isReady;
  const index = editor.blocks.getCurrentBlockIndex();
  if (index < 0) {
    return 'paragraph';
  }
  const output = await editor.save();
  const block = output?.blocks?.[index];
  return styleKeyForBlock(block) || 'paragraph';
};

export const convertCurrentBlock = async (editor, styleKey) => {
  const style = BLOCK_STYLES.find((item) => item.value === styleKey);
  if (!style) return;

  await editor.isReady;
  const index = editor.blocks.getCurrentBlockIndex();
  const tool = style.tool || style.value;

  if (index < 0) {
    editor.blocks.insert(tool, buildBlockData(style, ''), {}, 0, true);
    return;
  }

  const output = await editor.save();
  const current = output?.blocks?.[index];
  const currentKey = styleKeyForBlock(current);
  if (currentKey === styleKey) return;

  const html = getHtmlFromBlock(current);
  const plain = getPlainTextFromBlock(current);
  const text = html || plain;

  // Clear saved range — it points to the block we're about to delete
  savedEditorRange = null;

  editor.blocks.delete(index);
  editor.blocks.insert(tool, buildBlockData(style, text), {}, index, true);
};

const EMPTY_LIST_ITEM = { content: '', meta: {}, items: [] };

/**
 * Build valid block data for blocks.insert (List v2 needs items[], not just style).
 */
export const buildInsertBlockData = async (editor, tool, overrides = null) => {
  const customTools = new Set(['image', 'gallery', 'grid']);
  if (customTools.has(tool)) {
    return overrides ?? {};
  }

  if (typeof editor.blocks.composeBlockData === 'function') {
    try {
      const composed = await editor.blocks.composeBlockData(tool);
      if (!overrides) {
        return composed;
      }
      if (tool === 'list') {
        return {
          ...composed,
          ...overrides,
          items: overrides.items ?? composed.items ?? [EMPTY_LIST_ITEM],
        };
      }
      return { ...composed, ...overrides };
    } catch {
      // fall through to manual defaults
    }
  }

  if (tool === 'list') {
    return {
      style: overrides?.style || 'unordered',
      meta: {},
      items: overrides?.items ?? [EMPTY_LIST_ITEM],
    };
  }

  if (tool === 'table') {
    return (
      overrides ?? {
        withHeadings: true,
        content: [
          ['', ''],
          ['', ''],
        ],
      }
    );
  }

  return overrides ?? {};
};

export const insertBlockAtCursor = async (editor, tool, overrides = null) => {
  await editor.isReady;

  const blockCount = editor.blocks.getBlocksCount() ?? 0;
  const currentIndex = editor.blocks.getCurrentBlockIndex?.() ?? -1;
  const insertAt =
    currentIndex >= 0 && currentIndex < blockCount ? currentIndex + 1 : blockCount;

  const blockData = await buildInsertBlockData(editor, tool, overrides);

  try {
    editor.blocks.insert(tool, blockData, {}, insertAt, true);
  } catch (error) {
    console.warn(`Insert "${tool}" at ${insertAt} failed, retrying at end:`, error);
    editor.blocks.insert(tool, blockData, {}, blockCount, true);
  }

  try {
    if (editor.caret?.setToLastBlock) {
      editor.caret.setToLastBlock('end', 0);
    } else {
      editor.focus?.();
    }
  } catch {
    // ignore focus errors after insert
  }
};

export const parseVideoEmbed = (url) => {
  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }

  const youtubeMatch = trimmed.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/i
  );
  if (youtubeMatch) {
    const id = youtubeMatch[1];
    return {
      service: 'youtube',
      source: trimmed,
      embed: `https://www.youtube.com/embed/${id}`,
      width: 580,
      height: 320,
    };
  }

  const vimeoMatch = trimmed.match(/vimeo\.com\/(\d+)/i);
  if (vimeoMatch) {
    return {
      service: 'vimeo',
      source: trimmed,
      embed: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
      width: 580,
      height: 320,
    };
  }

  return {
    service: 'youtube',
    source: trimmed,
    embed: trimmed,
    width: 580,
    height: 320,
  };
};
