import './App.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { uploadImage } from './api/uploader';
import EditorPanel from './components/editor/EditorPanel';
import { editorJSToHtml } from './utils/editorTransforms';

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
  const [editorData, setEditorData] = useState(null);
  const [expanded, setExpanded] = useState(true);
  const [apiType, setApiType] = useState('article');
  const [contentId, setContentId] = useState('content-1001');
  const [saveHistory, setSaveHistory] = useState([]);
  const [formikFields, setFormikFields] = useState({
    articleContent: '',
    readTime: 0,
  });
  const [uploadStatus, setUploadStatus] = useState('idle');
  const [uploadTrace, setUploadTrace] = useState([]);

  const editorSaveRef = useRef(null);
  const blobUrlsRef = useRef([]);

  const registerEditorSave = useCallback((saveFn) => {
    editorSaveRef.current = saveFn;
  }, []);

  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      blobUrlsRef.current = [];
    };
  }, []);

  const saveData = (id, type, key, payload) => {
    setSaveHistory((currentHistory) => [
      {
        timestamp: new Date().toISOString(),
        contentId: id,
        apiType: type,
        contentKey: key,
        payload,
      },
      ...currentHistory,
    ]);
  };

  const appendTrace = (message) => {
    setUploadTrace((current) => [
      { at: new Date().toISOString(), message },
      ...current,
    ]);
  };

  const uploadFilesWithPreview = useCallback(async (files) => {
    const urls = [];
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
      }
      setUploadStatus('success');
      return urls;
    } catch (error) {
      setUploadStatus('failed');
      appendTrace(`Upload failed: ${error.message}`);
      return [];
    }
  }, []);

  const editorHtml = useMemo(
    () => editorJSToHtml(editorData || { blocks: [] }),
    [editorData]
  );
  const normalizedText = extractPlainText(editorHtml);
  const readTime = computeReadTime(editorHtml);

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

  const handleSaveContent = async () => {
    const data = await editorSaveRef.current?.();
    if (data) {
      editorDataSave(editorJSToHtml(data));
    }
  };

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
      </div>

      <section className="accordion">
        <button
          type="button"
          className="accordionHeader"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
        >
          EDITOR
          <span>{expanded ? '▲' : '▼'}</span>
        </button>
        {expanded && (
          <div className="accordionBody">
            <EditorPanel
              onChange={setEditorData}
              onUpload={uploadFilesWithPreview}
              registerSave={registerEditorSave}
            />
            <button type="button" className="saveButton" onClick={handleSaveContent}>
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
