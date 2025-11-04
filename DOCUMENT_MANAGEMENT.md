# Document Management System

## Overview

The userDocument management system allows users to upload, store, search, and manage their healthcare userDocuments (and userDocuments for people they support) with fine-grained access control based on DAA (Digital Account Access) and ROI (Release of Information) personas.

---

## Key Features

✅ **Multi-file Upload**: Upload up to 5 files at once (max 25 MB each)
✅ **Direct S3 Upload**: Presigned URLs for fast, secure browser-to-S3 uploads
✅ **Temporary Files**: Files uploaded immediately, finalized when user selects category
✅ **Automatic Cleanup**: Abandoned temp files deleted after 1 hour
✅ **Access Control**: DAA required to upload for others, ROI required to view sensitive userDocuments
✅ **Full-text Search**: Search by filename, description, tags, category, date range
✅ **Secure Downloads**: Presigned URLs with 15-minute expiration
✅ **Audit Trail**: Track who uploaded what, when, and for whom

---

## Architecture

### Upload Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  Document Upload Flow                        │
└─────────────────────────────────────────────────────────────┘

1. User selects files (max 5, up to 25 MB each)
   ↓
2. Frontend → BFF: POST /api/userDocuments/upload/initiate
   Request: {
     files: [{ fileName, contentType, fileSize }],
     ownerIdType: "EID",
     ownerIdValue: "E123456"
   }

   BFF validates:
   - Session exists
   - File size < 25 MB
   - Content type allowed (PDF, images, docs)
   - User has DAA access if uploading for others

   BFF returns: {
     uploads: [{
       tempDocumentId: "uuid",
       presignedUrl: "https://s3.../temp/session-id/timestamp-file.pdf",
       expiresIn: 900 (15 minutes)
     }]
   }
   ↓
3. Frontend → S3: PUT file using presigned URL
   Direct upload to S3 temp location
   Files stored: temp/{sessionId}/{timestamp}-{filename}
   ↓
4. User selects category and clicks "Upload"
   ↓
5. Frontend → BFF: POST /api/userDocuments/upload/finalize
   Request: {
     tempDocumentIds: ["uuid1", "uuid2"],
     category: "MEDICAL_RECORD",
     description: "Lab results",
     tags: ["lab", "annual"]
   }

   BFF:
   - Verifies files exist in S3
   - Moves files from temp → permanent location
   - Creates userDocument metadata in MongoDB
   - Returns finalized userDocuments
   ↓
6. Documents now visible in user's account

Abandonment Handling:
- Scheduled job runs every 15 minutes
- Deletes temp files > 1 hour old
- Deletes temp metadata not finalized
```

### S3 Bucket Structure

```
hs-userDocuments-{env}/
├── temp/
│   └── {sessionId}/
│       └── {timestamp}-{sanitized-filename}
│           (Auto-deleted after 1 hour if not finalized)
│
└── userDocuments/
    └── {ownerIdType}/  (e.g., "EID")
        └── {ownerIdValue}/  (e.g., "E123456")
            └── {year}/  (e.g., "2025")
                └── {month}/  (e.g., "01")
                    └── {documentId}-{sanitized-filename}
                        (e.g., "uuid-lab_results.pdf")
```

**Example Paths**:
- Temp: `temp/session-abc123/1699200000000-lab_results.pdf`
- Permanent: `userDocuments/EID/E123456/2025/01/uuid-lab_results.pdf`

---

## Data Model

### Document Entity (MongoDB)

```java
{
  // Identity
  "documentId": "uuid",
  "fileName": "lab_results.pdf",  // Sanitized
  "originalFileName": "Lab Results (2024).pdf",  // Original
  "fileSize": 1024000,  // Bytes
  "contentType": "application/pdf",
  "category": "MEDICAL_RECORD",

  // S3 location
  "s3Key": "userDocuments/EID/E123456/2025/01/uuid-lab_results.pdf",
  "s3Bucket": "hs-userDocuments-prod",

  // Ownership (whose userDocument this is)
  "ownerIdType": "EID",
  "ownerIdValue": "E123456",
  "ownerFirstName": "John",
  "ownerLastName": "Doe",

  // Upload info (who uploaded it)
  "uploadedByIdType": "HSID",
  "uploadedByIdValue": "HS789012",
  "uploadedByFirstName": "Jane",
  "uploadedByLastName": "Doe",
  "uploadedAt": "2025-01-15T10:30:00Z",

  // Security
  "isSensitive": true,  // Default: all userDocuments are sensitive

  // Metadata for search
  "description": "Annual checkup lab results",
  "tags": ["lab", "annual", "2024"],
  "extractedText": "",  // Future: OCR text

  // Status
  "status": "ACTIVE",  // TEMPORARY, ACTIVE, DELETED
  "finalizedAt": "2025-01-15T10:35:00Z",
  "deletedAt": null,

  // Temporary upload tracking
  "sessionId": "session-abc123",
  "tempS3Key": "temp/session-abc123/1699200000000-lab_results.pdf",

  // Audit
  "lastModifiedAt": "2025-01-15T10:35:00Z",
  "lastAccessedAt": "2025-01-15T14:20:00Z"
}
```

### Document Categories

| Category | Label | Description |
|----------|-------|-------------|
| `MEDICAL_RECORD` | Medical Record | General medical records |
| `LAB_RESULT` | Lab Result | Laboratory test results |
| `PRESCRIPTION` | Prescription | Prescriptions and medication records |
| `INSURANCE_CARD` | Insurance Card | Insurance cards and coverage userDocuments |
| `IMMUNIZATION_RECORD` | Immunization Record | Vaccination records |
| `MARKSHEET` | Marksheet / Transcript | Academic transcripts and certificates |
| `IDENTIFICATION` | Identification | ID cards, driver's license, etc. |
| `OTHER` | Other | Other userDocuments |

---

## Access Control

### Upload Access

**Rule**: User can upload userDocuments for themselves OR for people they support (if they have DAA)

| Scenario | Upload Allowed? | Required Access |
|----------|----------------|-----------------|
| Uploading own userDocuments | ✅ Yes | Any authenticated user |
| Uploading for supported member | ✅ Yes | **DAA** (Digital Account Access) required |
| Uploading for non-supported member | ❌ No | Not in viewableMembers list |

**Implementation**:
```java
// Check if uploading for self
boolean uploadingForSelf = ownerIdValue.equals(session.getUserInfo().getIdValue());

if (!uploadingForSelf) {
  // Must have DAA access for this member
  boolean hasDAA = session.getAccessDecision().getViewableMembers().stream()
    .anyMatch(m -> m.getEid().equals(ownerIdValue) && m.getHasDigitalAccountAccess());

  if (!hasDAA) {
    throw new SecurityException("No DAA access to upload for this member");
  }
}
```

### View/Download Access

**Rule**: Can view own userDocuments OR others' userDocuments if in viewableMembers list

| Document Type | View Allowed? | Required Access |
|---------------|--------------|-----------------|
| Own userDocuments | ✅ Yes | Any authenticated user |
| Non-sensitive userDocuments of supported member | ✅ Yes | Member in viewableMembers (RRP+DAA) |
| **Sensitive** userDocuments of supported member | ✅ Yes | **ROI** (Release of Information) required |

**All userDocuments are sensitive by default** (`isSensitive: true`), so viewing others' userDocuments requires ROI.

**Implementation**:
```java
// Check if viewing own userDocument
boolean isOwnDocument = userDocument.getOwnerIdValue().equals(session.getUserInfo().getIdValue());

if (isOwnDocument) {
  return; // Always allowed
}

// Viewing someone else's userDocument - check access
SupportedMember member = session.getAccessDecision().getViewableMembers().stream()
  .filter(m -> m.getEid().equals(userDocument.getOwnerIdValue()))
  .findFirst()
  .orElseThrow(() -> new SecurityException("No access to this member's userDocuments"));

// If userDocument is sensitive, require ROI
if (userDocument.getIsSensitive() && !member.getHasSensitiveDataAccess()) {
  throw new SecurityException("No ROI access for sensitive userDocuments");
}
```

### Delete Access

**Rule**: Same as view access, but requires DAA for others' userDocuments

---

## API Endpoints

### 1. Initiate Upload

**Endpoint**: `POST /api/userDocuments/upload/initiate`

**Description**: Generate presigned S3 URLs for file upload

**Request**:
```json
{
  "files": [
    {
      "fileName": "lab-results.pdf",
      "contentType": "application/pdf",
      "fileSize": 1024000
    },
    {
      "fileName": "prescription.jpg",
      "contentType": "image/jpeg",
      "fileSize": 512000
    }
  ],
  "ownerIdType": "EID",
  "ownerIdValue": "E123456"
}
```

**Response**:
```json
{
  "uploads": [
    {
      "tempDocumentId": "uuid-1",
      "fileName": "lab-results.pdf",
      "presignedUrl": "https://hs-userDocuments-dev.s3.amazonaws.com/temp/session-abc/...",
      "s3Key": "temp/session-abc123/1699200000000-lab-results.pdf",
      "expiresIn": 900
    },
    {
      "tempDocumentId": "uuid-2",
      "fileName": "prescription.jpg",
      "presignedUrl": "https://hs-userDocuments-dev.s3.amazonaws.com/temp/session-abc/...",
      "s3Key": "temp/session-abc123/1699200000001-prescription.jpg",
      "expiresIn": 900
    }
  ]
}
```

**Frontend Usage**:
```typescript
// Step 1: Get presigned URLs
const response = await fetch('/api/userDocuments/upload/initiate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    files: selectedFiles.map(f => ({
      fileName: f.name,
      contentType: f.type,
      fileSize: f.size,
    })),
    ownerIdType: 'EID',
    ownerIdValue: 'E123456',
  }),
});

const { uploads } = await response.json();

// Step 2: Upload files directly to S3
for (let i = 0; i < uploads.length; i++) {
  const upload = uploads[i];
  const file = selectedFiles[i];

  await fetch(upload.presignedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
}
```

---

### 2. Finalize Upload

**Endpoint**: `POST /api/userDocuments/upload/finalize`

**Description**: Move files from temp to permanent storage and create metadata

**Request**:
```json
{
  "tempDocumentIds": ["uuid-1", "uuid-2"],
  "category": "MEDICAL_RECORD",
  "description": "Annual checkup results",
  "tags": ["lab", "annual", "2024"]
}
```

**Response**:
```json
[
  {
    "documentId": "uuid-1",
    "fileName": "lab-results.pdf",
    "originalFileName": "lab-results.pdf",
    "fileSize": 1024000,
    "contentType": "application/pdf",
    "category": "MEDICAL_RECORD",
    "ownerIdType": "EID",
    "ownerIdValue": "E123456",
    "ownerDisplayName": "John Doe",
    "uploadedByIdValue": "HS789012",
    "uploadedByDisplayName": "Jane Doe",
    "uploadedAt": "2025-01-15T10:30:00Z",
    "finalizedAt": "2025-01-15T10:35:00Z",
    "isSensitive": true,
    "description": "Annual checkup results",
    "tags": ["lab", "annual", "2024"],
    "status": "ACTIVE"
  },
  // ... more userDocuments
]
```

---

### 3. Search Documents

**Endpoint**: `POST /api/userDocuments/search`

**Description**: Search and filter userDocuments with pagination

**Request**:
```json
{
  "ownerIdType": "EID",
  "ownerIdValue": "E123456",
  "searchQuery": "lab",
  "categories": ["MEDICAL_RECORD", "LAB_RESULT"],
  "uploadedAfter": "2024-01-01T00:00:00Z",
  "uploadedBefore": "2025-12-31T23:59:59Z",
  "tags": ["annual"],
  "includeSensitive": true,
  "page": 0,
  "size": 20,
  "sortBy": "uploadedAt",
  "sortDirection": "DESC"
}
```

**Response**:
```json
{
  "content": [
    { /* Document object */ },
    { /* Document object */ }
  ],
  "pageable": {
    "pageNumber": 0,
    "pageSize": 20
  },
  "totalElements": 42,
  "totalPages": 3,
  "last": false,
  "first": true
}
```

---

### 4. Get Download URL

**Endpoint**: `GET /api/userDocuments/{documentId}/download`

**Description**: Generate presigned download URL

**Response**:
```json
{
  "downloadUrl": "https://hs-userDocuments-dev.s3.amazonaws.com/userDocuments/EID/E123456/...",
  "expiresIn": 900
}
```

**Frontend Usage**:
```typescript
const response = await fetch(`/api/userDocuments/${documentId}/download`, {
  credentials: 'include',
});
const { downloadUrl } = await response.json();

// Option 1: Download in browser
window.open(downloadUrl, '_blank');

// Option 2: Display in iframe/viewer
userDocument.getElementById('pdf-viewer').src = downloadUrl;
```

---

### 5. Delete Document

**Endpoint**: `DELETE /api/userDocuments/{documentId}`

**Description**: Soft delete a userDocument

**Response**: `204 No Content`

---

### 6. Get Document Categories

**Endpoint**: `GET /api/userDocuments/categories`

**Description**: Get list of available userDocument categories

**Response**:
```json
[
  { "value": "MEDICAL_RECORD", "label": "Medical Record" },
  { "value": "LAB_RESULT", "label": "Lab Result" },
  { "value": "PRESCRIPTION", "label": "Prescription" },
  { "value": "INSURANCE_CARD", "label": "Insurance Card" },
  { "value": "IMMUNIZATION_RECORD", "label": "Immunization Record" },
  { "value": "MARKSHEET", "label": "Marksheet / Transcript" },
  { "value": "IDENTIFICATION", "label": "Identification" },
  { "value": "OTHER", "label": "Other" }
]
```

---

## Configuration

### Environment Variables

```bash
# MongoDB
SPRING_DATA_MONGODB_URI=mongodb://admin:password@localhost:27017/hs_mono_repo?authSource=admin
SPRING_DATA_MONGODB_DATABASE=hs_mono_repo

# AWS S3
AWS_ACCESS_KEY_ID=your-access-key  # For local dev (use IAM role in production)
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_DOCUMENTS_BUCKET=hs-userDocuments-dev
AWS_REGION=us-east-1
AWS_S3_UPLOAD_URL_EXPIRATION_MINUTES=15
AWS_S3_DOWNLOAD_URL_EXPIRATION_MINUTES=15
```

### application.yml

```yaml
aws:
  accessKeyId: ${AWS_ACCESS_KEY_ID:}
  secretAccessKey: ${AWS_SECRET_ACCESS_KEY:}
  s3:
    userDocuments:
      bucket: ${AWS_S3_DOCUMENTS_BUCKET:hs-userDocuments-dev}
      region: ${AWS_REGION:us-east-1}
      upload-url-expiration-minutes: ${AWS_S3_UPLOAD_URL_EXPIRATION_MINUTES:15}
      download-url-expiration-minutes: ${AWS_S3_DOWNLOAD_URL_EXPIRATION_MINUTES:15}
```

---

## File Constraints

| Constraint | Value |
|------------|-------|
| Max file size | 25 MB |
| Max files per upload | 5 |
| Temp file TTL | 1 hour |
| Presigned URL expiration | 15 minutes |
| Cleanup job interval | 15 minutes |

### Allowed File Types

- **PDFs**: `application/pdf`
- **Images**: `image/jpeg`, `image/jpg`, `image/png`, `image/gif`, `image/webp`
- **Documents**: `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.userDocument`

---

## Cleanup Job

**Scheduler**: `DocumentCleanupScheduler`

**Schedule**: Every 15 minutes

**Logic**:
1. Find userDocuments with `status = TEMPORARY` and `uploadedAt < 1 hour ago`
2. Delete files from S3 (using `tempS3Key`)
3. Delete userDocument metadata from MongoDB
4. Log cleanup results

**Manual Trigger** (for testing):
```java
@Autowired
private DocumentService documentService;

documentService.cleanupAbandonedTempFiles();
```

---

## Security Best Practices

### 1. Presigned URLs

✅ **Short expiration**: 15 minutes prevents URL sharing
✅ **Session validation**: Only authenticated users get URLs
✅ **Access control**: DAA/ROI checked before URL generation
✅ **S3 bucket policy**: Restrict to BFF IAM role only

### 2. File Sanitization

✅ **Filename sanitization**: Remove path traversal characters
✅ **Content type validation**: Only allow approved MIME types
✅ **File size limits**: 25 MB max to prevent storage abuse

### 3. Data Protection

✅ **Default sensitive**: All userDocuments are sensitive by default
✅ **ROI required**: Viewing others' userDocuments requires ROI access
✅ **Audit trail**: Track who uploaded what, when, and for whom
✅ **Soft delete**: Documents marked as deleted, not permanently removed

### 4. S3 Bucket Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::ACCOUNT_ID:role/BFF-Service-Role"
      },
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::hs-userDocuments-prod/*"
    },
    {
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": "arn:aws:s3:::hs-userDocuments-prod/*",
      "Condition": {
        "StringNotEquals": {
          "aws:PrincipalArn": "arn:aws:iam::ACCOUNT_ID:role/BFF-Service-Role"
        }
      }
    }
  ]
}
```

---

## Future Enhancements

### 1. OCR Text Extraction
- Extract text from PDF/images using AWS Textract
- Store in `extractedText` field for full-text search

### 2. Document Versioning
- Allow users to upload new versions of userDocuments
- Track version history

### 3. Document Sharing
- Generate shareable links with custom expiration
- Share userDocuments with healthcare providers

### 4. Virus Scanning
- Integrate AWS GuardDuty or ClamAV
- Scan files before finalizing upload

### 5. Advanced Search
- Elasticsearch integration for fuzzy search
- Search by userDocument content (OCR text)
- Filter by multiple criteria simultaneously

---

## Testing

### Manual Testing

```bash
# 1. Start MongoDB and Redis
docker-compose up -d

# 2. Set environment variables
export AWS_ACCESS_KEY_ID=your-key
export AWS_SECRET_ACCESS_KEY=your-secret
export AWS_S3_DOCUMENTS_BUCKET=hs-userDocuments-dev

# 3. Start BFF
cd apps/bff
mvn spring-boot:run

# 4. Test upload initiate
curl -X POST http://localhost:8080/api/userDocuments/upload/initiate \
  -H "Content-Type: application/json" \
  -H "Cookie: SESSION_ID=your-session" \
  -d '{
    "files": [{"fileName": "test.pdf", "contentType": "application/pdf", "fileSize": 1024}],
    "ownerIdType": "HSID",
    "ownerIdValue": "HS123456"
  }'

# 5. Upload file to S3 using presigned URL
curl -X PUT "<presigned-url>" \
  -H "Content-Type: application/pdf" \
  --data-binary @test.pdf

# 6. Finalize upload
curl -X POST http://localhost:8080/api/userDocuments/upload/finalize \
  -H "Content-Type: application/json" \
  -H "Cookie: SESSION_ID=your-session" \
  -d '{
    "tempDocumentIds": ["temp-doc-id"],
    "category": "MEDICAL_RECORD",
    "description": "Test userDocument"
  }'
```

---

## Summary

The userDocument management system provides:

✅ **Secure upload** via presigned S3 URLs
✅ **Access control** based on DAA and ROI personas
✅ **Efficient storage** with automatic cleanup
✅ **Full-text search** across metadata and content
✅ **Audit trail** for compliance and security
✅ **Scalable architecture** ready for millions of userDocuments

**Result**: Users can safely upload, manage, and access their healthcare userDocuments and userDocuments for people they support, with enterprise-grade security and performance!
