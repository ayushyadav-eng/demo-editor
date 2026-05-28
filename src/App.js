import './App.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AtomicBlockUtils, EditorState } from 'draft-js';
import { convertToRaw } from 'draft-js';
import draftToHtml from 'draftjs-to-html';
import { Editor } from 'react-draft-wysiwyg';
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';

const BODY_API_TYPES = new Set(['sport', 'game', 'team', 'person', 'venue']);
const GRID_SIZE_LIMIT = 10;

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

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runUploadLifecycle = async (file, onStageChange) => {
  const uploadId = `upload-${Date.now()}`;
  const safeFileName = file.name.replace(/\s+/g, '-').toLowerCase();
  const key = `${Date.now()}-${safeFileName}`;

  onStageChange('init');
  await wait(180);

  onStageChange('signedUrls');
  await wait(180);

  onStageChange('upload');
  await wait(200);

  onStageChange('complete');
  await wait(160);

  onStageChange('persistImageMetadata');
  await wait(160);

  const url = `https://cdn.mock-viewlift.dev/content/images/${key}`;
  return {
    default: url,
    metadata: {
      uploadId,
      key,
      filename: file.name,
      size: file.size,
      mimeType: file.type,
    },
  };
};

const buildGalleryHtml = (urls) => {
  const items = urls
    .map((src) => `<figure class="gallery-item"><img src="${src}" alt="" /></figure>`)
    .join('');
  return `<div class="gallery">${items}</div>`;
};

const buildGridHtml = (urls, columns) => {
  const items = urls
    .map((src) => `<figure class="grid-item"><img src="${src}" alt="" /></figure>`)
    .join('');
  return `<div class="grid" style="display:grid;gap:12px;grid-template-columns:repeat(${columns}, 1fr)">${items}</div>`;
};

function SaveLogPanel({ title, data }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </section>
  );
}

function InlineCustomBlocks({ blocks }) {
  if (!blocks.length) {
    return null;
  }

  return (
    <div className="inlineCustomBlocks">
      {blocks.map((block, index) => (
        <div
          // Index is acceptable for this local POC list because items are append-only.
          key={`${block.type}-${index}`}
          className="inlineCustomBlock"
          dangerouslySetInnerHTML={{ __html: block.html }}
        />
      ))}
    </div>
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
  const [customBlocks, setCustomBlocks] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('idle');
  const [uploadTrace, setUploadTrace] = useState([]);
  const [gridSelection, setGridSelection] = useState({ rows: 1, columns: 1 });

  const imageInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const gridInputRef = useRef(null);
  const blobUrlsRef = useRef([]);
  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      blobUrlsRef.current = [];
    };
  }, []);


  const editorHtml = useMemo(
    () => draftToHtml(convertToRaw(editorState.getCurrentContent())),
    [editorState]
  );
  const composedHtml = `${editorHtml}${customBlocks.map((block) => block.html).join('')}`;
  const normalizedText = extractPlainText(composedHtml);
  const readTime = computeReadTime(composedHtml);

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

  const uploadFiles = async (files) => {
    const urls = [];
    setIsUploading(true);
    setUploadStatus('in-progress');
    appendTrace(`Starting upload for ${files.length} file(s)`);

    try {
      for (const file of files) {
        await runUploadLifecycle(file, (stage) => {
          appendTrace(`${file.name}: ${stage}`);
        });
        const blobUrl = URL.createObjectURL(file);
        blobUrlsRef.current.push(blobUrl);
        urls.push(blobUrl);
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

  const insertImageIntoEditor = (src) => {
    const currentContent = editorState.getCurrentContent();
    const contentWithEntity = currentContent.createEntity('IMAGE', 'IMMUTABLE', { src });
    const entityKey = contentWithEntity.getLastCreatedEntityKey();
    const nextState = EditorState.set(editorState, { currentContent: contentWithEntity });
    setEditorState(AtomicBlockUtils.insertAtomicBlock(nextState, entityKey, ' '));
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    const [url] = await uploadFiles([file]);
    if (url) {
      insertImageIntoEditor(url);
    }
  };

  const handleGalleryInsert = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) {
      return;
    }

    const urls = await uploadFiles(files);
    if (!urls.length) {
      return;
    }

    setCustomBlocks((current) => [
      ...current,
      {
        type: 'gallery',
        html: buildGalleryHtml(urls),
      },
    ]);
  };

  const handleGridInsert = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) {
      return;
    }

    const urls = await uploadFiles(files);
    if (!urls.length) {
      return;
    }

    const totalCells = gridSelection.rows * gridSelection.columns;
    const gridUrls = urls.slice(0, totalCells);

    setCustomBlocks((current) => [
      ...current,
      {
        type: 'grid',
        html: buildGridHtml(gridUrls, gridSelection.columns),
      },
    ]);
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

  return (
    <div className="App">
      <h1>CKEditor Parity POC</h1>

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
            <div className="toolbarActions">
              <button type="button" onClick={() => imageInputRef.current?.click()} disabled={readOnly || isUploading}>
                Upload Image
              </button>
              <button type="button" onClick={() => galleryInputRef.current?.click()} disabled={readOnly || isUploading}>
                Insert Gallery
              </button>
              <button type="button" onClick={() => gridInputRef.current?.click()} disabled={readOnly || isUploading}>
                Insert Grid
              </button>
            </div>

            <div className="gridSelector">
              <span>Grid selection (10x10 parity):</span>
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
                        onClick={() => setGridSelection({ rows: rowIndex + 1, columns: columnIndex + 1 })}
                        disabled={readOnly}
                        aria-label={`Select ${rowIndex + 1} by ${columnIndex + 1}`}
                      />
                    );
                  })
                )}
              </div>
              <p>
                Selected: {gridSelection.rows} x {gridSelection.columns}
              </p>
            </div>

            <Editor
              readOnly={readOnly}
              editorState={editorState}
              onEditorStateChange={setEditorState}
              wrapperClassName="demo-wrapper"
              editorClassName="demo-editor"
            />
            <div className="demo-wrapper inlineBlocksWrapper">
              <InlineCustomBlocks blocks={customBlocks} />
            </div>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hiddenInput"
              onChange={handleImageUpload}
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hiddenInput"
              onChange={handleGalleryInsert}
            />
            <input
              ref={gridInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hiddenInput"
              onChange={handleGridInsert}
            />
            <button type="button" className="saveButton" onClick={() => editorDataSave(composedHtml)}>
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
