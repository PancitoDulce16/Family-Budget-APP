// PIN Lock Module

const PIN_HASH_KEY = 'family-budget-pin-hash';

/**
 * Checks if a PIN is set and shows the lock screen if necessary.
 * @returns {Promise<void>} A promise that resolves when the user is authenticated.
 */
export function initializePinLock() {
  return new Promise((resolve) => {
    const pinHash = localStorage.getItem(PIN_HASH_KEY);
    if (pinHash) {
      showPinScreen(false, resolve);
    } else {
      resolve(); // No PIN set, proceed immediately.
    }
  });
}

/**
 * Shows the PIN entry screen.
 * @param {boolean} isSettingPin - True if setting a new PIN, false if verifying.
 * @param {Function} onVerified - Callback to run after successful verification.
 */
function showPinScreen(isSettingPin, onVerified) {
  const lockScreen = document.createElement('div');
  lockScreen.id = 'pin-lock-screen';
  lockScreen.className = 'fixed inset-0 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 z-50 flex flex-col items-center justify-center p-4';
  lockScreen.innerHTML = `
    <div class="text-center">
      <div class="text-5xl mb-4">🔐</div>
      <h2 id="pin-title" class="text-2xl font-bold text-gray-800 dark:text-white mb-2">${isSettingPin ? 'Crea tu PIN' : 'Ingresa tu PIN'}</h2>
      <p id="pin-subtitle" class="text-gray-600 dark:text-gray-400 mb-6">Para proteger tu información.</p>
      <div class="flex justify-center gap-3 mb-6">
        <div class="pin-dot w-4 h-4 rounded-full border-2 border-gray-400"></div>
        <div class="pin-dot w-4 h-4 rounded-full border-2 border-gray-400"></div>
        <div class="pin-dot w-4 h-4 rounded-full border-2 border-gray-400"></div>
        <div class="pin-dot w-4 h-4 rounded-full border-2 border-gray-400"></div>
      </div>
      <div class="grid grid-cols-3 gap-4 max-w-xs mx-auto">
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 'Borrar', 0, '✖'].map(key => `
          <button class="pin-key text-2xl font-bold p-4 rounded-full bg-white/50 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/20 transition aspect-square">
            ${key === 'Borrar' ? '⌫' : key}
          </button>
        `).join('')}
      </div>
    </div>
  `;
  document.body.appendChild(lockScreen);

  let pin = '';
  const dots = lockScreen.querySelectorAll('.pin-dot');

  lockScreen.querySelectorAll('.pin-key').forEach(key => {
    key.addEventListener('click', async () => {
      const keyValue = key.textContent.trim();
      if (/\d/.test(keyValue) && pin.length < 4) {
        pin += keyValue;
      } else if (keyValue === '⌫') {
        pin = pin.slice(0, -1);
      } else if (keyValue === '✖') {
        // This is a way to bypass if needed, or could be removed.
        // For now, it just closes. In a real app, might trigger logout.
        lockScreen.remove();
        // Potentially call logout function here.
        return;
      }

      updateDots();

      if (pin.length === 4) {
        if (isSettingPin) {
          // Logic for setting a new PIN (e.g., confirm PIN)
          await hashAndStorePin(pin);
          Swal.fire('¡Éxito!', 'Tu PIN ha sido configurado.', 'success');
          lockScreen.remove();
        } else {
          // Logic for verifying PIN
          const isValid = await verifyPin(pin);
          if (isValid) {
            lockScreen.remove();
            onVerified();
          } else {
            lockScreen.classList.add('animate-shake');
            setTimeout(() => lockScreen.classList.remove('animate-shake'), 500);
            pin = '';
            updateDots();
            document.getElementById('pin-subtitle').textContent = 'PIN incorrecto. Intenta de nuevo.';
            document.getElementById('pin-subtitle').classList.add('text-red-500');
          }
        }
      }
    });
  });

  function updateDots() {
    dots.forEach((dot, index) => {
      dot.classList.toggle('bg-green-500', index < pin.length);
      dot.classList.toggle('border-gray-400', index >= pin.length);
    });
  }
}

/**
 * Opens the UI for setting a new PIN.
 */
export function openPinSetup() {
  showPinScreen(true, () => {});
}

/**
 * Hashes a PIN using SHA-256.
 * @param {string} pin The 4-digit PIN.
 * @returns {Promise<string>} The hex string of the hash.
 */
async function hashPin(pin) {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hashes and stores the PIN in localStorage.
 * @param {string} pin The PIN to store.
 */
async function hashAndStorePin(pin) {
  const hash = await hashPin(pin);
  localStorage.setItem(PIN_HASH_KEY, hash);
}

/**
 * Verifies an entered PIN against the stored hash.
 * @param {string} pin The entered PIN.
 * @returns {Promise<boolean>} True if the PIN is correct.
 */
async function verifyPin(pin) {
  const storedHash = localStorage.getItem(PIN_HASH_KEY);
  if (!storedHash) return false;

  const enteredHash = await hashPin(pin);
  return enteredHash === storedHash;
}

/**
 * Removes the PIN from the device.
 */
export function removePin() {
    localStorage.removeItem(PIN_HASH_KEY);
    Swal.fire('PIN Eliminado', 'Ya no se te pedirá un PIN para acceder.', 'info');
}

/**
 * Checks if a PIN is currently set.
 * @returns {boolean} True if a PIN is set.
 */
export function isPinSet() {
    return localStorage.getItem(PIN_HASH_KEY) !== null;
}