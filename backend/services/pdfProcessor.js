const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

// No need to import blackPageDetector for now, we'll simplify
// const { detectBlackPages } = require('../utils/blackPageDetector');

class PDFProcessor {
  /**
   * Extract page information from a PDF file
   */
  static async extractPDFInfo(filePath) {
    try {
      console.log(`  📖 Reading PDF with pdf-lib: ${filePath}`);
      const fileBuffer = fs.readFileSync(filePath);
      console.log(`  📦 Buffer size: ${fileBuffer.length} bytes`);
      
      // Load PDF using pdf-lib
      const pdfDoc = await PDFDocument.load(fileBuffer);
      const pageCount = pdfDoc.getPageCount();
      
      const fileStats = fs.statSync(filePath);
      const fileSizeKB = Math.round(fileStats.size / 1024);

      console.log(`  ✅ PDF loaded: ${pageCount} pages, ${fileSizeKB} KB`);

      return {
        success: true,
        pageCount,
        fileSize: fileSizeKB,
        fileName: path.basename(filePath)
      };
    } catch (error) {
      console.error(`  ❌ Error reading PDF: ${error.message}`);
      console.error(`  ❌ Stack:`, error.stack);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Render a single page as base64 image for preview
   * Note: Actual rendering happens on frontend with PDF.js
   * Backend just returns the PDF bytes so frontend can render it
   */
  static async renderPagePreview(filePath, pageNumber, scale = 2) {
    try {
      console.log(`  🖼️ Generating preview: page ${pageNumber}`);
      
      // For backend, we'll return the PDF file as binary
      // Frontend will render it using PDF.js which is already there
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          error: 'File not found'
        };
      }

      // Return a placeholder/data URL indicating preview should be done on frontend
      // In production, you'd use 'canvas' or 'sharp' npm packages, but for simplicity:
      return {
        success: false,
        error: 'Preview rendering moved to frontend for better performance',
        note: 'Use PDF.js on frontend to render pages'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Detect black and blank pages in a PDF
   * For now, return empty arrays (detection happens on frontend with actual rendering)
   */
  static async detectBlankPages(filePath) {
    try {
      console.log(`  🔍 Scanning for blank pages: ${filePath}`);
      
      // For backend, we just return empty - actual detection with visual analysis happens on frontend
      // This is more efficient since the frontend already has the rendered pages
      
      return {
        success: true,
        blackPages: [],
        blankPages: [],
        totalPages: 0,
        note: 'Use frontend for actual blank page detection with visual rendering'
      };
    } catch (error) {
      return {
        success: false,
        blackPages: [],
        blankPages: [],
        error: error.message
      };
    }
  }

  /**
   * Merge multiple PDFs with specific pages in specified order
   * @param {Array} pages - Array of {filePath, pageIndex, rotationAngle}
   * @param {String} outputPath - Path where to save merged PDF
   */
  static async mergePDFs(pages, outputPath) {
    try {
      const mergedPdf = await PDFDocument.create();

      for (const pageConfig of pages) {
        const { filePath, pageIndex, rotationAngle = 0 } = pageConfig;

        // Load source PDF
        const sourceFileBuffer = fs.readFileSync(filePath);
        const sourcePdf = await PDFDocument.load(sourceFileBuffer);

        // Get the page
        const [copiedPage] = await mergedPdf.copyPages(
          sourcePdf,
          [pageIndex]
        );

        // Apply rotation if needed
        if (rotationAngle && rotationAngle !== 0) {
          const rotation = (rotationAngle % 360);
          copiedPage.setRotation(rotation);
        }

        mergedPdf.addPage(copiedPage);
      }

      // Save merged PDF
      const pdfBytes = await mergedPdf.save();
      fs.writeFileSync(outputPath, pdfBytes);

      return {
        success: true,
        message: 'PDFs merged successfully',
        outputPath,
        fileSize: Math.round(pdfBytes.length / 1024)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get page count from a PDF
   */
  static async getPageCount(filePath) {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const pdf = await PDFDocument.load(fileBuffer);
      return {
        success: true,
        pageCount: pdf.getPages().length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Clean up uploaded files
   */
  static cleanupFiles(filePaths) {
    try {
      filePaths.forEach(filePath => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
      return { success: true };
    } catch (error) {
      console.error('Cleanup error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Rotate a page in a PDF
   */
  static async rotatePageInPDF(filePath, pageIndex, angle) {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const pdf = await PDFDocument.load(fileBuffer);
      const pages = pdf.getPages();

      if (pageIndex < 0 || pageIndex >= pages.length) {
        return { success: false, error: 'Invalid page index' };
      }

      const page = pages[pageIndex];
      const normalizedAngle = ((angle % 360) + 360) % 360;

      // Get current rotation and add new rotation
      const currentRotation = page.getRotation().angle || 0;
      const newRotation = (currentRotation + normalizedAngle) % 360;

      page.setRotation(newRotation);

      const pdfBytes = await pdf.save();
      fs.writeFileSync(filePath, pdfBytes);

      return { success: true, message: 'Page rotated successfully' };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = PDFProcessor;
