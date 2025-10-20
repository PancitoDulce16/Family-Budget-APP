// Main Application Module - Complete Enhanced Version
import { auth, db } from './firebase-config.js';
import { getCurrentUser } from './auth.js';
import { DEFAULT_CATEGORIES } from './config.js';
import { setupNavigation } from './navigation.js';
import { initializeTasks } from './tasks.js';
import { initializeBalance, calculateBalance } from './balance.js';
import { initializeCategories, refreshCategories } from './categories.js';
import {
  editTransaction,
  deleteTransaction,
  openEditModal,
  getCurrentEditingTransaction,
  clearCurrentEditingTransaction,
  createTransactionActions,
  processRecurringTransactions
} from './transactions.js';
import { createSearchBar, filterTransactions } from './search.js';
import { initializeBudgets, createBudgetWidget, getCurrentBudgets } from './budgets.js';
import { createExportWidget } from './export.js';
import { createTrendsChart, createComparisonWidget } from './trends.js';
import { initializeDarkMode } from './dark-mode.js';
import { createReceiptGallery } from './receipt-gallery.js';
import { initializeGoals } from './goals.js';
import { showLoading, showNotification, showReceiptModal, showConfirmation } from './ui.js';
import { formatCurrency } from './utils.js';
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
  deleteDoc,
  getCountFromServer,
  onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Global variables
let currentUser = null;
let userFamilyGroup = null;
let familyGroupCurrency = 'USD'; // Default currency
let familyMembers = [];
let currentTransactions = [];
let customCategories = [];
let filteredTransactions = [];
let expenseChart = null;
let searchFilters = { query: '', category: '', type: '' };

// UI Elements
const addExpenseBtn = document.getElementById('add-expense-btn');
const addIncomeBtn = document.getElementById('add-income-btn');
const transactionModal = document.getElementById('transaction-modal');
const closeModalBtn = document.getElementById('close-modal');
const transactionForm = document.getElementById('transaction-form');
const typeBtns = document.querySelectorAll('.type-btn');
const transactionTypeInput = document.getElementById('transaction-type');
const sharedCheckbox = document.getElementById('transaction-shared');
const sharedOptions = document.getElementById('shared-options');
const receiptInput = document.getElementById('transaction-receipt');
const receiptDropZone = document.getElementById('receipt-drop-zone');
const receiptPreviewContainer = document.getElementById('receipt-preview');

// Initialize app
window.initializeApp = async (user) => {
  currentUser = user;
  await loadUserData();

  if (userFamilyGroup) {
    setupNavigation();
    setupDashboardTabs();
    setupEventListeners();

    // Initialize and load dynamic categories
    await initializeDefaultCategories(userFamilyGroup);
    await loadCustomCategories();

    await loadDashboard();

    // Initialize all modules
    initializeTasks(userFamilyGroup, familyMembers);
    initializeBalance(userFamilyGroup, familyMembers);

    // Process recurring transactions on startup
    await processRecurringTransactions(userFamilyGroup);

    initializeDarkMode();


    // Load historical data for analytics widgets once
    addAnalyticsWidgets();
    updateAnalyticsWidgets();

    // Setup view change handler
    window.onViewChange = handleViewChange;

    // Add search bar to dashboard
    addSearchToDashboard();

    // Initialize views that depend on categories
    initializeCategories(userFamilyGroup, familyMembers, customCategories);
    initializeBudgets(userFamilyGroup, customCategories);


  }
};

function setupDashboardTabs() {
    const tabs = document.querySelectorAll('.dashboard-tab-btn');
    const panels = document.querySelectorAll('.dashboard-tab-panel');

    const setActiveTab = (tab) => {
        const tabName = tab.dataset.tab;

        tabs.forEach(t => {
            if (t === tab) {
                t.classList.add('bg-green-100', 'text-green-700');
                t.classList.remove('text-gray-500', 'hover:bg-gray-100');
            } else {
                t.classList.remove('bg-green-100', 'text-green-700');
                t.classList.add('text-gray-500', 'hover:bg-gray-100');
            }
        });

        panels.forEach(panel => {
            panel.id === `${tabName}-tab` ? panel.classList.remove('hidden') : panel.classList.add('hidden');
        });
    };

    tabs.forEach(tab => tab.addEventListener('click', () => setActiveTab(tab)));
    setActiveTab(tabs[0]); // Activate first tab by default
}

function handleViewChange(viewName) {
  if (viewName === 'balance') {
    calculateBalance();
  } else if (viewName === 'categories') {
    refreshCategories();
  } else if (viewName === 'dashboard') {
    updateBudgetWidget();
  }
}

// Load user data and family group
async function loadUserData() {
  const userDoc = await getDoc(doc(db, 'users', currentUser.uid));

  if (userDoc.exists()) {
    const userData = userDoc.data();

    if (userData.familyGroupId) {
      userFamilyGroup = userData.familyGroupId;
      await loadFamilyMembers();
      // Load currency from family group
      const groupDoc = await getDoc(doc(db, 'familyGroups', userFamilyGroup));
      if (groupDoc.exists()) {
        familyGroupCurrency = groupDoc.data().currency || 'USD';
        document.getElementById('app-container').dataset.currency = familyGroupCurrency; // Store globally for other modules
      }
      populatePaidByDropdown();
    }
  }
}

// Load family members
async function loadFamilyMembers() {
  const membersQuery = query(
    collection(db, 'users'),
    where('familyGroupId', '==', userFamilyGroup)
  );

  const snapshot = await getDocs(membersQuery);
  familyMembers = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

async function loadCustomCategories() {
  customCategories = await getCustomCategories(userFamilyGroup);
  // Populate dropdowns that depend on categories
  populateCategoryDropdown(document.getElementById('transaction-category'));
  populateCategoryDropdown(document.getElementById('filter-category'), 'Todas');
  // The search bar categories are populated within its own module
}

// Add search bar to dashboard
function addSearchToDashboard() {
  const dashboardView = document.getElementById('dashboard-view');
  const quickActions = dashboardView.querySelector('.grid');

  const searchBar = createSearchBar((filters) => {
    searchFilters = filters;
    applySearchFilters();
  }, customCategories);

  dashboardView.insertBefore(searchBar, quickActions);
}

// Add analytics widgets (export, trends, comparison)
function addAnalyticsWidgets() {
  const analyticsTab = document.getElementById('analytics-tab');

  // Create container for analytics widgets
  const analyticsContainer = document.createElement('div');
  analyticsContainer.id = 'analytics-widgets-container'; // Keep this ID for updateAnalyticsWidgets
  analyticsContainer.className = 'mt-6';

  analyticsTab.appendChild(analyticsContainer);
}

// Apply search filters
function applySearchFilters() {
  filteredTransactions = filterTransactions(currentTransactions, searchFilters);
  updateRecentActivity();
}

// Populate "Paid By" dropdown
function populatePaidByDropdown() {
  const paidBySelect = document.getElementById('transaction-paidby');
  paidBySelect.innerHTML = '<option value="">Seleccionar...</option>';

  familyMembers.forEach(member => {
    const option = document.createElement('option');
    option.value = member.id;
    option.textContent = member.displayName;
    paidBySelect.appendChild(option);
  });

  populateSharedMembers();
}

// Populate a category dropdown dynamically
function populateCategoryDropdown(selectElement, allOptionText = 'Seleccionar...') {
  if (!selectElement) return;
  selectElement.innerHTML = `<option value="">${allOptionText}</option>`;
  customCategories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat.id;
    option.textContent = `${cat.emoji} ${cat.name}`;
    selectElement.appendChild(option);
  });
}

// Populate shared members checkboxes
function populateSharedMembers() {
  const sharedMembersDiv = document.getElementById('shared-members');
  sharedMembersDiv.innerHTML = '';

  familyMembers.forEach(member => {
    const div = document.createElement('div');
    div.className = 'flex items-center gap-2';
    div.innerHTML = `
      <input type="checkbox" id="member-${member.id}" class="member-checkbox" data-member-id="${member.id}">
      <label for="member-${member.id}" class="text-sm">${member.displayName}</label>
      <input type="number" id="percentage-${member.id}" placeholder="%" min="0" max="100"
        class="w-16 px-2 py-1 border border-gray-300 rounded text-sm" disabled>
    `;
    sharedMembersDiv.appendChild(div);

    const checkbox = div.querySelector(`#member-${member.id}`);
    const percentageInput = div.querySelector(`#percentage-${member.id}`);

    checkbox.addEventListener('change', () => {
      percentageInput.disabled = !checkbox.checked;
      if (!checkbox.checked) {
        percentageInput.value = '';
      }
    });
  });
}

// Setup event listeners
function setupEventListeners() {
  addExpenseBtn?.addEventListener('click', () => {
    clearCurrentEditingTransaction();
    openTransactionModal('expense');
  });

  addIncomeBtn?.addEventListener('click', () => {
    clearCurrentEditingTransaction();
    openTransactionModal('income');
  });

  // This button is on the dashboard
  document.getElementById('dashboard-manage-categories-btn')?.addEventListener('click', () => {
    openCategoryManagerModal(userFamilyGroup, customCategories, async () => {
      await loadCustomCategories(); // Refresh categories everywhere
    });
  });

  document.getElementById('manage-categories-btn')?.addEventListener('click', () => {
    openCategoryManagerModal(userFamilyGroup, customCategories, async () => {
      await loadCustomCategories(); // Refresh categories everywhere
    });
  });

  closeModalBtn?.addEventListener('click', () => {
    clearCurrentEditingTransaction();
    closeTransactionModal();
  });

  typeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      typeBtns.forEach(b => {
        b.classList.remove('bg-red-50', 'bg-green-50', 'border-red-500', 'border-green-500', 'text-red-600', 'text-green-600');
        b.classList.add('border-gray-300', 'text-gray-600');
      });

      const type = btn.dataset.type;
      transactionTypeInput.value = type;

      if (type === 'expense') {
        btn.classList.add('bg-red-50', 'border-red-500', 'text-red-600');
      } else {
        btn.classList.add('bg-green-50', 'border-green-500', 'text-green-600');
      }
    });
  });

  sharedCheckbox?.addEventListener('change', () => {
    if (sharedCheckbox.checked) {
      sharedOptions.classList.remove('hidden');
    } else {
      sharedOptions.classList.add('hidden');
    }
  });

  const handleFile = (file) => {
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
  };

  receiptInput?.addEventListener('change', (e) => handleFile(e.target.files[0]));

  // Drag and Drop events
  receiptDropZone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    receiptDropZone.classList.add('border-green-500', 'bg-green-50');
  });

  receiptDropZone?.addEventListener('dragleave', (e) => {
    e.preventDefault();
    receiptDropZone.classList.remove('border-green-500', 'bg-green-50');
  });

  receiptDropZone?.addEventListener('drop', (e) => {
    e.preventDefault();
    receiptDropZone.classList.remove('border-green-500', 'bg-green-50');
    if (e.dataTransfer.files.length) {
      receiptInput.files = e.dataTransfer.files;
      handleFile(e.dataTransfer.files[0]);
    }
  });

  transactionForm?.addEventListener('submit', handleTransactionSubmit);

  const dateInput = document.getElementById('transaction-date');
  if (dateInput) {
    dateInput.valueAsDate = new Date();
  }
}

function openTransactionModal(type) {
  transactionModal.classList.remove('hidden');
  transactionTypeInput.value = type;

  typeBtns.forEach(btn => {
    btn.classList.remove('bg-red-50', 'bg-green-50', 'border-red-500', 'border-green-500', 'text-red-600', 'text-green-600');
    btn.classList.add('border-gray-300', 'text-gray-600');

    if (btn.dataset.type === type) {
      if (type === 'expense') {
        btn.classList.add('bg-red-50', 'border-red-500', 'text-red-600');
      } else {
        btn.classList.add('bg-green-50', 'border-green-500', 'text-green-600');
      }
    }
  });
}

function closeTransactionModal() {
  transactionModal.classList.add('hidden');
  transactionForm.reset();
  receiptPreviewContainer.classList.add('hidden');
  receiptDropZone.classList.remove('hidden');
  sharedOptions.classList.add('hidden');
  sharedCheckbox.checked = false;
}

async function handleTransactionSubmit(e) {
  e.preventDefault();

  if (!userFamilyGroup) {
    showNotification('Debes pertenecer a un grupo familiar primero', 'error');
    return;
  }

  try {
    showLoading(true);

    const type = transactionTypeInput.value;
    const amount = parseFloat(document.getElementById('transaction-amount').value);
    const description = document.getElementById('transaction-description').value;
    const category = document.getElementById('transaction-category').value;
    const date = new Date(document.getElementById('transaction-date').value);
    const paidBy = document.getElementById('transaction-paidby').value;
    const receiptFile = receiptInput.files[0];
    const currency = document.getElementById('transaction-currency').value;
    const isShared = sharedCheckbox.checked;

    // Check if editing
    const editingTransaction = getCurrentEditingTransaction();

    let receiptBase64 = editingTransaction?.receiptBase64 || null;

    // If new receipt uploaded
    if (receiptFile) {
      if (receiptFile.size > 1024 * 1024) {
        showNotification('La imagen debe ser menor a 1MB. Intenta comprimirla.', 'error');
        showLoading(false);
        return;
      }
      receiptBase64 = await convertFileToBase64(receiptFile);
    }

    const transactionData = {
      type,
      amount,
      description,
      category,
      date: date,
      currency: currency,
      paidBy,
      receiptBase64: receiptBase64,
      isShared,
      sharedWith: []
    };

    if (isShared) {
      const checkboxes = document.querySelectorAll('.member-checkbox:checked');
      const sharedMembers = [];

      checkboxes.forEach(checkbox => {
        const memberId = checkbox.dataset.memberId;
        const percentage = parseFloat(document.getElementById(`percentage-${memberId}`).value) || 0;

        sharedMembers.push({
          userId: memberId,
          percentage
        });
      });

      transactionData.sharedWith = sharedMembers;
    }

    if (editingTransaction) {
      // Update existing transaction
      await editTransaction(editingTransaction.id, transactionData);
      showNotification('Transacción actualizada', 'success');
    } else {
      // Create new transaction
      transactionData.familyGroupId = userFamilyGroup;
      transactionData.addedBy = currentUser.uid;
      transactionData.createdAt = serverTimestamp();

      await addDoc(collection(db, 'transactions'), transactionData);
      showNotification('Transacción guardada exitosamente', 'success');
    }

    clearCurrentEditingTransaction();
    closeTransactionModal();

    if (window.onViewChange) {
      refreshCategories();
    }
  } catch (error) {
    console.error('Error al guardar transacción:', error);
    showNotification('Error al guardar la transacción', 'error');
  } finally {
    showLoading(false);
  }
}

async function loadDashboard() {
  if (!userFamilyGroup) return;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const transactionsQuery = query(
    collection(db, 'transactions'),
    where('familyGroupId', '==', userFamilyGroup),
    where('date', '>=', monthStart),
    where('date', '<=', monthEnd),
    orderBy('date', 'desc')
  );

  onSnapshot(transactionsQuery, (snapshot) => {
    currentTransactions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    filteredTransactions = currentTransactions;
    applySearchFilters();

    updateDashboardStats();
    updateRecentActivity();
    updateExpenseChart();
    updateBudgetWidget();
    updateAnalyticsWidgets();
    calculateBalance();
  });
}

function updateDashboardStats() {
  let totalExpenses = 0;
  let totalIncome = 0;

  currentTransactions.forEach(transaction => {
    if (transaction.type === 'expense') {
      totalExpenses += transaction.amount;
    } else {
      totalIncome += transaction.amount;
    }
  });

  const balance = totalIncome - totalExpenses;

  document.getElementById('total-expenses').textContent = formatCurrency(totalExpenses, familyGroupCurrency);
  document.getElementById('total-income').textContent = formatCurrency(totalIncome, familyGroupCurrency);
  document.getElementById('balance').textContent = formatCurrency(balance, familyGroupCurrency);

  const balanceElement = document.getElementById('balance');
  // Update goals widget with the new total balance
  const totalBalance = parseFloat(balanceElement.textContent.replace('$', ''));
  initializeGoals(userFamilyGroup, totalBalance);

  if (balance >= 0) {
    balanceElement.classList.remove('text-red-600');
    balanceElement.classList.add('text-green-600');
  } else {
    balanceElement.classList.remove('text-green-600');
    balanceElement.classList.add('text-red-600');
  }
}

function updateRecentActivity() {
  const recentActivityDiv = document.getElementById('recent-activity');
  recentActivityDiv.innerHTML = '';

  const recent = filteredTransactions.slice(0, 10);

  if (recent.length === 0) {
    recentActivityDiv.innerHTML = `
      <div class="text-center py-12">
        <svg class="mx-auto h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        <h3 class="mt-2 text-lg font-medium text-gray-800">Sin Actividad</h3>
        <p class="mt-1 text-sm text-gray-500">Añade un gasto o ingreso para empezar.</p>
      </div>
    `;
    return;
  }

  recent.forEach(transaction => {
    const member = familyMembers.find(m => m.id === transaction.paidBy);
    const memberName = member ? member.displayName : 'Desconocido';

    const div = document.createElement('div');
    div.className = 'border-b pb-3 cursor-pointer hover:bg-gray-50 p-2 rounded transition';
    div.innerHTML = `
      <div class="flex justify-between items-start">
        <div class="flex-1">
          <p class="font-medium text-sm">${transaction.description}</p>
          <p class="text-xs text-gray-500">${memberName} - ${transaction.category}</p>
        </div>
        <p class="font-semibold ${transaction.type === 'expense' ? 'text-red-600' : 'text-green-600'}">
          ${transaction.type === 'expense' ? '-' : '+'}${formatCurrency(transaction.amount, transaction.currency || familyGroupCurrency)}
        </p>
      </div>
    `;

    // Add edit/delete buttons
    const actions = createTransactionActions(
      transaction,
      (t) => openEditModal(t, familyMembers),
      () => applySearchFilters()
    );
    div.appendChild(actions);

    // Click to view receipt
    div.addEventListener('click', (e) => {
      if (!e.target.closest('button')) {
        if (transaction.receiptBase64) {
          showReceiptModal(transaction.receiptBase64, transaction.description);
        }
      }
    });

    recentActivityDiv.appendChild(div);
  });
}

function updateExpenseChart() {
  const categoryTotals = {};
  customCategories.forEach(cat => categoryTotals[cat.id] = 0);
  currentTransactions.filter(t => t.type === 'expense').forEach(t => {
    if (categoryTotals.hasOwnProperty(t.category)) {
      categoryTotals[t.category] += t.amount;
    }
  });

  const ctx = document.getElementById('expense-chart');
  if (!ctx) return;

  if (expenseChart) {
    expenseChart.destroy();
  }

  const hasData = Object.values(categoryTotals).some(val => val > 0);

  if (!hasData) {
    ctx.parentElement.innerHTML = '<div class="flex items-center justify-center h-64"><p class="text-gray-500 text-sm text-center">No hay gastos este mes</p></div>';
    return;
  }

  // Ensure canvas exists
  if (!ctx.getContext) {
    ctx.parentElement.innerHTML = '<canvas id="expense-chart"></canvas>';
  }

  expenseChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: customCategories.map(c => c.name),
      datasets: [{
        data: customCategories.map(c => categoryTotals[c.id] || 0),
        backgroundColor: customCategories.map(c => c.color),
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom'
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed || 0;
              return `${label}: ${formatCurrency(value, familyGroupCurrency)}`;
            }
          }
        }
      }
    }
  });
}

function updateBudgetWidget() {
  const categoryTotals = {};
  customCategories.forEach(cat => categoryTotals[cat.id] = 0);
  currentTransactions.filter(t => t.type === 'expense').forEach(t => {
    if (categoryTotals.hasOwnProperty(t.category)) {
      categoryTotals[t.category] += t.amount;
    }
  });

  // Check if widget already exists
  const budgetContainer = document.getElementById('budget-widget-container');
  if (!budgetContainer) {
      console.error('Budget widget container not found!');
      return;
  }



  budgetContainer.innerHTML = '';
  const widget = createBudgetWidget(categoryTotals, userFamilyGroup, customCategories);
  budgetContainer.appendChild(widget);
}

function convertFileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// --- Custom Categories Logic (Moved from custom-categories.js) ---

/**
 * Initializes default categories for a family group if they don't exist.
 * @param {string} familyGroupId The ID of the family group.
 */
async function initializeDefaultCategories(familyGroupId) {
  const categoriesRef = collection(db, 'categories');
  const q = query(categoriesRef, where('familyGroupId', '==', familyGroupId));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    const batch = writeBatch(db);
    DEFAULT_CATEGORIES.forEach(category => {
      const newCategoryRef = doc(collection(db, 'categories'));
      batch.set(newCategoryRef, { ...category, familyGroupId });
    });
    await batch.commit();
  }
}

/**
 * Fetches all custom categories for a family group.
 * @param {string} familyGroupId The ID of the family group.
 * @returns {Promise<Array>} A promise that resolves to an array of category objects.
 */
async function getCustomCategories(familyGroupId) {
  const categoriesRef = collection(db, 'categories');
  const q = query(categoriesRef, where('familyGroupId', '==', familyGroupId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Opens the category management modal.
 * @param {string} familyGroupId The ID of the family group.
 * @param {Array} currentCategories The current list of categories.
 * @param {Function} onUpdate Callback to refresh data.
 */
function openCategoryManagerModal(familyGroupId, currentCategories, onUpdate) {
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
        <h3 class="text-lg font-semibold mb-2">Añadir Nueva Categoría</h3>
        <form id="add-category-form" class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <input type="text" id="new-category-name" placeholder="Nombre" required class="w-full px-4 py-3 border border-gray-300 rounded-lg">
          <input type="text" id="new-category-emoji" placeholder="Emoji (ej: 🚗)" required maxlength="2" class="w-full px-4 py-3 border border-gray-300 rounded-lg">
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
      div.className = 'flex items-center justify-between bg-gray-50 p-3 rounded-lg';
      div.innerHTML = `
        <div class="flex items-center gap-3">
          <span class="text-2xl">${cat.emoji}</span>
          <span class="font-medium">${cat.name}</span>
          <div class="w-5 h-5 rounded-full" style="background-color: ${cat.color};"></div>
        </div>
        <button data-id="${cat.id}" class="delete-category-btn text-red-500 hover:text-red-700 font-bold">&times;</button>
      `;
      categoryList.appendChild(div);
    });
  };

  renderCategories(currentCategories);

  // Event Listeners
  modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());

  addForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = addForm.querySelector('#new-category-name').value;
    const emoji = addForm.querySelector('#new-category-emoji').value;
    const color = addForm.querySelector('#new-category-color').value;

    if (!name || !emoji) return;

    try {
      showLoading(true);
      const newCategory = { name, emoji, color, familyGroupId };
      const docRef = await addDoc(collection(db, 'categories'), newCategory);
      customCategories.push({ id: docRef.id, ...newCategory }); // Update global state
      renderCategories(customCategories);
      addForm.reset();
      onUpdate(); // Notify app to refresh data
      showNotification('Categoría añadida', 'success');
    } catch (error) {
      console.error("Error adding category:", error);
      showNotification('Error al añadir categoría', 'error');
    } finally {
      showLoading(false);
    }
  });

  categoryList.addEventListener('click', async (e) => {
    if (e.target.classList.contains('delete-category-btn')) {
      const categoryId = e.target.dataset.id;
      
      const transactionsQuery = query(collection(db, "transactions"), where("familyGroupId", "==", familyGroupId), where("category", "==", categoryId));
      const countSnapshot = await getCountFromServer(transactionsQuery);
      
      if (countSnapshot.data().count > 0) {
        showNotification('No se puede eliminar. La categoría está en uso.', 'error');
        return;
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
          customCategories = customCategories.filter(c => c.id !== categoryId); // Update global state
          renderCategories(customCategories);
          onUpdate(); // Notify app to refresh data
          showNotification('Categoría eliminada', 'success');
        } catch (error) {
          console.error("Error deleting category:", error);
          showNotification('Error al eliminar categoría', 'error');
        } finally {
          showLoading(false);
        }
      }
    }
  });
}

async function updateAnalyticsWidgets() {
    const container = document.getElementById('analytics-widgets-container');
    if (!container) return;

    // Clear existing widgets
    container.innerHTML = '';

    // Fetch all transactions for analytics
    const allTransactionsQuery = query(
        collection(db, 'transactions'),
        where('familyGroupId', '==', userFamilyGroup),
        orderBy('date', 'desc')
    );
    const snapshot = await getDocs(allTransactionsQuery);
    const allTransactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Calculate category totals from all transactions
    const categoryTotals = {};
    customCategories.forEach(cat => categoryTotals[cat.id] = 0);
    allTransactions.filter(t => t.type === 'expense').forEach(t => {
        if (categoryTotals.hasOwnProperty(t.category)) {
            categoryTotals[t.category] += t.amount;
        }
    });

    // Add export widget
    const exportWidget = createExportWidget(allTransactions, userFamilyGroup || 'Mi Familia', categoryTotals, customCategories);
    container.appendChild(exportWidget);

    // Add comparison widget
    const comparisonWidget = createComparisonWidget(allTransactions);
    container.appendChild(comparisonWidget);

    // Add trends chart
    const trendsWidget = createTrendsChart(allTransactions);
    container.appendChild(trendsWidget);

    // Add receipt gallery
    const galleryWidget = createReceiptGallery(allTransactions, customCategories);
    container.appendChild(galleryWidget);
}

/**
 * Gets the display properties for a category key.
 * @param {string} key The category key (ID).
 * @param {Array} categories The list of available categories.
 * @returns {object} An object with name, emoji, and color.
 */
function getCategoryDetails(key, categories) {
  const category = categories.find(c => c.id === key || c.key === key); // Support old and new keys
  if (category) {
    return {
      name: category.name,
      emoji: category.emoji,
      color: category.color,
      displayName: `${category.emoji} ${category.name}`
    };
  }
  return { name: 'Sin Categoría', emoji: '❓', color: '#9CA3AF', displayName: '❓ Sin Categoría' };
}
