const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openExcelFile: () => ipcRenderer.invoke('open-excel-file'),
  processExcel: (filePath) => ipcRenderer.invoke('process-excel', filePath),
  validatePDFs: (pdfPaths) => ipcRenderer.invoke('validate-pdfs', pdfPaths),
  mergePDFs: (pdfPaths, outputPath) => ipcRenderer.invoke('merge-pdfs', pdfPaths, outputPath),
  savePDFDialog: () => ipcRenderer.invoke('save-pdf-dialog'),
  openPDF: (filePath) => ipcRenderer.invoke('open-pdf', filePath),
  showItemInFolder: (filePath) => ipcRenderer.invoke('show-item-in-folder', filePath),
  
  onProgress: (callback) => {
    ipcRenderer.on('merge-progress', callback);
    return () => ipcRenderer.removeListener('merge-progress', callback);
  }
});