import './App.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AtomicBlockUtils, EditorState } from 'draft-js';
import { convertToRaw } from 'draft-js';
import draftToHtml from 'draftjs-to-html';
import { Editor } from 'react-draft-wysiwyg';
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';
import { uploadImage } from './api/uploader';
import { GalleryBlock, GridBlock, ImageBlock } from './components/editor/AtomicBlocks';
import {
  InsertGalleryButton,
  InsertGridButton,
  UploadImageButton,
} from './components/editor/ToolbarButtons';
import { customEntityTransform } from './utils/editorTransforms';

const BODY_API_TYPES = new Set(['sport', 'game', 'team', 'person', 'venue']);

const extractPlainText = (html) =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const computeReadTime = (html, wpm = 130) => {
  if (!html) {
    return 0;
  }

  const plainText = extractPlainText(html);
  if (!plainText) {
    return 0;
  }

  const wordCount = plainText.split(' ').length;
  const minutes = wordCount / wpm;
  return Math.round(minutes * 10) / 10;
};

function SaveLogPanel({ title, data }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </section>
  );
}

function App() {
  const [editorState, setEditorState] = useState(() => EditorState.createEmpty());
  const [expanded, setExpanded] = useState(false);
  const [apiType, setApiType] = useState('article');
  const [contentId, setContentId] = useState('content-1001');
  const [readOnly, setReadOnly] = useState(false);
  const [saveHistory, setSaveHistory] = useState([]);
  const [formikFields, setFormikFields] = useState({
    articleContent: '',
    readTime: 0,
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('idle');
  const [uploadTrace, setUploadTrace] = useState([]);
  const [gridSelection, setGridSelection] = useState({ rows: 1, columns: 1 });

  const blobUrlsRef = useRef([]);

  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      blobUrlsRef.current = [];
    };
  }, []);

  const editorHtml = useMemo(
    () =>
      draftToHtml(convertToRaw(editorState.getCurrentContent()), undefined, false, customEntityTransform),
    [editorState]
  );
  const normalizedText = extractPlainText(editorHtml);
  const readTime = computeReadTime(editorHtml);

  const saveData = (id, type, key, payload) => {
    const saveEntry = {
      timestamp: new Date().toISOString(),
      contentId: id,
      apiType: type,
      contentKey: key,
      payload,
    };

    setSaveHistory((currentHistory) => [saveEntry, ...currentHistory]);
  };

  const appendTrace = (message) => {
    setUploadTrace((current) => [
      {
        at: new Date().toISOString(),
        message,
      },
      ...current,
    ]);
  };

  const uploadFilesWithPreview = async (files) => {
    const urls = [];
    setIsUploading(true);
    setUploadStatus('in-progress');
    appendTrace(`Starting upload for ${files.length} file(s)`);

    try {
      for (const file of files) {
        const cdnUrl = await uploadImage(file, {
          setUploadStatus: () => {},
          onTrace: (stage) => appendTrace(`${file.name}: ${stage}`),
        });
        const blobUrl = URL.createObjectURL(file);
        blobUrlsRef.current.push(blobUrl);
        urls.push(blobUrl);
        appendTrace(`${file.name}: uploaded -> ${cdnUrl}`);
        appendTrace(`${file.name}: local-preview-url-created`);
      }

      setUploadStatus('success');
      appendTrace(`Upload success for ${files.length} file(s)`);
      return urls;
    } catch (error) {
      setUploadStatus('failed');
      appendTrace(`Upload failed: ${error.message}`);
      return [];
    } finally {
      setIsUploading(false);
    }
  };

  const insertAtomicBlock = useCallback((entityType, entityData) => {
    setEditorState((currentState) => {
      const currentContent = currentState.getCurrentContent();
      const contentWithEntity = currentContent.createEntity(entityType, 'IMMUTABLE', entityData);
      const entityKey = contentWithEntity.getLastCreatedEntityKey();
      const nextState = EditorState.set(currentState, { currentContent: contentWithEntity });
      return AtomicBlockUtils.insertAtomicBlock(nextState, entityKey, ' ');
    });
  }, []);

  const insertImageIntoEditor = (src) => {
    insertAtomicBlock('IMAGE', { src });
  };

  const insertGalleryBlock = (urls) => {
    insertAtomicBlock('GALLERY', { urls });
  };

  const insertGridBlock = (urls, columns) => {
    insertAtomicBlock('GRID', { urls, columns });
  };

  const handleImageFiles = async (files) => {
    const file = files[0];
    if (!file) {
      return;
    }

    const [url] = await uploadFilesWithPreview([file]);
    if (url) {
      insertImageIntoEditor(url);
    }
  };

  const handleGalleryFiles = async (files) => {
    if (!files.length) {
      return;
    }

    const urls = await uploadFilesWithPreview(files);
    if (!urls.length) {
      return;
    }

    insertGalleryBlock(urls);
  };

  const handleGridFiles = async (files) => {
    if (!files.length) {
      return;
    }

    const urls = await uploadFilesWithPreview(files);
    if (!urls.length) {
      return;
    }

    const totalCells = gridSelection.rows * gridSelection.columns;
    const gridUrls = urls.slice(0, totalCells);
    insertGridBlock(gridUrls, gridSelection.columns);
  };

  const blockRendererFn = (contentBlock) => {
    if (contentBlock.getType() !== 'atomic') {
      return null;
    }

    const entityKey = contentBlock.getEntityAt(0);
    if (!entityKey) {
      return null;
    }

    const entity = editorState.getCurrentContent().getEntity(entityKey);
    const type = entity.getType();

    if (type === 'IMAGE') {
      return {
        component: ImageBlock,
        editable: false,
        props: {},
      };
    }

    if (type === 'GALLERY') {
      return {
        component: GalleryBlock,
        editable: false,
        props: {},
      };
    }

    if (type === 'GRID') {
      return {
        component: GridBlock,
        editable: false,
        props: {},
      };
    }

    return null;
  };

  const editorDataSave = (html) => {
    const lowerApiType = apiType.toLowerCase();

    if (lowerApiType === 'event') {
      saveData(contentId, apiType, 'details', html);
      return;
    }

    if (BODY_API_TYPES.has(lowerApiType)) {
      saveData(contentId, apiType, 'body', html);
      return;
    }

    if (lowerApiType === 'article') {
      const contentBodyData = {
        articleContent: html || '',
        readTime: computeReadTime(html),
        isPublish: false,
      };

      setFormikFields({
        articleContent: contentBodyData.articleContent,
        readTime: contentBodyData.readTime,
      });
      saveData(contentId, apiType, 'articleBody', contentBodyData);
    }
  };

  const toolbarDisabled = readOnly || isUploading;

  return (
    <div className="App">
      <h1>RTE</h1>

      <div className="controls">
        <label htmlFor="content-id">Content ID</label>
        <input
          id="content-id"
          value={contentId}
          onChange={(event) => setContentId(event.target.value)}
        />

        <label htmlFor="api-type">API Type</label>
        <select
          id="api-type"
          value={apiType}
          onChange={(event) => setApiType(event.target.value)}
        >
          <option value="article">article</option>
          <option value="event">event</option>
          <option value="sport">sport</option>
          <option value="game">game</option>
          <option value="team">team</option>
          <option value="person">person</option>
          <option value="venue">venue</option>
        </select>

        <label htmlFor="readonly-toggle" className="checkbox">
          <input
            id="readonly-toggle"
            type="checkbox"
            checked={readOnly}
            onChange={(event) => setReadOnly(event.target.checked)}
          />
          Read only
        </label>
      </div>

      <section className="accordion">
        <button
          type="button"
          className="accordionHeader"
          onClick={() => setExpanded((currentExpanded) => !currentExpanded)}
          disabled={readOnly}
          aria-expanded={expanded}
        >
          EDITOR
          <span>{expanded ? '▲' : '▼'}</span>
        </button>
        {expanded && (
          <div className="accordionBody">
            <Editor
              readOnly={readOnly}
              editorState={editorState}
              onEditorStateChange={setEditorState}
              wrapperClassName="demo-wrapper"
              editorClassName="demo-editor"
              blockRendererFn={blockRendererFn}
              toolbarCustomButtons={[
                <UploadImageButton
                  key="upload-image"
                  disabled={toolbarDisabled}
                  onSelectFiles={handleImageFiles}
                />,
                <InsertGalleryButton
                  key="insert-gallery"
                  disabled={toolbarDisabled}
                  onSelectFiles={handleGalleryFiles}
                />,
                <InsertGridButton
                  key="insert-grid"
                  disabled={toolbarDisabled}
                  gridSelection={gridSelection}
                  setGridSelection={setGridSelection}
                  onSelectFiles={handleGridFiles}
                />,
              ]}
            />
            <button type="button" className="saveButton" onClick={() => editorDataSave(editorHtml)}>
              Save Content
            </button>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Computed Metadata</h2>
        <p>Word count: {normalizedText ? normalizedText.split(' ').length : 0}</p>
        <p>Read time (130 wpm): {readTime} min</p>
        <p>Upload status: {uploadStatus}</p>
      </section>

      <SaveLogPanel title="Formik-like Fields" data={formikFields} />
      <SaveLogPanel title="Upload Trace" data={uploadTrace.slice(0, 15)} />
      <SaveLogPanel title="Latest saveData payload" data={saveHistory[0] || {}} />
    </div>
  );
}

export default App;
