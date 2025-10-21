// Activity Log Module
import { db } from './firebase-config.js';
import { collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

/**
 * Logs an activity in the family group.
 * @param {string} familyGroupId The ID of the family group.
 * @param {string} userId The ID of the user who performed the action.
 * @param {string} userName The name of the user.
 * @param {string} action A description of the action (e.g., "se unió al grupo").
 * @param {object} [details={}] Optional additional details about the action.
 */
export async function logActivity(familyGroupId, userId, userName, action, details = {}) {
  try {
    await addDoc(collection(db, 'activityLog'), {
      familyGroupId,
      userId,
      userName,
      action,
      details,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error("Error logging activity:", error);
    // This is a background task, so we don't show a notification to the user.
  }
}