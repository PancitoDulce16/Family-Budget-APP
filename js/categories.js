// Categories Module - Filtered transactions view
import { db } from './firebase-config.js';
import { collection, query, where, getDocs, orderBy } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let familyMembers = [];
let userFamilyGroup = null;
let allTransactions = [];

export function initializeCategories(familyGroupId, members) {
  userFamilyGroup = familyGroupId;
  familyMembers = members;

  setupCategoryFilters();
  populateYearFilter();
  loadAllTransactions();
}

function setupCategoryFilters() {
  const categoryFilter = document.getElementById('filter-category');
  const yearFilter = document.getElementById('filter-year');
  const monthFilter = document.getElementById('filter-month');

  categoryFilter?.addEventListener('change', applyFilters);
  yearFilter?.addEventListener('change', applyFilters);
  monthFilter?.addEventListener('change', applyFilters);
}

function populateYearFilter() {
  const yearFilter = document.getElementById('filter-year');
  if (!yearFilter) return;

  const currentYear = new Date().getFullYear();
  yearFilter.innerHTML = '';

  // Add years from 2020 to current year + 1
  for (let year = currentYear + 1; year >= 2020; year--) {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    if (year === currentYear) option.selected = true;
    yearFilter.appendChild(option);
  }
}

async function loadAllTransactions() {
  if (!userFamilyGroup) return;

  try {
    const transactionsQuery = query(
      collection(db, 'transactions'),
      where('familyGroupId', '==', userFamilyGroup),
      orderBy('date', 'desc')
    );

    const snapshot = await getDocs(transactionsQuery);
    allTransactions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    applyFilters();
  } catch (error) {
    console.error('Error cargando transacciones:', error);
  }
}

function applyFilters() {
  const categoryFilter = document.getElementById('filter-category')?.value;
  const yearFilter = document.getElementById('filter-year')?.value;
  const monthFilter = document.getElementById('filter-month')?.value;

  let filtered = [...allTransactions];

  // Filter by category
  if (categoryFilter) {
    filtered = filtered.filter(t => t.category === categoryFilter);
  }

  // Filter by year
  if (yearFilter) {
    filtered = filtered.filter(t => {
      const date = t.date?.toDate ? t.date.toDate() : new Date(t.date);
      return date.getFullYear() === parseInt(yearFilter);
    });
  }

  // Filter by month
  if (monthFilter !== '') {
    filtered = filtered.filter(t => {
      const date = t.date?.toDate ? t.date.toDate() : new Date(t.date);
      return date.getMonth() === parseInt(monthFilter);
    });
  }

  displayFilteredTransactions(filtered);
  updateCategorySummary(filtered);
}

function displayFilteredTransactions(transactions) {
  const container = document.getElementById('filtered-transactions');
  if (!container) return;

  if (transactions.length === 0) {
    container.innerHTML = '<p class="text-gray-500 text-center py-8">No se encontraron transacciones</p>';
    return;
  }

  container.innerHTML = '';

  // Only show expenses
  const expenses = transactions.filter(t => t.type === 'expense');

  expenses.forEach(transaction => {
    const member = familyMembers.find(m => m.id === transaction.paidBy);
    const memberName = member ? member.displayName : 'Desconocido';

    const date = transaction.date?.toDate ? transaction.date.toDate() : new Date(transaction.date);
    const dateStr = date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    const categoryColors = {
      casa: 'bg-purple-50 border-purple-200 text-purple-700',
      servicios: 'bg-blue-50 border-blue-200 text-blue-700',
      elias: 'bg-green-50 border-green-200 text-green-700',
      papas: 'bg-orange-50 border-orange-200 text-orange-700'
    };

    const categoryNames = {
      casa: 'Casa',
      servicios: 'Servicios',
      elias: 'Elías',
      papas: 'Papás'
    };

    const colorClass = categoryColors[transaction.category] || 'bg-gray-50 border-gray-200 text-gray-700';

    const div = document.createElement('div');
    div.className = `border rounded-lg p-4 cursor-pointer hover:shadow-md transition ${colorClass}`;
    div.innerHTML = `
      <div class="flex justify-between items-start mb-2">
        <div class="flex-1">
          <h4 class="font-semibold">${transaction.description}</h4>
          <p class="text-sm opacity-75">${categoryNames[transaction.category]}</p>
        </div>
        <p class="text-xl font-bold">$${transaction.amount.toFixed(2)}</p>
      </div>
      <div class="flex justify-between items-center text-sm opacity-75">
        <span>${memberName}</span>
        <span>${dateStr}</span>
      </div>
    `;

    // Click to view receipt
    div.addEventListener('click', () => {
      if (transaction.receiptBase64) {
        showReceiptModal(transaction.receiptBase64, transaction.description);
      }
    });

    container.appendChild(div);
  });

  // Add total at the end
  const total = expenses.reduce((sum, t) => sum + t.amount, 0);
  const totalDiv = document.createElement('div');
  totalDiv.className = 'border-t-2 border-gray-300 pt-4 mt-4';
  totalDiv.innerHTML = `
    <div class="flex justify-between items-center">
      <span class="text-lg font-semibold">Total:</span>
      <span class="text-2xl font-bold text-red-600">$${total.toFixed(2)}</span>
    </div>
  `;
  container.appendChild(totalDiv);
}

function updateCategorySummary(transactions) {
  const expenses = transactions.filter(t => t.type === 'expense');

  const totals = {
    casa: 0,
    servicios: 0,
    elias: 0,
    papas: 0
  };

  expenses.forEach(transaction => {
    if (totals.hasOwnProperty(transaction.category)) {
      totals[transaction.category] += transaction.amount;
    }
  });

  document.getElementById('cat-casa').textContent = `$${totals.casa.toFixed(2)}`;
  document.getElementById('cat-servicios').textContent = `$${totals.servicios.toFixed(2)}`;
  document.getElementById('cat-elias').textContent = `$${totals.elias.toFixed(2)}`;
  document.getElementById('cat-papas').textContent = `$${totals.papas.toFixed(2)}`;
}

// Show receipt modal (reused from app.js)
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

export function refreshCategories() {
  loadAllTransactions();
}
