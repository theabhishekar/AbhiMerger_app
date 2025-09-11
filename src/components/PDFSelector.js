import React, { useState, useEffect } from 'react';

const PDFSelector = ({ pdfReferences, onSelection, onBack, onNext }) => {
  const [selectedPDFs, setSelectedPDFs] = useState([]);
  const [validationResults, setValidationResults] = useState({});
  const [isValidating, setIsValidating] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (pdfReferences && pdfReferences.length > 0) {
      validatePDFs();
    }
  }, [pdfReferences]);

  const validatePDFs = async () => {
    if (!window.electronAPI || !pdfReferences || pdfReferences.length === 0) return;
    
    setIsValidating(true);
    try {
      const results = await window.electronAPI.validatePDFs(pdfReferences);
      const resultsMap = {};
      results.forEach(result => {
        resultsMap[result.id] = result;
      });
      setValidationResults(resultsMap);
    } catch (error) {
      console.error('Validation failed:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const filteredPDFs = pdfReferences.filter(pdf => {
    const matchesSearch = pdf.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pdf.sheet.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterType === 'all') return matchesSearch;
    if (filterType === 'valid') return matchesSearch && validationResults[pdf.id]?.exists;
    if (filterType === 'invalid') return matchesSearch && !validationResults[pdf.id]?.exists;
    return matchesSearch && pdf.type === filterType;
  });

  const handleSelectAll = () => {
    const validPDFs = filteredPDFs.filter(pdf => validationResults[pdf.id]?.exists);
    setSelectedPDFs(validPDFs.map(pdf => pdf.id));
  };

  const handleSelectNone = () => {
    setSelectedPDFs([]);
  };

  const handleSelectByRow = (rowNumber) => {
    const rowPDFs = pdfReferences.filter(pdf => pdf.row === rowNumber && validationResults[pdf.id]?.exists);
    const rowPDFIds = rowPDFs.map(pdf => pdf.id);
    const allSelected = rowPDFIds.every(id => selectedPDFs.includes(id));
    
    setSelectedPDFs(prev => {
      if (allSelected) {
        // Unselect all in row
        return prev.filter(id => !rowPDFIds.includes(id));
      } else {
        // Select all in row
        const newSelection = [...prev];
        rowPDFIds.forEach(id => {
          if (!newSelection.includes(id)) {
            newSelection.push(id);
          }
        });
        return newSelection;
      }
    });
  };

  const handleSelectByColumn = (columnName) => {
    const colPDFs = pdfReferences.filter(pdf => pdf.columnName === columnName && validationResults[pdf.id]?.exists);
    const colPDFIds = colPDFs.map(pdf => pdf.id);
    const allSelected = colPDFIds.every(id => selectedPDFs.includes(id));
    
    setSelectedPDFs(prev => {
      if (allSelected) {
        // Unselect all in column
        return prev.filter(id => !colPDFIds.includes(id));
      } else {
        // Select all in column
        const newSelection = [...prev];
        colPDFIds.forEach(id => {
          if (!newSelection.includes(id)) {
            newSelection.push(id);
          }
        });
        return newSelection;
      }
    });
  };

  const handlePDFToggle = (pdfId) => {
    console.log('Toggling PDF:', pdfId);
    setSelectedPDFs(prev => {
      const newSelection = prev.includes(pdfId) 
        ? prev.filter(id => id !== pdfId)
        : [...prev, pdfId];
      console.log('New selection:', newSelection);
      
      // Update parent with current selection
      const selectedPDFData = pdfReferences.filter(pdf => newSelection.includes(pdf.id));
      onSelection(selectedPDFData);
      
      return newSelection;
    });
  };

  const handleBatchSelect = (startIndex, endIndex) => {
    const validPDFs = pdfReferences.filter(pdf => validationResults[pdf.id]?.exists);
    const batchPDFs = validPDFs.slice(startIndex, endIndex);
    setSelectedPDFs(batchPDFs.map(pdf => pdf.id));
  };

  const handleNext = () => {
    const selectedPDFData = pdfReferences.filter(pdf => selectedPDFs.includes(pdf.id));
    console.log('Passing selected PDFs to parent:', selectedPDFData);
    
    // Check for potential issues
    const networkPDFs = selectedPDFData.filter(pdf => 
      pdf.type.includes('web') || pdf.type.includes('drive') || pdf.type.includes('dropbox')
    ).length;
    
    if (selectedPDFData.length > 20) {
      const proceed = window.confirm(
        `You've selected ${selectedPDFData.length} PDFs. This may cause memory issues.\n\n` +
        `Recommended: Process in batches of 10-15 PDFs.\n\n` +
        `Continue anyway?`
      );
      if (!proceed) return;
    }
    
    if (networkPDFs > 5) {
      const proceed = window.confirm(
        `You've selected ${networkPDFs} web/cloud PDFs. This may be slow and unreliable.\n\n` +
        `Recommended: Use local files when possible.\n\n` +
        `Continue anyway?`
      );
      if (!proceed) return;
    }
    
    onSelection(selectedPDFData);
    onNext();
  };

  const getStatusBadge = (pdf) => {
    const result = validationResults[pdf.id];
    if (!result) return <span className="pdf-status">Checking...</span>;
    
    if (result.exists) {
      return <span className="pdf-status exists">✓ Available</span>;
    } else {
      return <span className="pdf-status missing">✗ Missing</span>;
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const typeStats = pdfReferences.reduce((acc, pdf) => {
    acc[pdf.type] = (acc[pdf.type] || 0) + 1;
    return acc;
  }, {});

  const validCount = Object.values(validationResults).filter(r => r.exists).length;
  const invalidCount = Object.values(validationResults).filter(r => !r.exists).length;

  return (
    <div className="card">
      <h2>Step 3: Select PDFs to Merge</h2>
      
      {/* Statistics */}
      <div className="metadata">
        <div className="metadata-item">
          <div className="metadata-value">{pdfReferences.length}</div>
          <div className="metadata-label">Total PDFs</div>
        </div>
        <div className="metadata-item">
          <div className="metadata-value" style={{ color: '#28a745' }}>{validCount}</div>
          <div className="metadata-label">Available</div>
        </div>
        <div className="metadata-item">
          <div className="metadata-value" style={{ color: '#dc3545' }}>{invalidCount}</div>
          <div className="metadata-label">Missing</div>
        </div>
        <div className="metadata-item">
          <div className="metadata-value">{selectedPDFs.length}</div>
          <div className="metadata-label">Selected</div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ margin: '20px 0', display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search PDFs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-box"
          style={{ flex: 1, minWidth: '200px' }}
        />
        
        <div className="filters">
          <button 
            className={`filter-button ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            All ({pdfReferences.length})
          </button>
          <button 
            className={`filter-button ${filterType === 'valid' ? 'active' : ''}`}
            onClick={() => setFilterType('valid')}
          >
            Valid ({validCount})
          </button>
          <button 
            className={`filter-button ${filterType === 'invalid' ? 'active' : ''}`}
            onClick={() => setFilterType('invalid')}
          >
            Missing ({invalidCount})
          </button>
          {Object.entries(typeStats).map(([type, count]) => (
            <button 
              key={type}
              className={`filter-button ${filterType === type ? 'active' : ''}`}
              onClick={() => setFilterType(type)}
            >
              {type.replace('-', ' ')} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Actions */}
      <div style={{ margin: '20px 0', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button className="button secondary" onClick={handleSelectAll}>
          Select All Valid
        </button>
        <button className="button secondary" onClick={handleSelectNone}>
          Select None
        </button>
        <button className="button secondary" onClick={validatePDFs} disabled={isValidating}>
          {isValidating ? 'Validating...' : 'Refresh Validation'}
        </button>
      </div>

      {/* Batch Processing Warning */}
      {selectedPDFs.length > 15 && (
        <div style={{ 
          margin: '20px 0', 
          padding: '15px', 
          background: '#fff3cd', 
          border: '1px solid #ffeaa7', 
          borderRadius: '8px',
          color: '#856404'
        }}>
          <h4 style={{ margin: '0 0 10px 0' }}>⚠️ Large Batch Detected ({selectedPDFs.length} PDFs)</h4>
          <p style={{ margin: '0 0 10px 0' }}>For better performance and reliability, consider processing in smaller batches:</p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button 
              className="button secondary" 
              onClick={() => handleBatchSelect(0, 10)}
            >
              Select First 10
            </button>
            <button 
              className="button secondary" 
              onClick={() => handleBatchSelect(10, 20)}
            >
              Select Next 10
            </button>
            <button 
              className="button secondary" 
              onClick={() => handleBatchSelect(20, 30)}
            >
              Select Next 10
            </button>
          </div>
        </div>
      )}

      {/* Row/Column Selection */}
      <div style={{ margin: '20px 0' }}>
        <h4>Select by Row/Column:</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '10px' }}>
          <div>
            <h5>Rows:</h5>
            {[...new Set(pdfReferences.map(pdf => pdf.row))].sort((a, b) => a - b).map(row => {
              const rowPDFs = pdfReferences.filter(pdf => pdf.row === row && validationResults[pdf.id]?.exists);
              const rowCount = rowPDFs.length;
              const selectedInRow = rowPDFs.filter(pdf => selectedPDFs.includes(pdf.id)).length;
              const isAllSelected = rowCount > 0 && selectedInRow === rowCount;
              
              return rowCount > 0 ? (
                <div key={row} style={{ display: 'flex', alignItems: 'center', margin: '5px 0' }}>
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={() => handleSelectByRow(row)}
                    style={{ marginRight: '8px' }}
                  />
                  <label style={{ cursor: 'pointer' }} onClick={() => handleSelectByRow(row)}>
                    Row {row} ({selectedInRow}/{rowCount})
                  </label>
                </div>
              ) : null;
            })}
          </div>
          <div>
            <h5>Columns:</h5>
            {[...new Set(pdfReferences.map(pdf => pdf.columnName))].map(col => {
              const colPDFs = pdfReferences.filter(pdf => pdf.columnName === col && validationResults[pdf.id]?.exists);
              const colCount = colPDFs.length;
              const selectedInCol = colPDFs.filter(pdf => selectedPDFs.includes(pdf.id)).length;
              const isAllSelected = colCount > 0 && selectedInCol === colCount;
              
              return colCount > 0 ? (
                <div key={col} style={{ display: 'flex', alignItems: 'center', margin: '5px 0' }}>
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={() => handleSelectByColumn(col)}
                    style={{ marginRight: '8px' }}
                  />
                  <label style={{ cursor: 'pointer' }} onClick={() => handleSelectByColumn(col)}>
                    {col} ({selectedInCol}/{colCount})
                  </label>
                </div>
              ) : null;
            })}
          </div>
        </div>
      </div>

      {/* PDF List */}
      <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '8px' }}>
        {filteredPDFs.map(pdf => {
          const result = validationResults[pdf.id];
          const isSelected = selectedPDFs.includes(pdf.id);
          const isValid = result?.exists;
          
          return (
            <div 
              key={pdf.id} 
              className={`pdf-item ${isSelected ? 'selected' : ''} ${isValid ? 'clickable' : 'disabled'}`}
              style={{ opacity: isValid ? 1 : 0.6, cursor: isValid ? 'pointer' : 'not-allowed' }}
              onClick={() => isValid && handlePDFToggle(pdf.id)}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => {
                  e.stopPropagation();
                  handlePDFToggle(pdf.id);
                }}
                disabled={!isValid}
                style={{ cursor: 'pointer' }}
              />
              
              <span className="pdf-icon">{pdf.icon}</span>
              
              <div className="pdf-path" style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                  {pdf.path}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  Sheet: {pdf.sheet} | Row: {pdf.row} | Column: {pdf.columnName}
                  {result?.size && ` | ${formatFileSize(result.size)}`}
                </div>
              </div>
              
              {getStatusBadge(pdf)}
            </div>
          );
        })}
      </div>

      {filteredPDFs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          No PDFs match the current filter criteria.
        </div>
      )}

      {/* Actions */}
      <div className="actions">
        <button className="button secondary" onClick={onBack}>
          ← Back
        </button>
        <div>
          <span style={{ marginRight: '15px', color: '#666' }}>
            {selectedPDFs.length} PDFs selected
          </span>
          <button 
            className={`button ${selectedPDFs.length > 15 ? 'danger' : ''}`}
            onClick={handleNext}
            disabled={selectedPDFs.length === 0}
            title={selectedPDFs.length > 15 ? 'Large batch - consider splitting for better performance' : ''}
          >
            {selectedPDFs.length > 20 ? '⚠️ ' : ''}Merge Selected PDFs →
          </button>
        </div>
      </div>
    </div>
  );
};

export default PDFSelector;