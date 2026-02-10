const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PDFProcessor = require('../services/pdfProcessor');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log(`✅ Created uploads directory: ${uploadDir}`);
    }
    console.log(`📁 Storing file in: ${uploadDir}`);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Create unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const finalName = uniqueSuffix + '-' + file.originalname;
    console.log(`📝 Generated filename: ${finalName}`);
    cb(null, finalName);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    console.log(`🔍 Filtering file: ${file.originalname} (mimetype: ${file.mimetype})`);
    // Only accept PDF files
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      console.log(`✅ File accepted: ${file.originalname}`);
      cb(null, true);
    } else {
      console.warn(`❌ File rejected: ${file.originalname} - not a PDF (mimetype: ${file.mimetype})`);
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max file size
  }
});

/**
 * POST /api/pdf/upload
 * Upload PDF files
 */
router.post('/upload', upload.array('files'), async (req, res) => {
  try {
    console.log('📥 Upload request received');
    console.log(`📁 Files in request:`, req.files ? req.files.length : 0);
    
    if (!req.files || req.files.length === 0) {
      console.warn('⚠️ No files in request');
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }

    console.log(`📄 Processing ${req.files.length} file(s)...`);

    const uploadedFiles = [];

    for (const file of req.files) {
      console.log(`🔄 Processing file: ${file.originalname}`);
      const info = await PDFProcessor.extractPDFInfo(file.path);

      if (info.success) {
        uploadedFiles.push({
          id: file.filename,
          fileName: file.originalname,
          filePath: file.path,
          pageCount: info.pageCount,
          fileSize: info.fileSize
        });
        console.log(`✅ File processed: ${file.originalname} (${info.pageCount} pages)`);
      } else {
        console.error(`❌ Failed to process: ${file.originalname} - ${info.error}`);
      }
    }

    console.log(`✅ Upload complete: ${uploadedFiles.length} file(s) successfully processed`);

    res.json({
      success: true,
      files: uploadedFiles,
      message: `${uploadedFiles.length} file(s) uploaded successfully`
    });
  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/pdf/preview
 * Get preview image of a PDF page
 */
router.post('/preview', async (req, res) => {
  try {
    const { filePath, pageNumber } = req.body;

    if (!filePath || !pageNumber) {
      return res.status(400).json({
        success: false,
        error: 'Missing filePath or pageNumber'
      });
    }

    // Verify file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    const result = await PDFProcessor.renderPagePreview(filePath, pageNumber);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/pdf/detect-blanks
 * Detect black and blank pages in a PDF
 */
router.post('/detect-blanks', async (req, res) => {
  try {
    const { filePath } = req.body;

    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: 'Missing filePath'
      });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    const result = await PDFProcessor.detectBlankPages(filePath);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/pdf/merge
 * Merge PDFs with specified pages in specified order
 */
router.post('/merge', async (req, res) => {
  try {
    const { pages, fileName = 'merged.pdf' } = req.body;

    if (!pages || pages.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No pages specified for merging'
      });
    }

    // Validate all files exist
    for (const pageConfig of pages) {
      if (!fs.existsSync(pageConfig.filePath)) {
        return res.status(404).json({
          success: false,
          error: `File not found: ${pageConfig.filePath}`
        });
      }
    }

    // Create output directory if it doesn't exist
    const outputDir = path.join(__dirname, '../../outputs');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Create unique output filename
    const timestamp = Date.now();
    const outputFileName = `${timestamp}-${fileName}`;
    const outputPath = path.join(outputDir, outputFileName);

    const result = await PDFProcessor.mergePDFs(pages, outputPath);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        outputFileName,
        fileSize: result.fileSize,
        downloadUrl: `/api/pdf/download/${outputFileName}`
      });
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/pdf/download/:fileName
 * Download merged PDF
 */
router.get('/download/:fileName', (req, res) => {
  try {
    const fileName = req.params.fileName;
    const filePath = path.join(__dirname, '../../outputs', fileName);

    // Security check - prevent directory traversal
    const realPath = path.resolve(filePath);
    const outputDir = path.resolve(path.join(__dirname, '../../outputs'));

    if (!realPath.startsWith(outputDir)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    // Extract original filename from the fileName (remove timestamp)
    const originalName = fileName.split('-').slice(1).join('-') || 'merged.pdf';

    res.download(filePath, originalName, (err) => {
      if (err) {
        console.error('Download error:', err);
      }
      // Cleanup the file after download
      setTimeout(() => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }, 5000);
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/pdf/cleanup
 * Delete uploaded files
 */
router.post('/cleanup', (req, res) => {
  try {
    const { filePaths } = req.body;

    if (!filePaths || !Array.isArray(filePaths)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid filePaths'
      });
    }

    const result = PDFProcessor.cleanupFiles(filePaths);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/pdf/file/:fileId
 * Get raw PDF file for frontend rendering
 */
router.get('/file/:fileId', (req, res) => {
  try {
    const fileId = req.params.fileId;
    const filePath = path.join(__dirname, '../../uploads', fileId);

    // Security check - prevent directory traversal
    const uploadsDir = path.resolve(path.join(__dirname, '../../uploads'));
    const realPath = path.resolve(filePath);

    if (!realPath.startsWith(uploadsDir)) {
      console.warn(`🚫 Access denied to: ${filePath}`);
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    if (!fs.existsSync(filePath)) {
      console.warn(`📁 File not found: ${filePath}`);
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    console.log(`📥 Serving PDF: ${fileId}`);
    res.setHeader('Content-Type', 'application/pdf');
    res.sendFile(filePath);
  } catch (error) {
    console.error('❌ File serving error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

module.exports = router;
