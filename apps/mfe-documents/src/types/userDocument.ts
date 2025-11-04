/**
 * Document types matching backend models
 */

export enum DocumentCategory {
  MEDICAL_RECORD = 'MEDICAL_RECORD',
  LAB_RESULT = 'LAB_RESULT',
  PRESCRIPTION = 'PRESCRIPTION',
  INSURANCE_CARD = 'INSURANCE_CARD',
  IMMUNIZATION_RECORD = 'IMMUNIZATION_RECORD',
  MARKSHEET = 'MARKSHEET',
  IDENTIFICATION = 'IDENTIFICATION',
  OTHER = 'OTHER',
}

export enum DocumentStatus {
  TEMPORARY = 'TEMPORARY',
  ACTIVE = 'ACTIVE',
  DELETED = 'DELETED',
}

export interface Document {
  documentId: string;
  fileName: string;
  originalFileName: string;
  fileSize: number;
  contentType: string;
  category: DocumentCategory;
  s3Key: string;
  s3Bucket: string;

  // Ownership
  ownerIdType: string;
  ownerIdValue: string;
  ownerFirstName?: string;
  ownerLastName?: string;

  // Upload info
  uploadedByIdType: string;
  uploadedByIdValue: string;
  uploadedByFirstName?: string;
  uploadedByLastName?: string;
  uploadedAt: string;

  // Security
  isSensitive: boolean;

  // Metadata
  description?: string;
  tags?: string[];
  extractedText?: string;

  // Status
  status: DocumentStatus;
  finalizedAt?: string;
  deletedAt?: string;

  // Audit
  lastModifiedAt?: string;
  lastAccessedAt?: string;
}

export interface FileUploadInfo {
  fileName: string;
  contentType: string;
  fileSize: number;
}

export interface DocumentUploadRequest {
  files: FileUploadInfo[];
  ownerIdType: string;
  ownerIdValue: string;
}

export interface UploadInfo {
  tempDocumentId: string;
  fileName: string;
  presignedUrl: string;
  s3Key: string;
  expiresIn: number;
}

export interface DocumentUploadResponse {
  uploads: UploadInfo[];
}

export interface DocumentFinalizeRequest {
  tempDocumentIds: string[];
  category: DocumentCategory;
  description?: string;
  tags?: string[];
}

export interface DocumentSearchRequest {
  ownerIdType: string;
  ownerIdValue: string;
  searchQuery?: string;
  categories?: DocumentCategory[];
  uploadedAfter?: string;
  uploadedBefore?: string;
  tags?: string[];
  includeSensitive?: boolean;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'ASC' | 'DESC';
}

export interface DocumentSearchResponse {
  content: Document[];
  pageable: {
    pageNumber: number;
    pageSize: number;
  };
  totalElements: number;
  totalPages: number;
  last: boolean;
  first: boolean;
}

export interface DocumentDownloadResponse {
  downloadUrl: string;
  expiresIn: number;
}

export interface CategoryOption {
  value: string;
  label: string;
}

export const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  [DocumentCategory.MEDICAL_RECORD]: 'Medical Record',
  [DocumentCategory.LAB_RESULT]: 'Lab Result',
  [DocumentCategory.PRESCRIPTION]: 'Prescription',
  [DocumentCategory.INSURANCE_CARD]: 'Insurance Card',
  [DocumentCategory.IMMUNIZATION_RECORD]: 'Immunization Record',
  [DocumentCategory.MARKSHEET]: 'Marksheet / Transcript',
  [DocumentCategory.IDENTIFICATION]: 'Identification',
  [DocumentCategory.OTHER]: 'Other',
};

export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
export const MAX_FILES_PER_UPLOAD = 5;
export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
