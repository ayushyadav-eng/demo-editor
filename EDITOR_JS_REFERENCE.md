# Editor.js Integration - Quick Reference

## File Structure

```
src/
├── App.js                              # Main app component (updated)
├── utils/
│   └── editorTransforms.js            # HTML conversion utilities (updated)
├── api/
│   └── uploader.js                    # Image upload handler
└── components/editor/
    ├── EditorJSWrapper.jsx            # Hook wrapper for Editor.js [NEW]
    ├── AtomicBlocks.jsx               # Legacy components (deprecated)
    ├── ToolbarButtons.jsx             # Legacy buttons (deprecated)
    └── tools/                         # Custom Editor.js tools [NEW]
        ├── ImageTool.jsx              # Single image upload
        ├── GalleryTool.jsx            # Multiple image gallery
        └── GridTool.jsx               # Grid layout with images
```

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Initialize Editor in App.js
```javascript
const { editorRef, save, instance } = useEditorJS({
  readOnly: false,
  initialData: { blocks: [] },
  onChange: (data) => console.log('Editor data:', data),
  onUpload: uploadFilesWithPreview
});
```

### 3. Add Editor DOM
```jsx
<div id="editorjs" ref={editorRef} className="demo-editor"></div>
```

## API Reference

### `useEditorJS(config)`

**Config Object:**
```javascript
{
  readOnly: boolean,              // Enable read-only mode
  initialData: object,            // Initial editor content
  onChange: (data) => void,       // Called when editor changes
  onUpload: (files) => Promise    // Upload handler
}
```

**Return Value:**
```javascript
{
  editorRef: RefObject,           // React ref for DOM
  save: () => Promise<object>,    // Save editor data
  clear: () => Promise<void>,     // Clear all blocks
  render: (data) => Promise,      // Render editor data
  instance: RefObject             // Editor instance
}
```

## Working with Editor Data

### Save Editor Data
```javascript
const handleSave = async () => {
  if (instance.current) {
    const data = await instance.current.save();
    // data = { blocks: [...], version: '2.28.0' }
    console.log('Saved data:', data);
  }
};
```

### Convert to HTML
```javascript
import { editorJSToHtml } from './utils/editorTransforms';

const html = editorJSToHtml(editorData);
// Returns: <p>Text</p><img src="..."/><div class="gallery">...</div>
```

### Load Data into Editor
```javascript
const handleLoad = async () => {
  if (instance.current) {
    await instance.current.render(editorData);
  }
};
```

## Supported Blocks

| Block Type | Editor.js Tool | Output HTML |
|-----------|-----------------|------------|
| Paragraph | paragraph | `<p>...</p>` |
| Heading 1-6 | header | `<h1>...</h1>` - `<h6>...</h6>` |
| Unordered List | list | `<ul><li>...</li></ul>` |
| Ordered List | list | `<ol><li>...</li></ol>` |
| Code | code | `<pre><code>...</code></pre>` |
| Quote | quote | `<blockquote><p>...</p></blockquote>` |
| Image | image | `<figure class="image"><img/></figure>` |
| Gallery | gallery [CUSTOM] | `<div class="gallery"><figure>...</figure></div>` |
| Grid | grid [CUSTOM] | `<div class="grid">...</div>` |
| Embed | embed | `<iframe>...</iframe>` |
| Divider | delimiter | `<hr/>` |

## Custom Tools

### ImageTool
- Single image upload
- Optional caption
- Drag-and-drop support
- Outputs: `{ type: 'image', data: { url: '...', caption: '...' } }`

### GalleryTool
- Multi-image upload
- Grid view of images
- Outputs: `{ type: 'gallery', data: { urls: [...] } }`

### GridTool
- Interactive grid selector (1-10x1-10)
- Upload images to grid cells
- Configurable columns
- Outputs: `{ type: 'grid', data: { urls: [...], columns: 2 } }`

## Upload Handler Example

```javascript
const uploadFilesWithPreview = async (files) => {
  const urls = [];
  
  for (const file of files) {
    try {
      const url = await uploadImage(file, { /* options */ });
      urls.push(url);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  }
  
  return urls; // Return array of image URLs
};
```

## Styling

### Editor Container
```css
#editorjs {
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 4px;
  min-height: 300px;
}

#editorjs .ce-block__content {
  max-width: 800px;
}
```

### Custom Block Styles
```css
/* Image blocks */
.image {
  margin: 20px 0;
}

/* Gallery blocks */
.gallery {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 20px 0;
}

.gallery-item {
  flex: 1;
  min-width: 150px;
}

/* Grid blocks */
.grid {
  display: grid;
  gap: 10px;
  margin: 20px 0;
}

.grid-item {
  aspect-ratio: 1;
  overflow: hidden;
}

.grid-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

## Common Tasks

### Get Block Count
```javascript
const blockCount = editorData.blocks.length;
```

### Filter by Type
```javascript
const images = editorData.blocks.filter(b => b.type === 'image');
const galleries = editorData.blocks.filter(b => b.type === 'gallery');
```

### Extract All Text
```javascript
const allText = editorData.blocks
  .filter(b => b.type === 'paragraph')
  .map(b => b.data.text)
  .join('\n');
```

### Calculate Word Count
```javascript
import { extractPlainText } from './App';

const html = editorJSToHtml(editorData);
const plainText = extractPlainText(html);
const wordCount = plainText.split(' ').length;
```

## Debugging

### Enable Debug Mode
```javascript
// In EditorJSWrapper.jsx, add to Editor.js config:
{
  // ... other config
  logLevel: 'VERBOSE'
}
```

### Inspect Block Data
```javascript
console.log('Current blocks:', editorData.blocks);
```

### Monitor Changes
```javascript
const { instance } = useEditorJS({
  onChange: (data) => {
    console.log('Editor changed:', data);
  }
});
```

## Best Practices

1. **Always await save()**: Editor.js methods are async
2. **Check instance.current**: Verify editor exists before operations
3. **Handle upload errors**: Provide user feedback on failures
4. **Validate block data**: Ensure required fields exist
5. **Sanitize HTML output**: Clean user-provided URLs and content
6. **Use refs carefully**: Editor instance is mutable
7. **Test with different data**: Try edge cases and large documents

## Migration from Draft.js

Old Draft.js approach:
```javascript
import { EditorState } from 'draft-js';
const [state, setState] = useState(() => EditorState.createEmpty());
```

New Editor.js approach:
```javascript
import { useEditorJS } from './components/editor/EditorJSWrapper';
const { instance, save } = useEditorJS({ /* config */ });
```

## Troubleshooting

### Editor shows blank
- Check if #editorjs DOM element exists
- Verify initialData format is correct
- Check browser console for errors

### Upload not working
- Verify onUpload callback is provided
- Check if files are being passed correctly
- Ensure backend accepts uploads

### HTML conversion issues
- Log editor data to see block structure
- Check editorJSToHtml handles all block types
- Verify custom tool output matches expected format

## Resources

- **Editor.js Docs**: https://editorjs.io/
- **Tools Repository**: https://github.com/editor-js/tools
- **Block API**: https://editorjs.io/creating-a-block-tool
- **Plugins**: https://editorjs.io/download
