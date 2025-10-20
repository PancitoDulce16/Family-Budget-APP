// UI Utilities Module

const loadingSpinner = document.getElementById('loading');

/**
 * Shows or hides the global loading spinner.
 * @param {boolean} show True to show, false to hide.
 */
export function showLoading(show) {
  if (loadingSpinner) {
    loadingSpinner.classList.toggle('hidden', !show);
  }
}

/**
 * Displays a temporary notification toast.
 * @param {string} message The message to display.
 * @param {'info' | 'success' | 'error'} type The type of notification.
 */
export function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500'
  };
  notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white z-50 animate-fadeIn ${colors[type]}`;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

/**
 * Shows a custom confirmation modal.
 * @param {string} title The title of the modal.
 * @param {string} message The message to display.
 * @param {string} confirmText The text for the confirmation button.
 * @returns {Promise<boolean>} A promise that resolves to true if confirmed, false otherwise.
 */
export function showConfirmation(title, message, confirmText = 'Confirmar') {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fadeIn';
    modal.innerHTML = `
      <div class="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
        <div class="text-5xl mb-4">🤔</div>
        <h3 class="text-xl font-bold text-gray-800 mb-2">${title}</h3>
        <p class="text-gray-600 mb-6">${message}</p>
        <div class="flex gap-4">
          <button class="confirm-cancel flex-1 py-3 px-4 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition font-semibold">
            Cancelar
          </button>
          <button class="confirm-accept flex-1 py-3 px-4 rounded-lg bg-red-600 text-white hover:bg-red-700 transition font-semibold">
            ${confirmText}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeModal = (result) => {
      modal.remove();
      resolve(result);
    };

    modal.querySelector('.confirm-accept').addEventListener('click', () => closeModal(true));
    modal.querySelector('.confirm-cancel').addEventListener('click', () => closeModal(false));
  });
}

/**
 * Displays a modal with the receipt image.
 * @param {string} base64Image The base64 encoded image string.
 * @param {string} description The description of the transaction.
 */
export function showReceiptModal(base64Image, description) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 animate-fadeIn';
  modal.innerHTML = `
    <div class="bg-white rounded-lg max-w-2xl w-full p-6 relative">
      <button class="close-btn absolute -top-2 -right-2 bg-white rounded-full w-8 h-8 flex items-center justify-center text-2xl text-gray-600 hover:text-black shadow-lg">&times;</button>
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-xl font-bold">Comprobante - ${description}</h3>
      </div>
      <div class="max-h-[70vh] overflow-auto">
        <img src="${base64Image}" class="w-full rounded-lg" alt="Comprobante">
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector('.close-btn').addEventListener('click', close);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      close();
    }
  });
}