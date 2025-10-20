// Tasks Module
import { db } from './firebase-config.js';
import { getCurrentUser } from './auth.js';
import { showLoading, showNotification } from './ui.js';
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let userFamilyGroup = null;
let familyMembers = [];
let tasksListener = null;

export function initializeTasks(familyGroupId, members) {
  userFamilyGroup = familyGroupId;
  familyMembers = members;

  setupTaskEventListeners();
  loadTasks();
}

function setupTaskEventListeners() {
  const addTaskBtn = document.getElementById('add-task-btn');
  const taskModal = document.getElementById('task-modal');
  const closeTaskModal = document.getElementById('close-task-modal');
  const taskForm = document.getElementById('task-form');

  // Open task modal
  addTaskBtn?.addEventListener('click', () => {
    taskModal.classList.remove('hidden');
    populateTaskAssignee();
  });

  // Close task modal
  closeTaskModal?.addEventListener('click', () => {
    taskModal.classList.add('hidden');
    taskForm.reset();
  });

  // Submit task form
  taskForm?.addEventListener('submit', handleTaskSubmit);
}

function populateTaskAssignee() {
  const assignedSelect = document.getElementById('task-assigned');
  assignedSelect.innerHTML = '<option value="">Seleccionar...</option>';

  familyMembers.forEach(member => {
    const option = document.createElement('option');
    option.value = member.id;
    option.textContent = member.displayName;
    assignedSelect.appendChild(option);
  });
}

async function handleTaskSubmit(e) {
  e.preventDefault();
  const currentUser = getCurrentUser();

  if (!userFamilyGroup) {
    showNotification('Debes pertenecer a un grupo familiar primero', 'error');
    return;
  }

  try {
    showLoading(true);

    const title = document.getElementById('task-title').value;
    const assignedTo = document.getElementById('task-assigned').value;
    const dueDate = new Date(document.getElementById('task-duedate').value);

    const taskData = {
      familyGroupId: userFamilyGroup,
      title,
      assignedTo,
      createdBy: currentUser.uid,
      dueDate,
      status: 'pending',
      relatedTransactionId: null,
      createdAt: serverTimestamp()
    };

    await addDoc(collection(db, 'tasks'), taskData);

    showNotification('Tarea creada exitosamente', 'success');
    document.getElementById('task-modal').classList.add('hidden');
    document.getElementById('task-form').reset();
  } catch (error) {
    console.error('Error al crear tarea:', error);
    showNotification('Error al crear la tarea', 'error');
  } finally {
    showLoading(false);
  }
}

function loadTasks() {
  if (!userFamilyGroup) return;

  // Unsubscribe from previous listener if exists
  if (tasksListener) {
    tasksListener();
  }

  const tasksQuery = query(
    collection(db, 'tasks'),
    where('familyGroupId', '==', userFamilyGroup),
    orderBy('dueDate', 'asc')
  );

  tasksListener = onSnapshot(tasksQuery, (snapshot) => {
    const tasks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    displayTasks(tasks);
  });
}

function displayTasks(tasks) {
  const pendingDiv = document.getElementById('pending-tasks');
  const completedDiv = document.getElementById('completed-tasks');

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  // Display pending tasks
  if (pendingTasks.length === 0) {
    pendingDiv.innerHTML = `
      <div class="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
        <svg class="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <h3 class="mt-2 text-md font-medium text-gray-800">¡Todo en orden!</h3>
        <p class="mt-1 text-sm text-gray-500">No hay tareas pendientes.</p>
      </div>
    `;
  } else {
    pendingDiv.innerHTML = '';
    pendingTasks.forEach(task => {
      pendingDiv.appendChild(createTaskCard(task, false));
    });
  }

  // Display completed tasks
  if (completedTasks.length === 0) {
    completedDiv.innerHTML = '<p class="text-center text-gray-400 text-sm py-4">Aún no se han completado tareas.</p>';
  } else {
    completedDiv.innerHTML = '';
    completedTasks.forEach(task => {
      completedDiv.appendChild(createTaskCard(task, true));
    });
  }
}

function createTaskCard(task, isCompleted) {
  const member = familyMembers.find(m => m.id === task.assignedTo);
  const assignedName = member ? member.displayName : 'Desconocido';

  const dueDate = task.dueDate?.toDate ? task.dueDate.toDate() : new Date(task.dueDate);
  const dateStr = dueDate.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });

  const isOverdue = !isCompleted && dueDate < new Date();

  const card = document.createElement('div');
  card.className = `border rounded-lg p-4 ${isOverdue ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}`;

  card.innerHTML = `
    <div class="flex justify-between items-start mb-2">
      <h4 class="font-semibold ${isCompleted ? 'line-through text-gray-500' : ''}">${task.title}</h4>
      ${!isCompleted ? `<button class="complete-task-btn text-green-600 hover:text-green-700" data-task-id="${task.id}">
        ✓ Completar
      </button>` : ''}
    </div>
    <p class="text-sm text-gray-600">Asignado a: ${assignedName}</p>
    <p class="text-sm ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-500'}">
      Fecha límite: ${dateStr} ${isOverdue ? '(Vencida)' : ''}
    </p>
  `;

  // Add complete button listener
  const completeBtn = card.querySelector('.complete-task-btn');
  completeBtn?.addEventListener('click', () => completeTask(task.id));

  return card;
}

async function completeTask(taskId) {
  try {
    showLoading(true);
    await updateDoc(doc(db, 'tasks', taskId), {
      status: 'completed'
    });
    showNotification('Tarea completada', 'success');
  } catch (error) {
    console.error('Error al completar tarea:', error);
    showNotification('Error al completar la tarea', 'error');
  } finally {
    showLoading(false);
  }
}

export function cleanup() {
  if (tasksListener) {
    tasksListener();
  }
}
