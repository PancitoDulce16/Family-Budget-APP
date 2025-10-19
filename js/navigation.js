// Navigation Module
export function setupNavigation() {
  const menuToggle = document.getElementById('menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  const navBtns = document.querySelectorAll('.nav-btn');
  const navBtnsMobile = document.querySelectorAll('.nav-btn-mobile');
  const views = document.querySelectorAll('.view-content');

  // Toggle mobile menu
  menuToggle?.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
  });

  // Navigation function
  function navigateTo(viewName) {
    // Hide all views
    views.forEach(view => view.classList.add('hidden'));

    // Show selected view
    const selectedView = document.getElementById(`${viewName}-view`);
    if (selectedView) {
      selectedView.classList.remove('hidden');
    }

    // Update active state on buttons
    navBtns.forEach(btn => {
      if (btn.dataset.view === viewName) {
        btn.classList.add('bg-indigo-700');
      } else {
        btn.classList.remove('bg-indigo-700');
      }
    });

    navBtnsMobile.forEach(btn => {
      if (btn.dataset.view === viewName) {
        btn.classList.add('bg-indigo-600');
      } else {
        btn.classList.remove('bg-indigo-600');
      }
    });

    // Close mobile menu
    mobileMenu?.classList.add('hidden');

    // Trigger view-specific initialization
    if (window.onViewChange) {
      window.onViewChange(viewName);
    }
  }

  // Add click listeners to nav buttons
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      navigateTo(btn.dataset.view);
    });
  });

  navBtnsMobile.forEach(btn => {
    btn.addEventListener('click', () => {
      navigateTo(btn.dataset.view);
    });
  });

  // Set default view
  navigateTo('dashboard');

  return { navigateTo };
}
