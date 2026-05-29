import { useEffect } from 'react';
import EditorToolbar from './EditorToolbar';
import { useEditorJS } from './EditorJSWrapper';

/**
 * Mounts only while the accordion is open so Editor.js always has a live DOM holder.
 */
export default function EditorPanel({ onChange, onUpload, registerSave }) {
  const { holderRef, instance, editorReady, save } = useEditorJS({
    onChange,
    onUpload,
  });

  useEffect(() => {
    if (registerSave) {
      registerSave(save);
      return () => registerSave(null);
    }
    return undefined;
  }, [registerSave, save]);

  return (
    <div className="rte-shell">
      <EditorToolbar
        editorInstance={instance}
        holderRef={holderRef}
        editorReady={editorReady}
        onUploadFiles={onUpload}
      />
      <div ref={holderRef} className="demo-editor" />
    </div>
  );
}
