const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');
const { BrowserWindow } = require('electron');

class PDFMerger {
  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'abhimerger-temp');
    this.ensureTempDir();
  }

  ensureTempDir() {
    try {
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create temp directory:', error);
      // Fallback to system temp directory
      this.tempDir = os.tmpdir();
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
        } else if (pdfPath.type.includes('web') || pdfPath.type.includes('drive') || pdfPath.type.includes('dropbox') || pdfPath.type.includes('onedrive')) {
          // Check if URL is accessible
          try {
            const directUrl = this.convertToDirectDownload(pdfPath.path);
            const response = await axios.head(directUrl, { 
              timeout: 10000,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              }
            });
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
          
          if (pdfPath.type.includes('web') || pdfPath.type.includes('drive') || pdfPath.type.includes('dropbox') || pdfPath.type.includes('onedrive')) {
            // Download from web/cloud
            console.log('Downloading PDF from:', pdfPath.path);
            pdfBytes = await this.downloadPDF(pdfPath.path);
          } else {
            // Local file handling
            let actualPath = pdfPath.path;
            
            if (pdfPath.type === 'relative-path') {
              actualPath = path.resolve(path.dirname(pdfPath.excelPath || ''), pdfPath.path);
            }
            
            // Check if file exists
            if (!fs.existsSync(actualPath)) {
              console.log('File not found, trying relative path:', actualPath);
              const relativePath = path.resolve(process.cwd(), actualPath);
              if (fs.existsSync(relativePath)) {
                actualPath = relativePath;
              } else {
                throw new Error(`File not found: ${actualPath}`);
              }
            }

            console.log('Reading PDF from:', actualPath);
            pdfBytes = fs.readFileSync(actualPath);
          }
          
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
    console.log('Downloading from:', directUrl);
    
    try {
      const response = await axios.get(directUrl, {
        responseType: 'arraybuffer',
        timeout: 60000,
        maxRedirects: 10,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      console.log('Download response status:', response.status);
      console.log('Content type:', response.headers['content-type']);
      console.log('Content length:', response.headers['content-length']);
      
      // Check if response is actually a PDF
      const buffer = Buffer.from(response.data);
      if (buffer.length < 4 || !buffer.toString('ascii', 0, 4).includes('%PDF')) {
        // Might be HTML redirect page, try alternative method
        if (url.includes('drive.google.com')) {
          return await this.downloadGoogleDriveAlternative(url);
        }
        throw new Error('Downloaded content is not a valid PDF');
      }
      
      return buffer;
    } catch (error) {
      console.error('Download failed:', error.message);
      if (url.includes('drive.google.com')) {
        console.log('Trying alternative Google Drive method...');
        return await this.downloadGoogleDriveAlternative(url);
      }
      throw error;
    }
  }

  convertToDirectDownload(url) {
    console.log('Converting URL:', url);
    
    // Convert Google Drive sharing links to direct download
    if (url.includes('drive.google.com/file/d/')) {
      const fileId = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/)?.[1];
      if (fileId) {
        const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`;
        console.log('Converted to:', directUrl);
        return directUrl;
      }
    }
    
    // Handle Google Drive open links
    if (url.includes('drive.google.com/open?id=')) {
      const fileId = url.match(/[?&]id=([a-zA-Z0-9-_]+)/)?.[1];
      if (fileId) {
        const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`;
        console.log('Converted to:', directUrl);
        return directUrl;
      }
    }
    
    // Convert Dropbox sharing links
    if (url.includes('dropbox.com') && url.includes('?dl=0')) {
      return url.replace('?dl=0', '?dl=1');
    }
    
    // Handle Dropbox scl links
    if (url.includes('dropbox.com/scl/')) {
      return url + (url.includes('?') ? '&' : '?') + 'dl=1';
    }
    
    // Handle OneDrive links
    if (url.includes('onedrive.live.com') || url.includes('1drv.ms')) {
      return url.replace('/view?', '/download?');
    }
    
    return url;
  }

  sendProgress(progressData) {
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(window => {
      window.webContents.send('merge-progress', progressData);
    });
  }

  async downloadGoogleDriveAlternative(url) {
    const fileId = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/)?.[1] || url.match(/[?&]id=([a-zA-Z0-9-_]+)/)?.[1];
    if (!fileId) throw new Error('Could not extract Google Drive file ID');
    
    // Try the alternative download URL
    const altUrl = `https://docs.google.com/uc?export=download&id=${fileId}`;
    console.log('Trying alternative URL:', altUrl);
    
    const response = await axios.get(altUrl, {
      responseType: 'arraybuffer',
      timeout: 60000,
      maxRedirects: 10,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const buffer = Buffer.from(response.data);
    if (buffer.length < 4 || !buffer.toString('ascii', 0, 4).includes('%PDF')) {
      throw new Error('Google Drive file is not accessible or not a PDF. Make sure the file is publicly shared.');
    }
    
    return buffer;
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