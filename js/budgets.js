// Budgets Module
import { db } from './firebase-config.js';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { showLoading, showNotification } from './ui.js';
import { formatCurrency } from './utils.js';

let budgetsListener = null;
let currentBudgets = {};
let customCategories = [];
let familyGroupCurrency = 'USD';

export function initializeBudgets(familyGroupId, categories) {
  loadBudgets(familyGroupId, categories);
  // Get currency from app.js or a global state
  const appContainer = document.getElementById('app-container');
  if (appContainer) {
      familyGroupCurrency = appContainer.dataset.currency || 'USD';
  }
}

function loadBudgets(familyGroupId) {
  if (budgetsListener) {
    budgetsListener();
  }

  const budgetRef = doc(db, 'budgets', familyGroupId);

  budgetsListener = onSnapshot(budgetRef, (doc) => {
    if (doc.exists()) {
      currentBudgets = doc.data();
    } // No need for else, empty object is fine
    updateBudgetDisplay();
  });
}

export async function saveBudget(familyGroupId, category, amount) {
  try {
    showLoading(true);
    const budgetRef = doc(db, 'budgets', familyGroupId);

    const budgetData = {
      ...currentBudgets,
      [category]: amount
    };

    await setDoc(budgetRef, budgetData, { merge: true });
    showNotification('Presupuesto guardado', 'success');
  } catch (error) {
    console.error('Error al guardar presupuesto:', error);
    showNotification('Error al guardar presupuesto', 'error');
  } finally {
    showLoading(false);
  }
}

export function createBudgetWidget(categoryTotals, familyGroupId, categories) {
  customCategories = categories;
  const widget = document.createElement('div');
  widget.className = 'bg-white rounded-2xl shadow-lg p-6 mb-6';
  widget.innerHTML = `
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-2xl font-bold text-gray-800 flex items-center gap-2">
        <span>🎯</span>
        Presupuestos Mensuales
      </h3>
    </div>
    <div class="space-y-4" id="budget-bars"></div>
  `;

  const manageBudgetsBtn = widget.querySelector('#manage-budgets-btn');
  manageBudgetsBtn.addEventListener('click', () => {
    openBudgetModal(familyGroupId);
  });

  updateBudgetBars(widget.querySelector('#budget-bars'), categoryTotals);

  return widget;
}

function updateBudgetBars(container, categoryTotals) {
  container.innerHTML = '';

  customCategories.forEach(cat => {
    const budget = currentBudgets[cat.id] || 0;
    const spent = categoryTotals[cat.id] || 0;
    const percentage = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
    const isOverBudget = spent > budget && budget > 0;

    const barColor = isOverBudget ? 'bg-red-500' : 'bg-green-500';
    const textColor = isOverBudget ? 'text-red-600' : 'text-gray-600';

    const barHTML = `
      <div>
        <div class="flex justify-between items-center mb-2">
          <span class="font-medium text-gray-700">${cat.name}</span>
          <span class="text-sm font-semibold ${textColor}">
            ${formatCurrency(spent, familyGroupCurrency)} / ${formatCurrency(budget, familyGroupCurrency)}
          </span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div class="${barColor} h-3 rounded-full transition-all duration-500" style="width: ${percentage}%; background-color: ${isOverBudget ? '' : cat.color};"></div>
        </div>
        ${isOverBudget ? '<p class="text-xs text-red-600 mt-1 font-medium">⚠️ Sobre presupuesto</p>' : ''}
        ${budget === 0 ? '<p class="text-xs text-gray-500 mt-1">Sin presupuesto definido</p>' : ''}
      </div>
    `;

    container.insertAdjacentHTML('beforeend', barHTML);
  });
}

function updateBudgetDisplay() {
  // This will be called when budgets change
  const event = new CustomEvent('budgetsUpdated', { detail: currentBudgets });
  window.dispatchEvent(event);
}

function openBudgetModal(familyGroupId) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50';
  modal.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 animate-fadeIn">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold text-gray-800">Configurar Presupuestos</h2>
        <button class="close-modal text-gray-500 hover:text-gray-700 text-3xl font-bold">&times;</button>
      </div>
      <form id="budget-form" class="space-y-4">
        <div id="budget-inputs" class="max-h-64 overflow-y-auto pr-2 space-y-4"></div>
        <button type="submit" class="w-full gradient-bg text-white py-3 px-4 rounded-lg hover:opacity-90 transition font-bold shadow-lg">
          Guardar Presupuestos
        </button>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const budgetInputsContainer = modal.querySelector('#budget-inputs');
  customCategories.forEach(cat => {
    budgetInputsContainer.innerHTML += `
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">${cat.emoji} ${cat.name}</label>
        <input type="number" data-id="${cat.id}" step="0.01" value="${currentBudgets[cat.id] || 0}"
          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
      </div>
    `;
  });

  modal.querySelector('.close-modal').addEventListener('click', () => {
    modal.remove();
  });

  modal.querySelector('#budget-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const inputs = modal.querySelectorAll('#budget-inputs input');
    const newBudgets = { ...currentBudgets };
    inputs.forEach(input => {
      newBudgets[input.dataset.id] = parseFloat(input.value) || 0;
    });

    const budgetRef = doc(db, 'budgets', familyGroupId);
    await setDoc(budgetRef, newBudgets);

    showNotification('Presupuestos actualizados', 'success');
    modal.remove();
  });
}

export function getCurrentBudgets() {
  return currentBudgets;
}

export function cleanup() {
  if (budgetsListener) {
    budgetsListener();
  }
}
