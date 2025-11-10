/**
 * S3 + CloudFront upload utilities
 * Uses presigned URLs for secure uploads
 */

interface UploadOptions {
  file: File
  companyId: string
  type: 'photo' | 'audio'
  onProgress?: (progress: number) => void
}

interface PresignedUrlResponse {
  url: string
  key: string
  cloudfrontUrl: string
}

/**
 * Get presigned URL from backend for S3 upload
 */
async function getPresignedUrl(
  fileName: string,
  fileType: string,
  companyId: string,
  type: 'photo' | 'audio'
): Promise<PresignedUrlResponse> {
  // This should call your backend API endpoint
  // For now, we'll use a placeholder
  const response = await fetch('/api/storage/presigned-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileName,
      fileType,
      companyId,
      type,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to get presigned URL')
  }

  return response.json()
}

/**
 * Upload file to S3 using presigned URL
 */
async function uploadToS3(
  file: File,
  presignedUrl: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const progress = (e.loaded / e.total) * 100
        onProgress(progress)
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        resolve()
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`))
      }
    })

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed'))
    })

    xhr.open('PUT', presignedUrl)
    xhr.setRequestHeader('Content-Type', file.type)
    xhr.send(file)
  })
}

/**
 * Upload file to S3 via CloudFront
 */
export async function uploadFile({
  file,
  companyId,
  type,
  onProgress,
}: UploadOptions): Promise<string> {
  try {
    // Get presigned URL
    const { url, key, cloudfrontUrl } = await getPresignedUrl(
      file.name,
      file.type,
      companyId,
      type
    )

    // Upload to S3
    await uploadToS3(file, url, onProgress)

    // Return CloudFront URL
    return cloudfrontUrl
  } catch (error) {
    console.error('Upload error:', error)
    throw error
  }
}

/**
 * Generate S3 key for file
 */
export function generateS3Key(
  companyId: string,
  type: 'photo' | 'audio',
  fileName: string
): string {
  const timestamp = Date.now()
  const randomId = Math.random().toString(36).substring(2, 15)
  const extension = fileName.split('.').pop()
  return `company/${companyId}/${type}/${timestamp}-${randomId}.${extension}`
}

