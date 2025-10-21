// Recurring Transactions Module
import { db } from './firebase-config.js';
import { showLoading, showNotification, showConfirmation } from './ui.js';
import { formatCurrency } from './utils.js';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

/**
 * Opens and initializes the recurring transactions management modal.
 * @param {string} familyGroupId The ID of the family group.
 * @param {Array} categories The list of custom categories.
 * @param {Array} members The list of family members.
 */
export function openRecurringTransactionsManager(familyGroupId, categories, members) {
  const modal = document.getElementById('recurring-transactions-modal');
  if (!modal) return;

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

  loadAndDisplayRecurring(familyGroupId);

  // --- Event Listeners ---
  modal.querySelector('#close-recurring-modal').addEventListener('click', () => modal.classList.add('hidden'));
  
  const sharedCheckbox = modal.querySelector('#recurring-transaction-shared');
  sharedCheckbox.addEventListener('change', () => {
    modal.querySelector('#recurring-shared-options').classList.toggle('hidden', !sharedCheckbox.checked);
  });

  modal.querySelectorAll('.rec-member-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const memberId = e.target.dataset.memberId;
      const percentageInput = modal.querySelector(`#rec-percentage-${memberId}`);
      percentageInput.disabled = !e.target.checked;
      if (!e.target.checked) percentageInput.value = '';
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
      nextDueDate: new Date(form.querySelector('#recurring-start-date').value),
      transactionData: {
        type: 'expense',
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
    loadAndDisplayRecurring(familyGroupId);
  };
}

async function loadAndDisplayRecurring(familyGroupId) {
  const listContainer = document.getElementById('recurring-transactions-list');
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
    const nextDueDate = recurring.nextDueDate.toDate().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

    card.innerHTML = `
      <div class="flex justify-between items-start">
        <div>
          <p class="font-semibold">${recurring.transactionData.description}</p>
          <p class="text-sm text-gray-600">${recurring.frequency === 'monthly' ? 'Mensual' : 'Semanal'} - Próximo: ${nextDueDate}</p>
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

  listContainer.querySelectorAll('.delete-recurring-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.dataset.id;
      if (await showConfirmation('¿Eliminar Gasto Recurrente?', 'Esto evitará que se genere en el futuro, pero no borrará las transacciones ya creadas.', 'Sí, Eliminar')) {
        await deleteDoc(doc(db, 'recurringTransactions', id));
        showNotification('Gasto recurrente eliminado.', 'success');
        loadAndDisplayRecurring(familyGroupId);
      }
    });
  });

  listContainer.querySelectorAll('.edit-recurring-btn').forEach(btn => {
    btn.addEventListener('click', (e) => populateRecurringFormForEdit(e.target.dataset.id));
  });
}

async function createRecurringTransaction(familyGroupId, recurringData) {
  try {
    showLoading(true);
    const dataToSave = {
      familyGroupId,
      frequency: recurringData.frequency,
      nextDueDate: recurringData.nextDueDate,
      transactionData: recurringData.transactionData,
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

async function updateRecurringTransaction(recurringId, recurringData) {
  try {
    showLoading(true);
    const docRef = doc(db, 'recurringTransactions', recurringId);
    await updateDoc(docRef, {
      frequency: recurringData.frequency,
      nextDueDate: recurringData.nextDueDate,
      transactionData: recurringData.transactionData
    });
    showNotification('Gasto recurrente actualizado con éxito.', 'success');
  } catch (error) {
    console.error("Error updating recurring transaction: ", error);
    showNotification('Error al actualizar el gasto recurrente.', 'error');
  } finally {
    showLoading(false);
  }
}

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

  form.dataset.editingId = recurringId;
  modal.querySelector('h3').textContent = 'Editar Gasto Recurrente';
  form.querySelector('button[type="submit"]').textContent = 'Guardar Cambios';

  form.querySelector('#recurring-description').value = details.description;
  form.querySelector('#recurring-amount').value = details.amount;
  form.querySelector('#recurring-currency').value = details.currency;
  form.querySelector('#recurring-category').value = details.category;
  form.querySelector('#recurring-frequency').value = data.frequency;
  form.querySelector('#recurring-start-date').valueAsDate = data.nextDueDate.toDate();

  const sharedCheckbox = form.querySelector('#recurring-transaction-shared');
  sharedCheckbox.checked = details.isShared;
  modal.querySelector('#recurring-shared-options').classList.toggle('hidden', !details.isShared);

  form.querySelectorAll('.rec-member-checkbox').forEach(cb => {
    cb.checked = false;
    const percentageInput = form.querySelector(`#rec-percentage-${cb.dataset.memberId}`);
    percentageInput.value = '';
    percentageInput.disabled = true;
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

function resetRecurringForm(modal) {
  const form = modal.querySelector('#recurring-transaction-form');
  form.reset();
  delete form.dataset.editingId;
  modal.querySelector('h3').textContent = 'Añadir Nueva';
  form.querySelector('button[type="submit"]').textContent = 'Añadir Gasto Recurrente';
  modal.querySelector('#recurring-shared-options').classList.add('hidden');
  modal.querySelector('#recurring-start-date').valueAsDate = new Date();
}