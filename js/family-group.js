// Family Group Management Module
import { db } from './firebase-config.js';
import { getCurrentUser } from './auth.js';
import { showLoading, showNotification } from './ui.js';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  query,
  where,
  getDocs,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Generate random invite code
function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Create a new family group
export async function createFamilyGroup(groupName, currency) {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('Usuario no autenticado');
  }

  try {
    showLoading(true);

    // Create unique group ID
    const groupRef = doc(collection(db, 'familyGroups'));
    const inviteCode = generateInviteCode();

    // Create family group
    await setDoc(groupRef, {
      name: groupName,
      currency: currency,
      createdBy: user.uid,
      roles: {
        [user.uid]: 'admin' // The creator is the first admin
      },
      inviteCode: inviteCode,
      createdAt: serverTimestamp()
    });

    // Update user's familyGroupId
    await updateDoc(doc(db, 'users', user.uid), {
      familyGroupId: groupRef.id
    });

    showNotification('Grupo familiar creado exitosamente', 'success');
    return { groupId: groupRef.id, inviteCode };
  } catch (error) {
    console.error('Error al crear grupo familiar:', error);
    showNotification('Error al crear el grupo familiar', 'error');
    throw error;
  } finally {
    showLoading(false);
  }
}

// Join family group using invite code
export async function joinFamilyGroup(inviteCode) {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('Usuario no autenticado');
  }

  try {
    showLoading(true);

    // Find group by invite code
    const groupsQuery = query(
      collection(db, 'familyGroups'),
      where('inviteCode', '==', inviteCode.toUpperCase())
    );

    const snapshot = await getDocs(groupsQuery);

    if (snapshot.empty) {
      throw new Error('Código de invitación inválido');
    }

    const groupDoc = snapshot.docs[0];
    const groupData = groupDoc.data();

    // Check if user is already a member by checking the roles map
    if (groupData.roles && groupData.roles[user.uid]) {
      throw new Error('Ya eres miembro de este grupo');
    }

    // Add user to group members with the 'member' role
    const updatedMembers = { ...groupData.roles, [user.uid]: 'member' };
    await updateDoc(doc(db, 'familyGroups', groupDoc.id), {
      roles: updatedMembers
    });

    // Update user's familyGroupId
    await updateDoc(doc(db, 'users', user.uid), {
      familyGroupId: groupDoc.id
    });

    showNotification('Te has unido al grupo familiar', 'success');
    return groupDoc.id;
  } catch (error) {
    console.error('Error al unirse al grupo:', error);
    showNotification(error.message || 'Error al unirse al grupo', 'error');
    throw error;
  } finally {
    showLoading(false);
  }
}

// Get family group info
export async function getFamilyGroupInfo(groupId) {
  const groupDoc = await getDoc(doc(db, 'familyGroups', groupId));

  if (groupDoc.exists()) {
    return {
      id: groupDoc.id,
      ...groupDoc.data()
    };
  }

  return null;
}

// Show family group setup modal
export function showFamilyGroupSetup() {
  // Create modal HTML
  const modalHTML = `
    <div id="family-group-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 class="text-2xl font-bold mb-4 text-indigo-600">Configurar Grupo Familiar</h2>
        <p class="text-gray-600 mb-6">Para usar la aplicación, necesitas crear o unirte a un grupo familiar.</p>

        <div id="setup-options" class="space-y-4">
          <button id="create-group-btn" class="w-full bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 transition">
            Crear Nuevo Grupo
          </button>
          <button id="join-group-btn" class="w-full bg-white border border-indigo-600 text-indigo-600 py-3 px-4 rounded-md hover:bg-indigo-50 transition">
            Unirme a un Grupo
          </button>
        </div>

        <div id="create-group-form" class="hidden">
          <form id="create-form" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nombre del Grupo</label>
              <input type="text" id="group-name" required placeholder="Ej: Familia González"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Moneda del Grupo</label>
              <select id="group-currency" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="CRC" selected>Colón Costarricense (₡)</option>
                <option value="USD">Dólar Estadounidense ($)</option>
              </select>
            </div>
            <div class="flex gap-2">
              <button type="submit" class="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition">
                Crear
              </button>
              <button type="button" id="cancel-create" class="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 transition">
                Cancelar
              </button>
            </div>
          </form>
        </div>

        <div id="join-group-form" class="hidden">
          <form id="join-form" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Código de Invitación</label>
              <input type="text" id="invite-code" required placeholder="Ej: ABC123" maxlength="6"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase">
            </div>
            <div class="flex gap-2">
              <button type="submit" class="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition">
                Unirme
              </button>
              <button type="button" id="cancel-join" class="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 transition">
                Cancelar
              </button>
            </div>
          </form>
        </div>

        <div id="group-created-info" class="hidden">
          <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <p class="text-green-800 font-semibold mb-2">¡Grupo creado exitosamente!</p>
            <p class="text-sm text-gray-700 mb-2">Comparte este código con tu familia:</p>
            <div class="bg-white border-2 border-green-500 rounded-lg p-3 text-center">
              <p id="display-invite-code" class="text-2xl font-bold text-indigo-600"></p>
            </div>
          </div>
          <button id="close-group-modal" class="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition">
            Continuar
          </button>
        </div>
      </div>
    </div>
  `;

  // Add modal to body
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // Get elements
  const modal = document.getElementById('family-group-modal');
  const setupOptions = document.getElementById('setup-options');
  const createGroupBtn = document.getElementById('create-group-btn');
  const joinGroupBtn = document.getElementById('join-group-btn');
  const createGroupForm = document.getElementById('create-group-form');
  const joinGroupForm = document.getElementById('join-group-form');
  const createForm = document.getElementById('create-form');
  const joinForm = document.getElementById('join-form');
  const cancelCreate = document.getElementById('cancel-create');
  const cancelJoin = document.getElementById('cancel-join');
  const groupCreatedInfo = document.getElementById('group-created-info');
  const closeGroupModal = document.getElementById('close-group-modal');

  // Event listeners
  createGroupBtn.addEventListener('click', () => {
    setupOptions.classList.add('hidden');
    createGroupForm.classList.remove('hidden');
  });

  joinGroupBtn.addEventListener('click', () => {
    setupOptions.classList.add('hidden');
    joinGroupForm.classList.remove('hidden');
  });

  cancelCreate.addEventListener('click', () => {
    createGroupForm.classList.add('hidden');
    setupOptions.classList.remove('hidden');
  });

  cancelJoin.addEventListener('click', () => {
    joinGroupForm.classList.add('hidden');
    setupOptions.classList.remove('hidden');
  });

  createForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const groupName = document.getElementById('group-name').value;
    const currency = document.getElementById('group-currency').value;

    try {
      const result = await createFamilyGroup(groupName, currency);
      createGroupForm.classList.add('hidden');
      groupCreatedInfo.classList.remove('hidden');
      document.getElementById('display-invite-code').textContent = result.inviteCode;
    } catch (error) {
      console.error('Error:', error);
    }
  });

  joinForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const inviteCode = document.getElementById('invite-code').value;

    try {
      await joinFamilyGroup(inviteCode);
      modal.remove();
      // Re-initialize the app without a hard reload
      if (window.initializeApp) {
        window.initializeApp(getCurrentUser());
      }
    } catch (error) {
      console.error('Error:', error);
    }
  });

  closeGroupModal?.addEventListener('click', () => {
    modal.remove();
    // Re-initialize the app without a hard reload
    if (window.initializeApp) {
      window.initializeApp(getCurrentUser());
    }
  });
}

/**
 * Opens the members management modal.
 * @param {string} familyGroupId The ID of the family group.
 * @param {Array} members The list of family members.
 * @param {string} currentUserId The ID of the current user, to prevent self-role-change.
 */
export async function openMembersManager(familyGroupId, members, currentUserId) {
  const modal = document.getElementById('manage-members-modal');
  if (!modal) return;

  modal.classList.remove('hidden');
  modal.querySelector('#close-members-modal').addEventListener('click', () => modal.classList.add('hidden'));

  const listContainer = modal.querySelector('#members-list');
  listContainer.innerHTML = '<p class="text-gray-500">Cargando miembros...</p>';

  const groupDoc = await getDoc(doc(db, 'familyGroups', familyGroupId));
  if (!groupDoc.exists()) {
    listContainer.innerHTML = '<p class="text-red-500">Error: No se encontró el grupo.</p>';
    return;
  }

  const roles = groupDoc.data().roles || {};
  listContainer.innerHTML = '';

  members.forEach(member => {
    const memberRole = roles[member.id] || 'member';
    const isCurrentUser = member.id === currentUserId;

    const card = document.createElement('div');
    card.className = 'flex items-center justify-between bg-gray-50 p-4 rounded-lg border';
    card.innerHTML = `
      <div class="flex items-center gap-3">
        <img src="${member.photoURL}" alt="${member.displayName}" class="w-10 h-10 rounded-full">
        <div>
          <p class="font-semibold">${member.displayName} ${isCurrentUser ? '<span class="text-xs text-green-600">(Tú)</span>' : ''}</p>
          <p class="text-sm text-gray-500">${member.email}</p>
        </div>
      </div>
      <div>
        <select data-member-id="${member.id}" class="role-select border-gray-300 rounded-md" ${isCurrentUser ? 'disabled' : ''}>
          <option value="admin" ${memberRole === 'admin' ? 'selected' : ''}>Admin</option>
          <option value="member" ${memberRole === 'member' ? 'selected' : ''}>Miembro</option>
          <option value="viewer" ${memberRole === 'viewer' ? 'selected' : ''}>Espectador</option>
        </select>
      </div>
    `;
    listContainer.appendChild(card);
  });

  // Add event listeners to role selectors
  listContainer.querySelectorAll('.role-select').forEach(select => {
    select.addEventListener('change', async (e) => {
      const memberId = e.target.dataset.memberId;
      const newRole = e.target.value;

      try {
        showLoading(true);
        const groupRef = doc(db, 'familyGroups', familyGroupId);
        // Use dot notation for updating a field within a map
        await updateDoc(groupRef, {
          [`roles.${memberId}`]: newRole
        });
        showNotification(`Rol de ${members.find(m => m.id === memberId).displayName} actualizado a ${newRole}.`, 'success');
      } catch (error) {
        console.error("Error updating role:", error);
        showNotification('Error al actualizar el rol.', 'error');
        // Revert UI change on failure
        e.target.value = roles[memberId] || 'member';
      } finally {
        showLoading(false);
      }
    });
  });
}
