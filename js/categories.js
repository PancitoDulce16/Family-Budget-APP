// Categories Module - Filtered transactions view
import { db } from './firebase-config.js';
import { showReceiptModal, showNotification } from './ui.js';
import { formatCurrency } from './utils.js';
import { collection, query, where, getDocs, orderBy } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let familyMembers = [];
let userFamilyGroup = null;
let allTransactions = [];
let customCategories = [];
let familyGroupCurrency = 'USD';

export function initializeCategories(familyGroupId, members, categories) {
  userFamilyGroup = familyGroupId;
  familyMembers = members;
  customCategories = categories;
  const appContainer = document.getElementById('app-container');
  if (appContainer) {
      familyGroupCurrency = appContainer.dataset.currency || 'USD';
  }

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
    showNotification('Error al cargar transacciones.', 'error');
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

  expenses.forEach(t => {
    const member = familyMembers.find(m => m.id === t.paidBy);
    const memberName = member ? member.displayName : 'Desconocido';
    const categoryDetails = getCategoryDetails(t.category, customCategories);
    const date = t.date?.toDate ? t.date.toDate() : new Date(t.date);
    const dateStr = date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });

    const div = document.createElement('div');
    div.className = `border rounded-lg p-4 cursor-pointer hover:shadow-md transition bg-gray-50 border-gray-200`;
    div.style.borderLeft = `4px solid ${categoryDetails.color}`;
    div.innerHTML = `
      <div class="flex justify-between items-start mb-2">
        <div class="flex-1">
          <h4 class="font-semibold">${t.description}</h4>
          <p class="text-sm opacity-75">${categoryDetails.displayName}</p>
        </div>
        <p class="text-xl font-bold text-red-600">-${formatCurrency(t.amount, familyGroupCurrency)}</p>
      </div>
      <div class="flex justify-between items-center text-sm opacity-75">
        <span>${memberName}</span>
        <span>${dateStr}</span>
      </div>
    `;

    // Click to view receipt
    div.addEventListener('click', () => {
      if (t.receiptBase64) {
        showReceiptModal(t.receiptBase64, t.description);
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
      <span class="text-2xl font-bold text-red-600">${formatCurrency(total, familyGroupCurrency)}</span>
    </div>
  `;
  container.appendChild(totalDiv);
}

function updateCategorySummary(transactions) {
  const summaryGrid = document.getElementById('category-summary-grid');
  if (!summaryGrid) return;

  summaryGrid.innerHTML = '';
  const expenses = transactions.filter(t => t.type === 'expense');

  customCategories.forEach(cat => {
    const total = expenses
      .filter(t => t.category === cat.id)
      .reduce((sum, t) => sum + t.amount, 0);

    const card = document.createElement('div');
    card.className = 'text-center p-4 bg-white rounded-xl shadow-md card-hover border';
    card.style.borderColor = cat.color;
    card.innerHTML = `
      <p class="text-sm text-gray-600 mb-1">${cat.emoji} ${cat.name}</p>
      <p class="text-2xl font-bold" style="color: ${cat.color};">${formatCurrency(total, familyGroupCurrency)}</p>
    `;
    summaryGrid.appendChild(card);
  });
}

export function refreshCategories() {
  loadAllTransactions();
}

/**
 * Gets the display properties for a category key.
 * @param {string} key The category key (ID).
 * @param {Array} categories The list of available categories.
 * @returns {object} An object with name, emoji, and color.
 */
function getCategoryDetails(key, categories) {
  const category = categories.find(c => c.id === key);
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
