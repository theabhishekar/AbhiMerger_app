const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');
const ExcelProcessor = require('./excel-processor');
const PDFMerger = require('./pdf-merger');

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
        preload: path.join(__dirname, 'preload.js')
      },
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
      show: false
    });

    const startUrl = this.isDev 
      ? 'http://localhost:3000' 
      : `file://${path.join(__dirname, '../build/index.html')}`;
    
    console.log('Loading URL:', startUrl);
    console.log('isDev:', this.isDev);
    
    this.mainWindow.loadURL(startUrl).catch(err => {
      console.error('Failed to load URL:', err);
    });

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
      if (this.isDev) {
        this.mainWindow.webContents.openDevTools();
      }
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    this.mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.error('Failed to load:', errorCode, errorDescription, validatedURL);
    });

    this.mainWindow.webContents.on('did-finish-load', () => {
      console.log('Page loaded successfully');
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
            label: 'Recent Files',
            submenu: this.getRecentFiles()
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
        label: 'Edit',
        submenu: [
          { label: 'Undo', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
          { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
          { type: 'separator' },
          { label: 'Cut', accelerator: 'CmdOrCtrl+X', role: 'cut' },
          { label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' },
          { label: 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste' }
        ]
      },
      {
        label: 'View',
        submenu: [
          { label: 'Reload', accelerator: 'CmdOrCtrl+R', role: 'reload' },
          { label: 'Force Reload', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
          { label: 'Toggle Developer Tools', accelerator: 'F12', role: 'toggleDevTools' },
          { type: 'separator' },
          { label: 'Actual Size', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
          { label: 'Zoom In', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
          { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
          { type: 'separator' },
          { label: 'Toggle Fullscreen', accelerator: 'F11', role: 'togglefullscreen' }
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

    if (process.platform === 'darwin') {
      template.unshift({
        label: app.getName(),
        submenu: [
          { label: 'About ' + app.getName(), role: 'about' },
          { type: 'separator' },
          { label: 'Services', role: 'services', submenu: [] },
          { type: 'separator' },
          { label: 'Hide ' + app.getName(), accelerator: 'Command+H', role: 'hide' },
          { label: 'Hide Others', accelerator: 'Command+Shift+H', role: 'hideothers' },
          { label: 'Show All', role: 'unhide' },
          { type: 'separator' },
          { label: 'Quit', accelerator: 'Command+Q', click: () => app.quit() }
        ]
      });
    }

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
      const filePath = result.filePaths[0];
      this.addToRecentFiles(filePath);
      return filePath;
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

  getRecentFiles() {
    return [{ label: 'No recent files', enabled: false }];
  }

  addToRecentFiles(filePath) {
    console.log('Added to recent files:', filePath);
  }

  showAbout() {
    dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'About AbhiMerger',
      message: 'AbhiMerger v1.0.0',
      detail: 'Cross-platform desktop application for Excel-to-PDF merging.\n\nBuilt with Electron, React, and Node.js.'
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