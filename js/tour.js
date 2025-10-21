// Guided Tour Module using Shepherd.js

const TOUR_STORAGE_KEY = 'family-budget-tour-completed';

/**
 * Initializes and starts the guided tour if it hasn't been completed before.
 */
export function startTourIfNeeded() {
  const hasCompletedTour = localStorage.getItem(TOUR_STORAGE_KEY);

  if (hasCompletedTour) {
    return; // Don't show the tour again
  }

  const tour = new Shepherd.Tour({
    useModalOverlay: true,
    defaultStepOptions: {
      classes: 'shadow-xl bg-white rounded-lg p-4',
      scrollTo: { behavior: 'smooth', block: 'center' },
      buttons: [
        {
          action() {
            return this.back();
          },
          classes: 'shepherd-button-secondary',
          text: 'Atrás',
        },
        {
          action() {
            return this.next();
          },
          text: 'Siguiente',
        },
      ],
    },
  });

  // Define tour steps
  tour.addStep({
    title: '¡Bienvenido/a a Family Budget!',
    text: 'Este rápido tour te mostrará las funciones principales. ¡Vamos a empezar!',
    buttons: [{ action() { return this.next(); }, text: '¡Empecemos! 🎉' }],
  });

  tour.addStep({
    title: 'Añadir Transacciones',
    text: 'Usa estos botones para registrar rápidamente un nuevo gasto o ingreso.',
    attachTo: { element: '#add-expense-btn', on: 'bottom' },
  });

  tour.addStep({
    title: 'Resumen Mensual',
    text: 'Aquí verás un resumen de tus gastos, ingresos y el balance total del mes actual.',
    attachTo: { element: '#total-expenses', on: 'bottom' },
  });

  tour.addStep({
    title: 'Navegación Principal',
    text: 'Usa este menú para moverte entre las diferentes secciones de la aplicación.',
    attachTo: { element: '.nav-btn[data-view="dashboard"]', on: 'bottom' },
  });

  tour.addStep({
    title: 'Análisis y Reportes',
    text: 'En la pestaña de "Análisis" encontrarás gráficos de tendencias, comparativas y podrás exportar tus datos.',
    attachTo: { element: '.dashboard-tab-btn[data-tab="analytics"]', on: 'bottom' },
    beforeShowPromise: () => {
      return new Promise(resolve => {
        document.querySelector('.dashboard-tab-btn[data-tab="analytics"]').click();
        setTimeout(resolve, 300);
      });
    }
  });

  tour.addStep({
    title: 'Configuración del Grupo',
    text: 'Aquí puedes gestionar categorías, gastos recurrentes y los miembros de tu grupo.',
    attachTo: { element: '.dashboard-tab-btn[data-tab="export"]', on: 'bottom' },
    beforeShowPromise: () => {
      return new Promise(resolve => {
        document.querySelector('.dashboard-tab-btn[data-tab="export"]').click();
        setTimeout(resolve, 300);
      });
    }
  });

  tour.addStep({
    title: '¡Todo Listo!',
    text: 'Has completado el tour. ¡Ya estás listo/a para tomar el control de tus finanzas familiares!',
    buttons: [{ action() { return this.complete(); }, text: 'Finalizar' }],
    beforeShowPromise: () => {
        return new Promise(resolve => {
          document.querySelector('.dashboard-tab-btn[data-tab="summary"]').click();
          setTimeout(resolve, 300);
        });
      }
  });

  // When the tour is completed or canceled, mark it as done.
  tour.on('complete', () => {
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
  });
  tour.on('cancel', () => {
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
  });

  // Start the tour
  tour.start();
}