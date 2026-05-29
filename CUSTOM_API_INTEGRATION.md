# Custom API Integration with Editor.js

## Your Existing API Setup

Your `src/api/uploader.js` already has all the functionality needed! It includes:

- ✅ `getPresignedUrls()` - Initialize upload and get presigned URLs
- ✅ `getBatchedUrls()` - Get batched signed URLs  
- ✅ `uploadChunk()` - Upload file chunks
- ✅ `completeUpload()` - Finalize upload
- ✅ `uploadImage()` - Complete image upload pipeline
- ✅ `sanitizeFileName()` - File name sanitization

## How It Integrates with Editor.js

### Option 1: Direct API Usage (Recommended)

The custom tools (ImageTool, GalleryTool, GridTool) already use your upload handler:

```javascript
// In App.js - The uploadFilesWithPreview function connects your API
const uploadFilesWithPreview = async (files) => {
  const urls = [];
  
  for (const file of files) {
    // Uses your custom API
    const cdnUrl = await uploadImage(file, {
      setUploadStatus: () => {},
      onTrace: (stage) => appendTrace(`${file.name}: ${stage}`),
    });
    urls.push(cdnUrl);
  }
  
  return urls;
};

// This is passed to Editor.js hooks
const { editorRef, save, instance } = useEditorJS({
  onUpload: uploadFilesWithPreview  // Your API handler!
});
```

### Option 2: Enhanced with ViewLift Config

If you want to use ViewLift-specific configurations:

```javascript
import { uploadImage } from './api/uploader';

const uploadFilesWithPreview = async (files, options = {}) => {
  const urls = [];
  
  for (const file of files) {
    const cdnUrl = await uploadImage(file, {
      // Your ViewLift API configuration
      Authorization: options.Authorization || getAuthHeader(),
      xApiKey: options.xApiKey || process.env.REACT_APP_API_KEY,
      selectedContentType: options.contentType || 'article',
      
      // Upload tracking
      setUploadStatus: (status) => console.log('Status:', status),
      onTrace: (stage) => console.log('Stage:', stage),
      
      // Custom chunk size (optional)
      perChunkSize: options.chunkSize || 5 * 1024 * 1024, // 5MB chunks
    });
    
    urls.push(cdnUrl);
  }
  
  return urls;
};
```

## Mock API vs Real API

Your `uploader.js` has built-in mocks. To use your real ViewLift API:

### Current Mock Setup (lines 25-50):
```javascript
export async function getPresignedUrls({...}) {
  await wait(180);  // Mock delay
  return {
    chunks: Math.max(1, Math.ceil(file.size / chunkSize)),
    uploadId: `mock-upload-${Date.now()}`,
    key: sanitizeFileName(file.name.trim()),
    prefixUrl: 'https://cdn.mock-viewlift.dev/content/images/',
    Bucket: 'mock-bucket',
  };
}
```

### To Enable Real API (Replace with):
```javascript
export async function getPresignedUrls({
  file,
  Authorization,
  xApiKey,
  selectedContentType,
  perChunkSize,
}) {
  const response = await fetch(
    `${process.env.REACT_APP_V3_API_URL}/appcms/upload/init?type=${selectedContentType}`,
    {
      method: 'POST',
      headers: {
        'Authorization': Authorization,
        'x-api-key': xApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName: sanitizeFileName(file.name),
        fileSize: file.size,
      }),
    }
  );
  
  if (!response.ok) throw new Error('Failed to initialize upload');
  return response.json();
}
```

## Data Flow: Editor.js → Your API → CDN

```
User uploads image in Editor.js
         ↓
ImageTool.onFileSelect()
         ↓
uploadFilesWithPreview(files)  [App.js]
         ↓
uploadImage(file, options)     [your API]
         ↓
getPresignedUrls()             [ViewLift API]
         ↓
uploadChunk()                  [S3 presigned URL]
         ↓
completeUpload()               [ViewLift API]
         ↓
cdnUrl returned
         ↓
Editor.js block created
{
  type: 'image',
  data: { url: 'https://cdn.viewlift.dev/...' }
}
```

## Using Your Upload Configuration

### With Environment Variables:

Create `.env`:
```
REACT_APP_V3_API_URL=https://api.viewlift.com/v3
REACT_APP_V2_API_URL=https://api.viewlift.com/v2
REACT_APP_API_KEY=your-api-key
```

### In App.js:

```javascript
const uploadFilesWithPreview = async (files) => {
  const urls = [];
  setIsUploading(true);
  
  try {
    for (const file of files) {
      const cdnUrl = await uploadImage(file, {
        setUploadStatus: (status) => {
          console.log('Upload status:', status);
          setUploadStatus(status);
        },
        onTrace: (stage) => {
          console.log('Upload stage:', stage);
          appendTrace(`${file.name}: ${stage}`);
        },
      });
      
      urls.push(cdnUrl);
      appendTrace(`${file.name}: uploaded -> ${cdnUrl}`);
    }
    
    setUploadStatus('success');
    return urls;
  } catch (error) {
    setUploadStatus('failed');
    appendTrace(`Upload failed: ${error.message}`);
    return [];
  } finally {
    setIsUploading(false);
  }
};
```

## Custom Tool Configuration

Your custom tools already support your upload handler:

### ImageTool.jsx - Already integrated:
```javascript
this.config = {
  onUpload: uploadFilesWithPreview,  // Your API function
  readOnly: false,
}
```

### Using with Advanced Options:

```javascript
const { editorRef, save } = useEditorJS({
  readOnly: false,
  initialData: savedContent,
  onChange: (data) => setEditorData(data),
  onUpload: async (files) => {
    // Your custom upload logic
    const urls = await uploadFilesWithPreview(files);
    return urls;
  }
});
```

## Tracking Uploads (Already Implemented)

Your `appendTrace()` logs all upload stages:

```javascript
appendTrace(`Starting upload for ${files.length} file(s)`);
appendTrace(`${file.name}: started`);
appendTrace(`${file.name}: chunking`);
appendTrace(`${file.name}: uploading chunks`);
appendTrace(`${file.name}: completing`);
appendTrace(`${file.name}: uploaded -> ${cdnUrl}`);
appendTrace(`Upload success for ${files.length} file(s)`);
```

These appear in the "Upload Trace" panel in the UI.

## Metadata & Content Storage

Your existing `editorDataSave()` function still works:

```javascript
const editorDataSave = (html) => {
  const lowerApiType = apiType.toLowerCase();

  if (lowerApiType === 'article') {
    const contentBodyData = {
      articleContent: html || '',           // Full HTML from Editor.js
      readTime: computeReadTime(html),      // Calculated metrics
      isPublish: false,
    };

    setFormikFields(contentBodyData);
    saveData(contentId, apiType, 'articleBody', contentBodyData);
  }
};
```

This saves to your ViewLift API with:
- Content ID
- API Type (article, event, sport, etc.)
- Content Body (HTML)
- Metadata (read time, word count)

## Testing Your Setup

1. **Start dev server**:
   ```bash
   npm start
   ```

2. **Upload an image** using Editor.js image tool
3. **Check Upload Trace panel** - Should show upload stages
4. **Verify image URL** - Should match your CDN
5. **Save content** - Should appear in Latest saveData payload

## Troubleshooting

### Upload fails
- Check network tab for API errors
- Verify API endpoint URLs in `.env`
- Check Authorization header format
- Verify file upload permissions

### URL not appearing
- Check if `uploadImage()` returns valid URL
- Verify `onUpload` callback returns array of URLs
- Check browser console for errors

### Wrong file names
- Check `sanitizeFileName()` function
- Verify file permissions on CDN
- Check if API accepts special characters

## Summary

✅ Your custom API is **fully integrated**
✅ Upload handling works **out of the box**
✅ ViewLift configuration **already in place**
✅ Metadata tracking **already implemented**
✅ Just need to **switch from mock to real API endpoints**

To enable real uploads, uncomment/replace the mock functions in `src/api/uploader.js` with actual ViewLift API calls!
