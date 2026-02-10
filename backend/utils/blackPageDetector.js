const fs = require('fs');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf');

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = require('pdfjs-dist/legacy/build/pdf.worker');

/**
 * Detect black and blank pages in a PDF
 * @param {String} filePath - Path to PDF file
 * @returns {Object} - { success, blackPages, blankPages, error }
 */
async function detectBlackPages(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const pdf = await pdfjsLib.getDocument({
      data: fileBuffer
    }).promise;

    const blackPages = [];
    const blankPages = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1 });

      // Get text content to detect if page is mostly blank
      const textContent = await page.getTextContent();
      const hasText = textContent.items && textContent.items.length > 0;

      // Analyze page - check if it's blank or black
      const pageAnalysis = await analyzePageContent(page, viewport, hasText);

      if (pageAnalysis.isBlack) {
        blackPages.push({
          pageNumber: i,
          confidence: pageAnalysis.confidence
        });
      } else if (pageAnalysis.isBlank) {
        blankPages.push({
          pageNumber: i,
          confidence: pageAnalysis.confidence
        });
      }
    }

    return {
      success: true,
      blackPages,
      blankPages,
      totalPages: pdf.numPages
    };
  } catch (error) {
    console.error('Error detecting black pages:', error);
    return {
      success: false,
      blackPages: [],
      blankPages: [],
      error: error.message
    };
  }
}

/**
 * Analyze page content to determine if it's black or blank
 */
async function analyzePageContent(page, viewport, hasText) {
  try {
    // For a more efficient approach without canvas, we'll use text content analysis
    const textContent = await page.getTextContent();
    
    // Get operators to check for black content
    const operatorList = await page.getOperatorList();
    
    let hasBlackContent = false;
    let hasWhiteContent = false;
    let totalOperators = 0;

    // Check operators for fill/stroke operations
    if (operatorList && operatorList.fnArray) {
      totalOperators = operatorList.fnArray.length;
      
      // Look for graphics state and fill operations
      for (let i = 0; i < operatorList.fnArray.length; i++) {
        const fn = operatorList.fnArray[i];
        const args = operatorList.argsArray[i];

        // Operators: 3 = setColorSpace, 92 = fill, 113 = setFillRGBColor, etc.
        if (fn === 113 && args) { // setFillRGBColor
          const [r, g, b] = args;
          // Check if it's black (RGB close to 0,0,0)
          if (r === 0 && g === 0 && b === 0) {
            hasBlackContent = true;
          }
          // Check if it's white (RGB close to 1,1,1)
          if (r === 1 && g === 1 && b === 1) {
            hasWhiteContent = true;
          }
        }
      }
    }

    // Determine page type based on analysis
    const isBlack = hasBlackContent && !hasText && totalOperators > 50;
    const isBlank = !hasText && operatorList.fnArray.length < 20;

    return {
      isBlack,
      isBlank,
      confidence: 0.7 // Moderate confidence
    };
  } catch (error) {
    console.error('Error analyzing page:', error);
    return {
      isBlack: false,
      isBlank: false,
      confidence: 0
    };
  }
}

module.exports = { detectBlackPages };
