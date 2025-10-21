// Transactions Management Module
import { db } from './firebase-config.js';
import { scanReceipt } from './ocr.js';
import { showLoading, showNotification, showConfirmation } from './ui.js';
import {
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let currentEditingTransaction = null;

// Edit transaction
export async function editTransaction(transactionId, updatedData) {
  try {
    showLoading(true);
    const transactionRef = doc(db, 'transactions', transactionId);
    await updateDoc(transactionRef, updatedData);
    showNotification('Transacción actualizada', 'success');
    return true;
  } catch (error) {
    console.error('Error al editar transacción:', error);
    showNotification('Error al editar la transacción', 'error');
    return false;
  } finally {
    showLoading(false);
  }
}

// Delete transaction
export async function deleteTransaction(transactionId) {
  const confirmDelete = await showConfirmation(
    '¿Eliminar Transacción?',
    'Esta acción no se puede deshacer. ¿Estás seguro?',
    'Sí, Eliminar'
  );

  if (!confirmDelete) return false;

  try {
    showLoading(true);
    const transactionRef = doc(db, 'transactions', transactionId);
    await deleteDoc(transactionRef);
    showNotification('Transacción eliminada', 'success');
    return true;
  } catch (error) {
    console.error('Error al eliminar transacción:', error);
    showNotification('Error al eliminar la transacción', 'error');
    return false;
  } finally {
    showLoading(false);
  }
}

// Open edit modal
export function openEditModal(transaction, familyMembers) {
  currentEditingTransaction = transaction;

  const modal = document.getElementById('transaction-modal');
  const modalTitle = document.getElementById('modal-title');
  const form = document.getElementById('transaction-form');

  modalTitle.textContent = 'Editar Transacción';
  modal.classList.remove('hidden');

  // Populate form with existing data
  document.getElementById('transaction-type').value = transaction.type;
  document.getElementById('transaction-amount').value = transaction.amount;
  document.getElementById('transaction-description').value = transaction.description;
  document.getElementById('transaction-category').value = transaction.category;
  document.getElementById('transaction-currency').value = transaction.currency || 'USD'; // Default to USD if not set

  // Format date for input
  const date = transaction.date?.toDate ? transaction.date.toDate() : new Date(transaction.date);
  document.getElementById('transaction-date').value = date.toISOString().split('T')[0];

  document.getElementById('transaction-paidby').value = transaction.paidBy;

  // Update type buttons
  const typeBtns = document.querySelectorAll('.type-btn');
  typeBtns.forEach(btn => {
    btn.classList.remove('bg-red-50', 'bg-green-50', 'border-red-500', 'border-green-500', 'text-red-600', 'text-green-600');
    btn.classList.add('border-gray-300', 'text-gray-600');

    if (btn.dataset.type === transaction.type) {
      if (transaction.type === 'expense') {
        btn.classList.add('bg-red-50', 'border-red-500', 'text-red-600');
      } else {
        btn.classList.add('bg-green-50', 'border-green-500', 'text-green-600');
      }
    }
  });

  // Show existing receipt
  if (transaction.receiptBase64) {
    const receiptPreviewContainer = document.getElementById('receipt-preview');
    const receiptDropZone = document.getElementById('receipt-drop-zone');

    receiptPreviewContainer.innerHTML = `
      <div class="relative">
        <img src="${transaction.receiptBase64}" class="max-h-48 rounded-lg shadow-md" alt="Preview">
        <button type="button" id="remove-receipt-btn" class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold">&times;</button>
      </div>
    `;
    receiptPreviewContainer.classList.remove('hidden');
    receiptDropZone.classList.add('hidden');

    document.getElementById('remove-receipt-btn').addEventListener('click', () => {
      document.getElementById('transaction-receipt').value = '';
      receiptPreviewContainer.classList.add('hidden');
      receiptDropZone.classList.remove('hidden');
    });
  }

  // Handle shared expense
  const sharedCheckbox = document.getElementById('transaction-shared');
  if (transaction.isShared) {
    sharedCheckbox.checked = true;
    document.getElementById('shared-options').classList.remove('hidden');

    // Populate shared members
    if (transaction.sharedWith) {
      transaction.sharedWith.forEach(share => {
        const checkbox = document.getElementById(`member-${share.userId}`);
        const percentageInput = document.getElementById(`percentage-${share.userId}`);
        if (checkbox && percentageInput) {
          checkbox.checked = true;
          percentageInput.disabled = false;
          percentageInput.value = share.percentage;
        }
      });
    }
  }

  // Make receipt optional for editing
  document.getElementById('transaction-receipt').removeAttribute('required');
}

export function getCurrentEditingTransaction() {
  return currentEditingTransaction;
}

export function clearCurrentEditingTransaction() {
  currentEditingTransaction = null;
  document.getElementById('modal-title').textContent = 'Añadir Transacción';
  document.getElementById('transaction-receipt').removeAttribute('required');
}

// Create action buttons for transactions
export function createTransactionActions(transaction, onEdit, onDelete) {
  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'flex gap-2 mt-2';

  const editBtn = document.createElement('button');
  editBtn.className = 'text-blue-600 hover:text-blue-700 text-sm font-medium';
  editBtn.innerHTML = '✏️ Editar';
  editBtn.onclick = (e) => {
    e.stopPropagation();
    onEdit(transaction);
  };

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'text-red-600 hover:text-red-700 text-sm font-medium';
  deleteBtn.innerHTML = '🗑️ Eliminar';
  deleteBtn.onclick = async (e) => {
    e.stopPropagation();
    const deleted = await deleteTransaction(transaction.id);
    if (deleted && onDelete) {
      onDelete(transaction.id);
    }
  };

  actionsDiv.appendChild(editBtn);
  actionsDiv.appendChild(deleteBtn);

  return actionsDiv;
}

/**
 * Handles the file drop/selection for the receipt.
 * @param {File} file The selected file.
 */
export function handleFileDrop(file) {
    const receiptInput = document.getElementById('transaction-receipt');
    const receiptPreviewContainer = document.getElementById('receipt-preview');
    const receiptDropZone = document.getElementById('receipt-drop-zone');

    if (!file || !file.type.startsWith('image/')) {
        showNotification('Por favor, selecciona un archivo de imagen.', 'error');
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        receiptPreviewContainer.innerHTML = `
        <div class="relative">
          <img src="${e.target.result}" class="max-h-48 rounded-lg shadow-md" alt="Preview">
          <button type="button" id="remove-receipt-btn" class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold">&times;</button>
        </div>
      `;
        receiptPreviewContainer.classList.remove('hidden');
        receiptDropZone.classList.add('hidden');

        document.getElementById('remove-receipt-btn').addEventListener('click', () => {
            receiptInput.value = '';
            receiptPreviewContainer.classList.add('hidden');
            receiptPreviewContainer.innerHTML = '';
            receiptDropZone.classList.remove('hidden');
        });
    };
    reader.readAsDataURL(file);
}

/**
 * Fills the transaction form with the data extracted by OCR.
 * @param {object} ocrData The extracted data.
 */
export function populateTransactionFormWithOCR(ocrData) {
    if (ocrData.amount) {
        document.getElementById('transaction-amount').value = ocrData.amount;
    }
    if (ocrData.date) {
        document.getElementById('transaction-date').value = ocrData.date;
    }
    if (ocrData.description) {
        document.getElementById('transaction-description').value = ocrData.description;
    }

    showNotification('Formulario autocompletado. ¡Por favor, verifica los datos!', 'info');
}
