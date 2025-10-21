// Transactions Management Module
import { db } from './firebase-config.js';
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
 * Checks for any recurring transactions that are due and creates them as standard transactions.
 * This should be called once when the app initializes.
 * @param {string} familyGroupId The ID of the user's family group.
 */
export async function processRecurringTransactions(familyGroupId) {
  if (!familyGroupId) return;

  const now = new Date();
  // Query for recurring transactions that are due
  const recurringQuery = query(
    collection(db, 'recurringTransactions'),
    where('familyGroupId', '==', familyGroupId),
    where('nextDueDate', '<=', now)
  );

  try {
    const snapshot = await getDocs(recurringQuery);
    if (snapshot.empty) {
      return; // No recurring transactions are due
    }

    const batchPromises = [];
    snapshot.forEach(docSnap => {
      const recurringTx = docSnap.data();
      const recurringTxId = docSnap.id;

      // 1. Create a new transaction from the recurring template
      const newTransactionData = {
        ...recurringTx.transactionData,
        date: recurringTx.nextDueDate, // Use the due date as the transaction date
        isRecurring: true, // Mark it as originated from a recurring transaction
        recurringSourceId: recurringTxId
      };
      batchPromises.push(addDoc(collection(db, 'transactions'), newTransactionData));

      // 2. Calculate the next due date based on frequency
      const currentDueDate = recurringTx.nextDueDate.toDate();
      let nextDueDate;
      if (recurringTx.frequency === 'monthly') {
        nextDueDate = new Date(currentDueDate.setMonth(currentDueDate.getMonth() + 1));
      } else if (recurringTx.frequency === 'weekly') {
        nextDueDate = new Date(currentDueDate.setDate(currentDueDate.getDate() + 7));
      } // Can be expanded with 'yearly', 'daily', etc.

      // 3. Update the recurring transaction with the new nextDueDate
      if (nextDueDate) {
        batchPromises.push(updateDoc(doc(db, 'recurringTransactions', recurringTxId), { nextDueDate }));
      }
    });

    await Promise.all(batchPromises);
    if (snapshot.size > 0) {
      showNotification(`${snapshot.size} gasto(s) recurrente(s) añadido(s) automáticamente.`, 'info');
    }
  } catch (error) {
    console.error("Error processing recurring transactions: ", error);
    showNotification('Error al procesar gastos recurrentes.', 'error');
  }
}

/**
 * Opens the recurring transactions management modal.
 * @param {string} familyGroupId The ID of the family group.
 * @param {Array} categories The list of custom categories.
 * @param {Array} members The list of family members.
 */
export function openRecurringTransactionsManager(familyGroupId, categories, members) {
  const modal = document.getElementById('recurring-transactions-modal');
  if (!modal) return;

  // Reset form to "add" mode
  resetRecurringForm(modal);

  modal.classList.remove('hidden');

  // Populate dropdowns
  const categorySelect = modal.querySelector('#recurring-category');
  categorySelect.innerHTML = '';
  categories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat.id;
    option.textContent = `${cat.emoji} ${cat.name}`;
    categorySelect.appendChild(option);
  });

// Ejemplo conceptual para un futuro js/ocr.js

// Se añadiría en index.html: <script src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'></script>

/**
 * Procesa una imagen de un comprobante usando Tesseract.js para extraer texto.
 * @param {File} imageFile El archivo de imagen del comprobante.
 */
async function scanReceipt(imageFile) {
  showLoading(true, 'Analizando comprobante...');
  
  // Crear un worker de Tesseract para el idioma español
  const worker = await Tesseract.createWorker('spa');
  
  // Reconocer el texto en la imagen
  const { data: { text } } = await worker.recognize(imageFile);
  
  // Terminar el worker para liberar memoria
  await worker.terminate();
  showLoading(false);
  
  // Analizar el texto extraído para encontrar datos relevantes
  const extractedData = parseReceiptText(text);
  
  // Rellenar el formulario de transacción con los datos encontrados
  populateTransactionFormWithOCR(extractedData);
}

/**
 * Analiza el texto de un recibo para extraer monto, fecha y comercio.
 * @param {string} text El texto extraído del recibo.
 * @returns {object} Un objeto con los datos encontrados.
 */
function parseReceiptText(text) {
    const data = {};

    // Expresión regular para encontrar el monto total (ej: TOTAL ₡12,345.67)
    // Esta es la parte más interesante, se pueden ir añadiendo más patrones.
    const amountRegex = /(?:TOTAL|MONTO|PAGAR)\s*[:\s]*[₡\$]?\s*([\d,]+\.\d{2})/i;
    const amountMatch = text.match(amountRegex);
    if (amountMatch && amountMatch[1]) {
        // Limpiar el formato del número (quitar comas) y convertirlo
        data.amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    }

    // Lógica similar se usaría para extraer la fecha y el nombre del comercio.
    
    return data;
}

/**
 * Rellena el formulario de transacción con los datos del OCR.
 * @param {object} ocrData Los datos extraídos.
 */
function populateTransactionFormWithOCR(ocrData) {
    if (ocrData.amount) {
        document.getElementById('transaction-amount').value = ocrData.amount;
    }
    // Rellenar otros campos...
    showNotification('Formulario autocompletado. ¡Por favor, verifica los datos!', 'info');
}
// En la función loadAndDisplayRecurring dentro de transactions.js

// ... dentro del bucle forEach que crea las tarjetas ...
card.innerHTML = `
  <div class="flex justify-between items-start">
    ...
  </div>
  <div class="text-right mt-2 flex gap-4 justify-end">
    <button data-id="${recurring.id}" class="edit-recurring-btn text-xs text-blue-500 hover:underline">Editar</button>
    <button data-id="${recurring.id}" class="delete-recurring-btn text-xs text-red-500 hover:underline">Eliminar</button>
  </div>
`;
// ...

// Luego, añadir el listener para el nuevo botón de editar
listContainer.querySelectorAll('.edit-recurring-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        // Aquí iría la lógica para abrir el modal en modo edición
        openRecurringModalForEdit(id); 
    });
});
  // Populate shared members for recurring form
  const sharedMembersDiv = modal.querySelector('#recurring-shared-members');
  sharedMembersDiv.innerHTML = '';
  members.forEach(member => {
    const div = document.createElement('div');
    div.className = 'flex items-center gap-2';
    div.innerHTML = `
      <input type="checkbox" id="rec-member-${member.id}" class="rec-member-checkbox" data-member-id="${member.id}">
      <label for="rec-member-${member.id}" class="text-sm">${member.displayName}</label>
      <input type="number" id="rec-percentage-${member.id}" placeholder="%" min="0" max="100" class="w-16 px-2 py-1 border border-gray-300 rounded text-sm" disabled>
    `;
    sharedMembersDiv.appendChild(div);
  });

  // Set default start date
  modal.querySelector('#recurring-start-date').valueAsDate = new Date();

  // Load and display existing recurring transactions
  loadAndDisplayRecurring(familyGroupId, members);

  // Event Listeners
  modal.querySelector('#close-recurring-modal').addEventListener('click', () => modal.classList.add('hidden'));
  
  const sharedCheckbox = modal.querySelector('#recurring-transaction-shared');
  const sharedOptions = modal.querySelector('#recurring-shared-options');
  sharedCheckbox.addEventListener('change', () => {
    sharedOptions.classList.toggle('hidden', !sharedCheckbox.checked);
  });

  modal.querySelectorAll('.rec-member-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const memberId = e.target.dataset.memberId;
      const percentageInput = modal.querySelector(`#rec-percentage-${memberId}`);
      percentageInput.disabled = !e.target.checked;
      if (!e.target.checked) {
        percentageInput.value = '';
      }
    });
  });

  const form = modal.querySelector('#recurring-transaction-form');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const editingId = form.dataset.editingId;

    const isShared = form.querySelector('#recurring-transaction-shared').checked;
    const sharedWith = [];

    if (isShared) {
      form.querySelectorAll('.rec-member-checkbox:checked').forEach(checkbox => {
        const memberId = checkbox.dataset.memberId;
        const percentage = parseFloat(form.querySelector(`#rec-percentage-${memberId}`).value) || 0;
        sharedWith.push({ userId: memberId, percentage });
      });
    }

    const recurringData = {
      frequency: form.querySelector('#recurring-frequency').value,
      startDate: new Date(form.querySelector('#recurring-start-date').value),
      transactionDetails: {
        type: 'expense', // For now, only recurring expenses
        amount: parseFloat(form.querySelector('#recurring-amount').value),
        description: form.querySelector('#recurring-description').value,
        category: form.querySelector('#recurring-category').value,
        currency: form.querySelector('#recurring-currency').value,
        familyGroupId: familyGroupId,
        addedBy: 'system-recurring',
        isShared: isShared,
        sharedWith: sharedWith
      }
    };

    if (editingId) {
      await updateRecurringTransaction(editingId, recurringData);
    } else {
      await createRecurringTransaction(familyGroupId, recurringData);
    }

    resetRecurringForm(modal);
    loadAndDisplayRecurring(familyGroupId, members);
  };
}

/**
 * Fetches and displays the list of existing recurring transactions.
 * @param {string} familyGroupId The ID of the family group.
 * @param {Array} members The list of family members.
 */
async function loadAndDisplayRecurring(familyGroupId, members) {
  const listContainer = document.getElementById('recurring-transactions-list');
  if (!listContainer) return;

  listContainer.innerHTML = '<p class="text-gray-500">Cargando...</p>';

  const q = query(collection(db, 'recurringTransactions'), where('familyGroupId', '==', familyGroupId));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    listContainer.innerHTML = '<p class="text-gray-500 text-center mt-4">No hay gastos recurrentes definidos.</p>';
    return;
  }

  listContainer.innerHTML = '';
  snapshot.forEach(docSnap => {
    const recurring = { id: docSnap.id, ...docSnap.data() };
    const card = document.createElement('div');
    card.className = 'bg-gray-50 p-3 rounded-lg border';

    const nextDueDate = recurring.nextDueDate.toDate().toLocaleDateString('es-ES', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    card.innerHTML = `
      <div class="flex justify-between items-start">
        <div>
          <p class="font-semibold">${recurring.transactionData.description}</p>
          <p class="text-sm text-gray-600">
            ${recurring.frequency === 'monthly' ? 'Mensual' : 'Semanal'} - Próximo: ${nextDueDate}
          </p>
        </div>
        <p class="font-bold text-red-600">-${formatCurrency(recurring.transactionData.amount, recurring.transactionData.currency)}</p>
      </div>
      <div class="text-right mt-2">
        <button data-id="${recurring.id}" class="edit-recurring-btn text-xs text-blue-600 hover:underline font-semibold">✏️ Editar</button>
        <button data-id="${recurring.id}" class="delete-recurring-btn text-xs text-red-500 hover:underline ml-4 font-semibold">🗑️ Eliminar</button>
      </div>
    `;
    listContainer.appendChild(card);
  });

  // Add delete listeners
  listContainer.querySelectorAll('.delete-recurring-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.dataset.id;
      const confirmed = await showConfirmation('¿Eliminar Gasto Recurrente?', 'Esto evitará que se genere en el futuro, pero no borrará las transacciones ya creadas.', 'Sí, Eliminar');
      if (confirmed) {
        await deleteDoc(doc(db, 'recurringTransactions', id));
        showNotification('Gasto recurrente eliminado.', 'success');
        loadAndDisplayRecurring(familyGroupId, members); // Refresh list
      }
    });
  });

  // Add edit listeners
  listContainer.querySelectorAll('.edit-recurring-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.dataset.id;
      await populateRecurringFormForEdit(id);
    });
  });
}

// Helper function to format currency, assuming it might be needed here.
function formatCurrency(amount, currency = 'CRC') {
  const symbols = {
    USD: '$',
    CRC: '₡',
  };
  const symbol = symbols[currency] || '₡';
  const formattedAmount = (Number(amount) || 0).toFixed(2);
  return `${symbol}${formattedAmount}`;
}

/**
 * Creates a new recurring transaction template in Firestore.
 * @param {string} familyGroupId The ID of the user's family group.
 * @param {object} recurringData The data for the recurring transaction.
 * @returns {Promise<void>}
 */
export async function createRecurringTransaction(familyGroupId, recurringData) {
  if (!familyGroupId) {
    showNotification('No se pudo crear la transacción recurrente sin un grupo familiar.', 'error');
    return;
  }

  try {
    showLoading(true);
    const dataToSave = {
      familyGroupId,
      frequency: recurringData.frequency, // 'monthly', 'weekly'
      nextDueDate: recurringData.startDate,
      transactionData: recurringData.transactionDetails, // { amount, description, category, etc. }
      createdAt: serverTimestamp(),
    };
    await addDoc(collection(db, 'recurringTransactions'), dataToSave);
    showNotification('¡Gasto recurrente creado con éxito!', 'success');
  } catch (error) {
    console.error("Error creating recurring transaction: ", error);
    showNotification('Error al crear la transacción recurrente.', 'error');
  } finally {
    showLoading(false);
  }
}

/**
 * Populates the recurring transaction form for editing.
 * @param {string} recurringId The ID of the recurring transaction to edit.
 */
async function populateRecurringFormForEdit(recurringId) {
  const modal = document.getElementById('recurring-transactions-modal');
  const form = modal.querySelector('#recurring-transaction-form');
  const docRef = doc(db, 'recurringTransactions', recurringId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    showNotification('No se encontró la transacción recurrente para editar.', 'error');
    return;
  }

  const data = docSnap.data();
  const details = data.transactionData;

  // Change form to "edit" mode
  form.dataset.editingId = recurringId;
  modal.querySelector('h3').textContent = 'Editar Gasto Recurrente';
  form.querySelector('button[type="submit"]').textContent = 'Guardar Cambios';

  // Populate fields
  form.querySelector('#recurring-description').value = details.description;
  form.querySelector('#recurring-amount').value = details.amount;
  form.querySelector('#recurring-currency').value = details.currency;
  form.querySelector('#recurring-category').value = details.category;
  form.querySelector('#recurring-frequency').value = data.frequency;
  form.querySelector('#recurring-start-date').valueAsDate = data.nextDueDate.toDate();

  // Handle shared options
  const sharedCheckbox = form.querySelector('#recurring-transaction-shared');
  const sharedOptions = form.querySelector('#recurring-shared-options');
  sharedCheckbox.checked = details.isShared;
  sharedOptions.classList.toggle('hidden', !details.isShared);

  // Reset all member checkboxes first
  form.querySelectorAll('.rec-member-checkbox').forEach(cb => {
    cb.checked = false;
    form.querySelector(`#rec-percentage-${cb.dataset.memberId}`).value = '';
    form.querySelector(`#rec-percentage-${cb.dataset.memberId}`).disabled = true;
  });

  if (details.isShared && details.sharedWith) {
    details.sharedWith.forEach(share => {
      const checkbox = form.querySelector(`#rec-member-${share.userId}`);
      const percentageInput = form.querySelector(`#rec-percentage-${share.userId}`);
      if (checkbox && percentageInput) {
        checkbox.checked = true;
        percentageInput.disabled = false;
        percentageInput.value = share.percentage;
      }
    });
  }
}

/**
 * Updates an existing recurring transaction in Firestore.
 * @param {string} recurringId The ID of the document to update.
 * @param {object} recurringData The new data for the recurring transaction.
 */
async function updateRecurringTransaction(recurringId, recurringData) {
  try {
    showLoading(true);
    const docRef = doc(db, 'recurringTransactions', recurringId);
    await updateDoc(docRef, {
      frequency: recurringData.frequency,
      nextDueDate: recurringData.startDate,
      transactionData: recurringData.transactionDetails
    });
    showNotification('Gasto recurrente actualizado con éxito.', 'success');
  } catch (error) {
    console.error("Error updating recurring transaction: ", error);
    showNotification('Error al actualizar el gasto recurrente.', 'error');
  } finally {
    showLoading(false);
  }
}

/**
 * Resets the recurring form to its initial "add" state.
 * @param {HTMLElement} modal The recurring transactions modal element.
 */
function resetRecurringForm(modal) {
  const form = modal.querySelector('#recurring-transaction-form');
  form.reset();
  delete form.dataset.editingId;
  modal.querySelector('h3').textContent = 'Añadir Nueva';
  form.querySelector('button[type="submit"]').textContent = 'Añadir Gasto Recurrente';
  modal.querySelector('#recurring-shared-options').classList.add('hidden');
  modal.querySelector('#recurring-start-date').valueAsDate = new Date();
}
