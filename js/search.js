// Search Module
export function createSearchBar(onSearch) {
  const searchContainer = document.createElement('div');
  searchContainer.className = 'mb-6';
  searchContainer.innerHTML = `
    <div class="bg-white rounded-2xl shadow-lg p-4">
      <div class="flex gap-4 flex-wrap">
        <div class="flex-1 min-w-[200px]">
          <input type="text" id="search-input" placeholder="🔍 Buscar transacciones..."
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition">
        </div>
        <div class="flex gap-2">
          <select id="search-category" class="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
            <option value="">Todas las categorías</option>
            <option value="casa">🏠 Casa</option>
            <option value="servicios">⚡ Servicios</option>
            <option value="elias">👤 Elías</option>
            <option value="papas">👨‍👩‍👦 Papás</option>
          </select>
          <select id="search-type" class="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
            <option value="">Todos los tipos</option>
            <option value="expense">💸 Gastos</option>
            <option value="income">💵 Ingresos</option>
          </select>
          <button id="clear-search" class="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium">
            Limpiar
          </button>
        </div>
      </div>
    </div>
  `;

  const searchInput = searchContainer.querySelector('#search-input');
  const searchCategory = searchContainer.querySelector('#search-category');
  const searchType = searchContainer.querySelector('#search-type');
  const clearBtn = searchContainer.querySelector('#clear-search');

  const performSearch = () => {
    const query = searchInput.value.toLowerCase();
    const category = searchCategory.value;
    const type = searchType.value;

    onSearch({
      query,
      category,
      type
    });
  };

  searchInput.addEventListener('input', performSearch);
  searchCategory.addEventListener('change', performSearch);
  searchType.addEventListener('change', performSearch);

  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchCategory.value = '';
    searchType.value = '';
    performSearch();
  });

  return searchContainer;
}

export function filterTransactions(transactions, filters) {
  return transactions.filter(transaction => {
    // Text search
    if (filters.query) {
      const matchesDescription = transaction.description.toLowerCase().includes(filters.query);
      const matchesAmount = transaction.amount.toString().includes(filters.query);
      if (!matchesDescription && !matchesAmount) return false;
    }

    // Category filter
    if (filters.category && transaction.category !== filters.category) {
      return false;
    }

    // Type filter
    if (filters.type && transaction.type !== filters.type) {
      return false;
    }

    return true;
  });
}
