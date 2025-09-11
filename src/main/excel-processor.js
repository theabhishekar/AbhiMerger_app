const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

class ExcelProcessor {
  constructor() {
    this.supportedExtensions = ['.xlsx', '.xls'];
  }

  async processFile(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error('File does not exist');
      }

      const workbook = XLSX.readFile(filePath);
      const sheetNames = workbook.SheetNames;
      const sheets = {};
      
      sheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        sheets[sheetName] = {
          data: jsonData,
          headers: jsonData[0] || [],
          rows: jsonData.slice(1),
          rowCount: jsonData.length - 1,
          columnCount: jsonData[0]?.length || 0,
          worksheet: worksheet // Keep reference for hyperlink access
        };
      });

      const pdfReferences = this.detectPDFReferences(sheets);

      return {
        success: true,
        filePath,
        fileName: path.basename(filePath),
        sheets,
        pdfReferences,
        metadata: {
          sheetCount: sheetNames.length,
          totalRows: Object.values(sheets).reduce((sum, sheet) => sum + sheet.rowCount, 0),
          fileSize: fs.statSync(filePath).size,
          lastModified: fs.statSync(filePath).mtime
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  detectPDFReferences(sheets) {
    const pdfReferences = [];
    const seenPDFs = new Set();

    Object.entries(sheets).forEach(([sheetName, sheet]) => {
      // Check all cells in worksheet for hyperlinks
      const worksheet = sheet.worksheet;
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
      
      for (let R = range.s.r; R <= range.e.r; R++) {
        for (let C = range.s.c; C <= range.e.c; C++) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          const cellObj = worksheet[cellAddress];
          
          if (!cellObj) continue;
          
          let pdfPath = null;
          let source = 'text';
          
          // Check for hyperlinks first - try multiple hyperlink properties
          if (cellObj.l) {
            const hyperlinkTarget = cellObj.l.Target || cellObj.l.target || cellObj.l.Hyperlink;
            console.log('Found hyperlink:', { cellAddress, cellValue: cellObj.v, hyperlinkTarget });
            if (hyperlinkTarget && this.isPDFReference(hyperlinkTarget)) {
              pdfPath = this.cleanHyperlinkPath(hyperlinkTarget);
              source = 'hyperlink';
              console.log('PDF hyperlink detected:', { cellAddress, pdfPath, source });
            }
          }
          
          // Fallback to cell text content
          if (!pdfPath && cellObj.v && typeof cellObj.v === 'string' && this.isPDFReference(cellObj.v)) {
            pdfPath = cellObj.v;
            source = 'text';
          }
          
          if (pdfPath) {
            const id = `${sheetName}_${R}_${C}`;
            
            // Avoid duplicates
            if (!seenPDFs.has(id)) {
              seenPDFs.add(id);
              const type = this.getPDFType(pdfPath);
              pdfReferences.push({
                id,
                path: pdfPath,
                type,
                source,
                sheet: sheetName,
                row: R + 1,
                column: C + 1,
                columnName: sheet.headers[C] || `Column ${C + 1}`,
                icon: this.getTypeIcon(type),
                exists: false, // Will be validated later
                selected: false
              });
              console.log('PDF reference created:', { id, cellValue: cellObj.v, pdfPath, source });
            }
          }
        }
      }
    });

    return pdfReferences;
  }

  isPDFReference(path) {
    const lowerPath = path.toLowerCase();
    return lowerPath.includes('.pdf') || 
           path.includes('drive.google.com/file/d/') ||
           path.includes('drive.google.com/open?id=') ||
           path.includes('docs.google.com/document/d/') ||
           path.includes('dropbox.com/s/') ||
           path.includes('dropbox.com/scl/') ||
           path.includes('onedrive.live.com') ||
           path.includes('1drv.ms/');
  }

  getPDFType(path) {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      if (path.includes('drive.google.com')) return 'google-drive';
      if (path.includes('dropbox.com')) return 'dropbox';
      if (path.includes('onedrive.live.com')) return 'onedrive';
      return 'web-url';
    }
    if (path.startsWith('\\\\')) return 'network-path';
    if (path.startsWith('./') || path.startsWith('../')) return 'relative-path';
    return 'local-path';
  }

  cleanHyperlinkPath(hyperlinkPath) {
    let cleanPath = hyperlinkPath;
    
    // Remove https:// prefix that Excel adds to local paths
    if (cleanPath.startsWith("https://'") && cleanPath.endsWith("'")) {
      cleanPath = cleanPath.slice(9, -1); // Remove https://' and trailing '
    } else if (cleanPath.startsWith("https://") && (cleanPath.includes('/Users/') || cleanPath.includes('/home/') || cleanPath.match(/^https:\/\/[A-Z]:/))) {
      cleanPath = cleanPath.slice(8); // Remove https:// for local paths
    }
    
    // Decode URL encoding
    try {
      cleanPath = decodeURIComponent(cleanPath);
    } catch (e) {
      // If decoding fails, use original
    }
    
    return cleanPath;
  }

  getTypeIcon(type) {
    const icons = {
      'local-path': '📁',
      'web-url': '🌐',
      'network-path': '🔗',
      'relative-path': '📄',
      'google-drive': '',
      'dropbox': '📦',
      'onedrive': '☁️'
    };
    return icons[type] || '📄';
  }
}

module.exports = ExcelProcessor;