// Navigation Module - Fixed Version
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
    views.forEach(view => {
      view.classList.add('hidden');
      view.classList.remove('animate-fadeIn');
    });

    // Show selected view with animation
    const selectedView = document.getElementById(`${viewName}-view`);
    if (selectedView) {
      selectedView.classList.remove('hidden');
      // Trigger reflow to restart animation
      void selectedView.offsetWidth;
      selectedView.classList.add('animate-fadeIn');
    }

    // Update active state on desktop buttons
    navBtns.forEach(btn => {
      if (btn.dataset.view === viewName) {
        btn.classList.add('bg-white/20', 'font-bold');
      } else {
        btn.classList.remove('bg-white/20', 'font-bold');
      }
    });

    // Update active state on mobile buttons
    navBtnsMobile.forEach(btn => {
      if (btn.dataset.view === viewName) {
        btn.classList.add('bg-white/20', 'font-bold');
      } else {
        btn.classList.remove('bg-white/20', 'font-bold');
      }
    });

    // Close mobile menu after navigation
    if (mobileMenu) {
      mobileMenu.classList.add('hidden');
    }

    // Trigger view-specific initialization
    if (window.onViewChange) {
      window.onViewChange(viewName);
    }
  }

  // Add click listeners to desktop nav buttons
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      navigateTo(btn.dataset.view);
    });
  });

  // Add click listeners to mobile nav buttons
  navBtnsMobile.forEach(btn => {
    btn.addEventListener('click', () => {
      navigateTo(btn.dataset.view);
    });
  });

  // Set default view (dashboard)
  navigateTo('dashboard');

  return { navigateTo };
}
