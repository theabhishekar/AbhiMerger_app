const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

// Import main process modules
const ExcelProcessor = require('../src/main/excel-processor');
const PDFMerger = require('../src/main/pdf-merger');

class MainApp {
  constructor() {
    this.mainWindow = null;
    this.excelProcessor = new ExcelProcessor();
    this.pdfMerger = new PDFMerger();
    this.isDev = !app.isPackaged;
  }

  createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        webSecurity: !this.isDev,
        preload: path.join(__dirname, '../src/main/preload.js')
      },
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
      show: false
    });

    const startUrl = this.isDev 
      ? 'http://localhost:3000' 
      : `file://${path.join(__dirname, 'index.html')}`;
    
    this.mainWindow.loadURL(startUrl);

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
      if (this.isDev) {
        this.mainWindow.webContents.openDevTools();
      }
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    this.createMenu();
    this.setupIPC();
  }

  createMenu() {
    const template = [
      {
        label: 'File',
        submenu: [
          {
            label: 'Open Excel File...',
            accelerator: 'CmdOrCtrl+O',
            click: () => this.openExcelFile()
          },
          { type: 'separator' },
          {
            label: 'Exit',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => app.quit()
          }
        ]
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'About AbhiMerger',
            click: () => this.showAbout()
          }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  setupIPC() {
    ipcMain.handle('open-excel-file', () => this.openExcelFile());
    ipcMain.handle('process-excel', (event, filePath) => this.excelProcessor.processFile(filePath));
    ipcMain.handle('validate-pdfs', (event, pdfPaths) => this.pdfMerger.validatePDFs(pdfPaths));
    ipcMain.handle('merge-pdfs', (event, pdfPaths, outputPath) => this.pdfMerger.mergePDFs(pdfPaths, outputPath));
    ipcMain.handle('save-pdf-dialog', () => this.savePDFDialog());
    ipcMain.handle('open-pdf', (event, filePath) => shell.openPath(filePath));
    ipcMain.handle('show-item-in-folder', (event, filePath) => shell.showItemInFolder(filePath));
  }

  async openExcelFile() {
    const result = await dialog.showOpenDialog(this.mainWindow, {
      title: 'Select Excel File',
      filters: [
        { name: 'Excel Files', extensions: ['xlsx', 'xls'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  }

  async savePDFDialog() {
    const result = await dialog.showSaveDialog(this.mainWindow, {
      title: 'Save Merged PDF',
      defaultPath: 'merged-document.pdf',
      filters: [
        { name: 'PDF Files', extensions: ['pdf'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    return result.canceled ? null : result.filePath;
  }

  showAbout() {
    dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'About AbhiMerger',
      message: 'AbhiMerger v1.0.0',
      detail: 'Cross-platform desktop application for Excel-to-PDF merging.'
    });
  }
}

const mainApp = new MainApp();

app.whenReady().then(() => {
  mainApp.createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainApp.createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

autoUpdater.checkForUpdatesAndNotify();