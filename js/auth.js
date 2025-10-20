// Authentication Module
import { auth, db } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { showLoading, showNotification } from './ui.js';

// UI Elements
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const showRegisterBtn = document.getElementById('show-register');
const showLoginBtn = document.getElementById('show-login');
const emailLoginForm = document.getElementById('email-login-form');
const emailRegisterForm = document.getElementById('email-register-form');
const googleLoginBtn = document.getElementById('google-login-btn');
const logoutBtn = document.getElementById('logout-btn');

// Toggle between login and register
showRegisterBtn?.addEventListener('click', () => {
  loginForm.classList.add('hidden');
  registerForm.classList.remove('hidden');
});

showLoginBtn?.addEventListener('click', () => {
  registerForm.classList.add('hidden');
  loginForm.classList.remove('hidden');
});

// Email Registration
emailRegisterForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('register-name').value;
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;

  try {
    showLoading(true);
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update profile with display name
    await updateProfile(user, {
      displayName: name
    });

    // Create user document in Firestore
    await createUserDocument(user);

    showNotification('Cuenta creada exitosamente', 'success');
  } catch (error) {
    console.error('Error al registrar:', error);
    showNotification(getErrorMessage(error.code), 'error');
  } finally {
    showLoading(false);
  }
});

// Email Login
emailLoginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    showLoading(true);
    await signInWithEmailAndPassword(auth, email, password);
    showNotification('Sesión iniciada', 'success');
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    showNotification(getErrorMessage(error.code), 'error');
  } finally {
    showLoading(false);
  }
});

// Google Login
googleLoginBtn?.addEventListener('click', async () => {
  const provider = new GoogleAuthProvider();

  try {
    showLoading(true);
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Check if user document exists, create if not
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      await createUserDocument(user);
    }

    showNotification('Sesión iniciada con Google', 'success');
  } catch (error) {
    console.error('Error al iniciar sesión con Google:', error);
    showNotification(getErrorMessage(error.code), 'error');
  } finally {
    showLoading(false);
  }
});

// Logout
logoutBtn?.addEventListener('click', async () => {
  try {
    await signOut(auth);
    showNotification('Sesión cerrada', 'success');
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    showNotification('Error al cerrar sesión', 'error');
  }
});

// Create user document in Firestore
async function createUserDocument(user) {
  const userRef = doc(db, 'users', user.uid);

  await setDoc(userRef, {
    email: user.email,
    displayName: user.displayName || user.email.split('@')[0],
    photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email)}&background=4F46E5&color=fff`,
    familyGroupId: null,
    createdAt: serverTimestamp()
  });
}

// Auth State Observer
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // User is signed in
    authContainer.classList.add('hidden');
    appContainer.classList.remove('hidden');

    // Update user info in navbar
    document.getElementById('user-name').textContent = user.displayName || user.email;
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      document.getElementById('user-photo').src = userData.photoURL;
    }

    // Check if user has a family group
    checkFamilyGroup(user);

    // Trigger app initialization
    if (window.initializeApp) {
      window.initializeApp(user);
    }
  } else {
    // User is signed out
    authContainer.classList.remove('hidden');
    appContainer.classList.add('hidden');
  }
});

// Check if user belongs to a family group
async function checkFamilyGroup(user) {
  const userDoc = await getDoc(doc(db, 'users', user.uid));

  if (userDoc.exists()) {
    const userData = userDoc.data();

    if (!userData.familyGroupId) {
      // User doesn't have a family group - show setup
      showFamilyGroupSetup(user);
    }
  }
}

// Show family group setup
async function showFamilyGroupSetup(user) {
  // Import and call the family group setup
  const { showFamilyGroupSetup: showSetup } = await import('./family-group.js');
  showSetup();
}

function getErrorMessage(errorCode) {
  const errors = {
    'auth/email-already-in-use': 'Este email ya está registrado',
    'auth/invalid-email': 'Email inválido',
    'auth/operation-not-allowed': 'Operación no permitida',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
    'auth/user-disabled': 'Esta cuenta ha sido deshabilitada',
    'auth/user-not-found': 'Usuario no encontrado',
    'auth/wrong-password': 'Contraseña incorrecta',
    'auth/popup-closed-by-user': 'Ventana cerrada por el usuario',
    'auth/cancelled-popup-request': 'Solicitud cancelada'
  };

  return errors[errorCode] || 'Ocurrió un error. Intenta de nuevo.';
}

// Export auth state checker
export function getCurrentUser() {
  return auth.currentUser;
}
