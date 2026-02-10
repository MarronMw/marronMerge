/**
 * PAGEMANAGER.JS - Page management (drag-drop, rotation, toggling, etc.)
 */

class PageManager {
  constructor() {
    this.pages = [];
    this.sortableInstance = null;
    this.initializeControls();
  }

  initializeControls() {
    document.getElementById('detectBlankBtn').addEventListener('click', () => {
      this.detectBlankPages();
    });

    document.getElementById('clearAllBtn').addEventListener('click', () => {
      if (confirm('Clear all pages?')) {
        this.pages = [];
        this.renderPages();
      }
    });
  }

  async loadPagesFromFiles(uploadedFiles) {
    this.pages = [];

    // Create page entries for each uploaded file
    for (const file of uploadedFiles) {
      for (let pageNum = 1; pageNum <= file.pageCount; pageNum++) {
        this.pages.push({
          id: `${file.id}-page-${pageNum}`,
          fileId: file.id,
          fileName: file.fileName,
          filePath: file.filePath,
          pageNumber: pageNum,
          rotation: 0,
          enabled: true,
          isBlank: false,
          isBlack: false,
          previewLoaded: false,
          previewData: null
        });
      }
    }

    this.renderPages();
    this.loadPagePreviews();
  }

  async loadPagePreviews() {
    // Load previews for all pages
    console.log(`🖼️ Loading previews for ${this.pages.length} pages...`);
    for (let i = 0; i < this.pages.length; i++) {
      const page = this.pages[i];
      if (!page.previewLoaded) {
        setTimeout(() => {
          this.loadPagePreview(page);
        }, i * 150); // Stagger the requests
      }
    }
  }

  async loadPagePreview(page) {
    try {
      console.log(`🔄 Loading preview: ${page.fileName} page ${page.pageNumber}`);
      
      // Fetch the PDF file from backend
      const pdfUrl = `/api/pdf/file/${page.fileId}`;
      const response = await fetch(pdfUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.status}`);
      }

      const pdfData = await response.arrayBuffer();
      console.log(`📦 PDF data received: ${pdfData.byteLength} bytes`);

      // Load with PDF.js
      const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
      const pdfPage = await pdf.getPage(page.pageNumber);

      // Render to canvas (low quality for thumbnail)
      const scale = 1;
      const viewport = pdfPage.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const context = canvas.getContext('2d');
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      await pdfPage.render(renderContext).promise;

      // Convert canvas to data URL
      const previewData = canvas.toDataURL('image/jpeg', 0.8); // Use JPEG for smaller file size
      
      page.previewData = previewData;
      page.previewLoaded = true;

      console.log(`✅ Preview loaded: ${page.fileName} page ${page.pageNumber}`);

      // Update the thumbnail in DOM
      const thumbnail = document.querySelector(`[data-page-id="${page.id}"] .page-thumbnail`);
      if (thumbnail) {
        thumbnail.innerHTML = `<img src="${previewData}" alt="Page ${page.pageNumber}">`;
      }
    } catch (error) {
      console.error(`❌ Error loading preview for page ${page.pageNumber}:`, error);
      // Leave placeholder text instead of failing
    }
  }

  renderPages() {
    const pagesList = document.getElementById('pagesList');

    if (this.pages.length === 0) {
      pagesList.innerHTML = '<p class="empty-state">Upload PDFs to see pages</p>';
      return;
    }

    pagesList.innerHTML = this.pages.map((page, index) => `
      <div class="page-item ${page.isBlank || page.isBlack ? 'blank-page' : ''} ${!page.enabled ? 'disabled' : ''}" 
           data-page-id="${page.id}" 
           data-file-id="${page.fileId}"
           data-page-number="${page.pageNumber}"
           data-page-index="${index}">
        <div class="page-thumbnail" style="cursor: pointer;">
          ${page.previewData ? `<img src="${page.previewData}" alt="Page ${page.pageNumber}">` : '<span>Loading...</span>'}
        </div>
        <div class="page-info">
          <div class="page-label">Page ${page.pageNumber}</div>
          <div class="page-source">${page.fileName.substring(0, 15)}...</div>
        </div>
        <div class="page-item-controls">
          <button class="page-btn toggle" title="Toggle page">
            ${page.enabled ? '👁️' : '🚫'}
          </button>
          <button class="page-btn rotate" title="Rotate 90°">
            🔄
          </button>
          <button class="page-btn remove" title="Remove">
            ✕
          </button>
        </div>
      </div>
    `).join('');

    // Add event listeners to the rendered elements
    this.attachEventListeners();
    
    // Initialize sortable
    this.initializeSortable();
  }

  attachEventListeners() {
    const pagesList = document.getElementById('pagesList');

    // Add click listeners to page thumbnails for preview
    pagesList.querySelectorAll('.page-thumbnail').forEach(thumbnail => {
      thumbnail.addEventListener('click', (e) => {
        const pageItem = thumbnail.closest('.page-item');
        const fileId = pageItem.getAttribute('data-file-id');
        const pageNumber = parseInt(pageItem.getAttribute('data-page-number'));
        const fileName = this.pages.find(p => p.fileId === fileId && p.pageNumber === pageNumber)?.fileName || 'Unknown';
        
        console.log(`🖱️ Thumbnail clicked: fileId=${fileId}, page=${pageNumber}`);
        this.showPagePreview(fileId, pageNumber, fileName);
      });
    });

    // Add click listeners to toggle buttons
    pagesList.querySelectorAll('.page-btn.toggle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const pageItem = btn.closest('.page-item');
        const pageId = pageItem.getAttribute('data-page-id');
        this.togglePage(pageId);
      });
    });

    // Add click listeners to rotate buttons
    pagesList.querySelectorAll('.page-btn.rotate').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const pageItem = btn.closest('.page-item');
        const pageId = pageItem.getAttribute('data-page-id');
        this.rotatePage(pageId);
      });
    });

    // Add click listeners to remove buttons
    pagesList.querySelectorAll('.page-btn.remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const pageItem = btn.closest('.page-item');
        const pageId = pageItem.getAttribute('data-page-id');
        this.removePage(pageId);
      });
    });
  }

  initializeSortable() {
    const pagesList = document.getElementById('pagesList');

    if (this.sortableInstance) {
      this.sortableInstance.destroy();
    }

    this.sortableInstance = Sortable.create(pagesList, {
      animation: 150,
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      dragClass: 'sortable-drag',
      onEnd: (evt) => {
        // Reorder pages array based on new order
        const newPages = [];
        pagesList.querySelectorAll('.page-item').forEach((element) => {
          const pageId = element.getAttribute('data-page-id');
          const page = this.pages.find(p => p.id === pageId);
          if (page) newPages.push(page);
        });
        this.pages = newPages;
      }
    });
  }

  togglePage(pageId) {
    const page = this.pages.find(p => p.id === pageId);
    if (page) {
      page.enabled = !page.enabled;
      this.renderPages();
    }
  }

  rotatePage(pageId) {
    const page = this.pages.find(p => p.id === pageId);
    if (page) {
      page.rotation = (page.rotation + 90) % 360;
      this.renderPages();
    }
  }

  removePage(pageId) {
    if (confirm('Remove this page?')) {
      this.pages = this.pages.filter(p => p.id !== pageId);
      this.renderPages();
    }
  }

  showPagePreview(fileId, pageNumber, fileName) {
    console.log(`👁️ Page preview requested: fileId=${fileId}, page=${pageNumber}, file=${fileName}`);
    
    if (!window.previewManager) {
      console.error('❌ Preview manager not initialized');
      alert('Preview manager not ready. Please refresh the page.');
      return;
    }

    try {
      window.previewManager.showPreview(fileId, pageNumber, fileName);
    } catch (error) {
      console.error('❌ Error showing preview:', error);
      alert('Error showing preview: ' + error.message);
    }
  }

  async detectBlankPages() {
    const uploadedFiles = uploadManager.getUploadedFiles();

    if (uploadedFiles.length === 0) {
      alert('Please upload PDFs first');
      return;
    }

    const statusDiv = document.getElementById('mergeStatus');
    statusDiv.className = 'status-message show loading';
    statusDiv.innerHTML = '<span>🔍 Scanning for blank/black pages...</span>';

    try {
      let allBlankPages = [];
      let allBlackPages = [];

      for (const file of uploadedFiles) {
        const response = await fetch('/api/pdf/detect-blanks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filePath: file.filePath })
        });

        const data = await response.json();

        if (data.success) {
          // Mark pages as blank/black in our pages array
          data.blankPages.forEach(bp => {
            const page = this.pages.find(
              p => p.filePath === file.filePath && p.pageNumber === bp.pageNumber
            );
            if (page) {
              page.isBlank = true;
            }
          });

          data.blackPages.forEach(bp => {
            const page = this.pages.find(
              p => p.filePath === file.filePath && p.pageNumber === bp.pageNumber
            );
            if (page) {
              page.isBlack = true;
            }
          });

          allBlankPages.push(...data.blankPages.map(bp => ({
            ...bp,
            fileName: file.fileName
          })));

          allBlackPages.push(...data.blackPages.map(bp => ({
            ...bp,
            fileName: file.fileName
          })));
        }
      }

      this.renderPages();

      // Show results
      if (allBlankPages.length > 0 || allBlackPages.length > 0) {
        const alertDiv = document.getElementById('blankPagesAlert');
        const listDiv = document.getElementById('blankPagesList');

        let html = '<div>';
        if (allBlankPages.length > 0) {
          html += `<h4>Blank Pages (${allBlankPages.length}):</h4>`;
          allBlankPages.forEach(bp => {
            html += `<div class="blank-page-item">
              Page ${bp.pageNumber} in ${bp.fileName}
            </div>`;
          });
        }
        if (allBlackPages.length > 0) {
          html += `<h4>Black Pages (${allBlackPages.length}):</h4>`;
          allBlackPages.forEach(bp => {
            html += `<div class="blank-page-item">
              Page ${bp.pageNumber} in ${bp.fileName}
            </div>`;
          });
        }
        html += '</div>';

        listDiv.innerHTML = html;
        alertDiv.style.display = 'block';

        statusDiv.className = 'status-message show success';
        statusDiv.innerHTML = `<strong>✅ Scan complete!</strong> Found ${allBlankPages.length + allBlackPages.length} blank/black page(s).`;
      } else {
        statusDiv.className = 'status-message show info';
        statusDiv.innerHTML = '<strong>✓ Good news!</strong> No blank or black pages detected.';
      }
    } catch (error) {
      console.error('Detection error:', error);
      statusDiv.className = 'status-message show error';
      statusDiv.innerHTML = `<strong>❌ Error:</strong> ${error.message}`;
    }
  }

  getPages() {
    return this.pages;
  }

  getEnabledPages() {
    return this.pages.filter(p => p.enabled);
  }
}

// Will be initialized by app.js
let pageManager;
