/**
 * MERGE.JS - PDF merging and export functionality
 */

class MergeManager {
  constructor() {
    this.initializeControls();
  }

  initializeControls() {
    document.getElementById('mergeBtn').addEventListener('click', () => {
      this.mergePDFs();
    });
  }

  async mergePDFs() {
    const enabledPages = pageManager.getEnabledPages();

    if (enabledPages.length === 0) {
      alert('Please upload PDFs and enable at least one page');
      return;
    }

    const outputFileName = document.getElementById('outputFileName').value || 'merged.pdf';
    const statusDiv = document.getElementById('mergeStatus');

    statusDiv.className = 'status-message show loading';
    statusDiv.innerHTML = '<span>⏳ Merging PDFs... This may take a moment</span>';

    try {
      // Prepare pages for merge
      const pagesToMerge = enabledPages.map(page => ({
        filePath: page.filePath,
        pageIndex: page.pageNumber - 1, // 0-indexed
        rotationAngle: page.rotation
      }));

      const response = await fetch('/api/pdf/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pages: pagesToMerge,
          fileName: outputFileName
        })
      });

      const data = await response.json();

      if (data.success) {
        statusDiv.className = 'status-message show success';
        statusDiv.innerHTML = `
          <strong>✅ Merge successful!</strong> 
          Merged ${enabledPages.length} pages into ${data.outputFileName}.
          <br>File size: ${data.fileSize} KB
        `;

        // Trigger download
        setTimeout(() => {
          this.downloadFile(data.downloadUrl, outputFileName);
        }, 500);

        // Cleanup uploaded files after a delay
        setTimeout(() => {
          this.cleanupUploadedFiles();
        }, 2000);
      } else {
        throw new Error(data.error || 'Merge failed');
      }
    } catch (error) {
      console.error('Merge error:', error);
      statusDiv.className = 'status-message show error';
      statusDiv.innerHTML = `<strong>❌ Error:</strong> ${error.message}`;
    }
  }

  downloadFile(url, fileName) {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  cleanupUploadedFiles() {
    const uploadedFiles = uploadManager.getUploadedFiles();
    const filePaths = uploadedFiles.map(f => f.filePath);

    fetch('/api/pdf/cleanup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePaths })
    }).catch(err => console.error('Cleanup error:', err));
  }
}

// Will be initialized by app.js
let mergeManager;
