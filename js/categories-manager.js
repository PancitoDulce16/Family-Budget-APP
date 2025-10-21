// Categories Management Module
import { db } from './firebase-config.js';
import { showLoading, showNotification, showConfirmation } from './ui.js';
import {
  logActivity
} from './activity-log.js';
import {
  collection,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  getCountFromServer
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

import { getCurrentUser } from './auth.js';
/**
 * Opens the category management modal.
 * @param {string} familyGroupId The ID of the family group.
 * @param {Array} currentCategories The current list of categories.
 * @param {Function} onUpdate Callback to refresh data in the main app.
 */
export function openCategoryManagerModal(familyGroupId, currentCategories, onUpdate) {
  const modal = document.createElement('div');
  modal.id = 'category-manager-modal';
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fadeIn';
  modal.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] flex flex-col">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold text-gray-800">Gestionar Categorías</h2>
        <button class="close-modal text-gray-500 hover:text-gray-700 text-3xl font-bold">&times;</button>
      </div>
      
      <div class="flex-1 overflow-y-auto pr-2 mb-6">
        <div id="category-list" class="space-y-3"></div>
      </div>

      <div class="mt-auto pt-4 border-t">
        <h3 id="form-title" class="text-lg font-semibold mb-2">Añadir Nueva Categoría</h3>
        <form id="add-category-form" class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <input type="text" id="new-category-name" placeholder="Nombre" required class="w-full px-4 py-3 border border-gray-300 rounded-lg">
          <input type="text" id="new-category-emoji" placeholder="Emoji (ej: 🚗)" required maxlength="4" class="w-full px-4 py-3 border border-gray-300 rounded-lg">
          <input type="color" id="new-category-color" value="#4F46E5" class="w-full h-[50px] border border-gray-300 rounded-lg cursor-pointer">
          <button type="submit" class="md:col-span-3 w-full gradient-bg text-white py-3 px-4 rounded-lg font-bold">Añadir Categoría</button>
        </form>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const categoryList = modal.querySelector('#category-list');
  const addForm = modal.querySelector('#add-category-form');

  const renderCategories = (categories) => {
    categoryList.innerHTML = '';
    categories.forEach(cat => {
      const div = document.createElement('div');
      div.className = 'flex items-center justify-between bg-gray-50 p-3 rounded-lg border';
      div.innerHTML = `
        <div class="flex items-center gap-3">
          <span class="text-2xl">${cat.emoji}</span>
          <span class="font-medium">${cat.name}</span>
          <div class="w-5 h-5 rounded-full" style="background-color: ${cat.color};"></div>
        </div>
        <div class="flex gap-2">
          <button data-id="${cat.id}" class="edit-category-btn text-blue-600 hover:text-blue-800 font-semibold text-xs">✏️ Editar</button>
          <button data-id="${cat.id}" class="delete-category-btn text-red-500 hover:text-red-700 font-semibold text-xs">🗑️ Eliminar</button>
        </div>
      `;
      categoryList.appendChild(div);
    });
  };

  renderCategories(currentCategories);

  // --- Event Listeners ---
  modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());

  addForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = addForm.querySelector('#new-category-name').value;
    const emoji = addForm.querySelector('#new-category-emoji').value;
    const color = addForm.querySelector('#new-category-color').value;
    const editingId = addForm.dataset.editingId;

    if (!name || !emoji) return;

    try {
      showLoading(true);
      const categoryData = { name, emoji, color, familyGroupId };

      if (editingId) {
        // Update existing category
        await updateDoc(doc(db, 'categories', editingId), categoryData);
        const index = currentCategories.findIndex(c => c.id === editingId);
        const oldName = currentCategories[index].name;
        currentCategories[index] = { id: editingId, ...categoryData };
        showNotification('Categoría actualizada', 'success');
        logActivity(familyGroupId, getCurrentUser().uid, getCurrentUser().displayName, `editó la categoría "${oldName}" a "${name}".`);
      } else {
        // Add new category
        const docRef = await addDoc(collection(db, 'categories'), categoryData);
        currentCategories.push({ id: docRef.id, ...categoryData });
        showNotification('Categoría añadida', 'success');
        logActivity(familyGroupId, getCurrentUser().uid, getCurrentUser().displayName, `creó la categoría "${name}".`);
      }
      
      renderCategories(currentCategories);
      resetCategoryForm(addForm);
      
      // Notificar a la app principal para que refresque sus datos
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error("Error adding category:", error);
      showNotification('Error al añadir categoría', 'error');
    } finally {
      showLoading(false);
    }
  });

  categoryList.addEventListener('click', async (e) => {
    const targetButton = e.target.closest('button');
    if (!targetButton) return;

    if (targetButton.classList.contains('delete-category-btn')) {
      const categoryId = e.target.dataset.id;
      
      const categoryToDelete = currentCategories.find(c => c.id === categoryId);
      // Verificar si la categoría está en uso
      const transactionsQuery = query(collection(db, "transactions"), where("familyGroupId", "==", familyGroupId), where("category", "==", categoryId));
      const countSnapshot = await getCountFromServer(transactionsQuery);
      const transactionCount = countSnapshot.data().count;
      
      if (transactionCount > 0) {
        // Si está en uso, ofrecer reasignar
        await handleReassignAndDelete(categoryToDelete, transactionCount, familyGroupId, currentCategories, onUpdate);
        return; // La función de reasignación se encarga del resto
      }

      const confirmed = await showConfirmation(
        '¿Eliminar Categoría?',
        'Esta acción no se puede deshacer.',
        'Sí, Eliminar'
      );

      if (confirmed) {
        try {
          showLoading(true);
          await deleteDoc(doc(db, 'categories', categoryId));
          
          // Actualizar lista local y re-renderizar
          currentCategories = currentCategories.filter(c => c.id !== categoryId);
          renderCategories(currentCategories);
          
          // Notificar a la app principal para que refresque sus datos
          if (onUpdate) onUpdate();
          logActivity(familyGroupId, getCurrentUser().uid, getCurrentUser().displayName, `eliminó la categoría "${categoryToDelete.name}".`);
          
          showNotification('Categoría eliminada', 'success');
        } catch (error) {
          console.error("Error deleting category:", error);
          showNotification('Error al eliminar categoría', 'error');
        } finally {
          showLoading(false);
        }
      }
    }

    if (targetButton.classList.contains('edit-category-btn')) {
      const categoryId = e.target.dataset.id;
      const category = currentCategories.find(c => c.id === categoryId);
      if (category) {
        populateFormForEdit(addForm, category);
      }
    }
  });
}

function populateFormForEdit(form, category) {
  form.dataset.editingId = category.id;
  form.querySelector('#new-category-name').value = category.name;
  form.querySelector('#new-category-emoji').value = category.emoji;
  form.querySelector('#new-category-color').value = category.color;
  form.querySelector('#form-title').textContent = 'Editar Categoría';
  form.querySelector('button[type="submit"]').textContent = 'Guardar Cambios';
  form.querySelector('#new-category-name').focus();
}

function resetCategoryForm(form) {
  form.reset();
  delete form.dataset.editingId;
  form.querySelector('#form-title').textContent = 'Añadir Nueva Categoría';
  form.querySelector('button[type="submit"]').textContent = 'Añadir Categoría';
  form.querySelector('#new-category-color').value = '#4F46E5';
}

async function handleReassignAndDelete(categoryToDelete, transactionCount, familyGroupId, allCategories, onUpdate) {
  const otherCategories = allCategories.filter(c => c.id !== categoryIdToDelete);
  if (otherCategories.length === 0) {
    showNotification('No puedes eliminar la última categoría si tiene transacciones asociadas.', 'error');
    return;
  }

  // Crear un modal para la reasignación
  const reassignModal = document.createElement('div');
  reassignModal.className = 'fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fadeIn';
  
  let optionsHTML = '';
  otherCategories.forEach(cat => {
    optionsHTML += `<option value="${cat.id}">${cat.emoji} ${cat.name}</option>`;
  });

  reassignModal.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
      <h3 class="text-xl font-bold text-gray-800 mb-2">Reasignar y Eliminar</h3>
      <p class="text-gray-600 mb-4">
        Esta categoría está en uso por <strong>${transactionCount}</strong> transacciones. 
        Para eliminarla, primero debes mover estas transacciones a otra categoría.
      </p>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Mover transacciones a:</label>
          <select id="reassign-category-select" class="w-full px-4 py-3 border border-gray-300 rounded-lg">
            ${optionsHTML}
          </select>
        </div>
        <div class="flex gap-4">
          <button id="reassign-cancel" class="flex-1 py-3 px-4 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition font-semibold">
            Cancelar
          </button>
          <button id="reassign-confirm" class="flex-1 py-3 px-4 rounded-lg bg-red-600 text-white hover:bg-red-700 transition font-semibold">
            Reasignar y Eliminar
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(reassignModal);

  reassignModal.querySelector('#reassign-cancel').addEventListener('click', () => reassignModal.remove());
  
  reassignModal.querySelector('#reassign-confirm').addEventListener('click', async () => {
    const newCategoryId = reassignModal.querySelector('#reassign-category-select').value;
    if (!newCategoryId) return;

    try {
      showLoading(true, 'Reasignando transacciones...');
      
      // 1. Encontrar todas las transacciones a reasignar
      const q = query(collection(db, 'transactions'), where('familyGroupId', '==', familyGroupId), where('category', '==', categoryToDelete.id));
      const snapshot = await getDocs(q);

      // 2. Usar un batch para actualizarlas todas
      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, { category: newCategoryId });
      });
      
      // 3. Añadir la eliminación de la categoría al mismo batch
      const categoryToDeleteRef = doc(db, 'categories', categoryToDelete.id);
      batch.delete(categoryToDeleteRef);

      // 4. Ejecutar el batch
      await batch.commit();

      showNotification('Transacciones reasignadas y categoría eliminada.', 'success');
      
      const newCategoryName = allCategories.find(c => c.id === newCategoryId).name;
      logActivity(familyGroupId, getCurrentUser().uid, getCurrentUser().displayName, `eliminó la categoría "${categoryToDelete.name}" y reasignó ${transactionCount} transacciones a "${newCategoryName}".`);

      // 5. Actualizar la UI
      if (onUpdate) {
        onUpdate();
      }
      reassignModal.remove();
      // Cierra el modal principal de categorías también
      document.getElementById('category-manager-modal')?.remove();

    } catch (error) {
      console.error("Error reassigning and deleting:", error);
      showNotification('Ocurrió un error en el proceso.', 'error');
    } finally {
      showLoading(false);
    }
  });
}