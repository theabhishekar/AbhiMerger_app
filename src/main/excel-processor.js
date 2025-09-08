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
          columnCount: jsonData[0]?.length || 0
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
      sheet.rows.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
          if (typeof cell === 'string' && this.isPDFReference(cell)) {
            const id = `${sheetName}_${rowIndex}_${colIndex}`;
            
            // Avoid duplicates
            if (!seenPDFs.has(id)) {
              seenPDFs.add(id);
              const type = this.getPDFType(cell);
              pdfReferences.push({
                id,
                path: cell,
                type,
                sheet: sheetName,
                row: rowIndex + 2, // +2 because we start from 1 and skip header
                column: colIndex + 1,
                columnName: sheet.headers[colIndex] || `Column ${colIndex + 1}`,
                icon: this.getTypeIcon(type),
                exists: false, // Will be validated later
                selected: false
              });
            }
          }
        });
      });
    });

    return pdfReferences;
  }

  isPDFReference(cell) {
    return cell.toLowerCase().includes('.pdf') || 
           cell.includes('drive.google.com/file/d/') ||
           cell.includes('dropbox.com/s/') ||
           cell.includes('onedrive.live.com');
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