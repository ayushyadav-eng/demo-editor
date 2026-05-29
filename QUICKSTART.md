# Quick Start Guide - Editor.js

## Installation

```bash
npm install
```

## Start Development

```bash
npm start
```

Visit `http://localhost:3000`

## Your Custom API is Already Integrated! ✅

### How It Works

1. **User uploads image** via Editor.js UI
2. **ImageTool/GalleryTool/GridTool** triggers upload
3. **uploadFilesWithPreview()** in App.js calls your API
4. **uploadImage()** from `src/api/uploader.js` handles upload
5. **CDN URL returned** and displayed in editor
6. **HTML saved** with all metadata

### Code Flow

```
Editor.js Tools
       ↓
uploadFilesWithPreview() [App.js]
       ↓
uploadImage() [api/uploader.js]  ← YOUR CUSTOM API
       ↓
getPresignedUrls()        ← ViewLift API initialization
uploadChunk()              ← S3 upload
completeUpload()           ← Finalize
       ↓
CDN URL → Editor Block → HTML
```

## Switching from Mock to Real API

Your `src/api/uploader.js` has built-in mocks. To use real ViewLift API:

### Option 1: Environment Variables
Create `.env`:
```
REACT_APP_V3_API_URL=https://api.viewlift.com/v3
REACT_APP_V2_API_URL=https://api.viewlift.com/v2
REACT_APP_API_KEY=your-api-key
```

### Option 2: Update uploader.js
Replace mock functions in `src/api/uploader.js` with actual API calls:

```javascript
export async function getPresignedUrls({
  file,
  Authorization,
  xApiKey,
  selectedContentType,
}) {
  const response = await fetch(
    `${process.env.REACT_APP_V3_API_URL}/appcms/upload/init?type=${selectedContentType}`,
    {
      method: 'POST',
      headers: {
        'Authorization': Authorization,
        'x-api-key': xApiKey,
      },
      body: JSON.stringify({
        fileName: sanitizeFileName(file.name),
        fileSize: file.size,
      }),
    }
  );
  return response.json();
}
```

## Common Tasks

### Save Editor Content
```javascript
const handleSave = async () => {
  if (editorInstance.current) {
    const data = await editorInstance.current.save();
    const html = editorJSToHtml(data);
    editorDataSave(html);  // Your save logic
  }
};
```

### Get Editor Data
```javascript
const data = await editorInstance.current.save();
console.log('Blocks:', data.blocks);
console.log('Version:', data.version);
```

### Convert to HTML
```javascript
import { editorJSToHtml } from './utils/editorTransforms';

const html = editorJSToHtml(editorData);
// html = "<p>Text</p><img .../><div class='gallery'>..."
```

### Access Upload Logs
- Check UI's "Upload Trace" panel
- Shows all upload stages
- Includes file names and CDN URLs

## Editor Features

### Built-in Tools
- Paragraph (text editor)
- Headers (H1-H6)
- Lists (ordered & unordered)
- Code blocks
- Quotes
- Embeds (YouTube, Vimeo, etc.)
- Divider

### Custom Tools
- **Image** - Single image with caption
- **Gallery** - Multi-image gallery
- **Grid** - Image grid with configurable columns

### Keyboard Shortcuts
- `Ctrl/Cmd + B` - Bold
- `Ctrl/Cmd + I` - Italic
- `Ctrl/Cmd + U` - Underline
- `Ctrl/Cmd + /` - Show command palette
- `Tab` - Indent
- `Shift + Tab` - Outdent

## Metadata

Automatically calculated:
- **Word Count** - From extracted plain text
- **Read Time** - Based on 130 wpm
- **Upload Status** - idle, in-progress, success, failed

## Project Structure

```
src/
├── App.js                           # Main editor component
├── api/
│   └── uploader.js                 # YOUR CUSTOM API
├── components/editor/
│   ├── EditorJSWrapper.jsx         # Editor.js hook wrapper
│   ├── AtomicBlocks.jsx            # Legacy (deprecated)
│   ├── ToolbarButtons.jsx          # Legacy (deprecated)
│   └── tools/
│       ├── ImageTool.jsx           # Single image upload
│       ├── GalleryTool.jsx         # Multi-image gallery
│       └── GridTool.jsx            # Grid layout
└── utils/
    └── editorTransforms.js         # JSON to HTML conversion
```

## Testing

### Upload Test
1. Click "EDITOR" to expand
2. Click Image/Gallery/Grid button
3. Select images
4. Check "Upload Trace" for logs
5. Verify images appear

### Content Test
1. Type text in editor
2. Add headings, lists, quotes
3. Insert images/gallery/grid
4. Click "Save Content"
5. Check console for data

### HTML Test
```javascript
import { editorJSToHtml } from './utils/editorTransforms';

const data = await editor.save();
const html = editorJSToHtml(data);
console.log(html);  // Should contain all HTML elements
```

## Troubleshooting

### Editor Not Showing
- Check if DOM element `<div id="editorjs">` exists
- Verify browser console for errors
- Ensure dependencies are installed

### Upload Not Working
- Check network tab for API errors
- Verify `uploadImage()` function works
- Check file size limits
- Ensure CORS configured

### HTML Empty
- Verify editor has blocks
- Check `editorJSToHtml()` function
- Log editor data: `console.log(editorData.blocks)`

### Wrong Image URLs
- Check if `onUpload` returns valid URLs
- Verify CDN endpoint
- Check authorization headers

## Production Build

```bash
npm run build
```

This creates:
- `build/` folder
- Optimized bundle
- Ready to deploy

Serve with:
```bash
serve -s build
```

## Documentation

- **MIGRATION_GUIDE.md** - Complete details
- **EDITOR_JS_REFERENCE.md** - API reference
- **CUSTOM_API_INTEGRATION.md** - Your API docs
- **MIGRATION_COMPLETE.md** - Full summary

## Key Differences from Draft.js

| Aspect | Draft.js | Editor.js |
|--------|----------|-----------|
| State | Complex EditorState | Simple JSON blocks |
| Output | Special conversion | Native JSON/HTML |
| React 19 | ❌ Deprecated | ✅ Supported |
| Learning | Steep | Moderate |
| Extensibility | Hard | Easy with tools |

## Next Steps

1. ✅ Dependencies installed
2. ✅ Custom API integrated
3. ✅ Editor running
4. 🔄 Switch mock → real API (optional)
5. 🔄 Add more tools (optional)
6. 🔄 Deploy to production (when ready)

---

**Happy editing!** 🎉

For more details, see the documentation files or visit [editorjs.io](https://editorjs.io)
