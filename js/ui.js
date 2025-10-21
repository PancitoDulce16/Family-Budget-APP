// UI Utilities Module

const loadingSpinner = document.getElementById('loading');
let loadingMessageElement = null;

/**
 * Shows or hides the global loading spinner.
 * @param {boolean} show True to show, false to hide.
 * @param {string} [message='Cargando...'] Optional message to display.
 */
export function showLoading(show, message = 'Cargando...') {
  if (loadingSpinner) {
    if (!loadingMessageElement) {
      loadingMessageElement = loadingSpinner.querySelector('p');
    }
    if (loadingMessageElement) {
      loadingMessageElement.textContent = message;
    }
    loadingSpinner.classList.toggle('hidden', !show);
  }
}

/**
 * Displays a temporary notification toast.
 * @param {string} message The message to display.
 * @param {'info' | 'success' | 'error'} type The type of notification.
 */
export function showNotification(message, type = 'info') {
  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer);
      toast.addEventListener('mouseleave', Swal.resumeTimer);
    }
  });

  Toast.fire({
    icon: type,
    title: message
  });
}

/**
 * Shows a custom confirmation modal.
 * @param {string} title The title of the modal.
 * @param {string} message The message to display.
 * @param {string} [confirmText='Confirmar'] The text for the confirmation button.
 * @returns {Promise<boolean>} A promise that resolves to true if confirmed, false otherwise.
 */
export async function showConfirmation(title, message, confirmText = 'Confirmar') {
  const result = await Swal.fire({
    title: title,
    text: message,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: confirmText,
    cancelButtonText: 'Cancelar'
  });
  return result.isConfirmed;
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