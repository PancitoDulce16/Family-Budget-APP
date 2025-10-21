// Backup and Restore Module
import { db } from './firebase-config.js';
import { showLoading, showNotification, showConfirmation } from './ui.js';
import {
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  doc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

/**
 * Exports all group data to a JSON file.
 * @param {string} familyGroupId The ID of the family group.
 * @param {string} familyGroupName The name of the family group.
 */
export async function exportBackup(familyGroupId, familyGroupName) {
  if (!await showConfirmation('Crear Backup', 'Se exportarán todas las transacciones, categorías, presupuestos y metas. ¿Continuar?', 'Sí, Exportar')) {
    return;
  }

  showLoading(true, 'Generando backup...');

  try {
    const collectionsToExport = ['transactions', 'categories', 'recurringTransactions', 'goals', 'budgets'];
    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      groupName: familyGroupName,
    };

    for (const coll of collectionsToExport) {
      let q;
      if (coll === 'budgets') {
        // Budgets is a single doc
        const docSnap = await getDoc(doc(db, 'budgets', familyGroupId));
        if (docSnap.exists()) {
          backupData[coll] = docSnap.data();
        }
      } else {
        q = query(collection(db, coll), where('familyGroupId', '==', familyGroupId));
        const snapshot = await getDocs(q);
        backupData[coll] = snapshot.docs.map(d => d.data());
      }
    }

    // Create a downloadable file
    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_${familyGroupName.replace(/ /g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showNotification('Backup generado exitosamente.', 'success');

  } catch (error) {
    console.error('Error creating backup:', error);
    showNotification('Error al generar el backup.', 'error');
  } finally {
    showLoading(false);
  }
}

/**
 * Imports data from a JSON backup file, overwriting existing data.
 * @param {string} familyGroupId The ID of the family group.
 * @param {File} file The JSON file to import.
 */
export async function importBackup(familyGroupId, file) {
  const confirmed = await showConfirmation(
    '⚠️ ¡Atención! ¿Restaurar Backup?',
    'Esta acción borrará TODOS los datos actuales del grupo (transacciones, categorías, etc.) y los reemplazará con los del archivo. Esta acción no se puede deshacer.',
    'Sí, entiendo y quiero restaurar'
  );

  if (!confirmed) return;

  showLoading(true, 'Restaurando backup...');

  try {
    const fileContent = await file.text();
    const backupData = JSON.parse(fileContent);

    // Basic validation
    if (!backupData.version || !backupData.transactions || !backupData.categories) {
      throw new Error('Archivo de backup inválido o corrupto.');
    }

    const batch = writeBatch(db);

    // 1. Delete existing data
    const collectionsToDelete = ['transactions', 'categories', 'recurringTransactions', 'goals'];
    for (const coll of collectionsToDelete) {
      const q = query(collection(db, coll), where('familyGroupId', '==', familyGroupId));
      const snapshot = await getDocs(q);
      snapshot.docs.forEach(d => batch.delete(d.ref));
    }
    // Delete budgets doc
    batch.delete(doc(db, 'budgets', familyGroupId));

    // 2. Import new data
    // We need to handle category ID mapping
    const categoryIdMap = {};
    for (const category of backupData.categories) {
      const oldId = category.id; // Assuming categories in backup have an ID
      const newCategoryRef = doc(collection(db, 'categories'));
      categoryIdMap[oldId] = newCategoryRef.id;
      batch.set(newCategoryRef, { ...category, familyGroupId });
    }

    backupData.transactions.forEach(tx => {
      const newTxRef = doc(collection(db, 'transactions'));
      // Remap category ID
      const newTx = { ...tx, familyGroupId };
      if (tx.category && categoryIdMap[tx.category]) {
        newTx.category = categoryIdMap[tx.category];
      }
      batch.set(newTxRef, newTx);
    });

    // ... (Add similar logic for recurringTransactions, goals, budgets)

    await batch.commit();
    showNotification('¡Restauración completada! La página se recargará.', 'success');

    setTimeout(() => window.location.reload(), 2000);

  } catch (error) {
    console.error('Error importing backup:', error);
    showNotification(error.message || 'Error al restaurar el backup.', 'error');
  } finally {
    showLoading(false);
  }
}