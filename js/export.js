// Export Module - Excel and PDF
import { showLoading, showNotification } from './ui.js';
import { formatCurrency } from './utils.js';

let familyGroupCurrency = 'USD';

// Export to Excel using SheetJS
export async function exportToExcel(transactions, familyGroupName, customCategories) {
  try {
    showLoading(true);

    // Load SheetJS library dynamically
    if (!window.XLSX) {
      await loadScript('https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js');
    }

    // Prepare data for Excel
    const data = transactions.map(t => ({
      'Fecha': t.date?.toDate ? t.date.toDate().toLocaleDateString('es-ES') : new Date(t.date).toLocaleDateString('es-ES'),
      'Tipo': t.type === 'expense' ? 'Gasto' : 'Ingreso',
      'Categoría': getCategoryDetails(t.category, customCategories).displayName,
      'Descripción': t.description,
      'Monto': t.amount,
      'Pagado por': t.paidByName || t.paidBy,
      'Compartido': t.isShared ? 'Sí' : 'No',
      'Notas': t.notes || ''
    }));

    // Create workbook
    const wb = window.XLSX.utils.book_new();
    const ws = window.XLSX.utils.json_to_sheet(data);

    // Auto-size columns
    const cols = [
      { wch: 12 }, // Fecha
      { wch: 10 }, // Tipo
      { wch: 12 }, // Categoría
      { wch: 30 }, // Descripción
      { wch: 10 }, // Monto
      { wch: 15 }, // Pagado por
      { wch: 10 }, // Compartido
      { wch: 20 }  // Notas
    ];
    ws['!cols'] = cols;

    // Add worksheet to workbook
    window.XLSX.utils.book_append_sheet(wb, ws, 'Transacciones');

    // Generate filename
    const filename = `${familyGroupName}_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Download
    window.XLSX.writeFile(wb, filename);

    showNotification('Excel exportado exitosamente', 'success');
  } catch (error) {
    console.error('Error al exportar Excel:', error);
    showNotification('Error al exportar Excel', 'error');
  } finally {
    showLoading(false);
  }
}

// Export to PDF using jsPDF
export async function exportToPDF(transactions, familyGroupName, categoryTotals, customCategories) {
  try {
    showLoading(true);

    // Load jsPDF library dynamically
    // Get currency from app.js or a global state
    const appContainer = document.getElementById('app-container');
    if (appContainer) {
        familyGroupCurrency = appContainer.dataset.currency || 'USD';
    }

    if (!window.jspdf) {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Title
    doc.setFontSize(20);
    doc.setTextColor(16, 185, 129); // Green color
    doc.text(`Reporte de Gastos - ${familyGroupName}`, 15, 20);

    // Date
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}`, 15, 28);

    // Summary section
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Resumen por Categoría', 15, 40);

    let yPosition = 48;

    doc.setFontSize(11);
    customCategories.forEach(cat => {
      const total = categoryTotals[cat.id] || 0;
      doc.text(`${cat.emoji} ${cat.name}: ${formatCurrency(total, familyGroupCurrency)}`, 20, yPosition);
      yPosition += 7;
    });

    // Total
    const totalExpenses = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);
    doc.setFontSize(12);
    doc.setTextColor(220, 38, 38); // Red for total
    doc.text(`Total Gastos: ${formatCurrency(totalExpenses, familyGroupCurrency)}`, 20, yPosition + 5);

    // Transactions table
    yPosition += 18;
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Detalle de Transacciones', 15, yPosition);
    yPosition += 10;

    doc.setFontSize(9);

    // Table headers
    doc.setTextColor(255, 255, 255);
    doc.setFillColor(16, 185, 129); // Green background
    doc.rect(15, yPosition - 5, 180, 7, 'F');
    doc.text('Fecha', 18, yPosition);
    doc.text('Tipo', 45, yPosition);
    doc.text('Categoría', 65, yPosition);
    doc.text('Descripción', 95, yPosition);
    doc.text('Monto', 155, yPosition);

    yPosition += 8;
    doc.setTextColor(0);

    // Table rows
    transactions.slice(0, 30).forEach((t, index) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }

      // Alternate row colors
      if (index % 2 === 0) {
        doc.setFillColor(249, 250, 251);
        doc.rect(15, yPosition - 5, 180, 7, 'F');
      }

      const date = t.date?.toDate ? t.date.toDate().toLocaleDateString('es-ES') : new Date(t.date).toLocaleDateString('es-ES');
      const type = t.type === 'expense' ? 'Gasto' : 'Ingreso';
      const category = getCategoryDetails(t.category, customCategories).name;
      const description = t.description.length > 20 ? t.description.substring(0, 20) + '...' : t.description;
      const amount = formatCurrency(t.amount, familyGroupCurrency);

      doc.text(date, 18, yPosition);
      doc.text(type, 45, yPosition);
      doc.text(category, 65, yPosition);
      doc.text(description, 95, yPosition);

      // Color code amounts
      if (t.type === 'expense') {
        doc.setTextColor(220, 38, 38); // Red
      } else {
        doc.setTextColor(16, 185, 129); // Green
      }
      doc.text(amount, 155, yPosition);
      doc.setTextColor(0);

      yPosition += 7;
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Página ${i} de ${pageCount}`, 15, 285);
      doc.text('Generado con Family Budget Manager', 140, 285);
    }

    // Generate filename
    const filename = `Reporte_${familyGroupName}_${new Date().toISOString().split('T')[0]}.pdf`;

    // Download
    doc.save(filename);

    showNotification('PDF exportado exitosamente', 'success');
  } catch (error) {
    console.error('Error al exportar PDF:', error);
    showNotification('Error al exportar PDF', 'error');
  } finally {
    showLoading(false);
  }
}

// Create export buttons widget
export function createExportWidget(transactions, familyGroupName, categoryTotals, customCategories) {
  const widget = document.createElement('div');
  widget.className = 'bg-white rounded-2xl shadow-lg p-6 mb-6';

  widget.innerHTML = `
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-2xl font-bold text-gray-800 flex items-center gap-2">
        <span>📥</span>
        Exportar Datos
      </h3>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <button id="export-excel-btn" class="flex items-center justify-center gap-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-4 rounded-xl hover:opacity-90 transition font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1">
        <span class="text-2xl">📊</span>
        <div class="text-left">
          <div class="font-bold">Exportar a Excel</div>
          <div class="text-xs opacity-90">Archivo .xlsx con todas las transacciones</div>
        </div>
      </button>
      <button id="export-pdf-btn" class="flex items-center justify-center gap-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-4 rounded-xl hover:opacity-90 transition font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1">
        <span class="text-2xl">📄</span>
        <div class="text-left">
          <div class="font-bold">Exportar a PDF</div>
          <div class="text-xs opacity-90">Reporte profesional en PDF</div>
        </div>
      </button>
    </div>
    <p class="text-sm text-gray-500 mt-4 text-center">
      💡 Total de transacciones: ${transactions.length}
    </p>
  `;

  const excelBtn = widget.querySelector('#export-excel-btn');
  const pdfBtn = widget.querySelector('#export-pdf-btn');

  excelBtn.addEventListener('click', () => {
    exportToExcel(transactions, familyGroupName, customCategories);
  });

  pdfBtn.addEventListener('click', () => {
    exportToPDF(transactions, familyGroupName, categoryTotals, customCategories);
  });

  return widget;
}

// Helper function to load external scripts
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
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
