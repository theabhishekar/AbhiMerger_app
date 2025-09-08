import React, { useState, useMemo } from 'react';

const DataTable = ({ data, onNext, onBack, onMergeComplete }) => {
  const [selectedSheet, setSelectedSheet] = useState(Object.keys(data.sheets)[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [selectedPDFs, setSelectedPDFs] = useState([]);
  const [isMerging, setIsMerging] = useState(false);

  const currentSheet = data.sheets[selectedSheet];
  
  const filteredData = useMemo(() => {
    if (!searchTerm) return currentSheet.rows;
    
    return currentSheet.rows.filter(row =>
      row.some(cell => 
        cell && cell.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [currentSheet.rows, searchTerm]);

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;
    
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortConfig.key] || '';
      const bVal = b[sortConfig.key] || '';
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig]);

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

  const handlePDFClick = (cellValue, rowIndex, cellIndex) => {
    const pdfId = `${selectedSheet}_${rowIndex}_${cellIndex}`;
    const pdfPath = {
      id: pdfId,
      path: cellValue,
      sheet: selectedSheet,
      row: rowIndex + 2,
      column: cellIndex + 1,
      columnName: currentSheet.headers[cellIndex] || `Column ${cellIndex + 1}`
    };
    
    setSelectedPDFs(prev => {
      const exists = prev.find(pdf => pdf.id === pdfId);
      if (exists) {
        return prev.filter(pdf => pdf.id !== pdfId);
      } else {
        return [...prev, pdfPath];
      }
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

  const isPDFSelected = (rowIndex, cellIndex) => {
    const pdfId = `${selectedSheet}_${rowIndex}_${cellIndex}`;
    return selectedPDFs.some(pdf => pdf.id === pdfId);
  };

  const handleSelectRow = (rowIndex) => {
    const rowPDFs = [];
    sortedData[rowIndex].forEach((cell, cellIndex) => {
      if (cell && cell.toString().includes('.pdf')) {
        const pdfId = `${selectedSheet}_${rowIndex}_${cellIndex}`;
        rowPDFs.push({
          id: pdfId,
          path: cell,
          sheet: selectedSheet,
          row: rowIndex + 2,
          column: cellIndex + 1,
          columnName: currentSheet.headers[cellIndex] || `Column ${cellIndex + 1}`
        });
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
    sortedData.forEach((row, rowIndex) => {
      const cell = row[columnIndex];
      if (cell && cell.toString().includes('.pdf')) {
        const pdfId = `${selectedSheet}_${rowIndex}_${columnIndex}`;
        colPDFs.push({
          id: pdfId,
          path: cell,
          sheet: selectedSheet,
          row: rowIndex + 2,
          column: columnIndex + 1,
          columnName: currentSheet.headers[columnIndex] || `Column ${columnIndex + 1}`
        });
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

  const isRowSelected = (rowIndex) => {
    const rowPDFs = [];
    sortedData[rowIndex].forEach((cell, cellIndex) => {
      if (cell && cell.toString().includes('.pdf')) {
        const pdfId = `${selectedSheet}_${rowIndex}_${cellIndex}`;
        rowPDFs.push(pdfId);
      }
    });
    return rowPDFs.length > 0 && rowPDFs.every(pdfId => selectedPDFs.some(selected => selected.id === pdfId));
  };

  const isColumnSelected = (columnIndex) => {
    const colPDFs = [];
    sortedData.forEach((row, rowIndex) => {
      const cell = row[columnIndex];
      if (cell && cell.toString().includes('.pdf')) {
        const pdfId = `${selectedSheet}_${rowIndex}_${columnIndex}`;
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

      {/* Data Table */}
      <div className="table-container">
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
            {sortedData.slice(0, 100).map((row, rowIndex) => (
              <tr key={rowIndex}>
                <td style={{ textAlign: 'center', width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={isRowSelected(rowIndex)}
                    onChange={() => handleSelectRow(rowIndex)}
                  />
                </td>
                {row.map((cell, cellIndex) => {
                  const isPDF = cell && cell.toString().includes('.pdf');
                  const isSelected = isPDF && isPDFSelected(rowIndex, cellIndex);
                  
                  return (
                    <td key={cellIndex}>
                      {isPDF ? (
                        <span 
                          style={{ 
                            background: isSelected ? 'rgba(102, 126, 234, 0.3)' : 'rgba(102, 126, 234, 0.1)', 
                            padding: '4px 8px', 
                            borderRadius: '4px',
                            fontFamily: 'monospace',
                            cursor: 'pointer',
                            border: isSelected ? '2px solid #667eea' : '1px solid transparent',
                            display: 'inline-block',
                            transition: 'all 0.2s ease'
                          }}
                          onClick={() => handlePDFClick(cell, rowIndex, cellIndex)}
                          title={isSelected ? 'Click to deselect' : 'Click to select for merging'}
                        >
                          {isSelected ? '✅' : '📄'} {cell}
                        </span>
                      ) : (
                        cell || ''
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sortedData.length > 100 && (
        <p style={{ textAlign: 'center', color: '#666', marginTop: '10px' }}>
          Showing first 100 rows of {sortedData.length} total rows
        </p>
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
    </div>
  );
};

export default DataTable;