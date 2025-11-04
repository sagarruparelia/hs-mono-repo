import { useState, useEffect } from 'react';
import { DocumentService } from '../services/documentService';
import {
  Document,
  DocumentCategory,
  CATEGORY_LABELS,
  type DocumentSearchRequest,
} from '../types/userDocument';
import './DocumentList.css';

export interface DocumentListProps {
  ownerIdType: string;
  ownerIdValue: string;
  ownerDisplayName?: string;
  includeSensitive?: boolean;
  onDocumentClick?: (document: Document) => void;
  onDocumentDelete?: (documentId: string) => void;
}

export default function DocumentList({
  ownerIdType,
  ownerIdValue,
  ownerDisplayName,
  includeSensitive = true,
  onDocumentClick,
  onDocumentDelete,
}: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | ''>('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const pageSize = 10;

  useEffect(() => {
    loadDocuments();
  }, [ownerIdType, ownerIdValue, page, searchQuery, selectedCategory, includeSensitive]);

  const loadDocuments = async () => {
    setLoading(true);
    setError(null);

    try {
      const request: DocumentSearchRequest = {
        ownerIdType,
        ownerIdValue,
        searchQuery: searchQuery || undefined,
        categories: selectedCategory ? [selectedCategory as DocumentCategory] : undefined,
        includeSensitive,
        page,
        size: pageSize,
        sortBy: 'uploadedAt',
        sortDirection: 'DESC',
      };

      const response = await DocumentService.searchDocuments(request);
      setDocuments(response.content);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);
    } catch (err) {
      setError((err as Error).message);
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0); // Reset to first page on new search
    loadDocuments();
  };

  const handleDownload = async (document: Document) => {
    try {
      const { downloadUrl } = await DocumentService.getDownloadUrl(document.documentId);
      window.open(downloadUrl, '_blank');
    } catch (err) {
      alert(`Failed to download: ${(err as Error).message}`);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await DocumentService.deleteDocument(documentId);
      onDocumentDelete?.(documentId);
      loadDocuments(); // Reload list
    } catch (err) {
      alert(`Failed to delete: ${(err as Error).message}`);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="document-list">
      <div className="list-header">
        <h3>Documents</h3>
        {ownerDisplayName && <p className="owner-info">For: {ownerDisplayName}</p>}
        {totalElements > 0 && <p className="document-count">{totalElements} document(s)</p>}
      </div>

      {/* Search and Filters */}
      <form onSubmit={handleSearch} className="search-form">
        <div className="search-row">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents..."
            className="search-input"
          />
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value as DocumentCategory | '');
              setPage(0);
            }}
            className="category-filter"
          >
            <option value="">All Categories</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button type="submit" className="search-btn">
            Search
          </button>
        </div>
      </form>

      {/* Loading State */}
      {loading && <div className="loading">Loading documents...</div>}

      {/* Error State */}
      {error && (
        <div className="error-message">
          <p>Error: {error}</p>
          <button onClick={loadDocuments} className="retry-btn">
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && documents.length === 0 && (
        <div className="empty-state">
          <p>No documents found</p>
          <p className="empty-hint">Upload your first document to get started</p>
        </div>
      )}

      {/* Document List */}
      {!loading && !error && documents.length > 0 && (
        <>
          <div className="documents-grid">
            {documents.map((doc) => (
              <div
                key={doc.documentId}
                className="document-card"
                onClick={() => onDocumentClick?.(doc)}
              >
                <div className="document-icon">
                  {DocumentService.getFileIcon(doc.contentType)}
                </div>
                <div className="document-info">
                  <h4 className="document-name">{doc.originalFileName}</h4>
                  <p className="document-meta">
                    {CATEGORY_LABELS[doc.category]} •{' '}
                    {DocumentService.formatFileSize(doc.fileSize)} •{' '}
                    {formatDate(doc.uploadedAt)}
                  </p>
                  {doc.description && (
                    <p className="document-description">{doc.description}</p>
                  )}
                  {doc.tags && doc.tags.length > 0 && (
                    <div className="document-tags">
                      {doc.tags.map((tag, idx) => (
                        <span key={idx} className="tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="document-uploader">
                    Uploaded by: {doc.uploadedByFirstName} {doc.uploadedByLastName}
                  </p>
                </div>
                <div className="document-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleDownload(doc)}
                    className="action-btn download-btn"
                    title="Download"
                  >
                    ⬇️
                  </button>
                  <button
                    onClick={() => handleDelete(doc.documentId)}
                    className="action-btn delete-btn"
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="page-btn"
              >
                Previous
              </button>
              <span className="page-info">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page === totalPages - 1}
                className="page-btn"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
