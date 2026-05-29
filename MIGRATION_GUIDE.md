# Draft.js to Editor.js Migration Guide

## Overview
This document outlines the migration from Draft.js to Editor.js for the demo-editor project. This migration was necessary because Draft.js is deprecated in React 19 and Editor.js provides a more modern, maintainable alternative.

## Changes Made

### 1. **Dependencies** (`package.json`)

#### Removed:
- `draft-js` (^0.11.7)
- `react-draft-wysiwyg` (^1.15.0)
- `draftjs-to-html` (^0.9.1)

#### Added:
- `@editorjs/editorjs` (^2.28.0) - Core Editor.js library
- `@editorjs/header` (^2.7.0) - Header block tool
- `@editorjs/paragraph` (^2.11.0) - Paragraph block tool
- `@editorjs/list` (^2.8.1) - List block tool
- `@editorjs/code` (^2.9.0) - Code block tool
- `@editorjs/embed` (^2.5.3) - Embed block tool
- `@editorjs/quote` (^2.5.0) - Quote block tool
- `@editorjs/image` (^2.8.1) - Image block tool
- `editorjs-html` (^1.8.1) - Convert Editor.js output to HTML

### 2. **New Component: EditorJSWrapper** (`src/components/editor/EditorJSWrapper.jsx`)

Created a custom React hook `useEditorJS()` that:
- Initializes Editor.js instance with all configured tools
- Handles readOnly state management
- Provides methods: `save()`, `clear()`, `render()`
- Returns editor ref and instance for external access
- Manages cleanup on unmount

### 3. **Custom Tools** (`src/components/editor/tools/`)

#### **ImageTool.jsx**
- Handles single image uploads
- Supports drag-and-drop and file selection
- Stores image URL and optional caption
- Renders as HTML `<figure>` elements

#### **GalleryTool.jsx**
- Handles multiple image uploads
- Creates gallery block with multiple images
- Renders as `<div class="gallery">` containing multiple `<figure>` elements

#### **GridTool.jsx**
- Interactive grid selector (up to 10x10)
- Visual feedback for grid size selection
- Uploads images based on selected grid dimensions
- Renders as CSS grid with configurable columns

### 4. **Updated App.js**

#### State Changes:
- **OLD**: `editorState` (Draft.js EditorState object)
- **NEW**: `editorData` (Editor.js blocks format)

#### Removed:
- Draft.js imports: `EditorState`, `AtomicBlockUtils`, `convertToRaw`
- Draft.js conversion: `draftToHtml()`
- Draft.js components: `ImageBlock`, `GalleryBlock`, `GridBlock`
- Draft.js toolbar buttons: `UploadImageButton`, `InsertGalleryButton`, `InsertGridButton`
- `blockRendererFn()` - No longer needed (Editor.js tools handle rendering)
- `insertAtomicBlock()`, `insertImageIntoEditor()`, etc. - No longer needed

#### Added:
- `useEditorJS()` hook initialization
- `handleSaveContent()` - Calls editor.save() and converts to HTML

#### Kept:
- `uploadFilesWithPreview()` - Still handles image uploads
- `editorDataSave()` - Saves metadata and HTML
- `computeReadTime()`, `extractPlainText()` - Still calculate metrics
- State management for uploads, UI, and history

### 5. **Updated Utilities** (`src/utils/editorTransforms.js`)

#### New Functions:
- **`editorJSToHtml(editorData)`** - Main conversion function
  - Converts Editor.js blocks format to HTML
  - Handles all standard and custom block types

- **`blockToHtml(block)`** - Converts individual blocks
  - paragraph, header, list, code, quote, embed
  - image, gallery, grid (custom)
  - delimiter

- **Helper Functions**:
  - `listToHtml()` - Converts ordered/unordered lists
  - `embedToHtml()` - Handles YouTube, Vimeo, Instagram embeds
  - `galleryToHtml()` - Generates gallery HTML
  - `gridToHtml()` - Generates grid HTML with CSS styling
  - `escapeHtml()` - Sanitizes HTML special characters

#### Backward Compatibility:
- Kept `customEntityTransform()` with deprecation warning
- Allows gradual migration if needed

### 6. **Deprecated Components** (Kept for Reference)

#### AtomicBlocks.jsx
- Components marked as deprecated but kept in file
- Now return null with console warnings
- Can be safely removed after full migration

#### ToolbarButtons.jsx
- Button components marked as deprecated
- Now return null with console warnings
- Can be safely removed after full migration

## Editor.js Block Structure

### Input Format (Blocks):
```javascript
{
  blocks: [
    {
      id: "oUe47", // Auto-generated
      type: "paragraph",
      data: { text: "Example text" }
    },
    {
      type: "image",
      data: { url: "image.jpg", caption: "Image caption" }
    },
    {
      type: "gallery",
      data: { urls: ["img1.jpg", "img2.jpg"] }
    },
    {
      type: "grid",
      data: { urls: ["img1.jpg", "img2.jpg"], columns: 2 }
    }
  ],
  version: "2.28.0"
}
```

## Installation & Usage

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Use in Component**:
   ```javascript
   import { useEditorJS } from './components/editor/EditorJSWrapper';

   const { editorRef, save, instance } = useEditorJS({
     readOnly: false,
     initialData: { blocks: [] },
     onChange: (data) => console.log(data),
     onUpload: async (files) => [...urls]
   });

   // Save editor data
   const data = await save();
   ```

3. **Add Editor DOM**:
   ```jsx
   <div id="editorjs" ref={editorRef} />
   ```

## Migration Checklist

- [x] Remove Draft.js dependencies
- [x] Add Editor.js dependencies
- [x] Create Editor.js wrapper hook
- [x] Create custom image/gallery/grid tools
- [x] Update App.js state management
- [x] Update HTML conversion logic
- [x] Test editor functionality
- [x] Verify upload handling
- [x] Test read-only mode
- [] Optional: Remove deprecated component files (keep for now for reference)

## Key Differences

| Feature | Draft.js | Editor.js |
|---------|----------|-----------|
| **Architecture** | Lower-level, complex | Block-based, modular |
| **Toolbar** | Custom (react-draft-wysiwyg) | Built-in |
| **Block Extension** | Atomic blocks (complex) | Custom tools (simple) |
| **Output Format** | ContentState object | JSON blocks |
| **React 19** | Deprecated | Fully compatible |
| **Bundle Size** | Large | Smaller |
| **Learning Curve** | Steep | Moderate |

## Performance Improvements

- Lighter bundle size
- Faster initialization
- Better memory management
- Native block architecture
- Easier to extend with custom tools

## Testing Recommendations

1. Test text editing (paragraphs, headers, lists)
2. Test image upload functionality
3. Test gallery insertion and rendering
4. Test grid creation with various sizes
5. Test read-only mode
6. Test HTML output generation
7. Test metadata calculations (word count, read time)
8. Verify all upload traces are logged correctly

## Future Enhancements

1. Add markdown support via Editor.js plugins
2. Implement undo/redo persistence
3. Add collaborative editing features
4. Create custom tools for additional content types
5. Implement AI-powered content suggestions
6. Add SEO optimization tools

## Troubleshooting

### Editor not initializing
- Ensure DOM element with id="editorjs" exists
- Check browser console for error messages
- Verify all dependencies are installed

### Upload not working
- Verify `onUpload` callback is provided
- Check image file sizes
- Ensure CORS is properly configured

### HTML output empty
- Verify editor data contains blocks
- Check `editorJSToHtml()` is receiving correct data format
- Ensure all block types are handled in conversion function

## References

- [Editor.js Documentation](https://editorjs.io/)
- [Editor.js Tools](https://github.com/editor-js)
- [Editor.js Block API](https://editorjs.io/creating-a-block-tool)
