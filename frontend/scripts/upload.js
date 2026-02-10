/**
 * UPLOAD.JS - File upload and management functionality
 */

class UploadManager {
  constructor() {
    this.uploadedFiles = [];
    this.initializeEventListeners();
  }

  initializeEventListeners() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');

    // Click to upload
    uploadArea.addEventListener('click', () => fileInput.click());

    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
      const files = e.dataTransfer.files;
      this.handleFiles(files);
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
      this.handleFiles(e.target.files);
    });
  }

  async handleFiles(fileList) {
    const uploadStatus = document.getElementById('uploadStatus');
    uploadStatus.className = 'status-message show loading';
    uploadStatus.innerHTML = '<span>⏳ Uploading files...</span>';

    console.log('📁 Files selected:', fileList.length);

    const formData = new FormData();
    let validFileCount = 0;
    let invalidFiles = [];

    // Validate and add files - don't abort on first error
    for (let file of fileList) {
      console.log(`📄 Processing: ${file.name} (type: ${file.type}, size: ${file.size})`);
      
      const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      
      if (isPDF) {
        formData.append('files', file);
        validFileCount++;
        console.log(`✅ Added to upload: ${file.name}`);
      } else {
        invalidFiles.push(file.name);
        console.warn(`❌ Skipped (not PDF): ${file.name}`);
      }
    }

    // Show warning if some files were invalid
    if (invalidFiles.length > 0) {
      uploadStatus.className = 'status-message show error';
      uploadStatus.innerHTML = `⚠️ Skipped ${invalidFiles.length} non-PDF file(s): ${invalidFiles.join(', ')}`;
      return;
    }

    // Check if we have valid files to upload
    if (validFileCount === 0) {
      uploadStatus.className = 'status-message show error';
      uploadStatus.innerHTML = '❌ Error: No valid PDF files selected';
      document.getElementById('fileInput').value = '';
      return;
    }

    try {
      console.log(`🚀 Uploading ${validFileCount} file(s)...`);
      
      const response = await fetch('/api/pdf/upload', {
        method: 'POST',
        body: formData
      });

      console.log(`📦 Response status: ${response.status}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📊 Upload response:', data);

      if (data.success && data.files && data.files.length > 0) {
        this.uploadedFiles = data.files;
        this.renderFilesList();
        uploadStatus.className = 'status-message show success';
        uploadStatus.innerHTML = `
          <strong>✅ Success!</strong> 
          ${data.files.length} file(s) uploaded successfully.
        `;
        
        console.log('📥 Loading pages from files...');
        // Trigger page preview loading
        if (window.pageManager) {
          window.pageManager.loadPagesFromFiles(this.uploadedFiles);
        } else {
          console.error('❌ pageManager not initialized');
        }
      } else {
        throw new Error(data.error || 'Upload failed - no files returned from server');
      }
    } catch (error) {
      console.error('❌ Upload error:', error);
      uploadStatus.className = 'status-message show error';
      uploadStatus.innerHTML = `<strong>❌ Error:</strong> ${error.message}`;
    }

    // Clear file input
    document.getElementById('fileInput').value = '';
  }

  renderFilesList() {
    const filesList = document.getElementById('filesList');

    if (this.uploadedFiles.length === 0) {
      filesList.innerHTML = '<p class="empty-state">No files uploaded yet</p>';
      return;
    }

    filesList.innerHTML = this.uploadedFiles.map((file, index) => `
      <div class="file-item">
        <div class="file-info">
          <div class="file-name">📄 ${file.fileName}</div>
          <div class="file-meta">
            Pages: ${file.pageCount} | Size: ${file.fileSize} KB
          </div>
        </div>
        <div class="file-actions">
          <button class="btn-small btn-delete" onclick="uploadManager.deleteFile(${index})">
            Delete
          </button>
        </div>
      </div>
    `).join('');
  }

  deleteFile(index) {
    if (confirm('Are you sure you want to delete this file?')) {
      // Cleanup from backend
      const filePath = this.uploadedFiles[index].filePath;
      fetch('/api/pdf/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePaths: [filePath] })
      }).catch(err => console.error('Cleanup error:', err));

      this.uploadedFiles.splice(index, 1);
      this.renderFilesList();
      window.pageManager.loadPagesFromFiles(this.uploadedFiles);
    }
  }

  getUploadedFiles() {
    return this.uploadedFiles;
  }
}

// Will be initialized by app.js
let uploadManager;
