// Budgets Module
import { db } from './firebase-config.js';
import { getCurrentUser, showLoading, showNotification } from './auth.js';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let budgetsListener = null;
let currentBudgets = {};

export function initializeBudgets(familyGroupId) {
  loadBudgets(familyGroupId);
}

function loadBudgets(familyGroupId) {
  if (budgetsListener) {
    budgetsListener();
  }

  const budgetRef = doc(db, 'budgets', familyGroupId);

  budgetsListener = onSnapshot(budgetRef, (doc) => {
    if (doc.exists()) {
      currentBudgets = doc.data();
    } else {
      currentBudgets = {
        casa: 0,
        servicios: 0,
        elias: 0,
        papas: 0
      };
    }
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

export function createBudgetWidget(categoryTotals, familyGroupId) {
  const widget = document.createElement('div');
  widget.className = 'bg-white rounded-2xl shadow-lg p-6 mb-6';
  widget.innerHTML = `
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-2xl font-bold text-gray-800 flex items-center gap-2">
        <span>🎯</span>
        Presupuestos Mensuales
      </h3>
      <button id="manage-budgets-btn" class="gradient-bg text-white px-4 py-2 rounded-lg hover:opacity-90 transition font-semibold">
        Configurar
      </button>
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
  const categories = [
    { key: 'casa', name: '🏠 Casa', color: 'purple' },
    { key: 'servicios', name: '⚡ Servicios', color: 'blue' },
    { key: 'elias', name: '👤 Elías', color: 'green' },
    { key: 'papas', name: '👨‍👩‍👦 Papás', color: 'orange' }
  ];

  container.innerHTML = '';

  categories.forEach(cat => {
    const budget = currentBudgets[cat.key] || 0;
    const spent = categoryTotals[cat.key] || 0;
    const percentage = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
    const isOverBudget = spent > budget && budget > 0;

    const barColor = isOverBudget ? 'bg-red-500' : `bg-${cat.color}-500`;
    const textColor = isOverBudget ? 'text-red-600' : `text-${cat.color}-600`;

    const barHTML = `
      <div>
        <div class="flex justify-between items-center mb-2">
          <span class="font-medium text-gray-700">${cat.name}</span>
          <span class="text-sm ${textColor} font-semibold">
            $${spent.toFixed(2)} / $${budget.toFixed(2)}
          </span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div class="${barColor} h-3 rounded-full transition-all duration-500" style="width: ${percentage}%"></div>
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
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">🏠 Casa</label>
          <input type="number" id="budget-casa" step="0.01" value="${currentBudgets.casa || 0}"
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">⚡ Servicios</label>
          <input type="number" id="budget-servicios" step="0.01" value="${currentBudgets.servicios || 0}"
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">👤 Elías</label>
          <input type="number" id="budget-elias" step="0.01" value="${currentBudgets.elias || 0}"
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">👨‍👩‍👦 Papás</label>
          <input type="number" id="budget-papas" step="0.01" value="${currentBudgets.papas || 0}"
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
        </div>

        <button type="submit" class="w-full gradient-bg text-white py-3 px-4 rounded-lg hover:opacity-90 transition font-bold shadow-lg">
          Guardar Presupuestos
        </button>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('.close-modal').addEventListener('click', () => {
    modal.remove();
  });

  modal.querySelector('#budget-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const budgets = {
      casa: parseFloat(document.getElementById('budget-casa').value) || 0,
      servicios: parseFloat(document.getElementById('budget-servicios').value) || 0,
      elias: parseFloat(document.getElementById('budget-elias').value) || 0,
      papas: parseFloat(document.getElementById('budget-papas').value) || 0
    };

    const budgetRef = doc(db, 'budgets', familyGroupId);
    await setDoc(budgetRef, budgets);

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
