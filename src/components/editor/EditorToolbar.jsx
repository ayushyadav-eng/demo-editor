import { useCallback, useEffect, useRef, useState } from 'react';
import { GRID_SIZE_LIMIT } from './tools/GridTool';
import {
  BLOCK_STYLES,
  convertCurrentBlock,
  execOnSelection,
  getBlockStyleKey,
  insertBlockAtCursor,
  insertLink,
  parseVideoEmbed,
  saveEditorSelection,
} from './editorToolbarUtils';

function ToolbarButton({ title, label, onClick, disabled, className = '', holderRef }) {
  return (
    <button
      type="button"
      className={`rdw-option-wrapper ${className}`.trim()}
      title={title}
      disabled={disabled}
      onMouseDown={(event) => {
        event.preventDefault();
        saveEditorSelection(holderRef);
      }}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function ToolbarDivider() {
  return <span className="rte-toolbar__divider" aria-hidden="true" />;
}

export default function EditorToolbar({
  editorInstance,
  holderRef,
  editorReady,
  onUploadFiles,
}) {
  const [blockStyle, setBlockStyle] = useState('paragraph');
  const [gridOpen, setGridOpen] = useState(false);
  const [gridSelection, setGridSelection] = useState({ rows: 2, columns: 2 });
  const galleryInputRef = useRef(null);
  const imageInputRef = useRef(null);

  const isDisabled = !editorReady;

  useEffect(() => {
    const editor = editorInstance?.current;
    const holder = holderRef?.current;
    if (!editor || !holder || !editorReady) {
      return undefined;
    }

    const syncBlockStyle = () => {
      getBlockStyleKey(editor).then((key) => {
        if (key) {
          setBlockStyle(key);
        }
      });
    };

    syncBlockStyle();
    holder.addEventListener('click', syncBlockStyle);
    holder.addEventListener('keyup', syncBlockStyle);

    return () => {
      holder.removeEventListener('click', syncBlockStyle);
      holder.removeEventListener('keyup', syncBlockStyle);
    };
  }, [editorInstance, editorReady, holderRef]);

  const withEditor = useCallback(
    async (fn) => {
      const editor = editorInstance?.current;
      if (!editor || isDisabled) {
        return;
      }
      try {
        await editor.isReady;
        await fn(editor);
      } catch (error) {
        console.error('Toolbar action failed:', error);
      }
    },
    [editorInstance, isDisabled]
  );

  const handleBlockStyleChange = (event) => {
    const value = event.target.value;
    setBlockStyle(value);
    withEditor(async (editor) => {
      await convertCurrentBlock(editor, value);
      const key = await getBlockStyleKey(editor);
      if (key) {
        setBlockStyle(key);
      }
    });
  };

  const handleInsertGrid = () => {
    withEditor((editor) =>
      insertBlockAtCursor(editor, 'grid', {
        columns: gridSelection.columns,
        urls: [],
      })
    );
    setGridOpen(false);
  };

  const handleGalleryFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length || !onUploadFiles) {
      return;
    }

    const urls = await onUploadFiles(files);
    if (!urls.length) {
      return;
    }

    await withEditor((editor) => insertBlockAtCursor(editor, 'gallery', { urls }));
  };

  const handleImageFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length || !onUploadFiles) {
      return;
    }

    const urls = await onUploadFiles(files);
    if (!urls.length) {
      return;
    }

    await withEditor((editor) => insertBlockAtCursor(editor, 'image', { url: urls[0] }));
  };

  const handleInsertVideo = () => {
    const url = window.prompt('Paste video URL (YouTube or Vimeo)');
    if (!url) {
      return;
    }
    const data = parseVideoEmbed(url);
    if (data) {
      withEditor((editor) => insertBlockAtCursor(editor, 'embed', data));
    }
  };

  return (
    <div
      className="rdw-editor-toolbar rte-toolbar"
      role="toolbar"
      aria-label="Editor formatting"
      onMouseDown={() => saveEditorSelection(holderRef)}
    >
      <div className="rdw-block-type-wrapper">
        <select
          className="rdw-dropdown-selectedtext rte-block-style"
          value={blockStyle}
          disabled={isDisabled}
          onChange={handleBlockStyleChange}
          onMouseDown={(event) => {
            event.stopPropagation();
            saveEditorSelection(holderRef);
          }}
        >
          {BLOCK_STYLES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <ToolbarDivider />

      <div className="rdw-inline-wrapper rte-toolbar__group">
        <ToolbarButton
          title="Bold"
          label={<strong>B</strong>}
          disabled={isDisabled}
          holderRef={holderRef}
          onClick={() => execOnSelection(holderRef, 'bold')}
        />
        <ToolbarButton
          title="Italic"
          label={<em>I</em>}
          disabled={isDisabled}
          holderRef={holderRef}
          onClick={() => execOnSelection(holderRef, 'italic')}
        />
        <ToolbarButton
          title="Strikethrough"
          label={<s>S</s>}
          disabled={isDisabled}
          holderRef={holderRef}
          onClick={() => execOnSelection(holderRef, 'strikeThrough')}
        />
        <ToolbarButton
          title="Underline"
          label={<u>U</u>}
          disabled={isDisabled}
          holderRef={holderRef}
          onClick={() => execOnSelection(holderRef, 'underline')}
        />
      </div>

      <ToolbarDivider />

      <div className="rdw-inline-wrapper rte-toolbar__group">
        <label className="rte-color" title="Text color">
          <span className="rte-color__label">A</span>
          <input
            type="color"
            defaultValue="#000000"
            disabled={isDisabled}
            onChange={(event) => execOnSelection(holderRef, 'foreColor', event.target.value)}
          />
        </label>
        <label className="rte-color" title="Highlight color">
          <span className="rte-color__label rte-color__label--highlight">A</span>
          <input
            type="color"
            defaultValue="#ffff00"
            disabled={isDisabled}
            onChange={(event) => execOnSelection(holderRef, 'hiliteColor', event.target.value)}
          />
        </label>
      </div>

      <ToolbarDivider />

      <div className="rdw-inline-wrapper rte-toolbar__group">
        <ToolbarButton
          title="Numbered list"
          label="1."
          disabled={isDisabled}
          holderRef={holderRef}
          onClick={() => withEditor((editor) => insertBlockAtCursor(editor, 'list', { style: 'ordered' }))}
        />
        <ToolbarButton
          title="Bullet list"
          label="•"
          disabled={isDisabled}
          holderRef={holderRef}
          onClick={() => withEditor((editor) => insertBlockAtCursor(editor, 'list', { style: 'unordered' }))}
        />
        <ToolbarButton
          title="Decrease indent"
          label="⇤"
          disabled={isDisabled}
          holderRef={holderRef}
          onClick={() => execOnSelection(holderRef, 'outdent')}
        />
        <ToolbarButton
          title="Increase indent"
          label="⇥"
          disabled={isDisabled}
          holderRef={holderRef}
          onClick={() => execOnSelection(holderRef, 'indent')}
        />
        <ToolbarButton
          title="Align left"
          label="≡"
          disabled={isDisabled}
          holderRef={holderRef}
          onClick={() => execOnSelection(holderRef, 'justifyLeft')}
        />
      </div>

      <ToolbarDivider />

      <div className="rdw-inline-wrapper rte-toolbar__group">
        <ToolbarButton
          title="Insert table"
          label="▦"
          disabled={isDisabled}
          holderRef={holderRef}
          onClick={() => withEditor((editor) => insertBlockAtCursor(editor, 'table'))}
        />

        <span className="rdw-custom-toolbar-btn">
          <ToolbarButton
            title="Insert image"
            label="🖼"
            disabled={isDisabled}
            holderRef={holderRef}
            onClick={() => imageInputRef.current?.click()}
          />
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hiddenInput"
            onChange={handleImageFiles}
          />
        </span>

        <span className="rdw-custom-toolbar-btn">
          <ToolbarButton
            title="Insert gallery"
            label="Insert gallery"
            disabled={isDisabled}
            holderRef={holderRef}
            className="rte-toolbar__text-btn"
            onClick={() => galleryInputRef.current?.click()}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hiddenInput"
            onChange={handleGalleryFiles}
          />
        </span>

        <span className="rdw-insert-grid-wrapper">
          <ToolbarButton
            title="Insert grid"
            label="Insert Grid ▾"
            disabled={isDisabled}
            holderRef={holderRef}
            className="rte-toolbar__text-btn"
            onClick={() => setGridOpen((open) => !open)}
          />
          {gridOpen && (
            <div className="rdw-insert-grid-popover">
              <p>Select grid size</p>
              <div className="gridCells">
                {Array.from({ length: GRID_SIZE_LIMIT }, (_, rowIndex) =>
                  Array.from({ length: GRID_SIZE_LIMIT }, (_, columnIndex) => {
                    const isActive =
                      rowIndex < gridSelection.rows && columnIndex < gridSelection.columns;
                    return (
                      <button
                        key={`${rowIndex}-${columnIndex}`}
                        type="button"
                        className={`gridCell ${isActive ? 'active' : ''}`}
                        onMouseEnter={() =>
                          setGridSelection({ rows: rowIndex + 1, columns: columnIndex + 1 })
                        }
                        onClick={handleInsertGrid}
                      />
                    );
                  })
                )}
              </div>
              <p>
                {gridSelection.rows} × {gridSelection.columns}
              </p>
            </div>
          )}
        </span>

        <ToolbarButton
          title="Insert link"
          label="🔗"
          disabled={isDisabled}
          holderRef={holderRef}
          onClick={() => insertLink(holderRef)}
        />
        <ToolbarButton
          title="Insert video"
          label="Insert Video"
          disabled={isDisabled}
          holderRef={holderRef}
          className="rte-toolbar__text-btn"
          onClick={handleInsertVideo}
        />
      </div>

      <ToolbarDivider />

      <div className="rdw-inline-wrapper rte-toolbar__group">
        <ToolbarButton
          title="Undo"
          label="↶"
          disabled={isDisabled}
          holderRef={holderRef}
          onClick={() => execOnSelection(holderRef, 'undo')}
        />
        <ToolbarButton
          title="Redo"
          label="↷"
          disabled={isDisabled}
          holderRef={holderRef}
          onClick={() => execOnSelection(holderRef, 'redo')}
        />
      </div>

      {!editorReady && (
        <span className="rte-toolbar__loading">Loading editor…</span>
      )}
    </div>
  );
}
