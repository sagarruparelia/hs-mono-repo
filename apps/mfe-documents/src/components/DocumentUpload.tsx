import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { DocumentService } from '../services/documentService';
import {
  DocumentCategory,
  MAX_FILE_SIZE,
  MAX_FILES_PER_UPLOAD,
  ALLOWED_FILE_TYPES,
  CATEGORY_LABELS,
  type DocumentFinalizeRequest,
} from '../types/userDocument';
import './DocumentUpload.css';

export interface DocumentUploadProps {
  ownerIdType: string;
  ownerIdValue: string;
  ownerDisplayName?: string;
  onUploadComplete?: (documents: any[]) => void;
  onUploadError?: (error: Error) => void;
}

interface FileWithProgress {
  file: File;
  tempDocumentId?: string;
  progress: number;
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  error?: string;
}

export default function DocumentUpload({
  ownerIdType,
  ownerIdValue,
  ownerDisplayName,
  onUploadComplete,
  onUploadError,
}: DocumentUploadProps) {
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const [category, setCategory] = useState<DocumentCategory>(DocumentCategory.MEDICAL_RECORD);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const onDrop = (acceptedFiles: File[]) => {
    // Validate total number of files
    if (files.length + acceptedFiles.length > MAX_FILES_PER_UPLOAD) {
      alert(`You can only upload up to ${MAX_FILES_PER_UPLOAD} files at once`);
      return;
    }

    // Validate each file
    const validFiles: FileWithProgress[] = [];
    const errors: string[] = [];

    for (const file of acceptedFiles) {
      // Check file size
      if (!DocumentService.isValidFileSize(file, MAX_FILE_SIZE)) {
        errors.push(`${file.name}: File size exceeds ${DocumentService.formatFileSize(MAX_FILE_SIZE)}`);
        continue;
      }

      // Check file type
      if (!DocumentService.isAllowedFileType(file, ALLOWED_FILE_TYPES)) {
        errors.push(`${file.name}: File type not allowed`);
        continue;
      }

      validFiles.push({
        file,
        progress: 0,
        status: 'pending',
      });
    }

    if (errors.length > 0) {
      alert('Some files were rejected:\n' + errors.join('\n'));
    }

    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles]);
      // Start uploading immediately
      uploadFiles(validFiles);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.userDocument': ['.docx'],
    },
    maxFiles: MAX_FILES_PER_UPLOAD,
    disabled: isUploading || isFinalizing,
  });

  const uploadFiles = async (filesToUpload: FileWithProgress[]) => {
    setIsUploading(true);

    try {
      // Step 1: Initiate upload - get presigned URLs
      const response = await DocumentService.initiateUpload({
        files: filesToUpload.map((f) => ({
          fileName: f.file.name,
          contentType: f.file.type,
          fileSize: f.file.size,
        })),
        ownerIdType,
        ownerIdValue,
      });

      // Step 2: Upload files to S3 using presigned URLs
      for (let i = 0; i < filesToUpload.length; i++) {
        const fileWithProgress = filesToUpload[i];
        const uploadInfo = response.uploads[i];

        // Update status to uploading
        setFiles((prev) =>
          prev.map((f) =>
            f.file === fileWithProgress.file
              ? { ...f, status: 'uploading', tempDocumentId: uploadInfo.tempDocumentId }
              : f
          )
        );

        try {
          await DocumentService.uploadToS3(
            uploadInfo.presignedUrl,
            fileWithProgress.file,
            (progress) => {
              setFiles((prev) =>
                prev.map((f) =>
                  f.file === fileWithProgress.file ? { ...f, progress } : f
                )
              );
            }
          );

          // Update status to uploaded
          setFiles((prev) =>
            prev.map((f) =>
              f.file === fileWithProgress.file
                ? { ...f, status: 'uploaded', progress: 100 }
                : f
            )
          );
        } catch (error) {
          // Update status to error
          setFiles((prev) =>
            prev.map((f) =>
              f.file === fileWithProgress.file
                ? { ...f, status: 'error', error: (error as Error).message }
                : f
            )
          );
        }
      }
    } catch (error) {
      console.error('Upload initiation failed:', error);
      onUploadError?.(error as Error);

      // Mark all files as error
      setFiles((prev) =>
        prev.map((f) =>
          filesToUpload.includes(f)
            ? { ...f, status: 'error', error: (error as Error).message }
            : f
        )
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleFinalize = async () => {
    // Get uploaded files
    const uploadedFiles = files.filter((f) => f.status === 'uploaded');

    if (uploadedFiles.length === 0) {
      alert('No files uploaded yet');
      return;
    }

    setIsFinalizing(true);

    try {
      const request: DocumentFinalizeRequest = {
        tempDocumentIds: uploadedFiles
          .map((f) => f.tempDocumentId)
          .filter((id): id is string => id !== undefined),
        category,
        description: description || undefined,
        tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      };

      const documents = await DocumentService.finalizeUpload(request);

      // Success - clear form
      setFiles([]);
      setDescription('');
      setTags('');

      onUploadComplete?.(documents);
    } catch (error) {
      console.error('Upload finalization failed:', error);
      onUploadError?.(error as Error);
      alert(`Upload failed: ${(error as Error).message}`);
    } finally {
      setIsFinalizing(false);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadedCount = files.filter((f) => f.status === 'uploaded').length;
  const canFinalize = uploadedCount > 0 && !isUploading && !isFinalizing;

  return (
    <div className="userDocument-upload">
      <div className="upload-header">
        <h3>Upload Documents</h3>
        {ownerDisplayName && <p className="owner-info">For: {ownerDisplayName}</p>}
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive ? 'active' : ''} ${isUploading || isFinalizing ? 'disabled' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="dropzone-content">
          <span className="dropzone-icon">📁</span>
          {isDragActive ? (
            <p>Drop files here...</p>
          ) : (
            <>
              <p>Drag & drop files here, or click to select</p>
              <p className="dropzone-hint">
                Max {MAX_FILES_PER_UPLOAD} files, {DocumentService.formatFileSize(MAX_FILE_SIZE)} each
              </p>
              <p className="dropzone-hint">PDF, Images, Word documents</p>
            </>
          )}
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="file-list">
          <h4>Selected Files ({files.length})</h4>
          {files.map((fileWithProgress, index) => (
            <div key={index} className={`file-item ${fileWithProgress.status}`}>
              <div className="file-info">
                <span className="file-icon">
                  {DocumentService.getFileIcon(fileWithProgress.file.type)}
                </span>
                <div className="file-details">
                  <div className="file-name">{fileWithProgress.file.name}</div>
                  <div className="file-meta">
                    {DocumentService.formatFileSize(fileWithProgress.file.size)}
                    {fileWithProgress.status === 'uploading' &&
                      ` • ${Math.round(fileWithProgress.progress)}%`}
                    {fileWithProgress.status === 'uploaded' && ' • ✓ Uploaded'}
                    {fileWithProgress.status === 'error' && ` • ✗ ${fileWithProgress.error}`}
                  </div>
                </div>
              </div>
              {fileWithProgress.status === 'uploading' && (
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${fileWithProgress.progress}%` }}
                  />
                </div>
              )}
              {fileWithProgress.status === 'pending' && (
                <button
                  onClick={() => removeFile(index)}
                  className="remove-btn"
                  disabled={isUploading || isFinalizing}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Metadata Form */}
      {files.length > 0 && (
        <div className="metadata-form">
          <h4>Document Details</h4>

          <div className="form-group">
            <label htmlFor="category">Category *</label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as DocumentCategory)}
              disabled={isFinalizing}
            >
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description (optional)</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              rows={3}
              disabled={isFinalizing}
            />
          </div>

          <div className="form-group">
            <label htmlFor="tags">Tags (optional, comma-separated)</label>
            <input
              type="text"
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., annual, lab, 2024"
              disabled={isFinalizing}
            />
          </div>

          <button
            onClick={handleFinalize}
            className="finalize-btn"
            disabled={!canFinalize}
          >
            {isFinalizing ? 'Uploading...' : `Upload ${uploadedCount} Document(s)`}
          </button>
        </div>
      )}
    </div>
  );
}
