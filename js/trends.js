// Trends and Analytics Module
export function createTrendsChart(transactions) {
  const widget = document.createElement('div');
  widget.className = 'bg-white rounded-2xl shadow-lg p-6 mb-6';
  widget.innerHTML = `
    <div class="flex justify-between items-center mb-6">
      <h3 class="text-2xl font-bold text-gray-800 flex items-center gap-2">
        <span>📈</span>
        Tendencias de Gastos
      </h3>
      <div class="flex gap-2">
        <button class="trend-period-btn px-4 py-2 rounded-lg border-2 border-green-500 bg-green-50 text-green-600 font-semibold transition" data-period="6">
          6 Meses
        </button>
        <button class="trend-period-btn px-4 py-2 rounded-lg border-2 border-gray-300 text-gray-600 font-medium hover:border-green-500 hover:bg-green-50 hover:text-green-600 transition" data-period="12">
          12 Meses
        </button>
        <button class="trend-period-btn px-4 py-2 rounded-lg border-2 border-gray-300 text-gray-600 font-medium hover:border-green-500 hover:bg-green-50 hover:text-green-600 transition" data-period="all">
          Todo
        </button>
      </div>
    </div>
    <div class="relative" style="height: 400px;">
      <canvas id="trends-chart"></canvas>
    </div>
    <div id="trends-insights" class="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4"></div>
  `;

  const canvas = widget.querySelector('#trends-chart');
  const periodBtns = widget.querySelectorAll('.trend-period-btn');

  let currentChart = null;
  let currentPeriod = 6;

  // Period button handlers
  periodBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      periodBtns.forEach(b => {
        b.classList.remove('bg-green-50', 'border-green-500', 'text-green-600');
        b.classList.add('border-gray-300', 'text-gray-600');
      });
      btn.classList.add('bg-green-50', 'border-green-500', 'text-green-600');
      btn.classList.remove('border-gray-300', 'text-gray-600');

      currentPeriod = btn.dataset.period;
      updateChart();
    });
  });

  function updateChart() {
    const data = prepareChartData(transactions, currentPeriod);

    if (currentChart) {
      currentChart.destroy();
    }

    currentChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: 'Gastos',
            data: data.expenses,
            borderColor: 'rgb(220, 38, 38)',
            backgroundColor: 'rgba(220, 38, 38, 0.1)',
            tension: 0.4,
            fill: true,
            borderWidth: 3,
            pointRadius: 5,
            pointHoverRadius: 7,
            pointBackgroundColor: 'rgb(220, 38, 38)',
            pointBorderColor: '#fff',
            pointBorderWidth: 2
          },
          {
            label: 'Ingresos',
            data: data.income,
            borderColor: 'rgb(16, 185, 129)',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.4,
            fill: true,
            borderWidth: 3,
            pointRadius: 5,
            pointHoverRadius: 7,
            pointBackgroundColor: 'rgb(16, 185, 129)',
            pointBorderColor: '#fff',
            pointBorderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              font: {
                size: 14,
                weight: 'bold'
              },
              padding: 20,
              usePointStyle: true
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleFont: {
              size: 14,
              weight: 'bold'
            },
            bodyFont: {
              size: 13
            },
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                label += '$' + context.parsed.y.toFixed(2);
                return label;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '$' + value.toFixed(0);
              },
              font: {
                size: 12
              }
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            }
          },
          x: {
            ticks: {
              font: {
                size: 12
              }
            },
            grid: {
              display: false
            }
          }
        }
      }
    });

    updateInsights(data);
  }

  function updateInsights(data) {
    const insightsContainer = widget.querySelector('#trends-insights');

    // Calculate insights
    const totalExpenses = data.expenses.reduce((sum, val) => sum + val, 0);
    const totalIncome = data.income.reduce((sum, val) => sum + val, 0);
    const avgExpenses = totalExpenses / data.expenses.length;
    const avgIncome = totalIncome / data.income.length;
    const balance = totalIncome - totalExpenses;

    // Find highest and lowest months
    const maxExpenseMonth = data.labels[data.expenses.indexOf(Math.max(...data.expenses))];
    const minExpenseMonth = data.labels[data.expenses.indexOf(Math.min(...data.expenses))];

    // Calculate trend
    const recentExpenses = data.expenses.slice(-3).reduce((sum, val) => sum + val, 0) / 3;
    const previousExpenses = data.expenses.slice(-6, -3).reduce((sum, val) => sum + val, 0) / 3;
    const trend = recentExpenses > previousExpenses ? 'subiendo' : 'bajando';
    const trendPercentage = Math.abs(((recentExpenses - previousExpenses) / previousExpenses) * 100).toFixed(1);

    insightsContainer.innerHTML = `
      <div class="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border-2 border-purple-200">
        <div class="text-purple-600 text-sm font-semibold mb-1">Promedio Mensual</div>
        <div class="text-2xl font-bold text-purple-800">$${avgExpenses.toFixed(2)}</div>
        <div class="text-xs text-purple-600 mt-1">en gastos</div>
      </div>

      <div class="bg-gradient-to-br from-${balance >= 0 ? 'green' : 'red'}-50 to-${balance >= 0 ? 'green' : 'red'}-100 rounded-xl p-4 border-2 border-${balance >= 0 ? 'green' : 'red'}-200">
        <div class="text-${balance >= 0 ? 'green' : 'red'}-600 text-sm font-semibold mb-1">Balance Total</div>
        <div class="text-2xl font-bold text-${balance >= 0 ? 'green' : 'red'}-800">${balance >= 0 ? '+' : ''}$${balance.toFixed(2)}</div>
        <div class="text-xs text-${balance >= 0 ? 'green' : 'red'}-600 mt-1">${balance >= 0 ? 'Superávit' : 'Déficit'}</div>
      </div>

      <div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border-2 border-blue-200">
        <div class="text-blue-600 text-sm font-semibold mb-1">Tendencia</div>
        <div class="text-2xl font-bold text-blue-800">${trend === 'subiendo' ? '📈' : '📉'} ${trendPercentage}%</div>
        <div class="text-xs text-blue-600 mt-1">Gastos ${trend}</div>
      </div>

      <div class="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border-2 border-orange-200">
        <div class="text-orange-600 text-sm font-semibold mb-1">Mes con Mayor Gasto</div>
        <div class="text-lg font-bold text-orange-800">${maxExpenseMonth}</div>
        <div class="text-xs text-orange-600 mt-1">$${Math.max(...data.expenses).toFixed(2)}</div>
      </div>

      <div class="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-4 border-2 border-teal-200">
        <div class="text-teal-600 text-sm font-semibold mb-1">Mes con Menor Gasto</div>
        <div class="text-lg font-bold text-teal-800">${minExpenseMonth}</div>
        <div class="text-xs text-teal-600 mt-1">$${Math.min(...data.expenses).toFixed(2)}</div>
      </div>

      <div class="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-4 border-2 border-pink-200">
        <div class="text-pink-600 text-sm font-semibold mb-1">Proyección Próximo Mes</div>
        <div class="text-2xl font-bold text-pink-800">$${recentExpenses.toFixed(2)}</div>
        <div class="text-xs text-pink-600 mt-1">basado en últimos 3 meses</div>
      </div>
    `;
  }

  // Initial chart render
  setTimeout(() => updateChart(), 100);

  return widget;
}

function prepareChartData(transactions, period) {
  const now = new Date();
  const monthsToShow = period === 'all' ? 24 : parseInt(period);

  // Create month labels
  const labels = [];
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  for (let i = monthsToShow - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(`${months[date.getMonth()]} ${date.getFullYear()}`);
  }

  // Initialize data arrays
  const expenses = new Array(monthsToShow).fill(0);
  const income = new Array(monthsToShow).fill(0);

  // Aggregate transactions by month
  transactions.forEach(t => {
    const transactionDate = t.date?.toDate ? t.date.toDate() : new Date(t.date);
    const monthsDiff = (now.getFullYear() - transactionDate.getFullYear()) * 12 + (now.getMonth() - transactionDate.getMonth());

    if (monthsDiff >= 0 && monthsDiff < monthsToShow) {
      const index = monthsToShow - 1 - monthsDiff;
      if (t.type === 'expense') {
        expenses[index] += t.amount;
      } else {
        income[index] += t.amount;
      }
    }
  });

  return { labels, expenses, income };
}

// Create comparison widget
export function createComparisonWidget(transactions) {
  const widget = document.createElement('div');
  widget.className = 'bg-white rounded-2xl shadow-lg p-6 mb-6';
  widget.innerHTML = `
    <div class="mb-4">
      <h3 class="text-2xl font-bold text-gray-800 flex items-center gap-2">
        <span>📊</span>
        Comparativa Mensual
      </h3>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6" id="comparison-content"></div>
  `;

  const content = widget.querySelector('#comparison-content');

  // Get current and previous month data
  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const currentMonthData = getMonthData(transactions, currentMonth);
  const previousMonthData = getMonthData(transactions, previousMonth);

  // Calculate changes
  const expenseChange = currentMonthData.expenses - previousMonthData.expenses;
  const expenseChangePercent = previousMonthData.expenses > 0
    ? ((expenseChange / previousMonthData.expenses) * 100).toFixed(1)
    : 0;

  const incomeChange = currentMonthData.income - previousMonthData.income;
  const incomeChangePercent = previousMonthData.income > 0
    ? ((incomeChange / previousMonthData.income) * 100).toFixed(1)
    : 0;

  content.innerHTML = `
    <div class="space-y-4">
      <div class="text-center pb-4 border-b-2 border-gray-200">
        <h4 class="font-bold text-lg text-gray-700">Mes Actual</h4>
        <p class="text-sm text-gray-500">${currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</p>
      </div>
      <div class="bg-red-50 rounded-xl p-4 border-2 border-red-200">
        <div class="text-red-600 text-sm font-semibold mb-2">💸 Gastos</div>
        <div class="text-3xl font-bold text-red-700">$${currentMonthData.expenses.toFixed(2)}</div>
        <div class="text-sm mt-2 ${expenseChange > 0 ? 'text-red-600' : 'text-green-600'}">
          ${expenseChange > 0 ? '↑' : '↓'} ${Math.abs(expenseChangePercent)}% vs mes anterior
        </div>
      </div>
      <div class="bg-green-50 rounded-xl p-4 border-2 border-green-200">
        <div class="text-green-600 text-sm font-semibold mb-2">💵 Ingresos</div>
        <div class="text-3xl font-bold text-green-700">$${currentMonthData.income.toFixed(2)}</div>
        <div class="text-sm mt-2 ${incomeChange > 0 ? 'text-green-600' : 'text-red-600'}">
          ${incomeChange > 0 ? '↑' : '↓'} ${Math.abs(incomeChangePercent)}% vs mes anterior
        </div>
      </div>
    </div>

    <div class="space-y-4">
      <div class="text-center pb-4 border-b-2 border-gray-200">
        <h4 class="font-bold text-lg text-gray-700">Mes Anterior</h4>
        <p class="text-sm text-gray-500">${previousMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</p>
      </div>
      <div class="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
        <div class="text-gray-600 text-sm font-semibold mb-2">💸 Gastos</div>
        <div class="text-3xl font-bold text-gray-700">$${previousMonthData.expenses.toFixed(2)}</div>
      </div>
      <div class="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
        <div class="text-gray-600 text-sm font-semibold mb-2">💵 Ingresos</div>
        <div class="text-3xl font-bold text-gray-700">$${previousMonthData.income.toFixed(2)}</div>
      </div>
    </div>
  `;

  return widget;
}

function getMonthData(transactions, monthDate) {
  const expenses = transactions
    .filter(t => {
      const tDate = t.date?.toDate ? t.date.toDate() : new Date(t.date);
      return t.type === 'expense' &&
             tDate.getMonth() === monthDate.getMonth() &&
             tDate.getFullYear() === monthDate.getFullYear();
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const income = transactions
    .filter(t => {
      const tDate = t.date?.toDate ? t.date.toDate() : new Date(t.date);
      return t.type === 'income' &&
             tDate.getMonth() === monthDate.getMonth() &&
             tDate.getFullYear() === monthDate.getFullYear();
    })
    .reduce((sum, t) => sum + t.amount, 0);

  return { expenses, income };
}
