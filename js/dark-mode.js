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
  toggleContainer.className = 'flex items-center'; // Use flex to align with other items
  toggleContainer.innerHTML = `
    <button id="dark-mode-toggle" class="p-2 rounded-lg hover:bg-white/20 transition flex items-center gap-2" title="Cambiar tema">
      <span id="dark-mode-icon" class="text-2xl">${isDarkMode ? '☀️' : '🌙'}</span>
    </button>
  `;

  // Insert before the end of navbar
  const navContent = navbar.querySelector('.flex.justify-between.items-center');
  const toggleBtn = toggleContainer.querySelector('#dark-mode-toggle');

  if (navContent) {
    // Add event listener before appending to the DOM
    toggleBtn.addEventListener('click', toggleDarkMode);
    navContent.insertBefore(toggleContainer, navContent.children[1]); // Insert before user info
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

  // Dispatch a custom event to notify other modules (like charts)
  window.dispatchEvent(new CustomEvent('themeChanged'));
}

function enableDarkMode() {
  document.documentElement.classList.add('dark');
  applyDarkStyles();
}

function disableDarkMode() {
  document.documentElement.classList.remove('dark');
  removeDarkStyles();
}

function removeDarkStyles() {
  const style = document.getElementById('dark-mode-styles');
  if (style) {
    style.remove();
  }
}

function applyDarkStyles() {
  // Add dark mode styles dynamically by linking the CSS file
  if (document.getElementById('dark-mode-styles')) return;

  const link = document.createElement('link');
  link.id = 'dark-mode-styles';
  link.rel = 'stylesheet';
  link.href = './css/dark-theme.css'; // Path to your new CSS file

  document.head.appendChild(link);
}

export function isDarkModeEnabled() {
  return isDarkMode;
}
