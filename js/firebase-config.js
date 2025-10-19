// Firebase Configuration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyDUHSpy00PRGvlnwxzEyafKVoq5QaLElBI",
  authDomain: "family-budget-362ee.firebaseapp.com",
  projectId: "family-budget-362ee",
  storageBucket: "family-budget-362ee.firebasestorage.app",
  messagingSenderId: "87616381921",
  appId: "1:87616381921:web:034e60be9b9230a76c28a0",
  measurementId: "G-V9R29P3XKE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
