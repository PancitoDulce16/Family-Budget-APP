// Savings Goals Module
import { db } from './firebase-config.js';
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

export function initializeGoals(familyGroupId, totalBalance) {
  if (!familyGroupId) return;

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
      <p class="text-xs text-gray-500 text-right mt-1">$${savedAmount.toFixed(2)} de $${goal.targetAmount.toFixed(2)}</p>
    `;
    container.appendChild(goalEl);
  });
}

function openGoalModal(familyGroupId) {
  const name = prompt('Nombre de la meta (ej: Vacaciones 2026):');
  if (!name) return;
  const emoji = prompt('Emoji para la meta (ej: 🏖️):');
  if (!emoji) return;
  const targetAmount = parseFloat(prompt('Monto objetivo (ej: 5000):'));
  if (isNaN(targetAmount) || targetAmount <= 0) {
    showNotification('Monto inválido', 'error');
    return;
  }

  saveGoal(familyGroupId, { name, emoji, targetAmount });
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




```fdif
--- a/c/Users/Noelia/Documents/GitHub/Family-Budget-APP/js/app.js
+++ b/c/Users/Noelia/Documents/GitHub/Family-Budget-APP/js/app.js
@@ -80,9 +80,6 @@
     // Add search bar to dashboard
     addSearchToDashboard();
 
-    // Add export and trends widgets
-    addAnalyticsWidgets();
-
     // Setup view change handler
     window.onViewChange = handleViewChange;
 
@@ -179,7 +176,7 @@
   dashboardView.appendChild(analyticsContainer);
 }
 
-// Update analytics widgets with transaction data
+// Load and display analytics widgets that require all historical data
 function updateAnalyticsWidgets() {
   const container = document.getElementById('analytics-widgets-container');
   if (!container) return;
@@ -533,7 +530,6 @@
     updateRecentActivity();
     updateExpenseChart();
     updateBudgetWidget();
-    updateAnalyticsWidgets();
     calculateBalance();
   });
 }
