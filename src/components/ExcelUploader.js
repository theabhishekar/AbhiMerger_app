import React, { useState, useCallback } from 'react';

const ExcelUploader = ({ onUpload }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleFileSelect = async (file) => {
    if (!file) return;
    
    if (!window.electronAPI) {
      setError('This feature requires running in Electron desktop app. Use npm start instead.');
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const result = await window.electronAPI.processExcel(file);
      if (result.success) {
        onUpload(result);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to process Excel file: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClick = async () => {
    if (!window.electronAPI) {
      setError('This feature requires running in Electron desktop app. Use npm start instead.');
      return;
    }
    try {
      const filePath = await window.electronAPI.openExcelFile();
      if (filePath) {
        await handleFileSelect(filePath);
      }
    } catch (err) {
      setError('Failed to open file: ' + err.message);
    }
  };

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const excelFile = files.find(file => 
      file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
    );
    
    if (excelFile) {
      await handleFileSelect(excelFile.path);
    } else {
      setError('Please drop a valid Excel file (.xlsx or .xls)');
    }
  }, []);

  return (
    <div className="card">
      <h2>Step 1: Upload Excel File</h2>
      <p>Select an Excel file containing PDF references to get started.</p>
      
      <div 
        className={`upload-area ${isDragOver ? 'dragover' : ''}`}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isProcessing ? (
          <div>
            <div className="spinner">⏳</div>
            <p>Processing Excel file...</p>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}></div>
            <h3>Click to select or drag & drop Excel file</h3>
            <p>Supported formats: .xlsx, .xls</p>
            <button className="button" disabled={isProcessing}>
              Choose File
            </button>
          </div>
        )}
      </div>
      
      {error && (
        <div className="error-message" style={{ 
          background: '#f8d7da', 
          color: '#721c24', 
          padding: '15px', 
          borderRadius: '8px', 
          marginTop: '20px' 
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}
      
      <div className="help-text" style={{ marginTop: '30px', fontSize: '14px', color: '#666' }}>
        <h4>Supported PDF Reference Formats:</h4>
        <ul style={{ textAlign: 'left', maxWidth: '600px', margin: '0 auto' }}>
          <li><strong>Local paths:</strong> C:\Documents\file.pdf, /Users/docs/file.pdf</li>
          <li><strong>Network paths:</strong> \\server\share\file.pdf</li>
          <li><strong>Relative paths:</strong> ./docs/file.pdf, ../files/file.pdf</li>
          <li><strong>Web URLs:</strong> https://example.com/file.pdf</li>
          <li><strong>Google Drive:</strong> https://drive.google.com/file/d/...</li>
          <li><strong>Dropbox:</strong> https://www.dropbox.com/s/.../file.pdf</li>
        </ul>
      </div>
    </div>
  );
};

export default ExcelUploader;