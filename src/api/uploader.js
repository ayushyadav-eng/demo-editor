/**
 * Upload pipeline shaped like ViewliftTools-v2 ImageUploadAdapter + useUploader.
 * TODO: replace mocks with fetchHelper calls to:
 *   - POST ${NEXT_PUBLIC_V3_API_URL}/appcms/upload/init?type=image
 *   - POST ${NEXT_PUBLIC_V3_API_URL}/appcms/upload/signed-urls
 *   - PUT presigned URL
 *   - POST ${NEXT_PUBLIC_V3_API_URL}/appcms/upload/complete?type=image
 *   - POST ${NEXT_PUBLIC_V2_API_URL}/content/image
 */

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const sanitizeFileName = (fileName) => {
  const forbiddenChars = /[^a-zA-Z0-9_\s]/g;
  const lastDotIndex = fileName.lastIndexOf('.');
  const baseName = fileName.substring(0, lastDotIndex);
  const fileExtension = fileName.substring(lastDotIndex + 1);
  let sanitizedFileName = baseName.replace(forbiddenChars, ' ');
  sanitizedFileName = sanitizedFileName.replace(/\s+/g, '-');
  const timestamp = Date.now();
  return `${sanitizedFileName}-${timestamp}.${fileExtension}`;
};

// TODO: replace mock with fetchHelper({ url: `${BASE_URL}/init?type=${options.selectedContentType}`, ... })
export async function getPresignedUrls({
  file,
  Authorization,
  xApiKey,
  selectedContentType,
  perChunkSize,
}) {
  await wait(180);
  const key = sanitizeFileName(file.name.trim());
  const chunkSize = perChunkSize ?? file.size;
  const chunks = Math.max(1, Math.ceil(file.size / chunkSize));
  return {
    chunks,
    chunkSize,
    uploadId: `mock-upload-${Date.now()}`,
    key,
    prefixUrl: 'https://cdn.mock-viewlift.dev/content/images/',
    Bucket: 'mock-bucket',
  };
}

// TODO: replace mock with fetchHelper({ url: `${BASE_URL}/signed-urls`, method: 'POST', ... })
export async function getBatchedUrls({
  bucket,
  key,
  limit,
  offset,
  totalChunkCount,
  uploadId,
}) {
  await wait(180);
  const presignedUrls = {};
  for (let i = 0; i < limit; i += 1) {
    presignedUrls[offset + i + 1] = `https://mock-s3.example.com/${bucket}/${key}?part=${offset + i + 1}&uploadId=${uploadId}`;
  }
  return { presignedUrls };
}

// TODO: replace mock with fetchHelper({ url: `${BASE_URL}/complete?type=${options.selectedContentType}`, ... })
export async function completeUpload({
  Authorization,
  xApiKey,
  completedParts,
  filename,
  uploadId,
  selectedContentType,
  controller,
}) {
  await wait(160);
  return { status: 200 };
}

// TODO: replace mock with fetchHelper({ url: `${NEXT_PUBLIC_V2_API_URL}/content/image`, method: 'POST', ... })
export async function saveImageData(
  name,
  size,
  url,
  xApiKey,
  Authorization,
  selectedContentType
) {
  if (!name || !size || !url) {
    return new Error('Mandatory data missing. Failed to save image');
  }
  await wait(160);
  return {
    id: `img-${Date.now()}`,
    name,
    secureUrl: url,
    url,
    size,
    imageType: selectedContentType === 'brand' ? 'brand' : 'images-tab',
  };
}

export class ImageUploadAdapter {
  constructor(loader, Authorization, xApiKey, setUploadStatus, onStageChange) {
    this.loader = loader;
    this.Authorization = Authorization;
    this.xApiKey = xApiKey;
    this.setUploadStatus = setUploadStatus;
    this.onStageChange = onStageChange;
  }

  upload() {
    if (this.setUploadStatus) {
      this.setUploadStatus(true);
    }

    return this.loader.file.then(async (file) => {
      const trace = (stage) => {
        if (this.onStageChange) {
          this.onStageChange(stage);
        }
      };

      try {
        trace('init');
        const presigned = await getPresignedUrls({
          file,
          Authorization: this.Authorization,
          xApiKey: this.xApiKey,
          selectedContentType: 'image',
          perChunkSize: file.size,
        });

        if (!presigned) {
          throw new Error('Failed to start upload');
        }

        const { chunks, uploadId, prefixUrl, key, Bucket } = presigned;

        trace('signedUrls');
        const batch = await getBatchedUrls({
          bucket: Bucket,
          key,
          limit: chunks,
          offset: 0,
          totalChunkCount: chunks,
          uploadId,
        });

        if (!batch) {
          throw new Error('Failed to start upload');
        }

        trace('upload');
        // TODO: replace with fetch(batch.presignedUrls[1], { method: 'PUT', body: chunk })
        await wait(200);
        const mockEtag = 'mock-etag';

        trace('complete');
        const completeRes = await completeUpload({
          Authorization: this.Authorization,
          xApiKey: this.xApiKey,
          completedParts: [
            {
              ETag: mockEtag,
              PartNumber: 1,
            },
          ],
          filename: key,
          uploadId,
          selectedContentType: 'image',
          controller: new AbortController(),
        });

        if (completeRes.status !== 200) {
          throw new Error('Failed to complete upload');
        }

        const finalUrl = `${prefixUrl}${key}`;
        trace('persistImageMetadata');
        const saveRes = await saveImageData(
          file.name,
          file.size,
          finalUrl,
          this.xApiKey,
          this.Authorization,
          'image'
        );

        if (saveRes instanceof Error) {
          throw saveRes;
        }

        return { default: finalUrl };
      } finally {
        if (this.setUploadStatus) {
          this.setUploadStatus(false);
        }
      }
    });
  }
}

/**
 * React-friendly wrapper (draft-js has no FileRepository/createLoader).
 */
export async function uploadImage(file, { onTrace, setUploadStatus } = {}) {
  const loader = {
    file: Promise.resolve(file),
  };

  const adapter = new ImageUploadAdapter(
    loader,
    'mock-auth',
    'mock-api-key',
    setUploadStatus,
    onTrace
  );

  const result = await adapter.upload();
  return result.default;
}

export async function uploadImages(files, { onTrace, setUploadStatus } = {}) {
  const urls = [];
  for (const file of files) {
    const url = await uploadImage(file, {
      onTrace: (stage) => onTrace?.(`${file.name}: ${stage}`),
      setUploadStatus,
    });
    urls.push(url);
  }
  return urls;
}
