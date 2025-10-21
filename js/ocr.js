// OCR Module using Tesseract.js
import { showLoading, showNotification } from './ui.js';
import { populateTransactionFormWithOCR, handleFileDrop } from './transactions.js';

/**
 * Initializes the OCR functionality by adding an event listener to the scan button.
 */
export function initializeOCR() {
  const scanCameraBtn = document.getElementById('scan-receipt-camera-btn');
  const scanFileBtn = document.getElementById('scan-receipt-file-btn');
  const receiptInput = document.getElementById('transaction-receipt');

  scanFileBtn?.addEventListener('click', () => {
    // Trigger the hidden file input
    receiptInput.click();
  });

  scanCameraBtn?.addEventListener('click', () => {
    // Trigger the hidden file input with camera capture
    receiptInput.setAttribute('capture', 'environment'); // 'environment' for back camera
    receiptInput.click();
  });

  // Listen for file selection to process it with OCR
  receiptInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      // We need to pass the file to the transaction module to handle the preview
      // and then call scanReceipt. Let's simplify this.
      // The transaction module will now call scanReceipt after handling the file.
      handleFileDrop(file); // Re-use the file handling logic from transactions.js
      scanReceipt(file);
    }
    // Clean up the capture attribute after use
    receiptInput.removeAttribute('capture');
  });
}

/**
 * Processes a receipt image using Tesseract.js to extract text.
 * @param {File} imageFile The image file of the receipt.
 */
export async function scanReceipt(imageFile) {
  showLoading(true, 'Analizando comprobante...');
  
  try {
    // Create a Tesseract worker for Spanish
    const worker = await Tesseract.createWorker('spa');
    
    // Recognize text from the image
    const { data: { text } } = await worker.recognize(imageFile);
    
    // Terminate the worker to free up memory
    await worker.terminate();
    
    // Analyze the extracted text to find relevant data
    const extractedData = parseReceiptText(text);
    
    // Populate the transaction form with the found data
    populateTransactionFormWithOCR(extractedData);

  } catch (error) {
    console.error('Error during OCR processing:', error);
    showNotification('No se pudo analizar la imagen. Inténtalo de nuevo.', 'error');
  } finally {
    showLoading(false);
  }
}

/**
 * Parses the raw text from a receipt to extract amount, date, and merchant.
 * This function uses regular expressions and can be improved over time.
 * @param {string} text The text extracted from the receipt.
 * @returns {object} An object with the found data { amount, date, description }.
 */
function parseReceiptText(text) {
  const data = {};
  console.log("Texto extraído:", text);

  // Regex for total amount (handles formats like TOTAL 1,234.56 or Monto: $1234.56)
  // It looks for keywords like TOTAL, MONTO, PAGAR and captures the number that follows.
  const amountRegex = /(?:TOTAL|MONTO|PAGAR|PAGO)\s*[:\s]*[₡\$]?\s*([\d,]+\.\d{2})/i;
  const amountMatch = text.match(amountRegex);
  if (amountMatch && amountMatch[1]) {
    // Clean the number format (remove commas) and convert it
    data.amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  }

  // Regex for date (handles dd/mm/yyyy, dd-mm-yyyy)
  const dateRegex = /(\d{2})[\/\-](\d{2})[\/\-](\d{4})/;
  const dateMatch = text.match(dateRegex);
  if (dateMatch) {
    // Format to yyyy-mm-dd for the input field
    data.date = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
  }

  // Simple logic for merchant name: often the first line of the receipt
  const lines = text.split('\n');
  if (lines.length > 0 && lines[0].trim().length > 3) {
    data.description = lines[0].trim();
  }

  return data;
}