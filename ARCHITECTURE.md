# marronMerge - Architecture & Technical Design

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────════┐
│                        Browser (Frontend)                    │
├─────────────────────────────────────────────────────────────┤
│                          HTML5/CSS3                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Upload     │  │   Preview    │  │ Page Manager │      │
│  │  Management  │  │   System     │  │  & Reorder   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                          ↓                                   │
│                    Fetch/AJAX API                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    HTTP REST Endpoints
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Express.js Server                         │
├─────────────────────────────────────────────────────────────┤
│
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Route Handler (pdfRoutes.js)             │   │
│  │  - POST /upload      - POST /merge                   │   │
│  │  - POST /preview     - GET /download                 │   │
│  │  - POST /detect-blanks - POST /cleanup               │   │
│  └──────────────────────────────────────────────────────┘   │
│                          ↓                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │        PDF Processing Engine (pdfProcessor.js)        │   │
│  │  - extractPDFInfo()      - mergePDFs()               │   │
│  │  - renderPagePreview()   - rotatePageInPDF()         │   │
│  │  - detectBlankPages()    - cleanupFiles()            │   │
│  └──────────────────────────────────────────────────────┘   │
│                          ↓                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │    PDF Libraries & Utilities                          │   │
│  │  - pdf-lib (manipulation)                            │   │
│  │  - pdfjs-dist (rendering)                            │   │
│  │  - blackPageDetector.js (analysis)                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                          ↓                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │          File System (Node.js fs module)              │   │
│  │  [uploads/]  [outputs/]  [temporary files]           │   │
│  └──────────────────────────────────────────────────────┘   │
│
└─────────────────────────────────────────────────────────────┘
```

## 🔀 Data Flow Diagram

### Upload & Preview Flow
```
User Selects Files
       ↓
Validation (PDF check)
       ↓
Multer Upload Handler
       ↓
Store in /uploads/
       ↓
PDFProcessor.extractPDFInfo()
       ↓
Return File Info to Frontend
       ↓
Load Page Previews Asynchronously
       ↓
PDFProcessor.renderPagePreview())
       ↓
PDF.js renders page → PNG → Base64
       ↓
Display Thumbnails
```

### Merge Flow
```
User Selects Pages & Order
       ↓
Frontend Collects Enabled Pages
       ↓
POST /api/pdf/merge
       ↓
PDFProcessor.mergePDFs()
       ↓
Load Each Source PDF
       ↓
pdf-lib copies pages in order
       ↓
Apply Rotations (if any)
       ↓
Save Merged PDF to /outputs/
       ↓
Send Download URL to Frontend
       ↓
Frontend Triggers Download
       ↓
Auto-delete Files after 5 seconds
```

### Blank Page Detection Flow
```
User Clicks Detect Button
       ↓
POST /api/pdf/detect-blanks
       ↓
detectBlackPages() utility
       ↓
Load PDF with PDF.js
       ↓
For Each Page:
  - Get text content
  - Analyze operators
  - Check color values
       ↓
Classify as Black/Blank/Normal
       ↓
Return Results Array
       ↓
Frontend Highlights Pages
```

## 📦 Component Breakdown

### Frontend Components

#### 1. **upload.js** - UploadManager Class
- **Responsibility**: Handle file uploads
- **Key Methods**:
  - `handleFiles()`: Process uploaded files
  - `renderFilesList()`: Display file information
  - `deleteFile()`: Remove files
- **External Dependencies**: Fetch API, FormData

#### 2. **preview.js** - PreviewManager Class
- **Responsibility**: Display page previews
- **Key Methods**:
  - `showPreview()`: Load and display page image
  - `showSpinner()`: Loading indicator
- **External Dependencies**: Fetch API

#### 3. **pageManager.js** - PageManager Class
- **Responsibility**: Manage page order and properties
- **Key Methods**:
  - `loadPagesFromFiles()`: Initialize pages
  - `loadPagePreviews()`: Load all thumbnails
  - `renderPages()`: Render page list
  - `initializeSortable()`: Setup drag-drop
  - `togglePage()`: Enable/disable pages
  - `rotatePage()`: Rotate page
  - `removePage()`: Delete page
  - `detectBlankPages()`: Scan for blanks
- **External Dependencies**: SortableJS, Fetch API

#### 4. **merge.js** - MergeManager Class
- **Responsibility**: Merge and export PDFs
- **Key Methods**:
  - `mergePDFs()`: Orchestrate merge
  - `downloadFile()`: Trigger download
  - `cleanupUploadedFiles()`: Remove temp files
- **External Dependencies**: Fetch API

#### 5. **app.js** - Main Initialization
- Initializes all managers
- Sets PDF.js worker
- Prevents accidental navigation

### Backend Components

#### 1. **app.js** - Express Application
```javascript
- Middleware setup (CORS, body parsing)
- Static file serving (frontend)
- Route mounting
- Error handling
- Directory creation
```

#### 2. **routes/pdfRoutes.js** - API Routes
```javascript
POST   /upload           - File upload handler
POST   /preview          - Page preview endpoint
POST   /detect-blanks    - Blank page detection
POST   /merge            - PDF merge endpoint
GET    /download/:file   - Download merged PDF
POST   /cleanup          - Remove temporary files
GET    /health           - Health check
```

#### 3. **services/pdfProcessor.js** - Core Logic
```javascript
extractPDFInfo()      - Get PDF metadata
renderPagePreview()   - Generate page image
detectBlankPages()    - Find blank pages
mergePDFs()          - Combine PDFs
getPageCount()       - Get page count
rotatePageInPDF()    - Rotate page
cleanupFiles()       - Delete files
```

#### 4. **utils/blackPageDetector.js** - Detection Logic
```javascript
detectBlackPages()    - Analyze pages
analyzePageContent()  - Per-page analysis
```

## 🔄 State Management

### Frontend State
```javascript
// Upload Manager
uploadManager.uploadedFiles = [
  {
    id: string,
    fileName: string,
    filePath: string,
    pageCount: number,
    fileSize: number
  }
]

// Page Manager
pageManager.pages = [
  {
    id: string,
    fileId: string,
    fileName: string,
    filePath: string,
    pageNumber: number,
    rotation: 0,
    enabled: boolean,
    isBlank: boolean,
    isBlack: boolean,
    previewLoaded: boolean,
    previewData: string (base64)
  }
]
```

## 🛡️ Security Implementation

### Input Validation
- **File Type**: Only .pdf accepted
- **File Size**: 100MB limit per file
- **Path Sanitization**: Real path resolution to prevent traversal

### Data Protection
- **Memory**: Temporary files stored on disk, not in memory
- **Cleanup**: Files deleted after processing
- **CORS**: Properly configured for same-origin requests

## ⚡ Performance Optimizations

### Frontend
1. **Lazy Loading**: Page previews load asynchronously
2. **Staggered Requests**: 100ms delays prevent server overload
3. **DOM Efficiency**: Minimal DOM manipulation
4. **CSS GPU Acceleration**: Transforms and transitions use GPU

### Backend
1. **Streaming**: Large files handled via streaming
2. **Async Operations**: All I/O operations are non-blocking
3. **PDF.js Caching**: Library cached in browser
4. **Multer Options**: Disk storage instead of memory

## 📊 Database Schema (Files)

No database is used. File-based system:

```
/uploads/
  ├── timestamp-random-filename.pdf
  ├── timestamp-random-filename.pdf
  └── ...

/outputs/
  ├── timestamp-merged.pdf
  ├── timestamp-merged.pdf
  └── ...
```

Each file auto-deletes after download or timeout.

## 🔌 API Contracts

### Request/Response Format
- All requests use JSON (except file uploads)
- All responses are JSON
- Success responses include `{ success: true }`
- Error responses include `{ success: false, error: "message" }`

### Error Handling
- HTTP 400: Bad request (missing parameters)
- HTTP 404: Resource not found
- HTTP 403: Access denied (security)
- HTTP 500: Server error

## 🧪 Testing Scenarios

### Unit Test Examples
```javascript
// Test blank page detection
await PDFProcessor.detectBlankPages('/path/to/blank.pdf')

// Test merge with rotation
await PDFProcessor.mergePDFs([
  { filePath: '/path/to/file.pdf', pageIndex: 0, rotationAngle: 90 }
], '/output/merged.pdf')

// Test preview rendering
await PDFProcessor.renderPagePreview('/path/to/file.pdf', 1)
```

### Integration Test Workflow
1. Upload test PDF
2. Fetch page preview
3. Detect blank pages
4. Reorder pages
5. Merge PDFs
6. Download result
7. Verify output integrity

## 🔮 Future Enhancement Opportunities

### Phase 2 Features
- [ ] OCR text extraction
- [ ] PDF compression settings
- [ ] Batch processing queue
- [ ] User authentication
- [ ] Upload history
- [ ] Merge templates

### Phase 3 Features
- [ ] Cloud storage integration (AWS S3)
- [ ] PDF annotation tools
- [ ] Watermarking
- [ ] Digital signatures
- [ ] API rate limiting

### Performance Improvements
- [ ] Redis caching for previews
- [ ] Worker threads for PDF processing
- [ ] Distributed processing for large batches
- [ ] Progressive image JPEG for previews

## 📈 Scalability Considerations

### Current Limitations
- Single-threaded Node.js process
- Server-side storage only
- 100MB file size limit
- Memory usage ~200MB

### Scaling Strategy
1. **Vertical**: Increase server resources
2. **Horizontal**: Load balancer + multiple instances
3. **Cloud**: AWS Lambda, Google Cloud Functions
4. **Storage**: Move uploads to S3/Cloud Storage
5. **Queue**: Add Redis queue for processing

---

**Architecture Version**: 1.0.0  
**Last Updated**: February 10, 2024
