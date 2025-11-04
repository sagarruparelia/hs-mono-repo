import { useState } from 'react';
import DocumentUpload from './DocumentUpload';
import DocumentList from './DocumentList';
import DocumentViewer from './DocumentViewer';
import type { Document } from '../types/userDocument';
import './DocumentPage.css';

export interface DocumentPageProps {
  ownerIdType: string;
  ownerIdValue: string;
  ownerDisplayName?: string;
  loggedInUserIdType?: string;
  loggedInUserIdValue?: string;
  theme?: 'light' | 'dark';
  onDataLoad?: (data: any) => void;
}

export default function DocumentPage({
  ownerIdType,
  ownerIdValue,
  ownerDisplayName,
  loggedInUserIdType,
  loggedInUserIdValue,
  theme = 'light',
  onDataLoad,
}: DocumentPageProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'list'>('list');
  const [viewerDocument, setViewerDocument] = useState<Document | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUploadComplete = (documents: any[]) => {
    console.log('Upload complete:', documents);
    onDataLoad?.({ type: 'upload_complete', documents });
    // Switch to list tab and refresh
    setActiveTab('list');
    setRefreshKey((k) => k + 1);
  };

  const handleUploadError = (error: Error) => {
    console.error('Upload error:', error);
    onDataLoad?.({ type: 'upload_error', error: error.message });
  };

  const handleDocumentClick = (document: Document) => {
    setViewerDocument(document);
  };

  const handleDocumentDelete = (documentId: string) => {
    console.log('Document deleted:', documentId);
    onDataLoad?.({ type: 'document_deleted', documentId });
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className={`document-page ${theme}`}>
      <div className="page-header">
        <h2>Document Management</h2>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          📋 My Documents
        </button>
        <button
          className={`tab ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          📤 Upload
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'list' && (
          <DocumentList
            key={refreshKey}
            ownerIdType={ownerIdType}
            ownerIdValue={ownerIdValue}
            ownerDisplayName={ownerDisplayName}
            includeSensitive={true}
            onDocumentClick={handleDocumentClick}
            onDocumentDelete={handleDocumentDelete}
          />
        )}

        {activeTab === 'upload' && (
          <DocumentUpload
            ownerIdType={ownerIdType}
            ownerIdValue={ownerIdValue}
            ownerDisplayName={ownerDisplayName}
            onUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
          />
        )}
      </div>

      {viewerDocument && (
        <DocumentViewer document={viewerDocument} onClose={() => setViewerDocument(null)} />
      )}
    </div>
  );
}
