/**
 * APP.JS - Main application initialization
 */

document.addEventListener('DOMContentLoaded', () => {
  console.log('🔥 marronMerge initializing...');
  console.log(`📦 pdfjsLib available: ${typeof pdfjsLib !== 'undefined'}`);
  console.log(`📦 Sortable available: ${typeof Sortable !== 'undefined'}`);
  
  // Set dynamic year in footer
  const currentYear = new Date().getFullYear();
  const yearElement = document.getElementById('currentYear');
  if (yearElement) {
    yearElement.textContent = currentYear;
  }
  
  // Initialize all managers in correct order
  // PreviewManager will set up PDF.js
  previewManager = new PreviewManager();
  pageManager = new PageManager();
  mergeManager = new MergeManager();
  uploadManager = new UploadManager();
  
  // Expose managers to window object for cross-module access
  window.pageManager = pageManager;
  window.previewManager = previewManager;
  window.mergeManager = mergeManager;
  window.uploadManager = uploadManager;
  
  // Application is ready
  console.log('🔥 marronMerge initialized!');
  console.log('✅ All modules loaded:');
  console.log('  - Preview Manager');
  console.log('  - Page Manager');
  console.log('  - Merge Manager');
  console.log('  - Upload Manager');
});

// Prevent accidental page navigation
window.addEventListener('beforeunload', (e) => {
  if (uploadManager && uploadManager.getUploadedFiles().length > 0) {
    e.preventDefault();
    e.returnValue = '';
  }
});
