/**
 * PREVIEW.JS - PDF page preview and modal functionality
 */

class PreviewManager {
  constructor() {
    console.log('🔧 Initializing PreviewManager...');
    this.initializeModal();
    this.setupPDFJS();
  }

  setupPDFJS() {
    // Check if PDF.js is loaded
    if (typeof pdfjsLib === 'undefined') {
      console.error('❌ PDF.js library not loaded!');
      return;
    }
    
    console.log('✅ PDF.js library available');
    
    // Set up the worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    console.log('✅ PDF.js worker configured');
  }

  initializeModal() {
    const modal = document.getElementById('previewModal');
    const closeBtn = document.querySelector('.modal-close');

    if (!modal || !closeBtn) {
      console.error('❌ Modal elements not found in DOM');
      return;
    }

    closeBtn.addEventListener('click', () => {
      console.log('🔒 Closing modal');
      modal.classList.remove('show');
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        console.log('🔒 Closing modal (outside click)');
        modal.classList.remove('show');
      }
    });

    console.log('✅ Modal initialized');
  }

  async showPreview(fileId, pageNumber, fileName) {
    const modal = document.getElementById('previewModal');
    const previewImage = document.getElementById('previewImage');

    if (!modal || !previewImage) {
      console.error('❌ Modal or image element not found');
      alert('Error: Modal elements not found');
      return;
    }

    // Show spinner
    this.showSpinner(true);

    try {
      console.log(`🖼️ Opening preview: ${fileName} page ${pageNumber}`);
      
      // Check if PDF.js is available
      if (typeof pdfjsLib === 'undefined') {
        throw new Error('PDF.js library not loaded');
      }

      // Fetch the PDF file using the file ID
      const pdfUrl = `/api/pdf/file/${fileId}`;
      console.log(`📥 Fetching PDF from: ${pdfUrl}`);
      
      const response = await fetch(pdfUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
      }

      const pdfData = await response.arrayBuffer();
      console.log(`📦 PDF data loaded: ${pdfData.byteLength} bytes`);

      // Load with PDF.js
      console.log('⏳ Loading PDF document...');
      const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
      console.log(`📄 PDF loaded: ${pdf.numPages} pages`);

      // Validate page number
      if (pageNumber < 1 || pageNumber > pdf.numPages) {
        throw new Error(`Invalid page number: ${pageNumber}. PDF has ${pdf.numPages} pages`);
      }

      // Get the specific page
      console.log(`📖 Getting page ${pageNumber}...`);
      const page = await pdf.getPage(pageNumber);
      console.log(`✅ Got page ${pageNumber}`);

      // Render to canvas
      const scale = 2;
      const viewport = page.getViewport({ scale });

      console.log(`🎨 Rendering page (${viewport.width}x${viewport.height})...`);

      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Failed to get canvas context');
      }

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      await page.render(renderContext).promise;
      console.log(`✅ Page rendered`);

      // Convert to image
      const imageData = canvas.toDataURL('image/png');
      previewImage.src = imageData;
      
      console.log('📺 Showing modal...');
      modal.classList.add('show');
      console.log('✅ Preview displayed successfully');
    } catch (error) {
      console.error('❌ Preview error:', error);
      console.error('❌ Stack trace:', error.stack);
      this.showSpinner(false);
      alert('Error loading preview: ' + error.message);
    } finally {
      // Slight delay before hiding spinner to ensure render completes
      setTimeout(() => {
        this.showSpinner(false);
      }, 100);
    }
  }

  showSpinner(show) {
    const spinner = document.getElementById('spinner');
    if (!spinner) {
      console.error('❌ Spinner element not found');
      return;
    }
    
    if (show) {
      spinner.style.display = 'flex';
      console.log('⏳ Showing spinner');
    } else {
      spinner.style.display = 'none';
      console.log('✅ Hiding spinner');
    }
  }
}

// Will be initialized by app.js
let previewManager;
