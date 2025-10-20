// Dark Mode Module
const DARK_MODE_KEY = 'family-budget-dark-mode';

let isDarkMode = false;

export function initializeDarkMode() {
  // Load saved preference
  const savedMode = localStorage.getItem(DARK_MODE_KEY);
  isDarkMode = savedMode === 'true';

  // Apply mode
  if (isDarkMode) {
    enableDarkMode();
  }

  // Create toggle button
  createDarkModeToggle();
}

function createDarkModeToggle() {
  const navbar = document.querySelector('nav');
  if (!navbar) return;

  const toggleContainer = document.createElement('div');
  toggleContainer.className = 'ml-auto';
  toggleContainer.innerHTML = `
    <button id="dark-mode-toggle" class="p-2 rounded-lg hover:bg-white/20 transition flex items-center gap-2" title="Cambiar tema">
      <span id="dark-mode-icon" class="text-2xl">${isDarkMode ? '☀️' : '🌙'}</span>
    </button>
  `;

  // Insert before the end of navbar
  const navContent = navbar.querySelector('.container');
  const toggleBtn = toggleContainer.querySelector('#dark-mode-toggle');

  if (navContent) {
    // Add event listener before appending to the DOM
    toggleBtn.addEventListener('click', toggleDarkMode);
    navContent.appendChild(toggleContainer);
  } else {
    console.error('Could not find .container in navbar to add dark mode toggle.');
  }
}

export function toggleDarkMode() {
  isDarkMode = !isDarkMode;

  if (isDarkMode) {
    enableDarkMode();
  } else {
    disableDarkMode();
  }

  // Save preference
  localStorage.setItem(DARK_MODE_KEY, isDarkMode.toString());

  // Update icon
  const icon = document.getElementById('dark-mode-icon');
  if (icon) {
    icon.textContent = isDarkMode ? '☀️' : '🌙';
  }
}

function enableDarkMode() {
  document.documentElement.classList.add('dark');
  applyDarkStyles();
}

function disableDarkMode() {
  document.documentElement.classList.remove('dark');
  removeDarkStyles();
}

function applyDarkStyles() {
  // Add dark mode styles dynamically
  if (document.getElementById('dark-mode-styles')) return;

  const style = document.createElement('style');
  style.id = 'dark-mode-styles';
  style.textContent = `
    .dark {
      background-color: #1a1a1a;
      color: #e5e5e5;
    }

    .dark body {
      background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
    }

    /* Navbar */
    .dark nav {
      background: linear-gradient(135deg, #047857 0%, #065f46 100%);
    }

    /* Cards and containers */
    .dark .bg-white {
      background-color: #2d2d2d !important;
      border: 1px solid #404040;
    }

    .dark .text-gray-800 {
      color: #e5e5e5 !important;
    }

    .dark .text-gray-700 {
      color: #d4d4d4 !important;
    }

    .dark .text-gray-600 {
      color: #a3a3a3 !important;
    }

    .dark .text-gray-500 {
      color: #737373 !important;
    }

    .dark .text-gray-400 {
      color: #525252 !important;
    }

    /* Borders */
    .dark .border-gray-200 {
      border-color: #404040 !important;
    }

    .dark .border-gray-300 {
      border-color: #525252 !important;
    }

    /* Inputs */
    .dark input,
    .dark select,
    .dark textarea {
      background-color: #1a1a1a !important;
      border-color: #525252 !important;
      color: #e5e5e5 !important;
    }

    .dark input::placeholder {
      color: #737373 !important;
    }

    .dark input:focus,
    .dark select:focus,
    .dark textarea:focus {
      border-color: #10B981 !important;
      background-color: #262626 !important;
    }

    /* Hover effects */
    .dark .hover\\:bg-gray-50:hover {
      background-color: #262626 !important;
    }

    .dark .hover\\:bg-gray-100:hover {
      background-color: #333333 !important;
    }

    /* Stats cards gradients */
    .dark .bg-gradient-to-br.from-red-50 {
      background: linear-gradient(to bottom right, #450a0a, #7f1d1d) !important;
    }

    .dark .bg-gradient-to-br.from-green-50 {
      background: linear-gradient(to bottom right, #052e16, #14532d) !important;
    }

    .dark .bg-gradient-to-br.from-blue-50 {
      background: linear-gradient(to bottom right, #172554, #1e3a8a) !important;
    }

    .dark .bg-gradient-to-br.from-purple-50 {
      background: linear-gradient(to bottom right, #3b0764, #581c87) !important;
    }

    .dark .bg-gradient-to-br.from-orange-50 {
      background: linear-gradient(to bottom right, #431407, #7c2d12) !important;
    }

    .dark .bg-gradient-to-br.from-teal-50 {
      background: linear-gradient(to bottom right, #042f2e, #134e4a) !important;
    }

    .dark .bg-gradient-to-br.from-pink-50 {
      background: linear-gradient(to bottom right, #500724, #831843) !important;
    }

    .dark .bg-gradient-to-br.from-indigo-50 {
      background: linear-gradient(to bottom right, #1e1b4b, #312e81) !important;
    }

    /* Budget bars backgrounds */
    .dark .bg-red-50 {
      background-color: #450a0a !important;
    }

    .dark .bg-green-50 {
      background-color: #052e16 !important;
    }

    .dark .bg-blue-50 {
      background-color: #172554 !important;
    }

    .dark .bg-purple-50 {
      background-color: #3b0764 !important;
    }

    .dark .bg-orange-50 {
      background-color: #431407 !important;
    }

    .dark .bg-teal-50 {
      background-color: #042f2e !important;
    }

    .dark .bg-pink-50 {
      background-color: #500724 !important;
    }

    .dark .bg-gray-50 {
      background-color: #1a1a1a !important;
    }

    .dark .bg-gray-100 {
      background-color: #262626 !important;
    }

    .dark .bg-gray-200 {
      background-color: #333333 !important;
    }

    /* Border colors for dark cards */
    .dark .border-red-200 {
      border-color: #7f1d1d !important;
    }

    .dark .border-green-200 {
      border-color: #14532d !important;
    }

    .dark .border-blue-200 {
      border-color: #1e3a8a !important;
    }

    .dark .border-purple-200 {
      border-color: #581c87 !important;
    }

    .dark .border-orange-200 {
      border-color: #7c2d12 !important;
    }

    .dark .border-teal-200 {
      border-color: #134e4a !important;
    }

    .dark .border-pink-200 {
      border-color: #831843 !important;
    }

    /* Text colors remain vibrant */
    .dark .text-red-600,
    .dark .text-red-700,
    .dark .text-red-800 {
      color: #f87171 !important;
    }

    .dark .text-green-600,
    .dark .text-green-700,
    .dark .text-green-800 {
      color: #4ade80 !important;
    }

    .dark .text-blue-600,
    .dark .text-blue-700,
    .dark .text-blue-800 {
      color: #60a5fa !important;
    }

    .dark .text-purple-600,
    .dark .text-purple-700,
    .dark .text-purple-800 {
      color: #c084fc !important;
    }

    .dark .text-orange-600,
    .dark .text-orange-700,
    .dark .text-orange-800 {
      color: #fb923c !important;
    }

    .dark .text-teal-600,
    .dark .text-teal-700,
    .dark .text-teal-800 {
      color: #5eead4 !important;
    }

    .dark .text-pink-600,
    .dark .text-pink-700,
    .dark .text-pink-800 {
      color: #f472b6 !important;
    }

    /* Modals */
    .dark .bg-black {
      background-color: rgba(0, 0, 0, 0.9) !important;
    }

    /* Charts - keep backgrounds light for readability */
    .dark canvas {
      background-color: #ffffff;
      border-radius: 0.5rem;
      padding: 1rem;
    }

    /* Buttons */
    .dark button:not(.gradient-bg):not([class*="bg-red"]):not([class*="bg-green"]):not([class*="bg-blue"]) {
      background-color: #404040;
    }

    .dark button:not(.gradient-bg):hover:not([class*="bg-red"]):not([class*="bg-green"]):not([class*="bg-blue"]) {
      background-color: #525252;
    }

    /* Keep gradient buttons bright */
    .dark .gradient-bg {
      background: linear-gradient(135deg, #10B981 0%, #059669 100%);
    }

    /* Tables and lists */
    .dark .border-b {
      border-color: #404040 !important;
    }

    /* Shadows - make them subtle in dark mode */
    .dark .shadow-lg {
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2);
    }

    .dark .shadow-xl {
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
    }

    .dark .shadow-2xl {
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }

    /* Export buttons gradient */
    .dark .bg-gradient-to-r.from-green-500 {
      background: linear-gradient(to right, #10B981, #059669) !important;
    }

    .dark .bg-gradient-to-r.from-blue-500 {
      background: linear-gradient(to right, #3B82F6, #2563EB) !important;
    }

    /* Ensure text is readable on gradient buttons */
    .dark .gradient-bg,
    .dark .bg-gradient-to-r {
      color: white !important;
    }

    /* Login/Auth screens */
    .dark #auth-container {
      background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
    }

    /* Progress bars keep their colors */
    .dark .bg-red-500,
    .dark .bg-green-500,
    .dark .bg-blue-500,
    .dark .bg-purple-500,
    .dark .bg-orange-500 {
      /* Keep original colors */
    }

    /* Smooth transitions */
    * {
      transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease;
    }
  `;

  document.head.appendChild(style);
}

function removeDarkStyles() {
  const style = document.getElementById('dark-mode-styles');
  if (style) {
    style.remove();
  }
}

export function isDarkModeEnabled() {
  return isDarkMode;
}
