// Receipt Gallery Module
import { getCategoryDetails } from './custom-categories.js';
export function createReceiptGallery(transactions, customCategories) {
  const widget = document.createElement('div');
  widget.className = 'bg-white rounded-2xl shadow-lg p-6 mb-6';
  widget.innerHTML = `
    <div class="flex justify-between items-center mb-6">
      <h3 class="text-2xl font-bold text-gray-800 flex items-center gap-2">
        <span>🖼️</span>
        Galería de Comprobantes
      </h3>
      <button id="download-all-receipts" class="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:opacity-90 transition font-semibold shadow-lg">
        📥 Descargar Todos
      </button>
    </div>
    <div id="receipt-grid" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"></div>
  `;

  const grid = widget.querySelector('#receipt-grid');
  const downloadBtn = widget.querySelector('#download-all-receipts');

  // Filter transactions with receipts
  const transactionsWithReceipts = transactions.filter(t => t.receiptBase64);

  if (transactionsWithReceipts.length === 0) {
    grid.innerHTML = '<p class="col-span-full text-center text-gray-500 py-8">No hay comprobantes disponibles</p>';
    downloadBtn.disabled = true;
    downloadBtn.classList.add('opacity-50', 'cursor-not-allowed');
  } else {
    transactionsWithReceipts.forEach((transaction, index) => {
      const card = document.createElement('div');
      card.className = 'relative group cursor-pointer overflow-hidden rounded-xl border-2 border-gray-200 hover:border-green-500 transition transform hover:scale-105 hover:shadow-xl';
      card.innerHTML = `
        <img src="${transaction.receiptBase64}" alt="${transaction.description}" class="w-full h-48 object-cover">
        <div class="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition flex flex-col justify-end p-3">
          <p class="text-white font-semibold text-sm truncate">${transaction.description}</p>
          <p class="text-white text-xs">$${transaction.amount.toFixed(2)}</p>
          <p class="text-white text-xs opacity-75">${transaction.date?.toDate ? transaction.date.toDate().toLocaleDateString('es-ES') : new Date(transaction.date).toLocaleDateString('es-ES')}</p>
        </div>
      `;

      card.addEventListener('click', () => {
        openLightbox(transactionsWithReceipts, index, customCategories);
      });

      grid.appendChild(card);
    });

    downloadBtn.addEventListener('click', () => {
      downloadAllReceipts(transactionsWithReceipts);
    });
  }

  return widget;
}

function openLightbox(transactions, startIndex, customCategories) {
  let currentIndex = startIndex;

  const lightbox = document.createElement('div');
  lightbox.className = 'fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-50';
  lightbox.innerHTML = `
    <div class="relative max-w-6xl w-full h-full flex flex-col">
      <!-- Close button -->
      <button id="lightbox-close" class="absolute top-4 right-4 text-white text-4xl hover:text-gray-300 z-10 w-12 h-12 flex items-center justify-center bg-black/50 rounded-full">
        &times;
      </button>

      <!-- Navigation -->
      <button id="lightbox-prev" class="absolute left-4 top-1/2 -translate-y-1/2 text-white text-5xl hover:text-gray-300 z-10 w-14 h-14 flex items-center justify-center bg-black/50 rounded-full">
        ‹
      </button>
      <button id="lightbox-next" class="absolute right-4 top-1/2 -translate-y-1/2 text-white text-5xl hover:text-gray-300 z-10 w-14 h-14 flex items-center justify-center bg-black/50 rounded-full">
        ›
      </button>

      <!-- Image container -->
      <div class="flex-1 flex items-center justify-center mb-4">
        <img id="lightbox-image" src="" class="max-w-full max-h-full object-contain rounded-lg shadow-2xl" alt="Comprobante">
      </div>

      <!-- Info panel -->
      <div class="bg-white/10 backdrop-blur-md rounded-xl p-6 text-white">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <p class="text-sm text-gray-300">Descripción</p>
            <p id="lightbox-description" class="font-semibold text-lg"></p>
          </div>
          <div>
            <p class="text-sm text-gray-300">Monto</p>
            <p id="lightbox-amount" class="font-semibold text-lg text-green-400"></p>
          </div>
          <div>
            <p class="text-sm text-gray-300">Categoría</p>
            <p id="lightbox-category" class="font-semibold text-lg"></p>
          </div>
          <div>
            <p class="text-sm text-gray-300">Fecha</p>
            <p id="lightbox-date" class="font-semibold text-lg"></p>
          </div>
        </div>
        <div class="mt-4 flex gap-4 justify-between items-center">
          <p class="text-sm text-gray-300"><span id="lightbox-index"></span> de ${transactions.length}</p>
          <div class="flex gap-2">
            <button id="lightbox-download" class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition font-semibold">
              📥 Descargar
            </button>
            <button id="lightbox-zoom" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition font-semibold">
              🔍 Ver Original
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(lightbox);

  const img = lightbox.querySelector('#lightbox-image');
  const description = lightbox.querySelector('#lightbox-description');
  const amount = lightbox.querySelector('#lightbox-amount');
  const category = lightbox.querySelector('#lightbox-category');
  const date = lightbox.querySelector('#lightbox-date');
  const indexDisplay = lightbox.querySelector('#lightbox-index');

  const closeBtn = lightbox.querySelector('#lightbox-close');
  const prevBtn = lightbox.querySelector('#lightbox-prev');
  const nextBtn = lightbox.querySelector('#lightbox-next');
  const downloadBtn = lightbox.querySelector('#lightbox-download');
  const zoomBtn = lightbox.querySelector('#lightbox-zoom');

  function updateLightbox() {
    const transaction = transactions[currentIndex];

    img.src = transaction.receiptBase64;
    description.textContent = transaction.description;
    amount.textContent = `${transaction.type === 'expense' ? '-' : '+'}$${transaction.amount.toFixed(2)}`;
    category.textContent = getCategoryDetails(transaction.category, customCategories).displayName;
    date.textContent = transaction.date?.toDate
      ? transaction.date.toDate().toLocaleDateString('es-ES', { dateStyle: 'long' })
      : new Date(transaction.date).toLocaleDateString('es-ES', { dateStyle: 'long' });
    indexDisplay.textContent = currentIndex + 1;

    // Update button visibility
    prevBtn.style.display = currentIndex === 0 ? 'none' : 'flex';
    nextBtn.style.display = currentIndex === transactions.length - 1 ? 'none' : 'flex';
  }

  closeBtn.addEventListener('click', () => {
    lightbox.remove();
  });

  prevBtn.addEventListener('click', () => {
    if (currentIndex > 0) {
      currentIndex--;
      updateLightbox();
    }
  });

  nextBtn.addEventListener('click', () => {
    if (currentIndex < transactions.length - 1) {
      currentIndex++;
      updateLightbox();
    }
  });

  downloadBtn.addEventListener('click', () => {
    downloadReceipt(transactions[currentIndex]);
  });

  zoomBtn.addEventListener('click', () => {
    window.open(transactions[currentIndex].receiptBase64, '_blank');
  });

  // Keyboard navigation
  document.addEventListener('keydown', function handleKeyPress(e) {
    if (e.key === 'Escape') {
      lightbox.remove();
      document.removeEventListener('keydown', handleKeyPress);
    } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
      currentIndex--;
      updateLightbox();
    } else if (e.key === 'ArrowRight' && currentIndex < transactions.length - 1) {
      currentIndex++;
      updateLightbox();
    }
  });

  // Click outside to close
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) {
      lightbox.remove();
    }
  });

  updateLightbox();
}

function downloadReceipt(transaction) {
  const link = document.createElement('a');
  link.href = transaction.receiptBase64;
  link.download = `comprobante_${transaction.description.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.jpg`;
  link.click();
}

function downloadAllReceipts(transactions) {
  // Simple sequential download (browsers limit simultaneous downloads)
  let index = 0;

  function downloadNext() {
    if (index < transactions.length) {
      downloadReceipt(transactions[index]);
      index++;
      // Delay to avoid browser blocking
      setTimeout(downloadNext, 500);
    }
  }

  if (confirm(`¿Descargar ${transactions.length} comprobantes? Esto puede tomar unos momentos.`)) {
    downloadNext();
  }
}
