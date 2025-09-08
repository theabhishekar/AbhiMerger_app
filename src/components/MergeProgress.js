import React from 'react';

const MergeProgress = ({ progress, onCancel }) => {
  if (!progress) {
    return (
      <div className="card">
        <div className="progress-container">
          <h2>Initializing Merge...</h2>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: '0%' }}></div>
          </div>
        </div>
      </div>
    );
  }

  const { current = 0, total = 0, status = '', percentage = 0, error, completed } = progress;

  return (
    <div className="card">
      <h2>Step 4: Merging PDFs</h2>
      
      <div className="progress-container">
        {error ? (
          <div>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>❌</div>
            <h3 style={{ color: '#dc3545' }}>Merge Failed</h3>
            <p style={{ color: '#721c24', background: '#f8d7da', padding: '15px', borderRadius: '8px' }}>
              {error}
            </p>
            <button className="button secondary" onClick={onCancel} style={{ marginTop: '20px' }}>
              ← Back to Selection
            </button>
          </div>
        ) : completed ? (
          <div>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>✅</div>
            <h3 style={{ color: '#28a745' }}>Merge Completed Successfully!</h3>
            <p>Your PDFs have been merged and saved.</p>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚙️</div>
            <h3>Merging in Progress...</h3>
            
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
            
            <div className="progress-text">
              {percentage}% Complete
            </div>
            
            <div style={{ margin: '20px 0', fontSize: '16px' }}>
              {status}
            </div>
            
            {total > 0 && (
              <div style={{ color: '#666', fontSize: '14px' }}>
                Processing {current} of {total} files
              </div>
            )}
            
            <button 
              className="button danger" 
              onClick={onCancel}
              style={{ marginTop: '30px' }}
            >
              Cancel Merge
            </button>
          </div>
        )}
      </div>
      
      {/* Progress Details */}
      {!error && !completed && progress.details && (
        <div style={{ marginTop: '30px', textAlign: 'left' }}>
          <h4>Progress Details:</h4>
          <div style={{ 
            background: '#f8f9fa', 
            padding: '15px', 
            borderRadius: '8px',
            maxHeight: '200px',
            overflowY: 'auto',
            fontSize: '14px',
            fontFamily: 'monospace'
          }}>
            {progress.details.map((detail, index) => (
              <div key={index} style={{ marginBottom: '5px' }}>
                <span style={{ color: detail.type === 'error' ? '#dc3545' : '#28a745' }}>
                  {detail.type === 'error' ? '❌' : '✅'}
                </span>
                {' '}
                {detail.message}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Merge Statistics */}
      {completed && progress.stats && (
        <div className="metadata" style={{ marginTop: '30px' }}>
          <div className="metadata-item">
            <div className="metadata-value">{progress.stats.totalFiles || 0}</div>
            <div className="metadata-label">Files Processed</div>
          </div>
          <div className="metadata-item">
            <div className="metadata-value">{progress.stats.successCount || 0}</div>
            <div className="metadata-label">Successful</div>
          </div>
          <div className="metadata-item">
            <div className="metadata-value">{progress.stats.failedCount || 0}</div>
            <div className="metadata-label">Failed</div>
          </div>
          <div className="metadata-item">
            <div className="metadata-value">{progress.stats.totalPages || 0}</div>
            <div className="metadata-label">Total Pages</div>
          </div>
        </div>
      )}
      
      {/* Tips while waiting */}
      {!error && !completed && (
        <div style={{ 
          marginTop: '40px', 
          padding: '20px', 
          background: 'rgba(102, 126, 234, 0.1)', 
          borderRadius: '8px',
          fontSize: '14px'
        }}>
          <h4>💡 Tips:</h4>
          <ul style={{ textAlign: 'left', margin: '10px 0' }}>
            <li>Large files may take longer to process</li>
            <li>Web-based PDFs need to be downloaded first</li>
            <li>Password-protected PDFs will be skipped</li>
            <li>The merged PDF will preserve original page layouts</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default MergeProgress;