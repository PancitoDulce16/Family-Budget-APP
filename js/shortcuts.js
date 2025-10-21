// Keyboard Shortcuts Module

/**
 * Initializes keyboard shortcuts for the application.
 */
export function initializeShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Don't trigger shortcuts if user is typing in an input, select, or textarea
    const activeElement = document.activeElement;
    const isTyping = ['INPUT', 'SELECT', 'TEXTAREA'].includes(activeElement.tagName);

    // --- Global Shortcuts (work even when typing) ---

    // Escape to close modals
    if (e.key === 'Escape') {
      closeAllModals();
      return;
    }

    // --- Shortcuts that should NOT fire while typing ---
    if (isTyping) {
      return;
    }

    switch (e.key.toLowerCase()) {
      case 'n':
        // Open new transaction modal (for expense)
        document.getElementById('add-expense-btn')?.click();
        break;
      
      case 'i':
        // Open new transaction modal (for income)
        document.getElementById('add-income-btn')?.click();
        break;

      case '/':
        // Focus search bar
        e.preventDefault(); // Prevent typing '/' in the search bar
        document.getElementById('search-input')?.focus();
        break;
    }
  });
}

/**
 * Finds and closes any open modal.
 */
function closeAllModals() {
  // Add all your modal IDs here
  const modalIds = ['transaction-modal', 'task-modal', 'recurring-transactions-modal', 'manage-members-modal', 'category-manager-modal'];
  modalIds.forEach(id => {
    const modal = document.getElementById(id);
    if (modal && !modal.classList.contains('hidden')) {
      modal.querySelector('.close-modal, .close-task-modal, .close-recurring-modal, .close-members-modal')?.click();
    }
  });
}