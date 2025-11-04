import { useState, useEffect } from 'react';
import { DocumentService } from '../services/documentService';
import type { Document } from '../types/userDocument';
import './DocumentViewer.css';

export interface DocumentViewerProps {
  document: Document | null;
  onClose?: () => void;
}

export default function DocumentViewer({ document, onClose }: DocumentViewerProps) {
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (document) {
      loadViewUrl();
    } else {
      setViewUrl(null);
    }
  }, [document]);

  const loadViewUrl = async () => {
    if (!document) return;

    setLoading(true);
    setError(null);

    try {
      const { downloadUrl } = await DocumentService.getDownloadUrl(document.documentId);
      setViewUrl(downloadUrl);
    } catch (err) {
      setError((err as Error).message);
      console.error('Failed to load document:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!document) {
    return null;
  }

  const isPDF = document.contentType === 'application/pdf';
  const isImage = document.contentType.startsWith('image/');

  return (
    <div className="document-viewer-overlay" onClick={onClose}>
      <div className="document-viewer" onClick={(e) => e.stopPropagation()}>
        <div className="viewer-header">
          <div className="viewer-title">
            <h3>{document.originalFileName}</h3>
            <p className="viewer-meta">
              {DocumentService.formatFileSize(document.fileSize)} • {document.contentType}
            </p>
          </div>
          <button onClick={onClose} className="close-btn" title="Close">
            ✕
          </button>
        </div>

        <div className="viewer-content">
          {loading && <div className="viewer-loading">Loading document...</div>}

          {error && (
            <div className="viewer-error">
              <p>Failed to load document: {error}</p>
              <button onClick={loadViewUrl} className="retry-btn">
                Retry
              </button>
            </div>
          )}

          {!loading && !error && viewUrl && (
            <>
              {isPDF && (
                <iframe src={viewUrl} className="pdf-viewer" title={document.originalFileName} />
              )}

              {isImage && (
                <img src={viewUrl} alt={document.originalFileName} className="image-viewer" />
              )}

              {!isPDF && !isImage && (
                <div className="unsupported-viewer">
                  <p>Preview not available for this file type</p>
                  <a href={viewUrl} download className="download-link">
                    Download File
                  </a>
                </div>
              )}
            </>
          )}
        </div>

        <div className="viewer-actions">
          <a
            href={viewUrl || '#'}
            download={document.originalFileName}
            className="download-btn-viewer"
            target="_blank"
            rel="noopener noreferrer"
          >
            Download
          </a>
        </div>
      </div>
    </div>
  );
}
