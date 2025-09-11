const ExcelProcessor = require('./src/main/excel-processor.js');

async function testHyperlinks() {
  const processor = new ExcelProcessor();
  
  // You can test with your Excel file here
  const testFile = process.argv[2];
  if (!testFile) {
    console.log('Usage: node test-hyperlinks.js <excel-file-path>');
    return;
  }
  
  console.log('Testing hyperlink detection with:', testFile);
  
  const result = await processor.processFile(testFile);
  
  if (result.success) {
    console.log('\n=== PDF References Found ===');
    result.pdfReferences.forEach(ref => {
      console.log(`${ref.source.toUpperCase()}: ${ref.path}`);
      console.log(`  Location: Sheet "${ref.sheet}", Row ${ref.row}, Column ${ref.column}`);
      console.log(`  Type: ${ref.type} ${ref.icon}`);
      console.log('---');
    });
    
    console.log(`\nTotal references: ${result.pdfReferences.length}`);
    console.log(`Hyperlinks: ${result.pdfReferences.filter(r => r.source === 'hyperlink').length}`);
    console.log(`Text: ${result.pdfReferences.filter(r => r.source === 'text').length}`);
  } else {
    console.error('Error:', result.error);
  }
}

testHyperlinks();