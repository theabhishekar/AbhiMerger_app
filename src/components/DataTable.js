import React, { useState, useMemo } from 'react';

const DataTable = ({ data, onNext, onBack, onMergeComplete }) => {
  const [selectedSheet, setSelectedSheet] = useState(Object.keys(data.sheets)[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [selectedPDFs, setSelectedPDFs] = useState([]);
  const [isMerging, setIsMerging] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [rowLimit, setRowLimit] = useState(100);

  const currentSheet = data.sheets[selectedSheet];
  
  const filteredData = useMemo(() => {
    if (!searchTerm) return currentSheet.rows;
    
    return currentSheet.rows.filter(row =>
      row.some(cell => 
        cell && cell.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [currentSheet.rows, searchTerm]);

  const sortedDataWithIndices = useMemo(() => {
    // Create array with original indices
    const dataWithIndices = filteredData.map((row, index) => ({
      row,
      originalIndex: currentSheet.rows.indexOf(row)
    }));
    
    if (!sortConfig.key) return dataWithIndices;
    
    return [...dataWithIndices].sort((a, b) => {
      const aVal = a.row[sortConfig.key] || '';
      const bVal = b.row[sortConfig.key] || '';
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig, currentSheet.rows]);

  const handleSort = (columnIndex) => {
    setSortConfig(prev => ({
      key: columnIndex,
      direction: prev.key === columnIndex && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isPDFReference = (path) => {
    if (!path || typeof path !== 'string') return false;
    const lowerPath = path.toLowerCase();
    return lowerPath.includes('.pdf') || 
           path.includes('drive.google.com/file/d/') ||
           path.includes('drive.google.com/open?id=') ||
           path.includes('docs.google.com/document/d/') ||
           path.includes('dropbox.com/s/') ||
           path.includes('dropbox.com/scl/') ||
           path.includes('onedrive.live.com') ||
           path.includes('1drv.ms/');
  };

  const getCellHyperlink = (rowIndex, cellIndex) => {
    // Find matching PDF reference from the processed data
    const pdfId = `${selectedSheet}_${rowIndex}_${cellIndex}`;
    const pdfRef = data.pdfReferences.find(ref => ref.id === pdfId);
    return pdfRef && pdfRef.source === 'hyperlink' ? pdfRef.path : null;
  };

  const cleanHyperlinkPath = (hyperlinkPath) => {
    if (!hyperlinkPath) return hyperlinkPath;
    
    let cleanPath = hyperlinkPath;
    
    // Remove https:// prefix that Excel adds to local paths
    if (cleanPath.startsWith("https://'") && cleanPath.endsWith("'")) {
      cleanPath = cleanPath.slice(9, -1);
    } else if (cleanPath.startsWith("https://") && (cleanPath.includes('/Users/') || cleanPath.includes('/home/') || cleanPath.match(/^https:\/\/[A-Z]:/))) {
      cleanPath = cleanPath.slice(8);
    }
    
    // Decode URL encoding
    try {
      cleanPath = decodeURIComponent(cleanPath);
    } catch (e) {
      // If decoding fails, use original
    }
    
    return cleanPath;
  };

  const handlePDFClick = (originalRowIndex, cellIndex, event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    const actualRowIndex = originalRowIndex + 1;
    const pdfId = `${selectedSheet}_${actualRowIndex}_${cellIndex}`;
    const pdfRef = data.pdfReferences.find(ref => ref.id === pdfId);
    
    console.log('PDF click attempt:', { originalRowIndex, cellIndex, pdfId, pdfRef });
    
    if (!pdfRef) {
      console.log('No PDF reference found for:', pdfId);
      return;
    }
    
    console.log('PDF clicked successfully:', pdfRef);
    
    setSelectedPDFs(prev => {
      const exists = prev.find(pdf => pdf.id === pdfId);
      const newSelection = exists 
        ? prev.filter(pdf => pdf.id !== pdfId)
        : [...prev, pdfRef];
      console.log('Updated selection:', newSelection);
      return newSelection;
    });
  };

  const handleMergePDFs = async () => {
    if (selectedPDFs.length === 0) return;
    
    if (!window.electronAPI) {
      alert('This feature requires running in Electron desktop app.');
      return;
    }
    
    setIsMerging(true);
    try {
      console.log('Selected PDFs for merge:', selectedPDFs);
      const outputPath = await window.electronAPI.savePDFDialog();
      if (outputPath) {
        const result = await window.electronAPI.mergePDFs(selectedPDFs, outputPath);
        console.log('Merge result:', result);
        alert(`PDFs merged successfully! ${result.totalPages} pages merged.`);
        setSelectedPDFs([]);
        if (onMergeComplete) {
          onMergeComplete(outputPath);
        }
      }
    } catch (error) {
      console.error('Merge error:', error);
      alert('Merge failed: ' + error.message);
    } finally {
      setIsMerging(false);
    }
  };

  const isPDFSelected = (originalRowIndex, cellIndex) => {
    const actualRowIndex = originalRowIndex + 1;
    const pdfId = `${selectedSheet}_${actualRowIndex}_${cellIndex}`;
    return selectedPDFs.some(pdf => pdf.id === pdfId);
  };

  const handleSelectRow = (originalRowIndex) => {
    const rowPDFs = [];
    const row = currentSheet.rows[originalRowIndex];
    row.forEach((cell, cellIndex) => {
      const actualRowIndex = originalRowIndex + 1;
      const pdfId = `${selectedSheet}_${actualRowIndex}_${cellIndex}`;
      const pdfRef = data.pdfReferences.find(ref => ref.id === pdfId);
      if (pdfRef) {
        rowPDFs.push(pdfRef);
      }
    });
    
    const allSelected = rowPDFs.every(pdf => selectedPDFs.some(selected => selected.id === pdf.id));
    
    setSelectedPDFs(prev => {
      if (allSelected) {
        return prev.filter(selected => !rowPDFs.some(rowPdf => rowPdf.id === selected.id));
      } else {
        const newSelection = [...prev];
        rowPDFs.forEach(pdf => {
          if (!newSelection.some(selected => selected.id === pdf.id)) {
            newSelection.push(pdf);
          }
        });
        return newSelection;
      }
    });
  };

  const handleSelectColumn = (columnIndex) => {
    const colPDFs = [];
    currentSheet.rows.forEach((row, rowIndex) => {
      const actualRowIndex = rowIndex + 1;
      const pdfId = `${selectedSheet}_${actualRowIndex}_${columnIndex}`;
      const pdfRef = data.pdfReferences.find(ref => ref.id === pdfId);
      if (pdfRef) {
        colPDFs.push(pdfRef);
      }
    });
    
    const allSelected = colPDFs.every(pdf => selectedPDFs.some(selected => selected.id === pdf.id));
    
    setSelectedPDFs(prev => {
      if (allSelected) {
        return prev.filter(selected => !colPDFs.some(colPdf => colPdf.id === selected.id));
      } else {
        const newSelection = [...prev];
        colPDFs.forEach(pdf => {
          if (!newSelection.some(selected => selected.id === pdf.id)) {
            newSelection.push(pdf);
          }
        });
        return newSelection;
      }
    });
  };

  const isRowSelected = (originalRowIndex) => {
    const rowPDFs = [];
    const row = currentSheet.rows[originalRowIndex];
    if (!row) return false;
    
    row.forEach((cell, cellIndex) => {
      const actualRowIndex = originalRowIndex + 1;
      const pdfId = `${selectedSheet}_${actualRowIndex}_${cellIndex}`;
      const pdfRef = data.pdfReferences.find(ref => ref.id === pdfId);
      if (pdfRef) {
        rowPDFs.push(pdfId);
      }
    });
    return rowPDFs.length > 0 && rowPDFs.every(pdfId => selectedPDFs.some(selected => selected.id === pdfId));
  };

  const isColumnSelected = (columnIndex) => {
    const colPDFs = [];
    if (!currentSheet.rows) return false;
    
    currentSheet.rows.forEach((row, rowIndex) => {
      if (!row || !row[columnIndex]) return;
      const actualRowIndex = rowIndex + 1;
      const pdfId = `${selectedSheet}_${actualRowIndex}_${columnIndex}`;
      const pdfRef = data.pdfReferences.find(ref => ref.id === pdfId);
      if (pdfRef) {
        colPDFs.push(pdfId);
      }
    });
    return colPDFs.length > 0 && colPDFs.every(pdfId => selectedPDFs.some(selected => selected.id === pdfId));
  };

  return (
    <div className="card">
      <h2>Step 2: Review Excel Data</h2>
      
      {/* File Metadata */}
      <div className="metadata">
        <div className="metadata-item">
          <div className="metadata-value">{data.metadata.sheetCount}</div>
          <div className="metadata-label">Sheets</div>
        </div>
        <div className="metadata-item">
          <div className="metadata-value">{data.metadata.totalRows}</div>
          <div className="metadata-label">Total Rows</div>
        </div>
        <div className="metadata-item">
          <div className="metadata-value">{formatFileSize(data.metadata.fileSize)}</div>
          <div className="metadata-label">File Size</div>
        </div>
        <div className="metadata-item">
          <div className="metadata-value">{data.pdfReferences.length}</div>
          <div className="metadata-label">PDF References</div>
        </div>
      </div>

      {/* Sheet Selector */}
      {Object.keys(data.sheets).length > 1 && (
        <div style={{ margin: '20px 0' }}>
          <label>Select Sheet: </label>
          <select 
            value={selectedSheet} 
            onChange={(e) => setSelectedSheet(e.target.value)}
            style={{ padding: '8px', marginLeft: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            {Object.keys(data.sheets).map(sheetName => (
              <option key={sheetName} value={sheetName}>
                {sheetName} ({data.sheets[sheetName].rowCount} rows)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Search */}
      <div style={{ margin: '20px 0' }}>
        <input
          type="text"
          placeholder="Search data..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-box"
        />
      </div>

      {/* Table Controls */}
      <div style={{ margin: '20px 0', display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span 
          onClick={() => setIsExpanded(true)}
          style={{
            fontSize: '16px',
            cursor: 'pointer',
            padding: '6px 12px',
            borderRadius: '4px',
            transition: 'all 0.2s ease',
            userSelect: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            backgroundColor: 'rgba(102, 126, 234, 0.1)',
            border: '1px solid #667eea'
          }}
          title="Open full Excel view in popup"
        >
          ⛶ View Full File
        </span>
        
        {!isExpanded && sortedDataWithIndices.length > 100 && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <label>Show rows:</label>
            <select 
              value={rowLimit} 
              onChange={(e) => setRowLimit(Number(e.target.value))}
              style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ddd' }}
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value={500}>500</option>
              <option value={sortedDataWithIndices.length}>All ({sortedDataWithIndices.length})</option>
            </select>
          </div>
        )}
        
        <span style={{ color: '#666', fontSize: '14px' }}>
          {isExpanded ? `Showing all ${sortedDataWithIndices.length} rows` : `Showing ${Math.min(rowLimit, sortedDataWithIndices.length)} of ${sortedDataWithIndices.length} rows`}
        </span>
      </div>

      {/* Data Table */}
      <div className={`table-container ${isExpanded ? 'expanded' : ''}`} style={{
        maxHeight: isExpanded ? '80vh' : '400px',
        border: isExpanded ? '2px solid #667eea' : '1px solid #ddd'
      }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '40px', textAlign: 'center' }}>Row</th>
              {currentSheet.headers.map((header, index) => (
                <th 
                  key={index}
                  style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'center' }}
                >
                  <div>
                    <input
                      type="checkbox"
                      checked={isColumnSelected(index)}
                      onChange={() => handleSelectColumn(index)}
                      style={{ marginBottom: '5px' }}
                    />
                    <div onClick={() => handleSort(index)}>
                      {header || `Column ${index + 1}`}
                      {sortConfig.key === index && (
                        <span style={{ marginLeft: '5px' }}>
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedDataWithIndices.slice(0, isExpanded ? sortedDataWithIndices.length : rowLimit).map(({ row, originalIndex }, displayIndex) => (
              <tr key={displayIndex}>
                <td style={{ textAlign: 'center', width: '40px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={isRowSelected(originalIndex)}
                      onChange={() => handleSelectRow(originalIndex)}
                    />
                    <small style={{ fontSize: '10px', color: '#666' }}>{originalIndex + 2}</small>
                  </div>
                </td>
                {row.map((cell, cellIndex) => {
                  // Use original row index for PDF ID matching
                  const actualRowIndex = originalIndex + 1; // +1 because ExcelProcessor skips header row
                  const pdfId = `${selectedSheet}_${actualRowIndex}_${cellIndex}`;
                  const pdfRef = data.pdfReferences.find(ref => ref.id === pdfId);
                  
                  // Debug for abhi cell
                  if (cell === 'abhi') {
                    console.log('Abhi cell ID calculation:', { originalIndex, actualRowIndex, cellIndex, pdfId, foundRef: !!pdfRef });
                  }
                  const isPDF = !!pdfRef;
                  const isSelected = isPDF && isPDFSelected(originalIndex, cellIndex);
                  const isHyperlink = pdfRef && pdfRef.source === 'hyperlink';
                  
                  // Debug logging for cells that might have hyperlinks
                  if (cell === 'abhi' || (cell && cell.toString().toLowerCase().includes('abhi'))) {
                    console.log('Debug cell "abhi":', { cell, pdfId, pdfRef, isPDF });
                  }
                  
                  return (
                    <td key={cellIndex}>
                      {isPDF ? (
                        <div 
                          style={{ 
                            background: isSelected ? 'rgba(102, 126, 234, 0.3)' : 'rgba(102, 126, 234, 0.1)', 
                            padding: '4px 6px', 
                            borderRadius: '3px',
                            cursor: 'pointer',
                            border: isSelected ? '1px solid #667eea' : '1px solid rgba(102, 126, 234, 0.3)',
                            transition: 'all 0.2s ease',
                            userSelect: 'none',
                            display: 'inline-block',
                            fontSize: '13px'
                          }}
                          onClick={(e) => handlePDFClick(originalIndex, cellIndex, e)}
                          title={`${isSelected ? 'Click to deselect' : 'Click to select for merging'}\n${isHyperlink ? `Hyperlink: ${pdfRef.path}` : `Path: ${pdfRef.path}`}`}
                        >
                          <span style={{ fontWeight: isSelected ? 'bold' : 'normal' }}>
                            {isSelected ? '✅ ' : ''}{cell || 'PDF'}
                          </span>
                        </div>
                      ) : (
                        <div style={{ padding: '4px 6px' }}>
                          {cell || ''}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!isExpanded && sortedDataWithIndices.length > rowLimit && (
        <div style={{ textAlign: 'center', margin: '15px 0' }}>
          <p style={{ color: '#666', marginBottom: '10px' }}>
            Showing {rowLimit} of {sortedDataWithIndices.length} total rows
          </p>
          <button 
            className="button secondary"
            onClick={() => setRowLimit(Math.min(rowLimit + 100, sortedDataWithIndices.length))}
          >
            Load More Rows
          </button>
        </div>
      )}

      {/* PDF References Summary */}
      {data.pdfReferences.length > 0 && (
        <div style={{ marginTop: '30px' }}>
          <h3>PDF References Found</h3>
          <div className="filters">
            {['local-path', 'web-url', 'network-path', 'relative-path'].map(type => {
              const count = data.pdfReferences.filter(ref => ref.type === type).length;
              if (count === 0) return null;
              
              return (
                <div key={type} className="filter-button active" style={{ cursor: 'default' }}>
                  {type.replace('-', ' ')}: {count}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected PDFs */}
      {selectedPDFs.length > 0 && (
        <div style={{ 
          margin: '20px 0', 
          padding: '15px', 
          background: 'rgba(102, 126, 234, 0.1)', 
          borderRadius: '8px' 
        }}>
          <h4>Selected PDFs ({selectedPDFs.length}):</h4>
          <div style={{ maxHeight: '100px', overflowY: 'auto' }}>
            {selectedPDFs.map(pdf => (
              <div key={pdf.id} style={{ fontSize: '12px', margin: '2px 0' }}>
                ✅ {pdf.path}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="actions">
        <button className="button secondary" onClick={onBack}>
          ← Back
        </button>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {selectedPDFs.length > 0 && (
            <button 
              className="button" 
              onClick={handleMergePDFs}
              disabled={isMerging}
            >
              {isMerging ? 'Merging...' : `Merge ${selectedPDFs.length} PDFs`}
            </button>
          )}
          <span style={{ color: '#666' }}>
            Found {data.pdfReferences.length} PDF references
          </span>
          <button 
            className="button secondary" 
            onClick={onNext}
            disabled={data.pdfReferences.length === 0}
          >
            Next: Select PDFs →
          </button>
        </div>
      </div>

      {/* Full Excel View Modal */}
      {isExpanded && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            width: '95vw',
            height: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px',
              borderBottom: '1px solid #ddd',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8f9fa'
            }}>
              <h3 style={{ margin: 0, color: '#333' }}>Full Excel View - {data.fileName}</h3>
              <button 
                onClick={() => setIsExpanded(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '5px',
                  borderRadius: '4px'
                }}
                title="Close full view"
              >
                ✕
              </button>
            </div>
            
            {/* Modal Search */}
            <div style={{ padding: '15px 20px', borderBottom: '1px solid #eee' }}>
              <input
                type="text"
                placeholder="Search in full Excel view..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '30%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>
            
            {/* Modal Content - Full Table */}
            <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>Row</th>
                    {currentSheet.headers.map((header, index) => (
                      <th key={index} style={{ textAlign: 'center', minWidth: '120px' }}>
                        <div>
                          <input
                            type="checkbox"
                            checked={isColumnSelected(index)}
                            onChange={() => handleSelectColumn(index)}
                            style={{ marginBottom: '5px' }}
                          />
                          <div>{header || `Column ${index + 1}`}</div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedDataWithIndices.map(({ row, originalIndex }, displayIndex) => (
                    <tr key={displayIndex}>
                      <td style={{ textAlign: 'center', width: '40px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <input
                            type="checkbox"
                            checked={isRowSelected(originalIndex)}
                            onChange={() => handleSelectRow(originalIndex)}
                          />
                          <small style={{ fontSize: '10px', color: '#666', fontWeight: 'bold' }}>{originalIndex + 2}</small>
                        </div>
                      </td>
                      {row.map((cell, cellIndex) => {
                        const actualRowIndex = originalIndex + 1;
                        const pdfId = `${selectedSheet}_${actualRowIndex}_${cellIndex}`;
                        const pdfRef = data.pdfReferences.find(ref => ref.id === pdfId);
                        const isPDF = !!pdfRef;
                        const isSelected = isPDF && isPDFSelected(originalIndex, cellIndex);
                        const isHyperlink = pdfRef && pdfRef.source === 'hyperlink';
                        
                        return (
                          <td key={cellIndex} style={{ minWidth: '120px', maxWidth: '300px' }}>
                            {isPDF ? (
                              <div 
                                style={{ 
                                  background: isSelected ? 'rgba(102, 126, 234, 0.3)' : 'rgba(102, 126, 234, 0.1)', 
                                  padding: '3px 5px', 
                                  borderRadius: '3px',
                                  cursor: 'pointer',
                                  border: isSelected ? '1px solid #667eea' : '1px solid rgba(102, 126, 234, 0.3)',
                                  fontSize: '12px',
                                  display: 'inline-block'
                                }}
                                onClick={(e) => handlePDFClick(originalIndex, cellIndex, e)}
                                title={`${isSelected ? 'Selected' : 'Click to select'} - ${pdfRef.path}`}
                              >
                                {isSelected ? '✅ ' : ''}{cell || 'PDF'}
                              </div>
                            ) : (
                              <div style={{ padding: '3px 5px', fontSize: '12px', wordBreak: 'break-word' }}>
                                {cell || ''}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;