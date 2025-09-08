# AbhiMerger

A cross-platform desktop application for merging PDFs referenced in Excel files. Built with Electron, React, and Node.js.

## Features

### 🔥 Core Functionality
- **Excel File Processing**: Upload and parse .xlsx/.xls files with interactive data tables
- **Smart PDF Detection**: Auto-detect PDF references in Excel cells (local paths, URLs, network paths)
- **PDF Validation**: Real-time validation of PDF file existence and accessibility
- **Bulk PDF Merging**: Merge selected PDFs into a single document with progress tracking
- **Built-in PDF Viewer**: Preview merged PDFs directly in the app

###  Excel Integration
- Support for multiple sheets
- Interactive data table with sorting, filtering, and search
- Visual indicators for different PDF reference types:
  - 📁 Local file paths
  - 🌐 Web URLs  
  - 🔗 Network paths
  - 📄 Relative paths
  -  Google Drive links
  - 📦 Dropbox links
  - ☁️ OneDrive links

### 🔄 PDF Processing
- **Local Files**: Direct file system access
- **Web URLs**: Download and cache management
- **Google Drive**: Auto-convert sharing links to direct downloads
- **Network Paths**: UNC path support (\\server\share\file.pdf)
- **Relative Paths**: Resolve relative to Excel file location
- **Password Protection**: Handle password-protected PDFs
- **Metadata Preservation**: Maintain PDF bookmarks and properties

### 🖥️ Desktop Features
- **Native File Dialogs**: OS-native open/save dialogs
- **Menu Bar**: Full menu system with keyboard shortcuts
- **Auto-updater**: Seamless application updates
- **Recent Files**: Quick access to recently opened Excel files
- **System Integration**: 
  - Open PDFs in default viewer
  - Show files in system file manager
  - System notifications
  - Taskbar/dock progress indicators

### 🎨 User Interface
- **Modern React UI**: Responsive design with Tailwind CSS
- **Step-by-step Workflow**: Guided 5-step process
- **Real-time Progress**: Live updates during PDF merging
- **Drag & Drop**: Drag Excel files directly into the app
- **Dark/Light Theme**: Automatic theme detection
- **Accessibility**: Full keyboard navigation and screen reader support

## Installation

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Development Setup
```bash
# Clone the repository
git clone <repository-url>
cd AbhiMerger

# Install dependencies
npm install

# Start development server
npm run dev
```

### Building for Production
```bash
# Build React app
npm run build

# Build Electron app for current platform
npm run dist

# Build for all platforms
npm run build:electron
```

## Usage

### Step 1: Upload Excel File
- Click "Choose File" or drag & drop an Excel file
- Supported formats: .xlsx, .xls
- File is automatically processed and analyzed

### Step 2: Review Excel Data
- Browse your Excel data in an interactive table
- Search and filter through rows and columns
- View file metadata and PDF reference statistics
- Switch between multiple sheets if available

### Step 3: Select PDFs
- Review all detected PDF references
- Validate PDF accessibility in real-time
- Filter by type (local, web, network, etc.)
- Bulk select valid PDFs or choose individually
- See file sizes and availability status

### Step 4: Merge PDFs
- Watch real-time progress as PDFs are processed
- See detailed status for each file
- Cancel operation if needed
- Handle errors gracefully

### Step 5: View Results
- Preview merged PDF in built-in viewer
- Open in default PDF application
- Show file location in system file manager
- Start new merge process

## Supported PDF Sources

### Local Files
```
C:\Documents\file.pdf (Windows)
/Users/docs/file.pdf (macOS/Linux)
```

### Network Paths
```
\\server\share\file.pdf (UNC paths)
```

### Relative Paths
```
./docs/file.pdf
../files/file.pdf
```

### Web URLs
```
https://example.com/file.pdf
```

### Cloud Storage
```
https://drive.google.com/file/d/1ABC...
https://www.dropbox.com/s/xyz/file.pdf
https://onedrive.live.com/.../file.pdf
```

## Architecture

### Main Process (Node.js)
- **main.js**: Application lifecycle and window management
- **excel-processor.js**: Excel file parsing and PDF detection
- **pdf-merger.js**: PDF validation, downloading, and merging
- **preload.js**: Secure IPC bridge to renderer

### Renderer Process (React)
- **App.js**: Main application component with step management
- **ExcelUploader**: File upload with drag & drop
- **DataTable**: Interactive Excel data display
- **PDFSelector**: PDF selection with validation
- **MergeProgress**: Real-time progress tracking
- **PDFViewer**: Built-in PDF preview

### Key Technologies
- **Electron**: Cross-platform desktop framework
- **React**: Modern UI library
- **PDF-lib**: PDF manipulation and merging
- **SheetJS**: Excel file parsing
- **Axios**: HTTP client for web PDF downloads
- **TanStack Table**: Advanced data table functionality

## Distribution

### Windows
- `.exe` installer with auto-updater
- Portable version available
- Code signing for security

### macOS
- `.dmg` installer
- Code signing and notarization
- Apple Silicon (M1/M2) support

### Linux
- `.AppImage` (universal)
- `.deb` packages (Debian/Ubuntu)
- `.rpm` packages (Red Hat/Fedora)

## Security Features

- **Sandboxed Renderer**: Isolated renderer process
- **Context Isolation**: Secure IPC communication
- **No Remote Module**: Enhanced security model
- **File Validation**: Verify file types and integrity
- **Safe Downloads**: Secure handling of web PDFs

## Performance Optimizations

- **Streaming**: Handle large files efficiently
- **Background Processing**: Non-blocking PDF operations
- **Memory Management**: Efficient handling of large Excel files
- **Caching**: Smart caching of downloaded PDFs
- **Progress Tracking**: Real-time feedback with ETA

## Troubleshooting

### Common Issues

**Excel file won't open**
- Ensure file is not corrupted
- Check file permissions
- Try saving as .xlsx format

**PDFs not found**
- Verify file paths are correct
- Check network connectivity for web URLs
- Ensure proper permissions for network paths

**Merge fails**
- Check available disk space
- Verify PDF files are not corrupted
- Ensure PDFs are not password-protected

### Debug Mode
```bash
# Run in development mode with DevTools
npm run dev
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and feature requests, please use the GitHub issue tracker.

---

**AbhiMerger** - Simplifying PDF management for Excel users worldwide! 🚀