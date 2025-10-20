// Main Application Module - Complete Enhanced Version
import { auth, db } from './firebase-config.js';
import { getCurrentUser, showLoading, showNotification } from './auth.js';
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
  onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Global variables
let currentUser = null;
let userFamilyGroup = null;
let familyMembers = [];
let currentTransactions = [];
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
    setupEventListeners();
    await loadDashboard();

    // Initialize all modules
    initializeTasks(userFamilyGroup, familyMembers);
    initializeBalance(userFamilyGroup, familyMembers);
    initializeCategories(userFamilyGroup, familyMembers);
    initializeBudgets(userFamilyGroup);
    // Process recurring transactions on startup
    await processRecurringTransactions(userFamilyGroup);

    initializeDarkMode();

    // Add search bar to dashboard
    addSearchToDashboard();

    // Add export and trends widgets
    addAnalyticsWidgets();

    // Setup view change handler
    window.onViewChange = handleViewChange;
  }
};

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

// Add search bar to dashboard
function addSearchToDashboard() {
  const dashboardView = document.getElementById('dashboard-view');
  const quickActions = dashboardView.querySelector('.grid');

  const searchBar = createSearchBar((filters) => {
    searchFilters = filters;
    applySearchFilters();
  });

  dashboardView.insertBefore(searchBar, quickActions);
}

// Add analytics widgets (export, trends, comparison)
function addAnalyticsWidgets() {
  const dashboardView = document.getElementById('dashboard-view');

  // Create container for analytics widgets
  const analyticsContainer = document.createElement('div');
  analyticsContainer.id = 'analytics-widgets-container';
  analyticsContainer.className = 'mt-6';

  dashboardView.appendChild(analyticsContainer);
}

// Update analytics widgets with transaction data
function updateAnalyticsWidgets() {
  const container = document.getElementById('analytics-widgets-container');
  if (!container) return;

  // Clear existing widgets
  container.innerHTML = '';

  // Get family group name
  const familyGroupName = userFamilyGroup || 'Mi Familia';

  // Calculate category totals
  const categoryTotals = {
    casa: 0,
    servicios: 0,
    elias: 0,
    papas: 0
  };

  currentTransactions.forEach(transaction => {
    if (transaction.type === 'expense') {
      if (categoryTotals.hasOwnProperty(transaction.category)) {
        categoryTotals[transaction.category] += transaction.amount;
      }
    }
  });

  // Add export widget
  const exportWidget = createExportWidget(currentTransactions, familyGroupName, categoryTotals);
  container.appendChild(exportWidget);

  // Add trends chart (if we have transactions)
  if (currentTransactions.length > 0) {
    // Load all transactions for trends (not just current month)
    loadAllTransactionsForTrends();
  }
}

// Load all transactions for trends chart
async function loadAllTransactionsForTrends() {
  const allTransactionsQuery = query(
    collection(db, 'transactions'),
    where('familyGroupId', '==', userFamilyGroup),
    orderBy('date', 'desc')
  );

  const snapshot = await getDocs(allTransactionsQuery);
  const allTransactions = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  const container = document.getElementById('analytics-widgets-container');
  if (!container) return;

  // Add comparison widget
  const comparisonWidget = createComparisonWidget(allTransactions);
  container.appendChild(comparisonWidget);

  // Add trends chart
  const trendsWidget = createTrendsChart(allTransactions);
  container.appendChild(trendsWidget);

  // Add receipt gallery
  const galleryWidget = createReceiptGallery(allTransactions);
  container.appendChild(galleryWidget);
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
    } else if (!editingTransaction) {
      showNotification('Debes subir una foto del comprobante', 'error');
      showLoading(false);
      return;
    }

    const transactionData = {
      type,
      amount,
      description,
      category,
      date: date,
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

  document.getElementById('total-expenses').textContent = `$${totalExpenses.toFixed(2)}`;
  document.getElementById('total-income').textContent = `$${totalIncome.toFixed(2)}`;
  document.getElementById('balance').textContent = `$${balance.toFixed(2)}`;

  const balanceElement = document.getElementById('balance');
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
    recentActivityDiv.innerHTML = '<p class="text-gray-500 text-sm">No hay transacciones recientes</p>';
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
          ${transaction.type === 'expense' ? '-' : '+'}$${transaction.amount.toFixed(2)}
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
  const categoryTotals = {
    casa: 0,
    servicios: 0,
    elias: 0,
    papas: 0
  };

  currentTransactions.forEach(transaction => {
    if (transaction.type === 'expense') {
      if (categoryTotals.hasOwnProperty(transaction.category)) {
        categoryTotals[transaction.category] += transaction.amount;
      }
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
      labels: ['Casa', 'Servicios', 'Elías', 'Papás'],
      datasets: [{
        data: [
          categoryTotals.casa,
          categoryTotals.servicios,
          categoryTotals.elias,
          categoryTotals.papas
        ],
        backgroundColor: [
          '#9333EA',
          '#3B82F6',
          '#10B981',
          '#F97316'
        ],
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
              return `${label}: $${value.toFixed(2)}`;
            }
          }
        }
      }
    }
  });
}

function updateBudgetWidget() {
  const categoryTotals = {
    casa: 0,
    servicios: 0,
    elias: 0,
    papas: 0
  };

  currentTransactions.forEach(transaction => {
    if (transaction.type === 'expense') {
      if (categoryTotals.hasOwnProperty(transaction.category)) {
        categoryTotals[transaction.category] += transaction.amount;
      }
    }
  });

  // Check if widget already exists
  let budgetContainer = document.getElementById('budget-widget-container');

  if (!budgetContainer) {
    const dashboardView = document.getElementById('dashboard-view');
    budgetContainer = document.createElement('div');
    budgetContainer.id = 'budget-widget-container';
    dashboardView.appendChild(budgetContainer);
  }

  budgetContainer.innerHTML = '';
  const widget = createBudgetWidget(categoryTotals, userFamilyGroup);
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
