// Main Application Module - Enhanced Version
import { auth, db } from './firebase-config.js';
import { getCurrentUser, showLoading, showNotification } from './auth.js';
import { setupNavigation } from './navigation.js';
import { initializeTasks } from './tasks.js';
import { initializeBalance, calculateBalance } from './balance.js';
import { initializeCategories, refreshCategories } from './categories.js';
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
let expenseChart = null;

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
const receiptPreview = document.getElementById('receipt-preview');
const previewImage = document.getElementById('preview-image');

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

    // Setup view change handler
    window.onViewChange = handleViewChange;
  }
};

function handleViewChange(viewName) {
  if (viewName === 'balance') {
    calculateBalance();
  } else if (viewName === 'categories') {
    refreshCategories();
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
  addExpenseBtn?.addEventListener('click', () => openTransactionModal('expense'));
  addIncomeBtn?.addEventListener('click', () => openTransactionModal('income'));
  closeModalBtn?.addEventListener('click', closeTransactionModal);

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

  receiptInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        previewImage.src = e.target.result;
        receiptPreview.classList.remove('hidden');
      };
      reader.readAsDataURL(file);
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
  receiptPreview.classList.add('hidden');
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

    if (!receiptFile) {
      showNotification('Debes subir una foto del comprobante', 'error');
      showLoading(false);
      return;
    }

    if (receiptFile.size > 1024 * 1024) {
      showNotification('La imagen debe ser menor a 1MB. Intenta comprimirla.', 'error');
      showLoading(false);
      return;
    }

    const receiptBase64 = await convertFileToBase64(receiptFile);

    const transactionData = {
      familyGroupId: userFamilyGroup,
      type,
      amount,
      description,
      category,
      date: date,
      paidBy,
      addedBy: currentUser.uid,
      receiptBase64: receiptBase64,
      isShared,
      sharedWith: [],
      createdAt: serverTimestamp()
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

    await addDoc(collection(db, 'transactions'), transactionData);

    showNotification('Transacción guardada exitosamente', 'success');
    closeTransactionModal();

    // Refresh categories view if we're on it
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

    updateDashboardStats();
    updateRecentActivity();
    updateExpenseChart();
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

  const recent = currentTransactions.slice(0, 5);

  if (recent.length === 0) {
    recentActivityDiv.innerHTML = '<p class="text-gray-500 text-sm">No hay transacciones recientes</p>';
    return;
  }

  recent.forEach(transaction => {
    const member = familyMembers.find(m => m.id === transaction.paidBy);
    const memberName = member ? member.displayName : 'Desconocido';

    const div = document.createElement('div');
    div.className = 'flex justify-between items-center border-b pb-2 cursor-pointer hover:bg-gray-50 p-2 rounded';
    div.innerHTML = `
      <div>
        <p class="font-medium text-sm">${transaction.description}</p>
        <p class="text-xs text-gray-500">${memberName} - ${transaction.category}</p>
      </div>
      <p class="font-semibold ${transaction.type === 'expense' ? 'text-red-600' : 'text-green-600'}">
        ${transaction.type === 'expense' ? '-' : '+'}$${transaction.amount.toFixed(2)}
      </p>
    `;

    div.addEventListener('click', () => {
      if (transaction.receiptBase64) {
        showReceiptModal(transaction.receiptBase64, transaction.description);
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

  // Destroy previous chart if exists
  if (expenseChart) {
    expenseChart.destroy();
  }

  const hasData = Object.values(categoryTotals).some(val => val > 0);

  if (!hasData) {
    ctx.parentElement.innerHTML = '<p class="text-gray-500 text-sm text-center">No hay gastos este mes</p>';
    return;
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
          '#9333EA', // purple
          '#3B82F6', // blue
          '#10B981', // green
          '#F97316'  // orange
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

function convertFileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function showReceiptModal(base64Image, description) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50';
  modal.innerHTML = `
    <div class="bg-white rounded-lg max-w-2xl w-full p-6">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-xl font-bold">Comprobante - ${description}</h3>
        <button class="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
      </div>
      <img src="${base64Image}" class="w-full rounded-lg" alt="Comprobante">
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('button').addEventListener('click', () => {
    modal.remove();
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}
