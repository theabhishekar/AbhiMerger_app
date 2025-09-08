const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { BrowserWindow } = require('electron');

class PDFMerger {
  constructor() {
    this.tempDir = path.join(__dirname, '../../temp');
    this.ensureTempDir();
  }

  ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async validatePDFs(pdfPaths) {
    const results = [];
    
    for (const pdfPath of pdfPaths) {
      const result = {
        path: pdfPath.path,
        id: pdfPath.id,
        type: pdfPath.type,
        exists: false,
        accessible: false,
        error: null,
        size: 0
      };

      try {
        if (pdfPath.type === 'local-path') {
          result.exists = fs.existsSync(pdfPath.path);
          if (result.exists) {
            const stats = fs.statSync(pdfPath.path);
            result.accessible = stats.isFile();
            result.size = stats.size;
          }
        } else if (pdfPath.type === 'relative-path') {
          // Resolve relative to Excel file location
          const resolvedPath = path.resolve(path.dirname(pdfPath.excelPath || ''), pdfPath.path);
          result.exists = fs.existsSync(resolvedPath);
          if (result.exists) {
            const stats = fs.statSync(resolvedPath);
            result.accessible = stats.isFile();
            result.size = stats.size;
          }
        } else if (pdfPath.type.includes('web') || pdfPath.type.includes('drive') || pdfPath.type.includes('dropbox')) {
          // Check if URL is accessible
          try {
            const response = await axios.head(this.convertToDirectDownload(pdfPath.path), { timeout: 5000 });
            result.exists = response.status === 200;
            result.accessible = true;
            result.size = parseInt(response.headers['content-length'] || '0');
          } catch (error) {
            result.error = 'URL not accessible';
          }
        }
      } catch (error) {
        result.error = error.message;
      }

      results.push(result);
    }

    return results;
  }

  async mergePDFs(pdfPaths, outputPath) {
    console.log('Starting merge with paths:', pdfPaths);
    const mergedPdf = await PDFDocument.create();
    const results = {
      success: [],
      failed: [],
      outputPath: null,
      totalPages: 0
    };

    try {
      for (let i = 0; i < pdfPaths.length; i++) {
        const pdfPath = pdfPaths[i];
        console.log('Processing PDF:', pdfPath);
        
        // Send progress update
        this.sendProgress({
          current: i + 1,
          total: pdfPaths.length,
          status: `Processing ${path.basename(pdfPath.path)}...`,
          percentage: Math.round(((i + 1) / pdfPaths.length) * 100)
        });

        try {
          let pdfBytes;
          let actualPath = pdfPath.path;
          
          // Check if file exists
          if (!fs.existsSync(actualPath)) {
            console.log('File not found, trying relative path:', actualPath);
            // Try as relative path from current directory
            const relativePath = path.resolve(process.cwd(), actualPath);
            if (fs.existsSync(relativePath)) {
              actualPath = relativePath;
            } else {
              throw new Error(`File not found: ${actualPath}`);
            }
          }

          console.log('Reading PDF from:', actualPath);
          pdfBytes = fs.readFileSync(actualPath);
          
          if (!pdfBytes || pdfBytes.length === 0) {
            throw new Error('PDF file is empty or corrupted');
          }

          const pdf = await PDFDocument.load(pdfBytes);
          const pageCount = pdf.getPageCount();
          console.log(`PDF has ${pageCount} pages`);
          
          if (pageCount > 0) {
            const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            pages.forEach((page) => mergedPdf.addPage(page));
            
            results.success.push({
              path: pdfPath.path,
              pages: pages.length
            });
            results.totalPages += pages.length;
          } else {
            throw new Error('PDF has no pages');
          }

        } catch (error) {
          console.error('Error processing PDF:', error);
          results.failed.push({
            path: pdfPath.path,
            error: error.message
          });
        }
      }

      console.log('Merge results:', results);
      
      if (results.totalPages === 0) {
        throw new Error('No pages were successfully processed');
      }

      // Save merged PDF
      const pdfBytes = await mergedPdf.save();
      console.log('Generated PDF size:', pdfBytes.length);
      fs.writeFileSync(outputPath, pdfBytes);
      results.outputPath = outputPath;

      this.sendProgress({
        current: pdfPaths.length,
        total: pdfPaths.length,
        status: 'Merge completed successfully!',
        percentage: 100,
        completed: true
      });

      return results;

    } catch (error) {
      console.error('Merge failed:', error);
      throw new Error(`Failed to merge PDFs: ${error.message}`);
    }
  }

  async downloadPDF(url) {
    const directUrl = this.convertToDirectDownload(url);
    const response = await axios.get(directUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    return Buffer.from(response.data);
  }

  convertToDirectDownload(url) {
    // Convert Google Drive sharing links to direct download
    if (url.includes('drive.google.com/file/d/')) {
      const fileId = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/)?.[1];
      if (fileId) {
        return `https://drive.google.com/uc?export=download&id=${fileId}`;
      }
    }
    
    // Convert Dropbox sharing links
    if (url.includes('dropbox.com') && url.includes('?dl=0')) {
      return url.replace('?dl=0', '?dl=1');
    }
    
    return url;
  }

  sendProgress(progressData) {
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(window => {
      window.webContents.send('merge-progress', progressData);
    });
  }

  cleanup() {
    // Clean up temp directory
    if (fs.existsSync(this.tempDir)) {
      const files = fs.readdirSync(this.tempDir);
      files.forEach(file => {
        fs.unlinkSync(path.join(this.tempDir, file));
      });
    }
  }
}

module.exports = PDFMerger;