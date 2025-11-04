/**
 * Document API Service
 * Handles all API calls for document management
 */

import type {
  Document,
  DocumentUploadRequest,
  DocumentUploadResponse,
  DocumentFinalizeRequest,
  DocumentSearchRequest,
  DocumentSearchResponse,
  DocumentDownloadResponse,
  CategoryOption,
} from '../types/userDocument';

const API_BASE_URL = '/api/documents';

export class DocumentService {
  /**
   * Initiate document upload
   * Returns presigned URLs for S3 upload
   */
  static async initiateUpload(
    request: DocumentUploadRequest
  ): Promise<DocumentUploadResponse> {
    const response = await fetch(`${API_BASE_URL}/upload/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to initiate upload: ${error}`);
    }

    return response.json();
  }

  /**
   * Upload file to S3 using presigned URL
   */
  static async uploadToS3(
    presignedUrl: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const progress = (e.loaded / e.total) * 100;
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          resolve();
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('PUT', presignedUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
  }

  /**
   * Finalize document upload
   * Moves files from temp to permanent storage
   */
  static async finalizeUpload(
    request: DocumentFinalizeRequest
  ): Promise<Document[]> {
    const response = await fetch(`${API_BASE_URL}/upload/finalize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to finalize upload: ${error}`);
    }

    return response.json();
  }

  /**
   * Search documents with filters
   */
  static async searchDocuments(
    request: DocumentSearchRequest
  ): Promise<DocumentSearchResponse> {
    const response = await fetch(`${API_BASE_URL}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to search documents: ${error}`);
    }

    return response.json();
  }

  /**
   * Get download URL for a document
   */
  static async getDownloadUrl(documentId: string): Promise<DocumentDownloadResponse> {
    const response = await fetch(`${API_BASE_URL}/${documentId}/download`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get download URL: ${error}`);
    }

    return response.json();
  }

  /**
   * Delete a document
   */
  static async deleteDocument(documentId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/${documentId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to delete document: ${error}`);
    }
  }

  /**
   * Get document categories
   */
  static async getCategories(): Promise<CategoryOption[]> {
    const response = await fetch(`${API_BASE_URL}/categories`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get categories: ${error}`);
    }

    return response.json();
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Get file icon based on content type
   */
  static getFileIcon(contentType: string): string {
    if (contentType.startsWith('image/')) return '🖼️';
    if (contentType === 'application/pdf') return '📄';
    if (contentType.includes('word')) return '📝';
    return '📎';
  }

  /**
   * Check if file type is allowed
   */
  static isAllowedFileType(file: File, allowedTypes: string[]): boolean {
    return allowedTypes.includes(file.type);
  }

  /**
   * Validate file size
   */
  static isValidFileSize(file: File, maxSize: number): boolean {
    return file.size <= maxSize;
  }
}
