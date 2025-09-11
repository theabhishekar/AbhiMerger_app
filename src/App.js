import React, { useState, useEffect } from 'react';
import ExcelUploader from './components/ExcelUploader';
import DataTable from './components/DataTable';
import PDFSelector from './components/PDFSelector';
import MergeProgress from './components/MergeProgress';
import PDFViewer from './components/PDFViewer';
import './App.css';

function App() {
  const [currentStep, setCurrentStep] = useState(1);
  const [excelData, setExcelData] = useState(null);
  const [selectedPDFs, setSelectedPDFs] = useState([]);
  const [mergeProgress, setMergeProgress] = useState(null);
  const [mergedPDFPath, setMergedPDFPath] = useState(null);

  useEffect(() => {
    if (window.electronAPI) {
      const removeListener = window.electronAPI.onProgress((event, progressData) => {
        setMergeProgress(progressData);
        if (progressData.completed) {
          setCurrentStep(5);
        }
      });

      return removeListener;
    }
  }, []);

  const handleExcelUpload = (data) => {
    setExcelData(data);
    setCurrentStep(2);
  };

  const handlePDFSelection = (pdfs) => {
    console.log('Selected PDFs:', pdfs);
    setSelectedPDFs(pdfs);
  };

  const handleStartMerge = async () => {
    console.log('Starting merge with PDFs:', selectedPDFs);
    setCurrentStep(4);
    setMergeProgress({ status: 'Starting merge...', percentage: 0 });
    
    try {
      const outputPath = await window.electronAPI.savePDFDialog();
      if (outputPath) {
        console.log('Output path:', outputPath);
        const result = await window.electronAPI.mergePDFs(selectedPDFs, outputPath);
        setMergedPDFPath(result.outputPath);
      }
    } catch (error) {
      console.error('Merge failed:', error);
      setMergeProgress({ status: 'Merge failed', error: error.message });
    }
  };

  const handleReset = () => {
    setCurrentStep(1);
    setExcelData(null);
    setSelectedPDFs([]);
    setMergeProgress(null);
    setMergedPDFPath(null);
  };

  const handleMergeComplete = (outputPath) => {
    setMergedPDFPath(outputPath);
    setCurrentStep(5);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <ExcelUploader onUpload={handleExcelUpload} />;
      case 2:
        return (
          <DataTable 
            data={excelData} 
            onNext={() => setCurrentStep(3)}
            onBack={() => setCurrentStep(1)}
            onMergeComplete={handleMergeComplete}
          />
        );
      case 3:
        return (
          <PDFSelector 
            pdfReferences={excelData?.pdfReferences || []}
            onSelection={handlePDFSelection}
            onBack={() => setCurrentStep(2)}
            onNext={handleStartMerge}
          />
        );
      case 4:
        return (
          <MergeProgress 
            progress={mergeProgress}
            onCancel={() => setCurrentStep(3)}
          />
        );
      case 5:
        return (
          <PDFViewer 
            pdfPath={mergedPDFPath}
            onReset={handleReset}
          />
        );
      default:
        return <ExcelUploader onUpload={handleExcelUpload} />;
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>AbhiMerger</h1>
        <div className="step-indicator">
          {[1, 2, 3, 4, 5].map(step => (
            <div 
              key={step} 
              className={`step ${currentStep >= step ? 'active' : ''}`}
            >
              {step}
            </div>
          ))}
        </div>
      </header>
      
      <main className="app-main">
        {renderStep()}
      </main>
    </div>
  );
}

export default App;