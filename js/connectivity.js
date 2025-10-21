// Connectivity Status Module

/**
 * Initializes the connectivity status indicator.
 */
export function initializeConnectivityStatus() {
  const statusIndicator = document.getElementById('connection-status');
  if (!statusIndicator) return;

  const updateStatus = () => {
    if (navigator.onLine) {
      // User is online
      statusIndicator.classList.remove('hidden', 'bg-yellow-500');
      statusIndicator.classList.add('bg-green-500');
      statusIndicator.innerHTML = `
        <span class="w-2 h-2 bg-white rounded-full animate-pulse"></span>
        <span>Online</span>
      `;
      // Hide after a few seconds
      setTimeout(() => {
        statusIndicator.classList.add('hidden');
      }, 3000);
    } else {
      // User is offline
      statusIndicator.classList.remove('hidden', 'bg-green-500');
      statusIndicator.classList.add('bg-yellow-500');
      statusIndicator.innerHTML = `
        <span class="w-2 h-2 bg-white rounded-full"></span>
        <span>Offline</span>
      `;
    }
  };

  // Initial check
  if (navigator.onLine) {
    statusIndicator.classList.add('hidden');
  } else {
    updateStatus();
  }

  // Listen for online/offline events
  window.addEventListener('online', async () => {
    updateStatus();
    // Optional: Show a notification
    const { showNotification } = await import('./ui.js');
    showNotification('¡Estás de vuelta en línea! Sincronizando datos...', 'success');
  });

  window.addEventListener('offline', async () => {
    updateStatus();
    // Optional: Show a notification
    const { showNotification } = await import('./ui.js');
    showNotification('Estás desconectado. La app funciona en modo offline.', 'info');
  });
}