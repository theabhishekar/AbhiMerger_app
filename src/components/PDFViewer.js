import React, { useState } from 'react';

const PDFViewer = ({ pdfPath, onReset }) => {
  const [showViewer, setShowViewer] = useState(false);

  const handleOpenPDF = async () => {
    if (!pdfPath) return;
    try {
      await window.electronAPI.openPDF(pdfPath);
    } catch (error) {
      console.error('Failed to open PDF:', error);
    }
  };

  const handleShowInFolder = async () => {
    if (!pdfPath) return;
    try {
      await window.electronAPI.showItemInFolder(pdfPath);
    } catch (error) {
      console.error('Failed to show in folder:', error);
    }
  };

  const handleToggleViewer = () => {
    setShowViewer(!showViewer);
  };

  return (
    <div className="card">
      <h2>Step 5: Merge Complete!</h2>
      
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎉</div>
        <h3 style={{ color: '#28a745', marginBottom: '10px' }}>
          PDF Merge Successful!
        </h3>
        <p style={{ fontSize: '16px', color: '#666' }}>
          Your PDFs have been successfully merged into a single document.
        </p>
      </div>

      {/* File Info */}
      <div style={{ 
        background: '#f8f9fa', 
        padding: '20px', 
        borderRadius: '8px', 
        marginBottom: '30px',
        textAlign: 'left'
      }}>
        <h4>Merged PDF Details:</h4>
        <div style={{ fontFamily: 'monospace', fontSize: '14px', wordBreak: 'break-all' }}>
          <strong>Location:</strong> {pdfPath || 'No file selected'}
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ 
        display: 'flex', 
        gap: '15px', 
        justifyContent: 'center', 
        flexWrap: 'wrap',
        marginBottom: '30px'
      }}>
        <button className="button" onClick={handleOpenPDF}>
          📖 Open PDF
        </button>
        <button className="button secondary" onClick={handleShowInFolder}>
          📁 Show in Folder
        </button>
        <button className="button secondary" onClick={handleToggleViewer}>
          {showViewer ? '👁️ Hide Preview' : '👁️ Show Preview'}
        </button>
      </div>

      {/* PDF Viewer */}
      {showViewer && (
        <div style={{ marginBottom: '30px' }}>
          <h4>PDF Preview:</h4>
          <div style={{ 
            border: '1px solid #ddd', 
            borderRadius: '8px', 
            overflow: 'hidden',
            background: '#f8f9fa'
          }}>
            <iframe
              src={pdfPath ? `file://${pdfPath}` : ''}
              className="pdf-viewer"
              title="PDF Preview"
              style={{ 
                width: '100%', 
                height: '600px', 
                border: 'none',
                background: 'white'
              }}
            />
          </div>
          <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
            Note: If the preview doesn't load, click "Open PDF" to view in your default PDF viewer.
          </p>
        </div>
      )}

      {/* Success Tips */}
      <div style={{ 
        background: 'rgba(40, 167, 69, 0.1)', 
        padding: '20px', 
        borderRadius: '8px',
        marginBottom: '30px'
      }}>
        <h4>✅ What's Next?</h4>
        <ul style={{ textAlign: 'left', margin: '10px 0' }}>
          <li>Your merged PDF is ready to use</li>
          <li>Share it via email, cloud storage, or print it</li>
          <li>The original files remain unchanged</li>
          <li>You can merge more PDFs by starting over</li>
        </ul>
      </div>

      {/* Merge Report */}
      <div style={{ 
        background: '#f8f9fa', 
        padding: '20px', 
        borderRadius: '8px',
        marginBottom: '30px',
        textAlign: 'left'
      }}>
        <h4> Merge Report:</h4>
        <div style={{ fontSize: '14px' }}>
          <p><strong>Status:</strong> <span style={{ color: '#28a745' }}>✅ Completed Successfully</span></p>
          <p><strong>Output File:</strong> {pdfPath ? pdfPath.split('/').pop() : 'Unknown'}</p>
          <p><strong>Timestamp:</strong> {new Date().toLocaleString()}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="actions">
        <button className="button" onClick={onReset}>
          🔄 Merge More PDFs
        </button>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="button secondary" onClick={handleOpenPDF}>
            📖 Open PDF
          </button>
          <button className="button secondary" onClick={handleShowInFolder}>
            📁 Show in Folder
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={{ 
        marginTop: '40px', 
        padding: '20px', 
        borderTop: '1px solid #eee',
        fontSize: '12px',
        color: '#666',
        textAlign: 'center'
      }}>
        <p>
          Thank you for using AbhiMerger! 
          <br />
          Built with ❤️ using Electron, React, and PDF-lib
        </p>
      </div>
    </div>
  );
};

export default PDFViewer;