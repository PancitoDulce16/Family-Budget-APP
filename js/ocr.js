// OCR Module for Receipt Scanning
import { showLoading, showNotification } from './ui.js';

export function initializeOCR() {
  const scanButton = document.getElementById('scan-receipt-btn');
  scanButton?.addEventListener('click', startScan);
}

function startScan() {
  // Create a hidden file input to trigger the camera
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.capture = 'environment'; // Prioritize back camera

  fileInput.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      processImage(file);
    }
  };

  fileInput.click();
}

async function processImage(imageFile) {
  if (!window.Tesseract) {
    showNotification('La librería de escaneo no se ha cargado.', 'error');
    return;
  }

  showLoading(true);
  const loadingText = document.querySelector('#loading p');
  if (loadingText) loadingText.textContent = 'Analizando comprobante...';

  const progressDiv = document.createElement('div');
  progressDiv.className = 'w-full bg-gray-200 rounded-full h-2.5 mt-2';
  progressDiv.innerHTML = `<div class="bg-green-600 h-2.5 rounded-full" style="width: 0%"></div>`;
  document.querySelector('#loading > div').appendChild(progressDiv);
  const progressBar = progressDiv.querySelector('div');

  try {
    const worker = await Tesseract.createWorker('spa', 1, {
      logger: m => {
        if (m.status === 'recognizing text') {
          progressBar.style.width = `${m.progress * 100}%`;
        }
      }
    });
    const { data: { text } } = await worker.recognize(imageFile);
    await worker.terminate();

    const extractedData = parseReceiptText(text);
    populateTransactionFormWithOCR(extractedData);

  } catch (error) {
    console.error('Error en OCR:', error);
    showNotification('No se pudo analizar la imagen.', 'error');
  } finally {
    showLoading(false);
    if (loadingText) loadingText.textContent = 'Cargando...';
    progressDiv.remove();
  }
}

function parseReceiptText(text) {
  console.log("Texto extraído:", text);
  const data = {
    amount: null,
    description: null,
    date: null,
    currency: null
  };

  // --- Amount and Currency Extraction (More Robust) ---
  const amountLines = text.match(/.*[\d,]+\.\d{2}/g) || [];
  let potentialAmounts = [];

  amountLines.forEach(line => {
    const amountMatch = line.match(/([\d,]+\.\d{2})/);
    if (amountMatch) {
      const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
      let score = 1;
      if (/TOTAL/i.test(line)) score = 5;
      if (/SUBTOTAL/i.test(line)) score = 0.5;

      const currencyMatch = line.match(/[₡\$]/);
      const currency = currencyMatch ? (currencyMatch[0] === '$' ? 'USD' : 'CRC') : null;

      potentialAmounts.push({ amount, score, currency });
    }
  });

  // Get the amount with the highest score, or the largest amount if scores are equal
  if (potentialAmounts.length > 0) {
    potentialAmounts.sort((a, b) => b.score - a.score || b.amount - a.amount);
    data.amount = potentialAmounts[0].amount;
    data.currency = potentialAmounts[0].currency;
  }

  // --- Date Extraction (More Formats) ---
  const datePatterns = [
    /(\d{2}[-\/.]\d{2}[-\/.]\d{2,4})/, // dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy
    /(\d{1,2})\s+de\s+([a-zA-Z]+)\s+de\s+(\d{4})/i // 1 de Enero de 2024
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      // This part can be expanded with a date parsing library like date-fns for more robustness
      const [day, month, year] = match[1].split(/[-\/.]/);
      const fullYear = year.length === 2 ? `20${year}` : year;
      data.date = new Date(`${fullYear}-${month}-${day}`);
      break;
    }
  }

  // --- Description / Store Name Extraction ---
  const firstLine = text.split('\n')[0].trim();
  if (firstLine && firstLine.length > 3 && firstLine.length < 50) {
    data.description = `Compra en ${firstLine}`;
  }

  return data;
}

function populateTransactionFormWithOCR(ocrData) {
  if (ocrData.amount) {
    document.getElementById('transaction-amount').value = ocrData.amount;
  }
  if (ocrData.currency) {
    document.getElementById('transaction-currency').value = ocrData.currency;
  }
  if (ocrData.description) {
    document.getElementById('transaction-description').value = ocrData.description;
  }
  if (ocrData.date && !isNaN(ocrData.date)) {
    document.getElementById('transaction-date').valueAsDate = ocrData.date;
  }

  showNotification('Formulario autocompletado. ¡Por favor, verifica los datos!', 'info');
}