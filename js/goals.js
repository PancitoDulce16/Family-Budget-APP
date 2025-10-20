// Savings Goals Module
import { db } from './firebase-config.js';
import { formatCurrency } from './utils.js';
import { showNotification } from './ui.js';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  query,
  where
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let goalsListener = null;
let familyGroupCurrency = 'USD';

export function initializeGoals(familyGroupId, totalBalance) {
  if (!familyGroupId) return;

  // Get currency from app.js or a global state
  const appContainer = document.getElementById('app-container');
  if (appContainer) {
      familyGroupCurrency = appContainer.dataset.currency || 'USD';
  }

  if (goalsListener) goalsListener(); // Unsubscribe from previous listener

  const goalsQuery = query(collection(db, 'goals'), where('familyGroupId', '==', familyGroupId));
  goalsListener = onSnapshot(goalsQuery, (snapshot) => {
    const goals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    displayGoals(goals, totalBalance, familyGroupId);
  });
}

function displayGoals(goals, totalBalance, familyGroupId) {
  const container = document.getElementById('savings-goals-container');
  if (!container) return;

  container.innerHTML = '';

  if (goals.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
        <svg class="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
        <h3 class="mt-2 text-md font-medium text-gray-800">Sin Metas de Ahorro</h3>
        <p class="mt-1 text-sm text-gray-500">¡Crea una meta para empezar a ahorrar en familia!</p>
        <button id="add-new-goal-btn" class="mt-4 gradient-bg text-white px-4 py-2 rounded-lg font-semibold">Crear Meta</button>
      </div>
    `;
    container.querySelector('#add-new-goal-btn').addEventListener('click', () => openGoalModal(familyGroupId));
    return;
  }

  goals.forEach(goal => {
    const savedAmount = Math.max(0, totalBalance); // Assuming total balance contributes to goals
    const percentage = goal.targetAmount > 0 ? Math.min((savedAmount / goal.targetAmount) * 100, 100) : 0;

    const goalEl = document.createElement('div');
    goalEl.innerHTML = `
      <div class="flex justify-between items-center mb-1">
        <span class="font-medium text-gray-700">${goal.emoji} ${goal.name}</span>
        <span class="text-sm font-semibold text-green-600">
          ${percentage.toFixed(0)}%
        </span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
        <div class="bg-green-500 h-4 rounded-full transition-all duration-500" style="width: ${percentage}%"></div>
      </div>
      <p class="text-xs text-gray-500 text-right mt-1">${formatCurrency(savedAmount, familyGroupCurrency)} de ${formatCurrency(goal.targetAmount, familyGroupCurrency)}</p>
    `;
    container.appendChild(goalEl);
  });
}

function openGoalModal(familyGroupId, onUpdate) {
  const modal = document.createElement('div');
  modal.id = 'goal-manager-modal';
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fadeIn';
  modal.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold text-gray-800">Crear Meta de Ahorro</h2>
        <button class="close-modal text-gray-500 hover:text-gray-700 text-3xl font-bold">&times;</button>
      </div>
      <form id="add-goal-form" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Nombre de la meta</label>
          <input type="text" id="new-goal-name" placeholder="Ej: Vacaciones 2026" required class="w-full px-4 py-3 border border-gray-300 rounded-lg">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Emoji</label>
          <input type="text" id="new-goal-emoji" placeholder="Ej: 🏖️" required maxlength="2" class="w-full px-4 py-3 border border-gray-300 rounded-lg">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Monto Objetivo</label>
          <input type="number" id="new-goal-amount" placeholder="Ej: 5000" required min="1" step="0.01" class="w-full px-4 py-3 border border-gray-300 rounded-lg">
        </div>
        <button type="submit" class="w-full gradient-bg text-white py-3 px-4 rounded-lg font-bold">Crear Meta</button>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());

  modal.querySelector('#add-goal-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('new-goal-name').value;
    const emoji = document.getElementById('new-goal-emoji').value;
    const targetAmount = parseFloat(document.getElementById('new-goal-amount').value);

    if (isNaN(targetAmount) || targetAmount <= 0) {
      showNotification('Monto inválido', 'error');
      return;
    }

    await saveGoal(familyGroupId, { name, emoji, targetAmount });
    modal.remove();
  });
}

async function saveGoal(familyGroupId, goalData) {
  try {
    const goalRef = doc(collection(db, 'goals'));
    await setDoc(goalRef, { ...goalData, familyGroupId });
    showNotification('¡Meta creada! A ahorrar se ha dicho.', 'success');
  } catch (error) {
    console.error('Error saving goal:', error);
    showNotification('Error al guardar la meta.', 'error');
  }
}
