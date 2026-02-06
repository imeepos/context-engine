/**
 * File Upload Handler
 *
 * Utilities for handling file uploads in Better Auth endpoints
 */

/** Uploaded file structure */
export interface UploadedFile {
  fieldname: string;
  filename: string;
  mimetype: string;
  buffer: ArrayBuffer;
  size: number;
}

/**
 * Extract file from request FormData
 *
 * @param request - The Request object
 * @param fieldName - Optional field name (defaults to 'file')
 * @returns Promise<UploadedFile | undefined>
 */
export async function extractFileFromRequest(
  request: Request,
  fieldName?: string
): Promise<UploadedFile | undefined> {
  const contentType = request.headers.get('content-type') || '';

  if (!contentType.includes('multipart/form-data')) {
    return undefined;
  }

  try {
    const formData = await request.formData();
    const file = formData.get(fieldName || 'file') as File | null;

    if (!file || !(file instanceof File)) {
      return undefined;
    }

    return {
      fieldname: fieldName || 'file',
      filename: file.name,
      mimetype: file.type,
      buffer: await file.arrayBuffer(),
      size: file.size,
    };
  } catch {
    return undefined;
  }
}

/**
 * Extract multiple files from request FormData
 *
 * @param request - The Request object
 * @param fieldName - Optional field name (defaults to 'files')
 * @returns Promise<UploadedFile[]>
 */
export async function extractFilesFromRequest(
  request: Request,
  fieldName?: string
): Promise<UploadedFile[]> {
  const contentType = request.headers.get('content-type') || '';

  if (!contentType.includes('multipart/form-data')) {
    return [];
  }

  try {
    const formData = await request.formData();
    const files = formData.getAll(fieldName || 'files');
    const results: UploadedFile[] = [];

    for (const file of files) {
      if (file instanceof File) {
        results.push({
          fieldname: fieldName || 'files',
          filename: file.name,
          mimetype: file.type,
          buffer: await file.arrayBuffer(),
          size: file.size,
        });
      }
    }

    return results;
  } catch {
    return [];
  }
}
