import { useEffect, useRef, useState } from 'react';
import EditorJS from '@editorjs/editorjs';
import Header from '@editorjs/header';
import Paragraph from '@editorjs/paragraph';
import List from '@editorjs/list';
import Code from '@editorjs/code';
import Quote from '@editorjs/quote';
import Embed from '@editorjs/embed';
import Table from '@editorjs/table';
import Underline from '@editorjs/underline';
import ImageTool from './tools/ImageTool';
import GalleryTool from './tools/GalleryTool';
import GridTool from './tools/GridTool';
import { clearHolder, destroyEditor } from './editorInstance';
import { createEmptyEditorData, normalizeEditorData } from './editorData';
import { buildInsertBlockData } from './editorToolbarUtils';

const INLINE_TOOLS = ['bold', 'italic', 'underline'];

const buildTools = (onUpload) => ({
  header: {
    class: Header,
    inlineToolbar: INLINE_TOOLS,
    config: {
      levels: [2, 3, 4],
      defaultLevel: 2,
      placeholder: 'Heading',
    },
  },
  paragraph: {
    class: Paragraph,
    inlineToolbar: INLINE_TOOLS,
    config: {
      placeholder: 'Start writing…',
      preserveBlank: true,
    },
  },
  list: {
    class: List,
    inlineToolbar: INLINE_TOOLS,
  },
  code: Code,
  quote: Quote,
  embed: {
    class: Embed,
    config: {
      services: {
        youtube: true,
        vimeo: true,
        instagram: true,
        twitter: true,
        facebook: true,
      },
    },
  },
  table: {
    class: Table,
    inlineToolbar: true,
  },
  underline: Underline,
  image: {
    class: ImageTool,
    config: { onUpload },
  },
  gallery: {
    class: GalleryTool,
    config: { onUpload },
  },
  grid: {
    class: GridTool,
    config: { onUpload },
  },
});

const focusEditor = (editor) => {
  try {
    if (editor.caret?.setToFirstBlock) {
      editor.caret.setToFirstBlock('end', 0);
      return;
    }
    editor.focus?.(true);
  } catch {
    editor.focus?.();
  }
};

const ensureEditableBlock = async (editor) => {
  await editor.isReady;
  if (editor.blocks.getBlocksCount() > 0) {
    return;
  }
  const blockData = await buildInsertBlockData(editor, 'paragraph', { text: '' });
  editor.blocks.insert('paragraph', blockData, {}, 0, true);
};

export const useEditorJS = (config = {}) => {
  const holderRef = useRef(null);
  const instanceRef = useRef(null);
  const onChangeRef = useRef(config.onChange);
  const onUploadRef = useRef(config.onUpload);
  const canEmitChangeRef = useRef(false);
  const initGenerationRef = useRef(0);
  const initialDataRef = useRef(
    normalizeEditorData(config.initialData || createEmptyEditorData())
  );
  const [editorReady, setEditorReady] = useState(false);

  useEffect(() => {
    onChangeRef.current = config.onChange;
    onUploadRef.current = config.onUpload;
  });

  useEffect(() => {
    const holder = holderRef.current;
    if (!holder) {
      return undefined;
    }

    const generation = ++initGenerationRef.current;
    let cancelled = false;

    canEmitChangeRef.current = false;
    setEditorReady(false);
    clearHolder(holder);

    const editor = new EditorJS({
      holder,
      autofocus: true,
      minHeight: 200,
      tools: buildTools((...args) => onUploadRef.current?.(...args)),
      data: initialDataRef.current,
      onChange: async () => {
        if (!canEmitChangeRef.current || !onChangeRef.current || !instanceRef.current) {
          return;
        }
        try {
          const data = await instanceRef.current.save();
          onChangeRef.current(normalizeEditorData(data));
        } catch (error) {
          console.error('Error saving editor data:', error);
        }
      },
    });

    instanceRef.current = editor;

    editor.isReady
      .then(async () => {
        if (cancelled || generation !== initGenerationRef.current) {
          destroyEditor(editor);
          return;
        }

        await ensureEditableBlock(editor);
        focusEditor(editor);
        canEmitChangeRef.current = true;
        setEditorReady(true);
      })
      .catch((error) => {
        console.error('Error initializing editor:', error);
        if (!cancelled) {
          setEditorReady(false);
        }
      });

    return () => {
      cancelled = true;
      canEmitChangeRef.current = false;
      setEditorReady(false);
      const instance = instanceRef.current;
      instanceRef.current = null;
      destroyEditor(instance);
      clearHolder(holder);
    };
  }, []);

  const save = async () => {
    if (!instanceRef.current) {
      return null;
    }
    try {
      const data = await instanceRef.current.save();
      return normalizeEditorData(data);
    } catch (error) {
      console.error('Error saving editor:', error);
      return null;
    }
  };

  const clear = async () => {
    if (!instanceRef.current) {
      return;
    }
    try {
      await instanceRef.current.clear();
      await ensureEditableBlock(instanceRef.current);
      focusEditor(instanceRef.current);
    } catch (error) {
      console.error('Error clearing editor:', error);
    }
  };

  const render = async (data) => {
    if (!instanceRef.current) {
      return;
    }
    try {
      await instanceRef.current.render(normalizeEditorData(data));
      await ensureEditableBlock(instanceRef.current);
      focusEditor(instanceRef.current);
    } catch (error) {
      console.error('Error rendering editor:', error);
    }
  };

  return {
    holderRef,
    save,
    clear,
    render,
    instance: instanceRef,
    editorReady,
  };
};
